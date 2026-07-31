# FEMORIA çalışma rehberi

- Kapsamı küçük tut; mevcut Next.js App Router + TypeScript + Tailwind yapısını koru.
- Kullanıcı metinlerini `lib/i18n.ts` içinde hem `tr` hem `en` olarak ekle; varsayılan rota `/tr` olsun.
- Ortak UI’ı `components/`, veri tiplerini `lib/types.ts`, mock veriyi `lib/mock-data.ts` altında tut.
- Kesin adres/koordinat gösterme. API anahtarlarını yalnızca sunucu tarafında ve environment variable üzerinden kullan.
- `any` kullanma; sınır verilerini Zod ile doğrula; semantik HTML, etiket, alt metin ve görünür focus durumlarını koru.
- Yeni bağımlılık eklemeden önce gerekliliğini kontrol et. npm ve mevcut lockfile’ı kullan.
- Teslimden önce `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` çalıştır; kritik public rotaları mobil ve masaüstünde kontrol et.
