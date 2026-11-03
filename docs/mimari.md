# Femoria — Mimari ve kararlar

## Formdaki üç tutarsızlık: verilen kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| **Veritabanı** (MySQL mi PostgreSQL mi?) | **PostgreSQL (Supabase)** | Hazır e-posta/şifre girişi, dosya depolama, canlı mesajlaşma ve satır düzeyi güvenlik prototipi hızlandırır. Taslağın da önerisi bu. |
| **Barındırma** (PHP Vercel/Netlify'da çalışmaz) | **PHP yok.** Ön yüz statik (Vercel/Netlify), sunucu mantığı PostgreSQL fonksiyonları + Supabase Edge Functions | İş kuralları (sipariş, rozet, konum gizliliği) veritabanında; yapay zeka anahtarı Edge Function'da. Ayrı bir PHP sunucusuna gerek kalmaz. |
| **Takvim** (önce backend mi önce arayüz mü?) | **Önce veri modeli + arayüz iskeleti birlikte**, sonra özellikler | Bu depo ikisini birlikte kurar; taslak 4.4'teki öncelik sırası aşağıda. |

## Genel bakış

```
Tarayıcı (HTML/CSS/Vanilla JS)
  │  supabase-js (anon anahtar + kullanıcı JWT'si)
  ▼
Supabase
  ├─ Auth ............ e-posta + şifre (onay e-postası, şifre yenileme; PKCE akışı)
  ├─ PostgREST ....... tablolar (RLS ile korunur) + RPC fonksiyonları
  ├─ Realtime ........ messages, orders, conversations
  ├─ Storage ......... product-photos (açık), avatars (açık), voice-messages (yalnız katılımcılar)
  └─ Edge Function ... ayse-abla → OpenAI (sohbet, ürün tarifi, ses→yazı)
```

## Veri modeli

| Tablo | Amaç |
|---|---|
| `profiles` | Tek hesap (alıcı + satıcı). Ayarlar, cinsiyet (hitap), yaklaşık konum, onay kayıtları. Yalnız sahibi okur. |
| `public_profiles` (görünüm) | Başkalarının görebileceği güvenli alanlar (ad, mahalle, doğrulama durumu). |
| `categories`, `locations`, `badges` | Sözlükler. `locations`: il/ilçe/mahalle + mahalle merkezi. |
| `products` | Ürünler. Konum satıcıdan devralınır ve kaydırılır. |
| `conversations`, `messages` | Ürün başına alıcı–satıcı sohbeti. Mesaj türleri: metin, hazır, ses, sipariş, sistem. |
| `orders` | Sipariş kartı: adet, fiyat, teslim, tarih, iki tarafın "Anlaştık" onayı. |
| `blocks`, `reports` | Engelleme ve tek dokunuşla şikayet. |
| `user_badges` | Komşu Rozetleri. |
| `announcements` | Kooperatif / buluşma günü duyuruları (Vitrin'de kart). |
| `search_requests` | Bulunamayan aramalar → "Mahallende Aranıyor" panosu. |
| `events`, `assistant_feedback` | Başarı ölçütleri ve Ayşe Abla geri bildirimleri. |

## Güvenlik ve gizlilik kuralları (veritabanında uygulanır)

- **Yaklaşık konum:** `profiles` ve `products` tetikleyicileri gelen koordinatı her kayıtta ~500 m (ürünlerde ek ~200 m) rastgele kaydırır. Tam konum hiç saklanmaz. Haritada nokta yerine 500 m'lik daire çizilir.
- **Akıllı mesaj kalkanı:** `message_shield_flags()` telefon, IBAN, adres ve "önce kapora at" kalıplarını işaretler. İstemci aynı kurallarla göndermeden önce yumuşak uyarı verir; mesaj engellenmez, karar kullanıcının.
- **Kadın satıcı koruması:** `only_trusted_messages` açıksa yalnız e-postası (ya da telefonu) doğrulanmış ve en az bir tamamlanmış alışverişi olan alıcılar yazabilir (`can_message()`, `start_conversation()`).
- **Gece sessizliği:** `quiet_hours_enabled` açıksa 22:00–08:00 (İstanbul) arası gelen ilk mesaja otomatik "sabah dönecek" sistem notu düşer.
- **Engelleme:** Engellenen kişi sohbet başlatamaz ve mesaj gönderemez (RLS + RPC).
- **Doğrulama alanları** (`email_verified`, `phone_verified`, `identity_verified`, `cooperative_name`) kullanıcı tarafından değiştirilemez; e-posta doğrulaması Auth'tan otomatik gelir.
- **Konum (açık rıza):** Konum yalnızca cihazdan, tarayıcı izniyle alınır. İlk seferde kısa aydınlatma + "açık rıza veriyorum" onayı istenir (`profiles.location_consent_at`). Koordinat istemcide ~100 m'ye yuvarlanır; mahalle adı için yalnız bu yuvarlanmış değer OpenStreetMap Nominatim'e gönderilir, sunucu da kaydederken ~500 m kaydırır. İzin reddedilirse nasıl açılacağı anlatılır; listeden mahalle seçimi yedektir. Ayarlar → Konum → "Konum iznimi geri al" konumu cihazdan ve hesaptan siler.
- **Listeden konum:** Türkiye'nin 81 ili, 973 ilçesi ve ~73 bin mahalle/köyü `assets/tr/` altında (kaynaklar ve lisanslar: `assets/tr/KAYNAK.md`, üretim: `scripts/build-tr-locations.mjs`). Seçilen yerin koordinatı tarayıcıda OpenStreetMap ile bulunur; bulunamazsa ilçe, o da olmazsa il merkezi kullanılır.
- **Kaldırılan ürünler:** `remove_product()` mesajlaşması olmayan ürünü hemen siler (fotoğrafları istemci Storage'dan siler); olanı `kaldirildi` yapar ve 30 gün saklar (`restore_product()` ile geri alınır). `purge-removed-photos` Edge Function'ı her gece (pg_cron + pg_net, `x-cron-secret` ile korunur) `storage_cleanup_candidates()` listesindeki dosyaları siler: 30 günü dolan fotoğraflar, hiçbir ürüne ait olmayan fotoğraflar (1 günden eski) ve sohbeti silinmiş sesli mesajlar. Kaldırılan ürün sohbetin iki tarafına görünmeye devam eder.
- **Ayşe Abla görünümü:** sabittir (başı açık); kullanıcı tarafından değiştirilemez.
- **KVKK aydınlatma metni:** Tek kaynak `js/kvkk.js` (`KVKK_VERSION`), tam metin `#/aydinlatma` sayfasında. Üye olurken onaylanan sürüm ve zaman `profiles.kvkk_version` / `kvkk_accepted_at`'e yazılır. Metni hiç onaylamamış (eski) hesaplara bir kez kapatılamayan onay ekranı çıkar; bir kez onaylayana sürüm değişse de yeniden sorulmaz (`js/consent.js`). Hesap ve tüm veriler `delete_my_account()` ile tek düğmeyle silinir.

## RPC fonksiyonları

| Fonksiyon | Ne yapar |
|---|---|
| `nearby_products(lat, lng, radius_km, category, limit)` | "En yakından uzağa" sıralı liste |
| `price_suggestion(category, title)` | Benzer ürünlerin %25–%75 fiyat aralığı |
| `start_conversation(product_id)` | Sohbet açar ya da var olanı döndürür (engel/koruma kontrolüyle) |
| `propose_order`, `agree_order`, `cancel_order`, `mark_order_delivered` | Sipariş kartı yaşam döngüsü |
| `my_earnings()` | "Kazancım" kartı ve Emek Defteri (bu ay satılan, toplam, yeni komşu) |
| `district_demand(city, district)` | "Mahallende Aranıyor": ilçede en çok aranan ama bulunamayanlar |
| `refresh_badges(user)` | Rozet kuralları (teslimde otomatik çalışır) |
| `delete_my_account()` | KVKK silme |

## Ayşe Abla

- **Persona** (`supabase/functions/_shared/persona.ts`): kısa cümle (≤ 12 kelime), "siz" hitabı, teknik kelime yok, her cevapta tek sonraki adım, hukuk/vergi/sağlıkta uzmana yönlendirme, ödeme/şifre istemez.
- **Sesli okuma isteğe bağlıdır ve varsayılan olarak kapalıdır** (taslakta "varsayılan açık" yazıyordu; kullanıcı geri bildirimiyle değiştirildi). Asistan panelindeki hoparlör düğmesinden ya da Ayarlar'dan açılır; kapalıyken her mesajın yanındaki "Dinle" düğmesiyle tek mesaj dinlenebilir. Ses, `ayse-abla` fonksiyonunun `speak` modunda OpenAI ile üretilen sabit bir kadın sesidir (`OPENAI_TTS_VOICE`, varsayılan `coral`, "ellili yaşlarda sıcak bir abla" ton tarifiyle); uzun metinler cümle sınırında parçalanıp sırayla çalınır. Sunucu sesi yoksa tarayıcı sesine düşülür (bilinen Türkçe kadın sesleri seçilir, yalnız erkek sesi varsa perde yükseltilir).
- **Ekran haritası** sistem talimatına eklenir; asistan `highlight` alanıyla ekrandaki düğmeyi parlatabilir ("burayı göster").
- **Proaktif tetikleyiciler** (`js/assistant.js`): ilk giriş, aynı ekranda 30 sn hareketsizlik, aynı düğmeye 2 sn içinde 3 dokunuş, yarım kalan ürün, ilk gelen mesaj. "Sonra" denirse o oturumda kendiliğinden çıkmaz.
- **Geri bildirim:** tek soru, tek dokunuş, haftada en fazla 2 soru; "Sonra" denirse o hafta sorulmaz. Sorular: ilk ürün sonrası, 5 dk gezinti, ilk satış, rehber okuma, 2 hafta sonra dönüş.
- **Yedek mod:** OpenAI anahtarı yoksa ya da hata olursa kurallı cevaplar ve yerel "ürün tarifi" çalışır; uygulama asla kilitlenmez.

## Taslak 4.4 önceliklerine göre durum

| Özellik | Bu prototipte | Sonraki adım |
|---|---|---|
| Sesle Vitrin | ✅ Tarayıcı ses tanıma + `describe` modu | Yöresel ağız/Karadeniz şivesi test cümleleri toplamak |
| Güven Kalkanı (yaklaşık konum, mesaj kalkanı, KVKK) | ✅ (acil durum kişisi kaldırıldı) | Kimlik doğrulama akışı (e-Devlet/NFC) |
| Emek Defteri ve rozetler | ✅ 5 rozet kuralı | Aylık "Emek Defteri" bildirimi |
| Mahallende Aranıyor panosu | ✅ Talep kaydı + Vitrin kartı | Haftalık bildirim (zamanlanmış Edge Function) |
| Mahalle Buluşma Günleri | ✅ Duyuru kartı (`announcements`) | Saha işi |
| Abla–Kardeş mentorluk | ⏳ Veri alanı (`mentor_id`) + "Yol Gösteren" rozeti | Eşleştirme ekranı (Femoria 2.0) |
| Güvenli ödeme (emanet) | ⏳ Prototipte "elden ödeme" | iyzico / PayTR entegrasyonu (Femoria 2.0) |
| Fotoğrafta arka plan temizleme | ⏳ Otomatik ışık/kontrast düzeltme var | Arka plan silme modeli |
| Anlık bildirim (push) | ⏳ Uygulama içi kırmızı nokta + Realtime | Web Push / FCM |
