# Architecture

## Genel yapı

FEMORIA App Router tabanlı modüler bir monolit olarak başlar. UI, domain tipleri ve servis adaptörleri ayrıdır; böylece mock servisler ileride Supabase/OpenAI/OpenStreetMap adaptörleriyle değiştirilebilir.

```text
App Router pages
  → reusable components
  → typed service interfaces
  → mock adapters (Phase 1)
  → Supabase / OpenAI / OSM adapters (later)
```

## Sınırlar

- `app/[locale]`: rota kompozisyonu, metadata ve server component’ler.
- `components`: erişilebilir, yeniden kullanılabilir görsel ve etkileşimli parçalar.
- `lib/i18n.ts`: tüm public metinler, kategori ve teslimat etiketleri.
- `lib/types.ts`: domain modelleri ve servis sözleşmeleri.
- `lib/mock-data.ts`: yalnızca geliştirme verisi.
- `lib/services.ts`: Zod doğrulamalı mock katalog adaptörü.

## Backend hedef mimarisi

- **Supabase Auth:** alıcı, üretici ve yönetici oturumları; rol bilgisi `profiles`.
- **PostgreSQL + RLS:** ürün, başvuru, sipariş ve favoriler. Varsayılan erişim en az yetki.
- **Storage:** ürün görselleri; MIME, boyut ve sahiplik politikaları.
- **OpenAI:** yalnızca server route/service üzerinden. İstek bağlamı doğrulanmış katalog/sipariş kayıtlarıyla sınırlandırılır.
- **Harita:** public yanıtlarda yuvarlatılmış/anonimleştirilmiş konum; kesin koordinat yalnız yetkili teslimat akışında.

## i18n

URL tabanlı `/tr` ve `/en` rotaları vardır. Varsayılan `/tr`; dil değiştirici aynı path’in diğer locale karşılığını açar. Çeviri anahtarlarının iki dilde de bulunması TypeScript ile denetlenir.

## Güvenlik ve gizlilik

Server anahtarları `NEXT_PUBLIC_` öneki almaz. Public katalog yalnız onaylı ürünleri döndürür. Kesin ev adresi ve koordinat public payload’a hiç dahil edilmez. Form/API sınırları Zod ile doğrulanır; yönetim işlemleri ayrıca rol ve RLS ile korunur.

## Dağıtım

Uygulama standart Next.js App Router build’i üretir ve Vercel’in Next.js framework preset’iyle dağıtılır. Production build komutu `npm run build`, çıktı yönetimi ise Vercel tarafından otomatik olarak `.next` üzerinden yapılır.
