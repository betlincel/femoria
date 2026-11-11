-- =====================================================================
-- Femoria — e-ticaret: iyzico ile online ödeme (pazaryeri / emanet), kargo takibi,
-- teklif (pazarlık), satıcı mağazası + takip, puan ve yorum, gelişmiş sıralama.
--   • Ödeme ve iade yalnız Edge Function (odeme, odeme-sonuc) üzerinden; ödeme alanlarını
--     kullanıcı değiştiremez (yalnız service_role).
--   • Satıcının iyzico alt üye işyeri anahtarı ayrı tabloda; TC kimlik ve tam IBAN saklanmaz.
--   Tekrar tekrar çalıştırılabilir.
-- =====================================================================

-- ---------- Profil: mağaza tanıtımı + online ödeme alabilir mi ----------
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 600);
alter table public.profiles add column if not exists payout_ready boolean not null default false;

create or replace function public.profiles_protect_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.phone_verified    := old.phone_verified;
    new.email_verified    := old.email_verified;
    new.identity_verified := old.identity_verified;
    new.cooperative_name  := old.cooperative_name;
    new.payout_ready      := old.payout_ready;
  end if;
  return new;
end $$;

drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, full_name, avatar_url, phone_verified, identity_verified,
         cooperative_name, created_at, email_verified, bio, payout_ready
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- Satıcının iyzico alt üye işyeri kaydı (yalnız sunucu yazar; sahibi IBAN'ın son 4 hanesini görür)
create table if not exists public.payout_accounts (
  user_id          uuid primary key references public.profiles (id) on delete cascade,
  sub_merchant_key text not null,
  contact_name     text,
  iban_last4       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
drop policy if exists "ödeme hesabı: sahibi görür" on public.payout_accounts;
create policy "ödeme hesabı: sahibi görür" on public.payout_accounts for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.payout_accounts from anon, authenticated;
grant select (user_id, contact_name, iban_last4, created_at, updated_at) on public.payout_accounts to authenticated;

-- ---------- Ürün: beğeni sayısı (sıralama: en çok beğenilen) ----------
alter table public.products add column if not exists favorite_count int not null default 0;
update public.products p set favorite_count = (select count(*) from public.favorites f where f.product_id = p.id);
create index if not exists products_price_idx on public.products (price) where status = 'satista';
create index if not exists products_fav_idx on public.products (favorite_count desc) where status = 'satista';

create or replace function public.favorites_count_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('femoria.fav_count', '1', true);  -- products_protect_favcount bu güncellemeye izin verir
  if tg_op = 'INSERT' then
    update public.products set favorite_count = favorite_count + 1 where id = new.product_id;
  else
    update public.products set favorite_count = greatest(favorite_count - 1, 0) where id = old.product_id;
  end if;
  return null;
end $$;
-- Satıcı kendi ürününün beğeni sayısını değiştiremez (yalnız favori tetikleyicisi)
create or replace function public.products_protect_favcount()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' and coalesce(current_setting('femoria.fav_count', true), '') <> '1' then
    new.favorite_count := old.favorite_count;
  end if;
  return new;
end $$;
drop trigger if exists products_protect_favcount on public.products;
create trigger products_protect_favcount before update of favorite_count on public.products
  for each row execute function public.products_protect_favcount();

drop trigger if exists favorites_count on public.favorites;
create trigger favorites_count after insert or delete on public.favorites
  for each row execute function public.favorites_count_trg();

-- ---------- Ödeme oturumu (bir sepet = bir iyzico ödemesi) ----------
create table if not exists public.checkouts (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid not null references public.profiles (id) on delete cascade,
  total             numeric(10, 2) not null check (total >= 0),
  status            text not null default 'bekliyor' check (status in ('bekliyor', 'odendi', 'basarisiz', 'iptal')),
  shipping_address  jsonb,
  iyzico_token      text,
  iyzico_payment_id text,
  error             text,
  return_url        text,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);
alter table public.checkouts add column if not exists return_url text;
create index if not exists checkouts_buyer_idx on public.checkouts (buyer_id, created_at desc);
alter table public.checkouts enable row level security;
drop policy if exists "ödeme: alıcı görür" on public.checkouts;
create policy "ödeme: alıcı görür" on public.checkouts for select to authenticated
  using (buyer_id = (select auth.uid()));
revoke insert, update, delete on public.checkouts from anon, authenticated;

-- ---------- Teklifler (pazarlık) ----------
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  buyer_id        uuid not null references public.profiles (id) on delete cascade,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  amount          numeric(10, 2) not null check (amount > 0),
  counter_amount  numeric(10, 2) check (counter_amount > 0),
  status          text not null default 'bekliyor'
                  check (status in ('bekliyor', 'karsi', 'kabul', 'red', 'iptal', 'kullanildi')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (buyer_id <> seller_id)
);
create unique index if not exists offers_one_active on public.offers (product_id, buyer_id)
  where status in ('bekliyor', 'karsi', 'kabul');
create index if not exists offers_seller_idx on public.offers (seller_id, created_at desc);
create index if not exists offers_buyer_idx on public.offers (buyer_id, created_at desc);
alter table public.offers enable row level security;
drop policy if exists "teklif: taraflar görür" on public.offers;
create policy "teklif: taraflar görür" on public.offers for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()));
revoke insert, update, delete on public.offers from anon, authenticated;

