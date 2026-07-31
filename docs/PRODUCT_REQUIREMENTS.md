# FEMORIA Product Requirements

## Amaç

FEMORIA, evde üretim yapan kadınların güvenli biçimde görünürlük ve gelir elde etmesini; alıcıların ise yerel, özenli ve şeffaf ürünleri keşfetmesini sağlayan iki dilli pazar yeridir.

## Kullanıcılar ve başarı ölçütleri

- **Alıcı:** Ürün/üretici keşfeder, filtreler, favoriler ve sipariş talebi oluşturur.
- **Üretici:** Profil ve ürün yönetir; stok, sipariş ve içerik üretiminde destek alır.
- **Yönetici:** Başvuru, ürün, kategori, şikâyet ve platform sağlığını yönetir.

İlk ürün başarısı; keşiften ürün detayına geçiş, sipariş talebi tamamlama, doğrulanmış üretici sayısı ve tekrar ziyaret oranıyla ölçülür.

## Phase 1 kapsamı

Türkçe ve İngilizce ana sayfa, ürün keşfi, ürün detayı, yakındaki ürünler ve rehber sayfaları. Filtreleme ve görünüm değiştirme tarayıcıda mock veriyle çalışır. Favori düğmeleri görsel durum sunar; kalıcı değildir.

## Temel gereksinimler

- Ürünlerde üretici, kategori, fiyat, yaklaşık konum, puan, teslimat ve hazırlama/saklama bilgisi.
- Gıdada içerik, alerjen, net miktar, tarih/saklama/hazırlık alanları.
- El işlerinde malzeme, ölçü, renk, kişiselleştirme, hazırlık ve stok bilgisi.
- Açık adres veya kesin koordinat hiçbir public yüzeyde gösterilmez.
- Konum izni reddedildiğinde şehir/ilçe seçimiyle devam edilir.
- AI yalnızca doğrulanmış platform verisini kesin bilgi olarak kullanır; bilinmeyen stok/sipariş bilgisini üretmez.

## Kapsam dışı (bu faz)

Gerçek ödeme, kimlik doğrulama, sipariş yaşam döngüsü, Supabase bağlantısı, OpenAI çağrısı ve gerçek harita sağlayıcısı.

## Kabul ölçütleri

Public rotalar 390, 768 ve 1440 piksel genişliklerde yatay taşma olmadan çalışır; klavyeyle erişilebilir; TR/EN geçişinde yapı korunur; lint, tip, test ve production build geçer.
