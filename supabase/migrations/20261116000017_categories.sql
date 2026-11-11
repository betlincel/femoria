-- =====================================================================
-- Femoria — ürün kategorileri: ana kategori + alt kategori (evde yapılan ürünler)
--   OTOMATİK ÜRETİLDİ: js/categories-data.js → node scripts/build-categories.mjs
--   Elle düzenlemeyin; kategori eklemek için js/categories-data.js dosyasını değiştirip scripti çalıştırın.
--   Mevcut ürünler etkilenmez (eski kategori adları geçerli ana kategoriler olarak kalır).
--   Tekrar tekrar çalıştırılabilir.
-- =====================================================================

alter table public.categories add column if not exists parent text references public.categories (slug) on delete set null;
create index if not exists categories_parent_idx on public.categories (parent);

-- Ana kategoriler
insert into public.categories (slug, name, icon, sort, parent) values
  ('yemek', 'Yemek', 'cat-yemek', 100, null),
  ('orgu', 'Örgü', 'cat-orgu', 200, null),
  ('taki', 'Takı', 'cat-taki', 300, null),
  ('ev-susu', 'Ev süsü', 'cat-ev-susu', 400, null),
  ('kurutmalik', 'Kurutmalık', 'cat-kurutmalik', 500, null),
  ('giyim', 'Giyim', 'cat-giyim', 600, null),
  ('bebek', 'Bebek & Çocuk', 'cat-bebek', 700, null),
  ('bakim', 'Doğal Bakım', 'cat-bakim', 800, null),
  ('hediyelik', 'Hediyelik', 'cat-hediyelik', 900, null),
  ('bahce', 'Bahçe', 'cat-bahce', 1000, null),
  ('diger', 'Diğer', 'cat-diger', 1100, null)
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort = excluded.sort, parent = excluded.parent;

