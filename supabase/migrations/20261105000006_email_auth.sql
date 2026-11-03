-- =====================================================================
-- Femoria — giriş yöntemi: telefon + SMS kodu yerine e-posta + şifre
--   • profiles.email_verified: Auth'taki e-posta onayından otomatik gelir
--   • "Güvenilir alıcı" ve "Doğrulanmış Komşu" artık e-posta onayını sayar
--     (eski telefon doğrulaması da geçerli kalır)
-- =====================================================================

alter table public.profiles add column if not exists email_verified boolean not null default false;

-- Var olan kullanıcılar için doldur
update public.profiles p set email_verified = true
  from auth.users u
 where u.id = p.id and u.email_confirmed_at is not null and not p.email_verified;

-- Herkese açık profil görünümü: doğrulama bilgisi eklendi (yeni sütun sona)
create or replace view public.public_profiles as
  select id, full_name, avatar_url, city, district, neighborhood,
         phone_verified, identity_verified, cooperative_name, created_at, email_verified
  from public.profiles;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone_verified, email_verified)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.profiles_protect_columns()
returns trigger language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    new.phone_verified    := old.phone_verified;
    new.email_verified    := old.email_verified;
    new.identity_verified := old.identity_verified;
    new.cooperative_name  := old.cooperative_name;
  end if;
  return new;
end $$;

create or replace function public.handle_user_email_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified = true where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

create or replace function public.is_trusted_buyer(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select phone_verified or email_verified from public.profiles where id = p_user), false)
     and exists (select 1 from public.orders where buyer_id = p_user and status = 'teslim_edildi')
$$;

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

create or replace function public.profiles_after_update_badges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone_verified is distinct from old.phone_verified
     or new.email_verified is distinct from old.email_verified
     or new.identity_verified is distinct from old.identity_verified
     or new.cooperative_name is distinct from old.cooperative_name then
    perform public.refresh_badges(new.id);
  end if;
  return new;
end $$;

update public.badges set description = 'E-posta + kimlik doğrulaması tamamlandı' where slug = 'dogrulanmis-komsu';
