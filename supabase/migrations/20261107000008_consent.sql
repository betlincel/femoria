-- =====================================================================
-- Femoria — aydınlatma metni onayı ve konum rızası kaydı
--   kvkk_version / kvkk_accepted_at : kullanıcının onayladığı aydınlatma metni sürümü ve zamanı
--                                     (metin değişince uygulama yeniden onay ister)
--   location_consent_at             : konumun işlenmesine açık rıza zamanı (geri alınınca null)
-- Bu alanlar herkese açık profil görünümüne EKLENMEZ.
-- =====================================================================

-- Önceki migration'lar atlanmışsa da çalışsın diye
alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists gender text check (gender in ('kadin', 'erkek', 'belirtilmedi'));

alter table public.profiles add column if not exists kvkk_version text;
alter table public.profiles add column if not exists kvkk_accepted_at timestamptz;
alter table public.profiles add column if not exists location_consent_at timestamptz;

comment on column public.profiles.kvkk_version is 'Onaylanan aydınlatma metni sürümü (js/kvkk.js → KVKK_VERSION)';
comment on column public.profiles.location_consent_at is 'Konum için açık rıza zamanı; rıza geri alınınca null ve konum alanları temizlenir';

-- Üye olurken onaylanan aydınlatma metni sürümü (raw_user_meta_data.kvkk_version) profile yazılır.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, gender, phone_verified, email_verified, kvkk_version, kvkk_accepted_at)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'gender' in ('kadin', 'erkek', 'belirtilmedi')
         then new.raw_user_meta_data ->> 'gender' end,
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null,
    nullif(left(new.raw_user_meta_data ->> 'kvkk_version', 20), ''),
    case when nullif(new.raw_user_meta_data ->> 'kvkk_version', '') is not null then now() end
  )
  on conflict (id) do nothing;
  return new;
end $$;
