-- =====================================================================
-- Femoria — onarım (tekrar tekrar çalıştırılabilir, veri silmez)
--   1) Ürün türleri (kategoriler) tabloda yoksa eklenir; adlar sade (emojisiz) yazılır.
--      Ürün eklerken "category" alanı bu tabloya bağlıdır; tablo boşsa satışa çıkarma başarısız olur.
--   2) Fotoğraf / ses depolama alanları yoksa oluşturulur.
--   3) Profili oluşmamış hesaplara profil satırı açılır (ürünün satıcısı profile bağlıdır).
-- SQL Editor'de bir kez çalıştırmanız yeterli.
-- =====================================================================

-- 1) Ürün türleri — "icon" sütunu artık uygulamadaki çizgi ikonun adını tutar (emoji değil)
insert into public.categories (slug, name, icon, sort) values
  ('yemek',      'Yemek',      'cat-yemek',      1),
  ('orgu',       'Örgü',       'cat-orgu',       2),
  ('taki',       'Takı',       'cat-taki',       3),
  ('ev-susu',    'Ev süsü',    'cat-ev-susu',    4),
  ('kurutmalik', 'Kurutmalık', 'cat-kurutmalik', 5),
  ('diger',      'Diğer',      'cat-diger',      6)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort = excluded.sort;

-- 2) Depolama alanları
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-photos', 'product-photos', true,  5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',        'avatars',        true,  2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('voice-messages', 'voice-messages', false, 5242880, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

-- 3) Eksik profiller
insert into public.profiles (id, full_name, email_verified, phone_verified)
select u.id,
       nullif(u.raw_user_meta_data ->> 'full_name', ''),
       u.email_confirmed_at is not null,
       u.phone_confirmed_at is not null
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null
on conflict (id) do nothing;