-- Alt kategoriler
insert into public.categories (slug, name, icon, sort, parent) values
  ('recel', 'Reçel & Marmelat', 'cat-yemek', 101, 'yemek'),
  ('pekmez-bal', 'Pekmez, Bal & Tahin', 'cat-yemek', 102, 'yemek'),
  ('salca-sos', 'Salça & Sos', 'cat-yemek', 103, 'yemek'),
  ('tursu', 'Turşu & Zeytin', 'cat-yemek', 104, 'yemek'),
  ('hamur-isi', 'Mantı, Erişte & Tarhana', 'cat-yemek', 105, 'yemek'),
  ('borek', 'Börek, Gözleme & Poğaça', 'cat-yemek', 106, 'yemek'),
  ('kek-kurabiye', 'Kek, Kurabiye & Pasta', 'cat-yemek', 107, 'yemek'),
  ('tatli', 'Tatlı & Baklava', 'cat-yemek', 108, 'yemek'),
  ('hazir-yemek', 'Hazır Yemek & Sarma', 'cat-yemek', 109, 'yemek'),
  ('sut-urunleri', 'Peynir & Süt Ürünleri', 'cat-yemek', 110, 'yemek'),
  ('icecek', 'İçecek & Şerbet', 'cat-yemek', 111, 'yemek'),
  ('orgu-bebek', 'Bebek Örgüleri', 'cat-orgu', 201, 'orgu'),
  ('orgu-giyim', 'Atkı, Bere & Eldiven', 'cat-orgu', 202, 'orgu'),
  ('orgu-hirka', 'Hırka, Kazak & Yelek', 'cat-orgu', 203, 'orgu'),
  ('orgu-canta', 'Örgü Çanta & File', 'cat-orgu', 204, 'orgu'),
  ('amigurumi', 'Amigurumi & Örgü Oyuncak', 'cat-orgu', 205, 'orgu'),
  ('orgu-ortu', 'Battaniye & Örgü Örtü', 'cat-orgu', 206, 'orgu'),
  ('kolye', 'Kolye & Gerdanlık', 'cat-taki', 301, 'taki'),
  ('bileklik', 'Bileklik & Bilezik', 'cat-taki', 302, 'taki'),
  ('kupe', 'Küpe', 'cat-taki', 303, 'taki'),
  ('yuzuk', 'Yüzük', 'cat-taki', 304, 'taki'),
  ('tesbih', 'Tesbih', 'cat-taki', 305, 'taki'),
  ('sac-aksesuari', 'Saç Aksesuarı & Broş', 'cat-taki', 306, 'taki'),
  ('dantel-ortu', 'Dantel & Masa Örtüsü', 'cat-ev-susu', 401, 'ev-susu'),
  ('seramik', 'Seramik & Vazo', 'cat-ev-susu', 402, 'ev-susu'),
  ('mum', 'Mum & Kokulu Ürünler', 'cat-ev-susu', 403, 'ev-susu'),
  ('duvar-susu', 'Tablo & Duvar Süsü', 'cat-ev-susu', 404, 'ev-susu'),
  ('sepet-hasir', 'Sepet & Hasır', 'cat-ev-susu', 405, 'ev-susu'),
  ('kuru-cicek', 'Kuru Çiçek & Çelenk', 'cat-ev-susu', 406, 'ev-susu'),
  ('ceyiz-tekstil', 'Çeyiz & Ev Tekstili', 'cat-ev-susu', 407, 'ev-susu'),
  ('kuru-sebze', 'Kuru Sebze (Biber, Patlıcan)', 'cat-kurutmalik', 501, 'kurutmalik'),
  ('kuru-meyve', 'Kuru Meyve & Pestil', 'cat-kurutmalik', 502, 'kurutmalik'),
  ('baharat-cay', 'Baharat & Bitki Çayı', 'cat-kurutmalik', 503, 'kurutmalik'),
  ('tahil-bakliyat', 'Bulgur, Un & Bakliyat', 'cat-kurutmalik', 504, 'kurutmalik'),
  ('kuruyemis', 'Kuruyemiş & Cevizli Sucuk', 'cat-kurutmalik', 505, 'kurutmalik'),
  ('el-giyim', 'Elbise, Gömlek & Önlük', 'cat-giyim', 601, 'giyim'),
  ('sal-esarp', 'Şal, Eşarp & Yazma', 'cat-giyim', 602, 'giyim'),
  ('nakis', 'Nakış & İşleme', 'cat-giyim', 603, 'giyim'),
  ('kece-dokuma', 'Keçe & El Dokuma', 'cat-giyim', 604, 'giyim'),
  ('canta-cuzdan', 'Çanta, Cüzdan & Kılıf', 'cat-giyim', 605, 'giyim'),
  ('bebek-aksesuar', 'Bebek Aksesuarı & Lohusa', 'cat-bebek', 701, 'bebek'),
  ('bez-oyuncak', 'Bez & Ahşap Oyuncak', 'cat-bebek', 702, 'bebek'),
  ('cocuk-giyim', 'Çocuk Giyim', 'cat-bebek', 703, 'bebek'),
  ('sabun', 'Doğal Sabun', 'cat-bakim', 801, 'bakim'),
  ('krem-merhem', 'Krem, Merhem & Balsam', 'cat-bakim', 802, 'bakim'),
  ('kolonya-yag', 'Kolonya & Bitkisel Yağ', 'cat-bakim', 803, 'bakim'),
  ('banyo-lifi', 'Banyo Lifi & Kese', 'cat-bakim', 804, 'bakim'),
  ('kisiye-ozel', 'Kişiye Özel & İsimli', 'cat-hediyelik', 901, 'hediyelik'),
  ('hediye-seti', 'Hediye Seti & Sepeti', 'cat-hediyelik', 902, 'hediyelik'),
  ('dugun-nisan', 'Nişan, Düğün & Kına', 'cat-hediyelik', 903, 'hediyelik'),
  ('ozel-gun', 'Doğum, Bayram & Özel Gün', 'cat-hediyelik', 904, 'hediyelik'),
  ('magnet-hatira', 'Magnet, Anahtarlık & Hatıra', 'cat-hediyelik', 905, 'hediyelik'),
  ('fide-tohum', 'Fide, Fidan & Tohum', 'cat-bahce', 1001, 'bahce'),
  ('saksi-cicek', 'Saksı & Çiçek', 'cat-bahce', 1002, 'bahce'),
  ('taze-urun', 'Taze Sebze, Meyve & Yumurta', 'cat-bahce', 1003, 'bahce')
on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort = excluded.sort, parent = excluded.parent;