-- Sohbete sistem notu (teklif / kargo / ödeme olayları)
create or replace function public.post_system_note(p_conversation_id uuid, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into public.messages (conversation_id, sender_id, kind, body)
  select p_conversation_id, null, 'sistem', p_body where p_conversation_id is not null;
  update public.conversations set last_message_at = now() where id = p_conversation_id;
$$;
revoke execute on function public.post_system_note(uuid, text) from public, anon, authenticated;

create or replace function public.make_offer(p_product_id uuid, p_amount numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p      public.products%rowtype;
  v_conv uuid;
  v_id   uuid;
begin
  if auth.uid() is null then raise exception 'Giriş yapmanız gerekiyor' using errcode = '28000'; end if;
  select * into p from public.products where id = p_product_id and status = 'satista';
  if not found then raise exception 'Bu ürün artık satışta değil'; end if;
  if p.seller_id = auth.uid() then raise exception 'Kendi ürününüze teklif veremezsiniz'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Geçerli bir tutar yazın'; end if;
  if p_amount >= p.price then raise exception 'Teklif, ürün fiyatından düşük olmalı'; end if;
  if p_amount < p.price * 0.5 then raise exception 'Teklif, fiyatın en az yarısı olmalı'; end if;

  v_conv := public.start_conversation(p_product_id);  -- engel ve "güvendiğim kişiler" kontrolüyle

  update public.offers set status = 'iptal', updated_at = now()
   where product_id = p_product_id and buyer_id = auth.uid() and status in ('bekliyor', 'karsi', 'kabul');

  insert into public.offers (product_id, buyer_id, seller_id, conversation_id, amount, expires_at)
  values (p_product_id, auth.uid(), p.seller_id, v_conv, round(p_amount, 2), now() + interval '48 hours')
  returning id into v_id;

  perform public.post_system_note(v_conv, format('%s TL teklif verildi. Satıcının cevabı bekleniyor.', to_char(round(p_amount, 2), 'FM999999990.##')));
  return v_id;
end $$;

-- Satıcı: kabul / red / karşı teklif. Alıcı: karşı teklifi kabul / red, ya da kendi teklifini geri çekme.
create or replace function public.respond_offer(p_offer_id uuid, p_action text, p_counter numeric default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  o     public.offers%rowtype;
  price numeric;
begin
  select * into o from public.offers where id = p_offer_id for update;
  if not found then raise exception 'Teklif bulunamadı'; end if;
  if o.expires_at is not null and o.expires_at < now() and o.status in ('bekliyor', 'karsi') then
    update public.offers set status = 'iptal', updated_at = now() where id = o.id;
    raise exception 'Teklifin süresi doldu';
  end if;

  if auth.uid() = o.seller_id and o.status = 'bekliyor' then
    if p_action = 'kabul' then
      update public.offers set status = 'kabul', expires_at = now() + interval '48 hours', updated_at = now() where id = o.id;
      perform public.post_system_note(o.conversation_id, format('Satıcı %s TL teklifi kabul etti. 48 saat içinde bu fiyattan satın alabilirsiniz.', to_char(o.amount, 'FM999999990.##')));
    elsif p_action = 'red' then
      update public.offers set status = 'red', updated_at = now() where id = o.id;
      perform public.post_system_note(o.conversation_id, 'Satıcı teklifi kabul etmedi.');
    elsif p_action = 'karsi' then
      select products.price into price from public.products where id = o.product_id;
      if p_counter is null or p_counter <= o.amount or p_counter >= price then
        raise exception 'Karşı teklif, alıcının teklifinden yüksek ve ürün fiyatından düşük olmalı';
      end if;
      update public.offers set status = 'karsi', counter_amount = round(p_counter, 2),
             expires_at = now() + interval '48 hours', updated_at = now() where id = o.id;
      perform public.post_system_note(o.conversation_id, format('Satıcı %s TL karşı teklif verdi.', to_char(round(p_counter, 2), 'FM999999990.##')));
    else
      raise exception 'Geçersiz işlem';
    end if;
  elsif auth.uid() = o.buyer_id and o.status = 'karsi' and p_action in ('kabul', 'red') then
    if p_action = 'kabul' then
      update public.offers set status = 'kabul', amount = o.counter_amount,
             expires_at = now() + interval '48 hours', updated_at = now() where id = o.id;
      perform public.post_system_note(o.conversation_id, format('Alıcı %s TL karşı teklifi kabul etti.', to_char(o.counter_amount, 'FM999999990.##')));
    else
      update public.offers set status = 'red', updated_at = now() where id = o.id;
      perform public.post_system_note(o.conversation_id, 'Alıcı karşı teklifi kabul etmedi.');
    end if;
  elsif auth.uid() = o.buyer_id and o.status in ('bekliyor', 'karsi', 'kabul') and p_action = 'iptal' then
    update public.offers set status = 'iptal', updated_at = now() where id = o.id;
    perform public.post_system_note(o.conversation_id, 'Alıcı teklifini geri çekti.');
  else
    raise exception 'Bu teklif için bu işlem yapılamaz';
  end if;
  return (select status from public.offers where id = o.id);
end $$;

-- ---------- Sipariş: online ödeme ve kargo alanları ----------
alter table public.orders add column if not exists checkout_id uuid references public.checkouts (id) on delete set null;
alter table public.orders add column if not exists offer_id uuid references public.offers (id) on delete set null;
alter table public.orders add column if not exists payment_status text not null default 'yok'
  check (payment_status in ('yok', 'bekliyor', 'odendi', 'iade', 'basarisiz'));
alter table public.orders add column if not exists payout_status text not null default 'yok'
  check (payout_status in ('yok', 'bekliyor', 'onaylandi', 'iade'));
alter table public.orders add column if not exists shipping_status text
  check (shipping_status in ('hazirlaniyor', 'kargoda', 'teslim_edildi'));
alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists cargo_company text check (char_length(cargo_company) <= 60);
alter table public.orders add column if not exists tracking_no text check (char_length(tracking_no) <= 60);
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists confirmed_at timestamptz;
alter table public.orders add column if not exists iyzico_tx_id text;
create index if not exists orders_checkout_idx on public.orders (checkout_id);

-- Satıcı kargoya verdi (takip numarasıyla) ya da elden teslime hazır
create or replace function public.set_shipment(p_order_id uuid, p_company text, p_tracking text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.seller_id <> auth.uid() then raise exception 'Sipariş bulunamadı'; end if;
  if o.payment_status <> 'odendi' or o.status = 'iptal' then raise exception 'Bu sipariş kargoya verilemez'; end if;
  if o.delivery = 'kargo' and (coalesce(trim(p_company), '') = '' or coalesce(trim(p_tracking), '') = '') then
    raise exception 'Kargo firması ve takip numarası gerekli';
  end if;
  update public.orders
     set shipping_status = 'kargoda', cargo_company = nullif(trim(p_company), ''),
         tracking_no = nullif(trim(p_tracking), ''), shipped_at = now()
   where id = o.id;
  perform public.post_system_note(o.conversation_id,
    case when o.delivery = 'kargo'
         then format('Ürün kargoya verildi: %s, takip no %s.', trim(p_company), trim(p_tracking))
         else 'Satıcı ürünü teslime hazırladı. Teslim aldığınızda "Teslim aldım" deyin.' end);
end $$;

-- ---------- Takip ----------
create table if not exists public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, seller_id),
  check (follower_id <> seller_id)
);
create index if not exists follows_seller_idx on public.follows (seller_id);
alter table public.follows enable row level security;
drop policy if exists "takip: kendi takiplerini görür" on public.follows;
create policy "takip: kendi takiplerini görür" on public.follows for select to authenticated
  using (follower_id = (select auth.uid()));
drop policy if exists "takip: takip eder" on public.follows;
create policy "takip: takip eder" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
drop policy if exists "takip: bırakır" on public.follows;
create policy "takip: bırakır" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));
revoke all on public.follows from anon;
grant select, insert, delete on public.follows to authenticated;

