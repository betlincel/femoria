# FEMORIA

FEMORIA, kadın üreticilerle yerel ve özenli ürünleri keşfetmek isteyen alıcıları buluşturan iki dilli bir pazar yeri uygulamasıdır. Repository; responsive public arayüzün yanında Supabase Auth, PostgreSQL/RLS, profil yönetimi ve güvenli favori senkronizasyonu temelini içerir.

## Teknoloji

- Next.js 16 App Router ve React 19
- TypeScript strict ve Tailwind CSS 4
- Supabase Auth, PostgreSQL ve Row Level Security
- `@supabase/ssr` ile cookie tabanlı PKCE oturumları
- Drizzle ORM şema tanımları ve SQL migration
- Zod sınır doğrulaması
- Vitest ve Playwright

## Kurulum

Gereksinimler: Node.js 22, npm ve bir Supabase projesi.

```bash
npm ci
```

`.env.example` dosyasını `.env.local` olarak kopyalayın ve yalnızca Supabase proje panelindeki public değerleri ekleyin. Service role/secret key veya veritabanı parolası uygulamanın environment değişkenlerine eklenmemelidir.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_FAVORITES_ENABLED=false
```

Migration ve Supabase panel ayarları için [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) dosyasını izleyin.

## Çalıştırma

```bash
npm run dev
```

Varsayılan adres `http://localhost:3000`; `/` rotası `/tr` adresine yönlenir.

## Auth ve korunan rotalar

- `/tr/login`, `/en/login`
- `/tr/register`, `/en/register`
- `/auth/callback`
- `/[locale]/account` — server-side kullanıcı doğrulaması gerekir
- `/[locale]/favorites` — server-side kullanıcı doğrulaması gerekir

Email confirmation açıksa kayıt sonrası kullanıcıya doğrulama bağlantısı gösterilir; güvenlik azaltılarak otomatik oturum açılmaz.

## Favoriler ve seed durumu

Public katalog şimdilik mock ürün kullanır ve kimlikleri PostgreSQL UUID değildir. Bu nedenle database favori senkronizasyonu varsayılan olarak kapalıdır. Misafir ve mevcut mock katalog favorileri `localStorage` üzerinde çalışmaya devam eder.

Gerçek ürünler kontrollü biçimde `products` tablosuna taşınıp uygulama katalog servisi UUID kullanmaya başladığında `NEXT_PUBLIC_SUPABASE_FAVORITES_ENABLED=true` yapılabilir. Senkronizasyon yalnız geçerli UUID’leri ve RLS ile görünür olduğu doğrulanan ürünleri birleştirir; sahte foreign key oluşturmaz.

## Kalite komutları

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Migration yönetimi

PostgreSQL şeması `db/schema.ts`, uygulanabilir SQL ise `supabase/migrations` altında tutulur. İlk kurulumda migration Supabase SQL Editor üzerinden tek sefer çalıştırılır. Drizzle ve Supabase için iki ayrı remote migration geçmişi birlikte kullanılmamalıdır.

## Vercel

Framework preset **Next.js**, Node.js `22.x`, Install Command `npm ci`, Build Command `npm run build` olmalıdır. Üç public environment değişkeni Preview ve Production ortamlarına ayrı ayrı eklenmeli; Supabase Auth redirect allow listesine production callback URL’si yazılmalıdır. Output Directory override edilmez.
