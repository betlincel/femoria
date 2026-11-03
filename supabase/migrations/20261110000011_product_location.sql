-- =====================================================================
-- Femoria — konum profilde değil, ürün bazında
--   • Satıcı her ürünü satışa çıkarırken o ürünün konumunu girer (cihazdan ya da listeden)
--   • Ürünün koordinatı kaydedilirken ~500 m rastgele kaydırılır; adres saklanmaz
--   • Profildeki konum alanları kaldırılır. Alışveriş yapanın konumu ("Yakınımda" sıralaması)
--     yalnız kullanıcının cihazında tutulur; sunucuya yazılmaz.
--   • profiles.location_consent_at (rıza kaydı) kalır.
-- =====================================================================

-- ---------- Ürün konumu: istemciden gelir, sunucuda kaydırılır ----------
create or replace function public.products_fill_location()
returns trigger language plpgsql as $$
declare j double precision[];
begin
  if tg_op = 'INSERT'
     or new.approx_lat is distinct from old.approx_lat
     or new.approx_lng is distinct from old.approx_lng then
    if new.approx_lat is null or new.approx_lng is null then
      if tg_op = 'INSERT' then
        raise exception 'Ürünün konumu gerekli' using errcode = '23502';
      end if;
    else
      j := public.jitter_point(new.approx_lat, new.approx_lng, 500);
      new.approx_lat := j[1];
      new.approx_lng := j[2];
    end if;
  end if;
  if new.status = 'satista' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

-- ---------- Herkese açık profil: konum sütunları çıkarıldı ----------
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, full_name, avatar_url, phone_verified, identity_verified,
         cooperative_name, created_at, email_verified
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- ---------- Rozet kuralı: "Mahallenin Eli" ----------
create or replace function public.refresh_badges(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  delivered_count int;
  late_count int;
begin
  select * into p from public.profiles where id = p_user;
  if not found then return; end if;

  -- Mahallenin Eli: 5 farklı alıcıya elden teslim (konum artık profilde tutulmuyor)
  if (select count(distinct o.buyer_id)
        from public.orders o
       where o.seller_id = p_user and o.status = 'teslim_edildi'
         and o.delivery in ('elden', 'ikisi')) >= 5 then
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

  -- Doğrulanmış Komşu: e-posta (veya telefon) + kimlik doğrulaması
  if (p.email_verified or p.phone_verified) and p.identity_verified then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'dogrulanmis-komsu')
      on conflict do nothing;
  end if;

  -- Kooperatif Üyesi
  if p.cooperative_name is not null then
    insert into public.user_badges (user_id, badge_slug) values (p_user, 'kooperatif-uyesi')
      on conflict do nothing;
  end if;
end $$;

update public.badges set description = '5 farklı alıcıya elden teslim' where slug = 'mahallenin-eli';

-- ---------- Profildeki konum alanlarını kaldır (kayıtlı konumlar da silinir) ----------
drop trigger if exists profiles_jitter on public.profiles;
drop function if exists public.profiles_jitter_location();
alter table public.profiles drop column if exists approx_lat;
alter table public.profiles drop column if exists approx_lng;
alter table public.profiles drop column if exists city;
alter table public.profiles drop column if exists district;
alter table public.profiles drop column if exists neighborhood;
