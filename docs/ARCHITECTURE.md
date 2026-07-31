# Architecture

## Genel yapı

FEMORIA Next.js 16 App Router tabanlı modüler bir monolittir.

```text
App Router server/client components
  → Zod doğrulamalı form ve domain sınırları
  → Supabase SSR browser/server clients
  → Supabase Auth + PostgreSQL Data API
  → PostgreSQL grants + RLS
```

## Uygulama sınırları

- `app/[locale]`: TR/EN rota kompozisyonu, metadata, server-side route protection ve Server Actions.
- `app/auth/callback`: OAuth/email confirmation PKCE code exchange.
- `components`: erişilebilir ve yeniden kullanılabilir görsel/etkileşimli parçalar.
- `lib/i18n.ts`: tüm kullanıcı metinlerinin TR/EN karşılıkları.
- `lib/auth.ts`: signup, profil ve güvenli redirect Zod sınırları.
- `lib/supabase`: browser client, request-scoped server client, route guard ve session refresh.
- `lib/mock-data.ts`: seed tamamlanana kadar public katalog verisi.
- `db/schema.ts`: PostgreSQL için Drizzle şema karşılığı.
- `supabase/migrations`: trigger, grant, RLS ve uygulanabilir SQL’in kaynak doğrusu.

## Auth mimarisi

`@supabase/ssr` browser ve server client’ları aynı cookie tabanlı PKCE oturumunu kullanır. Next.js 16 root `proxy.ts`, uygun isteklerde token doğrulama/yenileme işlemini yapar. Supabase client sunucuda global tutulmaz; her istek için yeniden oluşturulur.

Account ve favorites rotaları render öncesi `supabase.auth.getUser()` ile kullanıcıyı doğrular. Güvenli olmayan `getSession()` verisi authorization kararı için kullanılmaz. Login sonrası `next` yalnız uygulama içindeki `/tr` veya `/en` rotalarına yönlenebilir.

Signup rolü UI ve Zod katmanında `buyer|producer` ile sınırlıdır. Database trigger aynı allowlist’i tekrar uygular; `admin` metadata ile oluşturulamaz. Kullanıcıların `profiles.role`, `profiles.status`, `producer_profiles.verification_status` veya `products.status` alanlarını değiştirebilmesi kolon grant’leriyle engellenir.

## Veri ve RLS

Tüm uygulama tablolarında RLS açıktır. Public katalog yalnız aktif kategorileri, onaylı üreticileri ve onaylı ürünleri görür. Sahiplik politikaları `(select auth.uid())` üzerinden uygulanır. Hassas adres satırları sadece kayıt sahibine açıktır; anonim adres politikası yoktur.

Service role veya secret key uygulamada kullanılmaz. Uygulama Supabase publishable key ile çalışır ve authorization PostgreSQL RLS tarafından uygulanır.

## Favoriler

Misafir favorileri local storage’da tutulur. Oturum açıldıktan sonra feature flag açıksa remote favoriler okunur, local UUID’ler `products` tablosunda görünürlük açısından doğrulanır ve yalnız doğrulanan kimlikler upsert edilir. Mock `p1` benzeri kimlikler veritabanına gönderilmez.

## Gizlilik

Public payload’larda açık ev adresi veya kesin koordinat bulunmaz. `addresses` hassas teslimat verisidir ve yalnız sahibine açıktır. Üretici için yalnız yaklaşık bölge metni tutulabilir.

## Dağıtım

Uygulama standart Next.js production çıktısı üretir. Supabase URL ve publishable key Preview/Production ortamlarında tanımlanır. Auth callback URL’leri Supabase allow listesiyle birebir eşleşmelidir.
