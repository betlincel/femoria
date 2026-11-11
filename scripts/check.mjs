// Ön yüz denetimi (derleme adımı yok):
//   1) Tüm JS modüllerinin sözdizimi (node --check)
//   2) Modüller arası içe aktarımlar: `import { a, b } from "./x.js"` ile istenen her ad,
//      hedef dosyada gerçekten dışa aktarılıyor mu? (Eksik ad tarayıcıda sayfayı çökertir.)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".js")) files.push(p);
  }
})("js");

let failed = 0;

// 1) Sözdizimi
for (const f of files) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { failed++; console.error(`✗ ${f}\n${e.stderr}`); }
}

// 2) İçe / dışa aktarım eşleşmesi
const exportCache = new Map();
function exportsOf(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  const src = readFileSync(file, "utf8");
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  if (/^export\s+default\b/m.test(src)) names.add("default");
  exportCache.set(file, names);
  return names;
}

let importCount = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["'](\.{1,2}\/[^"']+)["']/g)) {
    const target = resolve(dirname(f), m[2]);
    if (!existsSync(target)) { failed++; console.error(`✗ ${f}: "${m[2]}" dosyası yok`); continue; }
    const available = exportsOf(target);
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (!name) continue;
      importCount++;
      if (!available.has(name)) {
        failed++;
        console.error(`✗ ${f}: "${name}" adı ${relative(".", target)} dosyasında dışa aktarılmıyor`);
      }
    }
  }
}

// 3) Kategori verisinden üretilen dosyalar (SQL, Ayşe Abla listesi, seed) güncel mi?
try { execFileSync(process.execPath, ["scripts/build-categories.mjs", "--check"], { stdio: "pipe" }); }
catch (e) { failed++; console.error(String(e.stderr || e)); }

console.log(failed ? `${failed} hata` : `✓ ${files.length} dosya temiz, ${importCount} içe aktarım eşleşiyor`);
process.exit(failed ? 1 : 0);
