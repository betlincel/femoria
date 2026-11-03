-- =====================================================================
-- Femoria — görünümler, RPC fonksiyonları ve iş kuralı tetikleyicileri
-- =====================================================================

-- ---------- Herkese açık profil görünümü ----------
-- profiles tablosunu yalnızca sahibi okur; diğer kullanıcılar sadece bu
-- güvenli sütunları görür (telefon, acil kişi, ayarlar ve konum gizli kalır).
create view public.public_profiles as
  select id, full_name, avatar_url, city, district, neighborhood,
         phone_verified, identity_verified, cooperative_name, created_at
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ---------- Yardımcı kontroller ----------
create or replace function public.is_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and auth.uid() in (c.buyer_id, c.seller_id)
  )
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- "Güvenilir alıcı": doğrulanmış telefon + en az bir tamamlanmış alışveriş (puan).
create or replace function public.is_trusted_buyer(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select phone_verified from public.profiles where id = p_user), false)
     and exists (select 1 from public.orders where buyer_id = p_user and status = 'teslim_edildi')
$$;

create or replace function public.can_message(p_conversation_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  c public.conversations%rowtype;
  other uuid;
begin
  select * into c from public.conversations where id = p_conversation_id;
  if not found or auth.uid() not in (c.buyer_id, c.seller_id) then
    return false;
  end if;
  other := case when auth.uid() = c.buyer_id then c.seller_id else c.buyer_id end;
  if public.is_blocked_between(auth.uid(), other) then
    return false;
  end if;
  -- Kadın satıcı koruması: satıcı isterse yalnız güvenilir alıcılardan mesaj alır.
  if auth.uid() = c.buyer_id
     and (select only_trusted_messages from public.profiles where id = c.seller_id)
     and not public.is_trusted_buyer(c.buyer_id) then
    return false;
  end if;
  return true;
end $$;

-- ---------- Sohbet başlatma ----------
create or replace function public.start_conversation(p_product_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_seller uuid;
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmanız gerekiyor' using errcode = '28000';
  end if;

  select seller_id into v_seller from public.products
  where id = p_product_id and status = 'satista';
  if v_seller is null then
    raise exception 'Bu ürün artık satışta değil';
  end if;
  if v_seller = auth.uid() then
    raise exception 'Kendi ürününüze mesaj gönderemezsiniz';
  end if;
  if public.is_blocked_between(auth.uid(), v_seller) then
    raise exception 'Bu satıcıyla mesajlaşamazsınız';
  end if;
  if (select only_trusted_messages from public.profiles where id = v_seller)
     and not public.is_trusted_buyer(auth.uid()) then
    raise exception 'Bu satıcı yalnızca doğrulanmış ve puanı olan alıcılardan mesaj alıyor';
  end if;

  insert into public.conversations (product_id, buyer_id, seller_id)
  values (p_product_id, auth.uid(), v_seller)
  on conflict (product_id, buyer_id) do update set product_id = excluded.product_id
  returning id into v_id;

  return v_id;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.conversations
     set buyer_last_read_at  = case when buyer_id  = auth.uid() then now() else buyer_last_read_at  end,
         seller_last_read_at = case when seller_id = auth.uid() then now() else seller_last_read_at end
   where id = p_conversation_id and auth.uid() in (buyer_id, seller_id)
$$;

-- ---------- Akıllı mesaj kalkanı ----------
-- Mesaj engellenmez; işaretlenir. İstemci gönderimden önce de uyarır.
create or replace function public.message_shield_flags(p_body text)
returns text[] language plpgsql immutable as $$
declare
  f text[] := '{}';
  b text := coalesce(p_body, '');
begin
  if b ~* '(\+?9\s*0|0)?\s*\(?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}' then
    f := array_append(f, 'telefon');
  end if;
  if b ~* 'tr\s*\d{2}[\s\d]{20,}' or b ~* '\miban\M' then
    f := array_append(f, 'iban');
  end if;
  if b ~* '(sokak|sok\.|cadde|cad\.|bulvar|apartman|apt\.|daire|kap[ıi] no|no\s*:\s*\d)' then
    f := array_append(f, 'adres');
  end if;
  if b ~* '(kapora|[öo]n [öo]deme|[öo]nce (para|[öo]deme)|havale yap|eft yap|[şs]ifre|kart numara)' then
    f := array_append(f, 'dolandiricilik');
  end if;
  return f;
end $$;

create or replace function public.messages_before_insert()
returns trigger language plpgsql as $$
begin
  if new.kind in ('metin', 'hazir') then
    new.flags := public.message_shield_flags(new.body);
  end if;
  return new;
end $$;

create trigger messages_shield before insert on public.messages
  for each row execute function public.messages_before_insert();

-- Son mesaj zamanı + gece sessizliği (22:00–08:00, İstanbul saati)
create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c          public.conversations%rowtype;
  recipient  uuid;
  local_hour int := extract(hour from (now() at time zone 'Europe/Istanbul'));
begin
  update public.conversations set last_message_at = new.created_at
   where id = new.conversation_id
   returning * into c;

  if new.sender_id is null then
    return new;  -- sistem mesajı
  end if;

  recipient := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;

  if (local_hour >= 22 or local_hour < 8)
     and (select quiet_hours_enabled from public.profiles where id = recipient)
     and not exists (
       select 1 from public.messages m
        where m.conversation_id = new.conversation_id
          and m.kind = 'sistem'
          and m.body like 'Gece sessizliği%'
          and m.created_at > now() - interval '10 hours'
     ) then
    insert into public.messages (conversation_id, sender_id, kind, body)
    values (new.conversation_id, null, 'sistem',
            'Gece sessizliği: Karşı taraf şu an dinleniyor, sabah dönecek. 🌙');
  end if;

  return new;
end $$;

create trigger messages_after after insert on public.messages
  for each row execute function public.messages_after_insert();

-- ---------- Sipariş kartı ("Anlaştık") ----------
create or replace function public.propose_order(
  p_conversation_id uuid,
  p_quantity        int,
  p_unit_price      numeric,
  p_delivery        public.delivery_method,
  p_promised_date   date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  c    public.conversations%rowtype;
  v_id uuid;
begin
  if not public.can_message(p_conversation_id) then
    raise exception 'Bu sohbette sipariş kartı oluşturamazsınız';
  end if;
  select * into c from public.conversations where id = p_conversation_id;

  insert into public.orders (conversation_id, product_id, buyer_id, seller_id, quantity,
                             unit_price, delivery, promised_date, buyer_agreed, seller_agreed)
  values (c.id, c.product_id, c.buyer_id, c.seller_id, p_quantity, p_unit_price, p_delivery,
          p_promised_date, auth.uid() = c.buyer_id, auth.uid() = c.seller_id)
  returning id into v_id;

  insert into public.messages (conversation_id, sender_id, kind, body, order_id)
  values (c.id, auth.uid(), 'siparis', 'Sipariş kartı', v_id);

  return v_id;
end $$;

create or replace function public.agree_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or auth.uid() not in (o.buyer_id, o.seller_id) then
    raise exception 'Sipariş bulunamadı';
  end if;
  if o.status <> 'teklif' then
    return o;
  end if;

  update public.orders
     set buyer_agreed  = buyer_agreed  or auth.uid() = buyer_id,
         seller_agreed = seller_agreed or auth.uid() = seller_id
   where id = p_order_id
   returning * into o;

  if o.buyer_agreed and o.seller_agreed then
    update public.orders set status = 'anlasildi', agreed_at = now()
     where id = p_order_id returning * into o;
    insert into public.messages (conversation_id, sender_id, kind, body, order_id)
    values (o.conversation_id, null, 'sistem', 'Anlaştınız! 🤝 Sipariş kaydedildi.', o.id);
  end if;
  return o;
end $$;

create or replace function public.cancel_order(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  update public.orders set status = 'iptal'
   where id = p_order_id and auth.uid() in (buyer_id, seller_id) and status in ('teklif', 'anlasildi')
   returning * into o;
  if not found then
    raise exception 'Sipariş iptal edilemedi';
  end if;
  insert into public.messages (conversation_id, sender_id, kind, body, order_id)
  values (o.conversation_id, null, 'sistem', 'Sipariş iptal edildi.', o.id);
  return o;
end $$;

-- Teslimi alıcı onaylar (alıcı yoksa satıcı da işaretleyebilir).
create or replace function public.mark_order_delivered(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  update public.orders set status = 'teslim_edildi', delivered_at = now()
   where id = p_order_id and auth.uid() in (buyer_id, seller_id) and status = 'anlasildi'
   returning * into o;
  if not found then
    raise exception 'Önce iki tarafın da "Anlaştık" demesi gerekiyor';
  end if;
  insert into public.messages (conversation_id, sender_id, kind, body, order_id)
  values (o.conversation_id, null, 'sistem', 'Teslim edildi. Hayırlı olsun! 🎉', o.id);

  perform public.refresh_badges(o.seller_id);
  perform public.refresh_badges(mentor_id) from public.profiles
    where id = o.seller_id and mentor_id is not null;
  return o;
end $$;

-- ---------- Komşu Rozetleri ----------
create or replace function public.refresh_badges(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  delivered_count int;
  late_count int;
begin
  select * into p from public.profiles where id = p_user;
  if not found then return; end if;

  -- Mahallenin Eli: aynı mahalleden 5 farklı alıcıya satış
  if (select count(distinct o.buyer_id)
        from public.orders o join public.profiles b on b.id = o.buyer_id
       where o.seller_id = p_user and o.status = 'teslim_edildi'
         and b.neighborhood is not distinct from p.neighborhood
         and p.neighborhood is not null) >= 5 then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'mahallenin-eli')
      on conflict do nothing;
  end if;

  -- Sözünde Durur: 10 siparişin hepsi söz verilen günde teslim
  select count(*), count(*) filter (where o.promised_date is not null
                                      and (o.delivered_at at time zone 'Europe/Istanbul')::date > o.promised_date)
    into delivered_count, late_count
    from public.orders o
   where o.seller_id = p_user and o.status = 'teslim_edildi';
  if delivered_count >= 10 and late_count = 0 then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'sozunde-durur')
      on conflict do nothing;
  end if;

  -- Yol Gösteren: kardeşlerinden biri ilk satışını yaptı
  if exists (select 1 from public.profiles k
               join public.orders o on o.seller_id = k.id and o.status = 'teslim_edildi'
              where k.mentor_id = p_user) then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'yol-gosteren')
      on conflict do nothing;
  end if;

  -- Doğrulanmış Komşu: telefon + kimlik doğrulaması
  if p.phone_verified and p.identity_verified then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'dogrulanmis-komsu')
      on conflict do nothing;
  end if;

  -- Kooperatif Üyesi
  if p.cooperative_name is not null then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'kooperatif-uyesi')
      on conflict do nothing;
  end if;
end $$;

-- Doğrulama/kooperatif bilgisi (yönetici tarafından) değişince rozetleri tazele.
create or replace function public.profiles_after_update_badges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone_verified is distinct from old.phone_verified
     or new.identity_verified is distinct from old.identity_verified
     or new.cooperative_name is distinct from old.cooperative_name then
    perform public.refresh_badges(new.id);
  end if;
  return new;
end $$;

create trigger profiles_badges after update on public.profiles
  for each row execute function public.profiles_after_update_badges();

-- ---------- Yakınımda: en yakından uzağa ----------
create or replace function public.nearby_products(
  p_lat       double precision,
  p_lng       double precision,
  p_radius_km double precision default 10,
  p_category  text default null,
  p_limit     int default 50
) returns table (
  id uuid, title text, price numeric, category text, delivery public.delivery_method,
  photos text[], seller_id uuid, seller_name text, neighborhood text, district text,
  approx_lat double precision, approx_lng double precision, distance_km double precision,
  published_at timestamptz
) language sql stable as $$
  select p.id, p.title, p.price, p.category, p.delivery, p.photos, p.seller_id,
         s.full_name, p.neighborhood, p.district, p.approx_lat, p.approx_lng,
         round(public.distance_km(p_lat, p_lng, p.approx_lat, p.approx_lng)::numeric, 1)::double precision,
         p.published_at
    from public.products p
    join public.public_profiles s on s.id = p.seller_id
   where p.status = 'satista'
     and (p_category is null or p.category = p_category)
     and p.approx_lat is not null
     and public.distance_km(p_lat, p_lng, p.approx_lat, p.approx_lng) <= p_radius_km
   order by public.distance_km(p_lat, p_lng, p.approx_lat, p.approx_lng)
   limit least(p_limit, 200)
$$;

-- ---------- Fiyat önerisi ("Benzer patikler 150–220 TL arası") ----------
create or replace function public.price_suggestion(p_category text, p_title text default null)
returns table (low numeric, high numeric, sample_size int)
language plpgsql stable security definer set search_path = public as $$
declare
  word text := nullif(split_part(lower(coalesce(p_title, '')), ' ', 1), '');
begin
  -- Önce başlığın ilk kelimesine benzeyenler, yetmezse tüm kategori.
  return query
    with pool as (
      select price from public.products
       where category = p_category and status in ('satista', 'satildi')
         and word is not null and lower(title) like '%' || word || '%'
    ), fallback as (
      select price from public.products
       where category = p_category and status in ('satista', 'satildi')
    ), chosen as (
      select price from pool where (select count(*) from pool) >= 3
      union all
      select price from fallback where (select count(*) from pool) < 3
    )
    select round(percentile_cont(0.25) within group (order by price)::numeric / 10) * 10,
           round(percentile_cont(0.75) within group (order by price)::numeric / 10) * 10,
           count(*)::int
      from chosen
    having count(*) >= 3;
end $$;

-- ---------- Kazancım / Emek Defteri ----------
create or replace function public.my_earnings()
returns json language sql stable security definer set search_path = public as $$
  with month_orders as (
    select * from public.orders
     where seller_id = auth.uid()
       and status in ('anlasildi', 'teslim_edildi')
       and date_trunc('month', agreed_at at time zone 'Europe/Istanbul')
         = date_trunc('month', now() at time zone 'Europe/Istanbul')
  ), earlier_buyers as (
    select distinct buyer_id from public.orders
     where seller_id = auth.uid() and status in ('anlasildi', 'teslim_edildi')
       and agreed_at < date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'
  )
  select json_build_object(
    'items_sold',    coalesce((select sum(quantity) from month_orders), 0),
    'total',         coalesce((select sum(quantity * unit_price) from month_orders), 0),
    'new_neighbors', (select count(distinct buyer_id) from month_orders
                       where buyer_id not in (select buyer_id from earlier_buyers))
  )
$$;

-- ---------- Mahallende Aranıyor panosu ----------
-- Kimin aradığı gösterilmez; sadece ilçedeki toplam talep.
create or replace function public.district_demand(p_city text, p_district text, p_days int default 30)
returns table (query text, people int)
language sql stable security definer set search_path = public as $$
  select lower(trim(r.query)) as query, count(distinct coalesce(r.user_id::text, r.id::text))::int as people
    from public.search_requests r
   where r.city = p_city and r.district = p_district
     and r.created_at > now() - make_interval(days => least(p_days, 90))
   group by 1
   order by 2 desc
   limit 20
$$;

-- ---------- KVKK: hesabı ve verileri tek düğmeyle sil ----------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth, storage as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Giriş yapmanız gerekiyor';
  end if;
  -- Dosya nesneleri Storage API ile silinmelidir (istemci önce kendi klasörünü temizler).
  delete from auth.users where id = uid;  -- profil ve bağlı veriler cascade ile silinir
end $$;

-- ---------- İzinler ----------
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.refresh_badges(uuid) from public, anon, authenticated;
revoke execute on function public.start_conversation(uuid) from public, anon;
revoke execute on function public.propose_order(uuid, int, numeric, public.delivery_method, date) from public, anon;
revoke execute on function public.agree_order(uuid) from public, anon;
revoke execute on function public.cancel_order(uuid) from public, anon;
revoke execute on function public.mark_order_delivered(uuid) from public, anon;
revoke execute on function public.my_earnings() from public, anon;

grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.propose_order(uuid, int, numeric, public.delivery_method, date) to authenticated;
grant execute on function public.agree_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.mark_order_delivered(uuid) to authenticated;
grant execute on function public.my_earnings() to authenticated;
