# Supabase Setup

Bu rehber FEMORIA’nın ilk Supabase Auth ve PostgreSQL temelini kurar. Repository hiçbir service role/secret key veya database parolası gerektirmez.

## 1. Public API bilgileri

Supabase Dashboard → Project Settings/Connect alanından Project URL ve publishable key değerlerini alın. Bunları yalnız yerel `.env.local` dosyasına yazın:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_SUPABASE_FAVORITES_ENABLED=false
```

`.env.local` Git tarafından ignore edilir. `service_role`, `sb_secret_*`, JWT secret veya database connection parolası eklemeyin.

## 2. İlk migrationı SQL Editor ile uygulama

1. Supabase Dashboard → SQL Editor → New query açın.
2. `supabase/migrations/20260731123000_auth_database_foundation.sql` dosyasının tamamını kopyalayın.
3. Hedef projenin doğru olduğundan emin olun.
4. **Run** ile dosyayı tek sefer çalıştırın.
5. İşlem başarılı değilse migration transaction nedeniyle geri alınır; hatayı düzeltmeden parçaları ayrı ayrı çalıştırmayın.

Migration enum’ları, yedi tabloyu, indeksleri, `updated_at` trigger’larını, Auth profile trigger’ını, grants ve açık isimli RLS politikalarını birlikte kurar. Migration bir başlangıç migrationıdır; başarıyla uygulandıktan sonra aynı projede tekrar çalıştırmayın.

## 3. Migration sonrası kontrol

Table Editor’da şu tablolar görünmelidir:

- `profiles`
- `producer_profiles`
- `categories`
- `products`
- `product_images`
- `favorites`
- `addresses`

Her tabloda RLS enabled olmalıdır. Authentication → Users alanından test kullanıcısı oluşturulduğunda aynı UUID ile `profiles` kaydı oluşmalıdır. Producer rolüyle signup için ayrıca `producer_profiles` içinde `pending` kayıt oluşmalıdır.

## 4. Auth URL Configuration

Authentication → URL Configuration:

- Local Site URL: `http://localhost:3000`
- Local Redirect URL: `http://localhost:3000/auth/callback`
- Production Site URL: gerçek HTTPS Vercel domaini
- Production Redirect URL: `https://<vercel-domain>/auth/callback`
- Preview test edilecekse yalnız güvenilen preview callback URL’lerini allow list’e ekleyin.

Email confirmation açık kalabilir. Bu durumda signup sonrası kullanıcı e-postadaki bağlantıyı açana kadar oturum oluşmaz. Uygulama bu durumu güvenliği azaltmadan bilgi mesajıyla ele alır.

## 5. Google OAuth (isteğe bağlı)

Authentication → Providers → Google içinde provider’ı etkinleştirin ve Google Cloud OAuth bilgilerini Supabase paneline girin. Google tarafındaki authorized redirect URI, Supabase panelinin gösterdiği provider callback adresi olmalıdır. Uygulama dönüşü yine `/auth/callback` üzerinden locale-aware hedefe gider.

## 6. Favori senkronizasyonunu açma

İlk migration ürün seed’i içermez. Mevcut UI mock ürünleri `p1` gibi UUID olmayan kimlikler kullanır. Bu yüzden flag kapalı kalmalıdır:

```dotenv
NEXT_PUBLIC_SUPABASE_FAVORITES_ENABLED=false
```

Kontrollü category/product seed migrationı eklendikten, katalog servisi gerçek UUID’leri kullandıktan ve RLS ile public ürün sorguları doğrulandıktan sonra flag `true` yapılabilir. Merge kodu yine yalnız veritabanında gerçekten görünür olan UUID ürünleri kabul eder.

## 7. Vercel

Vercel Project Settings → Environment Variables alanında aşağıdakileri Preview ve Production için ekleyin:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_FAVORITES_ENABLED=false`

Node.js `22.x`, Build Command `npm run build` ve Install Command `npm ci` kullanın. Supabase URL allow listesi güncellenmeden deploy edilen OAuth/email callback akışları tamamlanmaz.

## 8. Güvenlik kontrol listesi

- Publishable key public olabilir; erişim RLS ile sınırlandırılır.
- Service role/secret key browser veya Vercel public environment’ına eklenmez.
- `profiles.role/status`, producer verification ve product moderation kolonları kullanıcı grant’lerinde yoktur.
- Adresler anon role’e açık değildir.
- Kesin koordinat tutulmaz veya public payload’a eklenmez.
- Auth gerektiren server sayfalarında kullanıcı `getUser()` ile doğrulanır.