-- ---------- Puan ve yorum (yalnız teslim edilmiş siparişin alıcısı, sipariş başına bir kez) ----------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references public.orders (id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  product_title text,
  rating      int not null check (rating between 1 and 5),
  comment     text check (char_length(comment) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists reviews_seller_idx on public.reviews (seller_id, created_at desc);

create or replace function public.reviews_fill()
returns trigger language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = new.order_id;
  if not found or o.buyer_id <> new.reviewer_id or o.status <> 'teslim_edildi' then
    raise exception 'Yalnızca teslim aldığınız siparişi puanlayabilirsiniz';
  end if;
  new.seller_id := o.seller_id;
  new.product_title := coalesce((select title from public.products where id = o.product_id),
                                (select product_title from public.conversations where id = o.conversation_id));
  new.comment := nullif(trim(new.comment), '');
  return new;
end $$;
drop trigger if exists reviews_fill on public.reviews;
create trigger reviews_fill before insert on public.reviews
  for each row execute function public.reviews_fill();

alter table public.reviews enable row level security;
drop policy if exists "yorum: herkes okur" on public.reviews;
create policy "yorum: herkes okur" on public.reviews for select using (true);
drop policy if exists "yorum: alıcı yazar" on public.reviews;
create policy "yorum: alıcı yazar" on public.reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()));
drop policy if exists "yorum: yazan siler" on public.reviews;
create policy "yorum: yazan siler" on public.reviews for delete to authenticated
  using (reviewer_id = (select auth.uid()));
