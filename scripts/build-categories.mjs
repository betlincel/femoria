// Kategori verisinden (js/categories-data.js) üretir:
//   1) supabase/migrations/20261116000017_categories.sql   — categories tablosu (ana + alt kategori)
//   2) supabase/functions/_shared/categories.ts            — Ayşe Abla'nın kategori listesi
//   3) supabase/seed.sql içindeki "BEGIN/END categories" bloğu
// Kullanım:  node scripts/build-categories.mjs          (dosyaları yazar)
//            node scripts/build-categories.mjs --check  (güncel mi? değilse hata verir)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { TAXONOMY, FLAT_CATEGORIES } from "../js/categories-data.js";

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = FLAT_CATEGORIES.map((x) => `  (${q(x.slug)}, ${q(x.name)}, ${q(x.icon)}, ${x.sort}, ${x.parent ? q(x.parent) : "null"})`);
const groupRows = FLAT_CATEGORIES.filter((x) => !x.parent).map((x) => rows[FLAT_CATEGORIES.indexOf(x)]);
const childRows = FLAT_CATEGORIES.filter((x) => x.parent).map((x) => rows[FLAT_CATEGORIES.indexOf(x)]);
const upsert = "on conflict (slug) do update set name = excluded.name, icon = excluded.icon, sort = excluded.sort, parent = excluded.parent;";

const migration = `-- =====================================================================
-- Femoria — ürün kategorileri: ana kategori + alt kategori (evde yapılan ürünler)
--   OTOMATİK ÜRETİLDİ: js/categories-data.js → node scripts/build-categories.mjs
--   Elle düzenlemeyin; kategori eklemek için js/categories-data.js dosyasını değiştirip scripti çalıştırın.
--   Mevcut ürünler etkilenmez (eski kategori adları geçerli ana kategoriler olarak kalır).
--   Tekrar tekrar çalıştırılabilir.
-- =====================================================================

alter table public.categories add column if not exists parent text references public.categories (slug) on delete set null;
create index if not exists categories_parent_idx on public.categories (parent);

-- Ana kategoriler
insert into public.categories (slug, name, icon, sort, parent) values
${groupRows.join(",\n")}
${upsert}

-- Alt kategoriler
insert into public.categories (slug, name, icon, sort, parent) values
${childRows.join(",\n")}
${upsert}
`;

const all = FLAT_CATEGORIES.map((x) => x.slug);
const tsList = (xs) => `[${xs.map((s) => JSON.stringify(s)).join(", ")}]`;
const promptLines = TAXONOMY.map((g) => g.children.length
  ? `- ${g.slug} (${g.name}) — alt türler: ${g.children.map((ch) => `${ch.slug} = ${ch.name}`).join("; ")}`
  : `- ${g.slug} (${g.name}) — yukarıdakilerin hiçbirine uymayanlar`);
const ts = `// OTOMATİK ÜRETİLDİ: js/categories-data.js → node scripts/build-categories.mjs (elle düzenlemeyin)

export const CATEGORY_SLUGS = ${tsList(all)} as const;

/** Ayşe Abla'ya ürün türü seçtirirken verilen liste: ana kategori ve alt türleri */
export const CATEGORY_PROMPT_LIST = ${JSON.stringify(promptLines.join("\n"))};
`;

const seedBlock = `-- BEGIN categories (otomatik üretildi: node scripts/build-categories.mjs)
insert into public.categories (slug, name, icon, sort, parent) values
${groupRows.join(",\n")}
${upsert}
insert into public.categories (slug, name, icon, sort, parent) values
${childRows.join(",\n")}
${upsert}
-- END categories`;

const targets = [
  ["supabase/migrations/20261116000017_categories.sql", () => migration],
  ["supabase/functions/_shared/categories.ts", () => ts],
  ["supabase/seed.sql", (cur) => {
    const re = /-- BEGIN categories[\s\S]*?-- END categories/;
    if (re.test(cur)) return cur.replace(re, seedBlock);
    // ilk çalıştırma: eski kategori insert'ini bloğa çevir
    const old = /insert into public\.categories[\s\S]*?on conflict \(slug\) do update set name = excluded\.name, icon = excluded\.icon, sort = excluded\.sort;/;
    if (!old.test(cur)) throw new Error("seed.sql içinde kategori bloğu bulunamadı");
    return cur.replace(old, seedBlock);
  }],
];

const check = process.argv.includes("--check");
let stale = 0;
for (const [file, make] of targets) {
  const cur = existsSync(file) ? readFileSync(file, "utf8") : "";
  const next = make(cur);
  if (cur === next) continue;
  if (check) { stale++; console.error(`✗ ${file} güncel değil — node scripts/build-categories.mjs çalıştırın`); }
  else { writeFileSync(file, next); console.log(`yazıldı: ${file}`); }
}
if (check) process.exit(stale ? 1 : 0);
