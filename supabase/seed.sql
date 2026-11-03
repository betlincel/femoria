-- =====================================================================
-- Femoria — başlangıç verileri (sözlükler). `supabase db reset` ile yüklenir.
-- Canlı projede bir kez SQL Editor'den çalıştırılabilir (idempotent).
-- =====================================================================

insert into public.categories (slug, name, icon, sort) values
  ('yemek',     'Yemek',      '🍲', 1),
  ('orgu',      'Örgü',       '🧶', 2),
  ('taki',      'Takı',       '📿', 3),
  ('ev-susu',   'Ev süsü',    '🏺', 4),
  ('kurutmalik','Kurutmalık', '🌶️', 5),
  ('diger',     'Diğer',      '🎁', 6)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort = excluded.sort;

insert into public.badges (slug, name, description, icon) values
  ('mahallenin-eli',    'Mahallenin Eli',    '5 farklı alıcıya elden teslim', '🏘️'),
  ('sozunde-durur',     'Sözünde Durur',     '10 siparişin hepsi söz verilen günde teslim', '⏰'),
  ('yol-gosteren',      'Yol Gösteren',      'Bir yeni satıcının ilk satışına yardım', '🧭'),
  ('dogrulanmis-komsu', 'Doğrulanmış Komşu', 'E-posta + kimlik doğrulaması tamamlandı', '✅'),
  ('kooperatif-uyesi',  'Kooperatif Üyesi',  'Kayıtlı bir kadın kooperatifine bağlı satıcı', '🤝')
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon = excluded.icon;

-- Pilot bölge: Trabzon (KTÜ çevresi). Mahalle merkezleri yaklaşık değerlerdir.
insert into public.locations (city, district, neighborhood, lat, lng) values
  ('Trabzon', 'Ortahisar', 'Kalkınma',        41.0005, 39.7720),
  ('Trabzon', 'Ortahisar', 'Üniversite',      40.9950, 39.7790),
  ('Trabzon', 'Ortahisar', 'Gülbaharhatun',   41.0050, 39.7250),
  ('Trabzon', 'Ortahisar', 'Kemerkaya',       41.0030, 39.7330),
  ('Trabzon', 'Ortahisar', 'Pelitli',         40.9880, 39.8000),
  ('Trabzon', 'Ortahisar', 'Boztepe',         40.9970, 39.7300),
  ('Trabzon', 'Ortahisar', 'Yalıncak',        40.9930, 39.8180),
  ('Trabzon', 'Akçaabat',  'Söğütlü',         41.0230, 39.5800),
  ('Trabzon', 'Akçaabat',  'Darıca',          41.0210, 39.5650),
  ('Trabzon', 'Yomra',     'Kaşüstü',         40.9800, 39.8400),
  ('Trabzon', 'Yomra',     'Sancak',          40.9550, 39.8590),
  ('Trabzon', 'Of',        'Merkez',          40.9450, 40.2650),
  ('Trabzon', 'Arsin',     'Merkez',          40.9500, 39.9250),
  ('Trabzon', 'Sürmene',   'Merkez',          40.9100, 40.1150)
on conflict (city, district, neighborhood) do nothing;

insert into public.announcements (title, body, city, district)
select 'Telefonla Satış Atölyesi',
       'Ayın son cumartesi, Kalkınma Muhtarlığı''nda saat 14:00. 1 saatte herkes ilk ürününü birlikte yüklüyor. Çayımız hazır!',
       'Trabzon', 'Ortahisar'
where not exists (select 1 from public.announcements where title = 'Telefonla Satış Atölyesi');
