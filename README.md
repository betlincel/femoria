# Femoria

**Yapay zeka destekli, konum odaklı kadın üretici pazaryeri.**

> Evde üretim yapan bir kadın, hiç yardım almadan, telefonuyla 3 dakikada ilk ürününü satışa çıkarabilmeli.

Bu depo, *Femoria — Proje ve Ürün Taslağı* belgesinin (TÜBİTAK 2209-B) çalışan prototipidir:
mobil öncelikli web uygulaması + Supabase altyapısı + "Ayşe Abla" yapay zeka asistanı.

## İçindekiler

| Taslak bölümü | Nerede |
|---|---|
| 1.1 Tasarım ilkeleri (56 px düğme, 18 px yazı, ikon+yazı, tek sütun) | `css/styles.css` |
| 1.2 Ana ekranlar: Vitrin, Sat, Yakınımda, Mesajlar, Profil | `js/views/*.js` |
| 1.3 İlk ürünü 3 adımda satışa çıkarma | `js/views/sat.js` |
| 1.4 Sohbet: hazır mesajlar, sesli mesaj, sipariş kartı, IBAN kalkanı, gece sessizliği, şikayet/engelle | `js/views/sohbet.js`, `supabase/migrations/…_functions.sql` |
| 1.5 Ölçülecek olaylar | `events` tablosu, `track()` çağrıları |
| 2 Rehber kitapçığı | `js/views/rehber.js` |
| 3 Ayşe Abla (persona, proaktif yardım, geri bildirim) | `js/assistant.js`, `supabase/functions/ayse-abla/` |
| 4 Yaratıcı dokunuşlar (Sesle Vitrin, rozetler, Mahallende Aranıyor, Güven Kalkanı, KVKK) | dağınık — bkz. [docs/mimari.md](docs/mimari.md) |

## Teknoloji