grant select on public.reviews to anon, authenticated;
grant insert, delete on public.reviews to authenticated;

-- ---------- Mağaza özeti: takipçi, puan, satış, ürün sayısı ----------
create or replace function public.seller_stats(p_seller uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'followers',    (select count(*) from public.follows where seller_id = p_seller),
    'rating',       (select round(avg(rating)::numeric, 1) from public.reviews where seller_id = p_seller),
    'review_count', (select count(*) from public.reviews where seller_id = p_seller),
    'sold',         (select coalesce(sum(quantity), 0) from public.orders where seller_id = p_seller and status = 'teslim_edildi'),
    'active',       (select count(*) from public.products where seller_id = p_seller and status = 'satista'),
    'following',    exists (select 1 from public.follows where seller_id = p_seller and follower_id = auth.uid())
  );
$$;

-- ---------- İzinler ----------
revoke execute on function public.make_offer(uuid, numeric) from public, anon;
revoke execute on function public.respond_offer(uuid, text, numeric) from public, anon;
revoke execute on function public.set_shipment(uuid, text, text) from public, anon;
grant execute on function public.make_offer(uuid, numeric) to authenticated;
grant execute on function public.respond_offer(uuid, text, numeric) to authenticated;
grant execute on function public.set_shipment(uuid, text, text) to authenticated;
grant execute on function public.seller_stats(uuid) to anon, authenticated;
grant execute on function public.refresh_badges(uuid) to service_role;
grant execute on function public.post_system_note(uuid, text) to service_role;
grant execute on function public.is_blocked_between(uuid, uuid) to service_role;

do $$ begin
  alter publication supabase_realtime add table public.offers;
exception when others then null; end $$;
