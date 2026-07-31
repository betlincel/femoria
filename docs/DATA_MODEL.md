# Data Model

## Temel tablolar

### profiles

`id`, `role` (`buyer|producer|admin`), `display_name`, `locale`, `city`, `district`, `neighborhood_public`, `created_at`.

### producer_profiles

`profile_id`, `story_tr`, `story_en`, `verification_status`, `delivery_regions`, `approximate_geohash`, `approved_at`. Kesin koordinat ayrı, yalnız yetkili erişimli alanda tutulur.

### categories

`id`, `slug`, `name_tr`, `name_en`, `kind` (`food|craft`), `active`, `sort_order`.

### products

`id`, `producer_id`, `category_id`, `slug`, `title_tr`, `title_en`, `description_tr`, `description_en`, `price_minor`, `currency`, `status`, `stock_mode`, `stock_quantity`, `preparation_days`, `created_at`.

### food_product_details

`product_id`, `ingredients_tr/en`, `allergens_tr/en`, `net_amount`, `production_date`, `expiry_date`, `storage_tr/en`, `preservation_method`.

### craft_product_details

`product_id`, `material_tr/en`, `dimensions`, `color_tr/en`, `customizable`, `customization_notes_tr/en`.

### product_images

`id`, `product_id`, `storage_path`, `alt_tr`, `alt_en`, `sort_order`.

### favorites

Bileşik anahtar: `buyer_id`, `product_id`; ayrıca `created_at`.

### orders / order_items

Sipariş talebi, durum, teslimat tipi, anonimleştirilmiş teslimat bölgesi, tutar snapshot’ı ve ürün satırları. Adres bilgisi katalog verisinden ayrı tutulur.

### complaints / producer_applications

Yönetici moderasyonu için durum, inceleyen kullanıcı, karar notu ve audit tarihleri.

## Kurallar

- Para integer minor unit olarak saklanır.
- Public sorgular yalnız `approved` ürün ve üreticileri döndürür.
- Çeviri alanları MVP’de iki sütun; kategori ve ürün içerikleri için TR zorunlu, EN yayın öncesi doğrulanır.
- RLS politikaları sahiplik ve role göre yazılır; service role tarayıcıya gönderilmez.
- Kesin koordinat, public view veya client payload’ına eklenmez.