- **Ön yüz:** HTML5, CSS3, Vanilla JavaScript (ES modülleri) — derleme adımı yok.
- **Arka uç:** [Supabase](https://supabase.com) — PostgreSQL, e-posta + şifreyle giriş, dosya depolama, canlı mesajlaşma (Realtime), Edge Functions.
- **Yapay zeka:** OpenAI API (sohbet + konuşmayı yazıya çevirme), anahtar yalnızca Edge Function'da durur.
- **Harita:** OpenStreetMap + Leaflet (ücretsiz, anahtarsız).
- **Ses:** Tarayıcının kendi konuşma tanıma (tr-TR) ve sesli okuma özellikleri.

Formdaki üç tutarsızlığın nasıl çözüldüğü [docs/mimari.md](docs/mimari.md) içinde.

## Proje yapısı

```
index.html                  Uygulama kabuğu (üst çubuk, 4 sekmeli alt menü, Ayşe Abla balonu)
css/styles.css              Tasarım sistemi
js/
  config.js                 ← Supabase adresi ve anon anahtarı buraya
  supabase.js               İstemci
  store.js                  Oturum, profil, konum, ayarlar
  api.js                    Tüm veri çağrıları
  router.js, app.js         Yönlendirme ve başlatma
  assistant.js              Ayşe Abla
  components.js             Ürün kartı, kategori kutucukları, konum seçici
  views/                    Ekranlar
supabase/
  config.toml               Yerel geliştirme ayarları
  migrations/               Şema, fonksiyonlar, RLS, depolama
  seed.sql                  Kategoriler, rozetler, Trabzon pilot mahalleleri
  functions/ayse-abla/      Yapay zeka Edge Function'ı
```

## Kurulum

### 1. Supabase projesini oluşturun

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje açın (bölge: Frankfurt `eu-central-1`, Türkiye'ye en yakın).
2. [Supabase CLI](https://supabase.com/docs/guides/cli)'yi kurun ve projeye bağlanın:

```bash
supabase login
```

```bash
supabase link --project-ref <PROJE-REF>
```

3. Veritabanını kurun (tablolar, RLS kuralları, depolama kovaları):

```bash
supabase db push
```

4. Başlangıç verilerini yükleyin: Dashboard → SQL Editor'de `supabase/seed.sql` içeriğini çalıştırın.

### 2. E-posta + şifre ile girişi ayarlayın

Dashboard → **Authentication → Sign In / Providers → Email**:

- **Email** sağlayıcısı açık olsun (varsayılan olarak açıktır).
- **Confirm email** açık olsun. Kullanıcı e-postasındaki bağlantıya tıklayınca hesabı açılır ve "e-postası doğrulanmış" sayılır (güvenilir alıcı ve "Doğrulanmış Komşu" rozeti bunu kullanır).
- **Minimum password length**: `8` (uygulama da 8 karakter ister).
- **Phone** sağlayıcısına artık gerek yok; kapalı kalabilir.

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: sitenin adresi (yerelde `http://localhost:5173`, yayında Vercel/Netlify adresiniz).
- **Redirect URLs**: aynı adresleri ekleyin. Onay ve "şifremi unuttum" bağlantıları buraya döner; listede olmayan adrese yönlendirme yapılmaz.

**E-posta gönderimi:** Supabase'in hazır e-posta servisi yalnızca deneme içindir ve saatte birkaç e-postayla sınırlıdır. Yayına çıkmadan önce **Authentication → Emails → SMTP Settings** bölümüne kendi SMTP sağlayıcınızı (ör. Resend, Brevo, Amazon SES) girin. Aynı sayfadaki şablonlardan onay ve şifre yenileme e-postalarını Türkçeleştirebilirsiniz.

### 3. Ayşe Abla'yı (yapay zeka) yayınlayın

```bash
supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-4o-mini
```

```bash
supabase functions deploy ayse-abla
```

Anahtar tanımlı değilse uygulama çalışmaya devam eder: Ayşe Abla kurallı cevaplara, "Sesle Vitrin" de basit anahtar kelime eşleştirmeye geçer.

### 4. Ön yüzü bağlayın

`js/config.js` dosyasına Dashboard → **Project Settings → API** sayfasındaki değerleri yazın:

```js
export const SUPABASE_URL = "https://<PROJE-REF>.supabase.co";
export const SUPABASE_ANON_KEY = "<anon public key>";
```

> `anon` anahtarı tarayıcı için tasarlanmıştır; veriyi RLS kuralları korur. `service_role` anahtarını asla ön yüze koymayın.

Dashboard → **Authentication → URL Configuration** altında **Site URL**'yi yayın adresinize ayarlayın.

### 5. Çalıştırın

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` açılır. Telefonda denemek için kamera ve mikrofon HTTPS ister; yayın ortamında (Vercel/Netlify) bu kendiliğinden sağlanır.

### Yerel Supabase ile (isteğe bağlı, Docker gerekir)

```bash
npm run db:start
```

Çıktıdaki `API URL` ve `anon key` değerlerini `js/config.js`'e yazın. Yerelde gönderilen onay ve şifre yenileme e-postaları gerçek adrese gitmez; `http://127.0.0.1:54324` adresindeki test gelen kutusunda (Inbucket) görünür. Yapay zekayı yerelde denemek için `supabase/.env.example` dosyasını `supabase/.env` olarak kopyalayıp `npm run functions:serve` çalıştırın.

## Yayınlama

Ön yüz tamamen statik dosyalardan oluşur; PHP sunucusu gerekmez. Depoyu **Vercel**, **Netlify**, **Cloudflare Pages** veya **GitHub Pages**'e bağlamanız yeterli (derleme komutu yok, çıktı klasörü: kök dizin).

## Başarı ölçütleri nasıl izlenir?

Tüm olaylar `public.events` tablosuna düşer. Örnek sorgular (SQL Editor):

```sql
-- Ürün yüklemeye başlayıp bitirenlerin oranı ve ortalama süre
select
  count(*) filter (where name = 'listing_published')::float
    / nullif(count(*) filter (where name = 'listing_started'), 0) as tamamlama_orani,
  avg((props->>'seconds')::int) filter (where name = 'listing_published') as ort_saniye,
  avg(((props->>'seconds')::int < 300)::int) filter (where name = 'listing_published') as bes_dk_alti_orani
from events where created_at > now() - interval '30 days';

-- Asistanla en az bir kez konuşan / rehberi açan kullanıcı oranı (hedef ≥ %50)
select
  count(distinct session_id) filter (where name = 'assistant_message')::float / count(distinct session_id) as asistan,
  count(distinct session_id) filter (where name = 'guide_opened')::float / count(distinct session_id) as rehber
from events where created_at > now() - interval '30 days';

-- İlk mesajdan "Anlaştık"a geçen sohbet oranı
select count(distinct o.conversation_id)::float / nullif((select count(*) from conversations), 0)
from orders o where o.status in ('anlasildi', 'teslim_edildi');
```

## Lisans

Henüz belirlenmedi.
