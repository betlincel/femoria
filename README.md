# FEMORIA

FEMORIA; evde üretim yapan kadınların ürünlerini sergileyebileceği, alıcıların yakınlarındaki doğrulanmış üreticileri keşfedebileceği iki dilli bir pazar yeri platformudur. Bu repository şu anda Phase 0 proje temelini ve Phase 1 responsive public arayüzünü içerir.

## Teknoloji

- Next.js 16 App Router
- React 19, TypeScript strict, Tailwind CSS 4
- Zod veri doğrulama
- Vitest birim testleri ve Playwright tarayıcı testleri
- Vercel uyumlu standart Next.js production çıktısı

## Kurulum

Gereksinimler: Node.js 22 ve npm.

```bash
npm ci
```

Phase 1 mock verilerle çalıştığı için environment variable gerekmez.

## Çalıştırma

```bash
npm run dev
```

Varsayılan geliştirme adresi `http://localhost:3000`; `/` rotası Türkçe ana sayfa olan `/tr` adresine yönlenir.

## Kalite komutları

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Environment variables

Mevcut prototip herhangi bir environment variable kullanmaz. Yeni bir runtime entegrasyonu eklendiğinde gereken değişkenler, gerçek değer içermeden `.env.example` dosyasında belgelenmelidir.

## Klasör yapısı

```text
app/                  App Router sayfaları ve global stiller
  [locale]/           Türkçe ve İngilizce public rotalar
components/           Yeniden kullanılabilir arayüz bileşenleri
lib/                  Tipler, çeviriler, mock veri ve servis sınırları
docs/                 Ürün, mimari, tasarım, veri ve yol haritası
tests/                Vitest ve Playwright testleri
public/               Statik görsel ve metadata varlıkları
```

## Mevcut kapsam

- `/tr`, `/en`
- `/tr/products`, `/en/products`
- `/tr/products/[slug]`, `/en/products/[slug]`
- `/tr/nearby`, `/en/nearby`
- `/tr/guide`, `/en/guide`

Gerçek kimlik doğrulama, ödeme, Supabase, OpenAI ve harita bağlantıları sonraki fazlara bırakılmıştır.

## Vercel

Framework preset olarak **Next.js** seçilir. Root Directory repository kökü, Install Command `npm ci`, Build Command `npm run build` olmalıdır. Output Directory için override yapılmaz; Vercel standart `.next` çıktısını otomatik yönetir. Node.js sürümü `22.x` seçilmelidir.
