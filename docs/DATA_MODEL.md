# Data Model

## İlk migration tabloları

### profiles

`id` doğrudan `auth.users.id` UUID’sine bağlıdır. `role` (`buyer|producer|admin`), `status` (`active|suspended`), `display_name`, `locale`, yaklaşık public bölge alanları ve audit tarihlerini içerir. Kullanıcı yalnız ad, dil, şehir, ilçe ve public mahalle alanlarını güncelleyebilir.

### producer_profiles

`profile_id` bire bir profile ilişkisidir. TR/EN hikâye, `verification_status`, teslimat bölgeleri, kesin koordinat içermeyen `approximate_area`, onay ve audit tarihlerini içerir. Üretici doğrulama durumunu kendisi değiştiremez.

### categories

UUID, slug, TR/EN ad, `food|craft` türü, aktiflik ve sıralama alanları. Public yalnız aktif kategorileri okuyabilir.

### products

UUID, üretici/kategori foreign key’leri, slug, iki dilli başlık/açıklama, minor-unit fiyat, para birimi, moderasyon durumu, stok modeli, hazırlık günü ve yaklaşık şehir/ilçe bilgisi. Public yalnız onaylı üreticiye ait `approved` ürünleri görür.

### product_images

Ürün foreign key’i, Supabase Storage içindeki göreli path, TR/EN alt metin ve sıralama. Harici URL saklanmaz; erişim ürün politikalarıyla bağlıdır.

### favorites

`buyer_id + product_id` bileşik anahtarı ve oluşturma tarihi. Kullanıcı yalnız kendi favorilerini okur, ekler ve siler. Ekleme politikası ürünün onaylı olmasını da doğrular.

### addresses

Teslimat için alıcı adı, telefon, adres satırı, şehir, ilçe, posta kodu ve not içerir. Kesin koordinat içermez. Hiçbir anonim/public okuma politikası yoktur; yalnız kayıt sahibi CRUD yapabilir.

## Trigger ve güvenlik kuralları

- Mutable tablolarda `updated_at` otomatik güncellenir.
- `auth.users` insert sonrası güvenli profile trigger’ı çalışır.
- Signup rolü database içinde tekrar `buyer|producer` allowlist’inden geçirilir; diğer değerler `buyer` olur.
- Producer signup, `pending` producer profile oluşturur.
- Yetki ve moderasyon kolonları normal kullanıcı update grant’lerine dahil değildir.
- Para integer minor unit olarak saklanır.
- RLS tüm public tablolarda açık ve varsayılan erişim en az yetkilidir.

## Sonraki migrationlar

Food/craft detay tabloları, siparişler, sipariş kalemleri, şikâyetler ve üretici başvurusu audit geçmişi sonraki migrationlara ayrılacaktır. Mock katalog gerçek UUID ürün seed’iyle değiştirilmeden database favorite feature flag’i açılmaz.
