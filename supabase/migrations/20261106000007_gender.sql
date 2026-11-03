-- =====================================================================
-- Femoria — cinsiyet (yalnızca hitap için: "Hanım" / "Bey" / yalnız ad)
-- Herkese açık profil görünümüne (public_profiles) EKLENMEZ; yalnız sahibi görür.
-- =====================================================================

alter table public.profiles add column if not exists gender text
  check (gender in ('kadin', 'erkek', 'belirtilmedi'));

comment on column public.profiles.gender is
  'Hitap için: kadin → "Hanım", erkek → "Bey", belirtilmedi → yalnız ad. Başkalarına gösterilmez.';

-- Üye olurken formdan gelen bilgi (raw_user_meta_data.gender) profile yazılır.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, gender, phone_verified, email_verified)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'gender' in ('kadin', 'erkek', 'belirtilmedi')
         then new.raw_user_meta_data ->> 'gender' end,
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end $$;
