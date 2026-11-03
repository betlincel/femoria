// Türkiye il / ilçe / mahalle listesini assets/tr/ altına üretir.
//
// Kaynaklar (MIT lisanslı npm paketleri):
//   turkey-neighbourhoods  (Murat Gözel)  → il, ilçe ve mahalle adları
//   memleketim-tr-cities   (Memleketim)   → il merkezlerinin koordinatları
//
// Kullanım:
//   npm pack turkey-neighbourhoods memleketim-tr-cities   (ve .tgz dosyalarını açın)
//   node scripts/build-tr-locations.mjs <turkey-neighbourhoods/package> <memleketim-tr-cities/package>
//
// Çıktı:
//   assets/tr/iller.json          [{ k: plaka, n: il, lat, lng, d: [ilçeler] }]
//   assets/tr/mahalle/<plaka>.json { ilçe: [mahalle/köy adları] }  (yalnız seçilen il yüklenir)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [tnDir, memDir] = process.argv.slice(2);
if (!tnDir || !memDir) {
  console.error("Kullanım: node scripts/build-tr-locations.mjs <turkey-neighbourhoods/package> <memleketim-tr-cities/package>");
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const names = read(join(tnDir, "src/data/cityNamesByCode.json"));            // { "61": "Trabzon" }
const districts = read(join(tnDir, "src/data/districtsByCityCode.json"));    // { "61": ["Akçaabat", ...] }
const hoods = read(join(tnDir, "src/data/neighbourhoodsByDistrictAndCityCode.json")); // { "61": { "Ortahisar": [...] } }
const cities = read(join(memDir, "cities.json"));                            // [{ plate, name, coordinates }]

const collator = new Intl.Collator("tr");
const sortTr = (arr) => [...new Set(arr)].sort(collator.compare);
const capTr = (s) => (s ? s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1) : s);

/** "Hamaz Mah (yazlık Köyü)" → "Hamaz (Yazlık köyü)", "Ağıllı Mah" → "Ağıllı" */
function cleanName(raw) {
  let s = String(raw).trim().replace(/\s+/g, " ");
  const m = s.match(/^(.*?)\s*\((.*)\)$/);
  let main = m ? m[1] : s;
  let note = m ? m[2] : null;
  main = main.replace(/\s+Mah\.?$/i, "");
  if (note) note = capTr(note.replace(/\s+Köyü$/i, " köyü").replace(/\s+Beldesi$/i, " beldesi"));
  return note ? `${main} (${note})` : main;
}

const byPlate = Object.fromEntries(cities.map((c) => [c.plate, c]));
const out = [];
mkdirSync("assets/tr/mahalle", { recursive: true });
let hoodCount = 0;

for (const [code, name] of Object.entries(names)) {
  const plate = code.padStart(2, "0");
  const c = byPlate[plate];
  if (!c) throw new Error(`Koordinat bulunamadı: ${plate} ${name}`);
  out.push({ k: plate, n: name, lat: c.coordinates.lat, lng: c.coordinates.lng, d: sortTr(districts[code] || []) });

  const perDistrict = {};
  for (const [dist, list] of Object.entries(hoods[code] || {})) {
    perDistrict[dist] = sortTr(list.map(cleanName));
    hoodCount += perDistrict[dist].length;
  }
  writeFileSync(`assets/tr/mahalle/${plate}.json`, JSON.stringify(perDistrict));
}

out.sort((a, b) => collator.compare(a.n, b.n));
writeFileSync("assets/tr/iller.json", JSON.stringify(out));
console.log(`✓ ${out.length} il, ${out.reduce((n, c) => n + c.d.length, 0)} ilçe, ${hoodCount} mahalle/köy yazıldı.`);
