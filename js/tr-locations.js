// Türkiye il / ilçe / mahalle listesi (assets/tr/, kaynaklar: assets/tr/KAYNAK.md)
// ve seçilen yerin koordinatını bulma.

let provincesPromise = null;
const hoodCache = new Map();

/** [{ k: plaka, n: il adı, lat, lng, d: [ilçeler] }] */
export function loadProvinces() {
  provincesPromise ??= fetch("assets/tr/iller.json").then((r) => {
    if (!r.ok) throw new Error("İl listesi yüklenemedi");
    return r.json();
  }).catch((e) => { provincesPromise = null; throw e; });
  return provincesPromise;
}

/** { ilçe: [mahalle / köy adları] } — yalnız seçilen il yüklenir */
export async function loadNeighbourhoods(plate) {
  if (!hoodCache.has(plate)) {
    const r = await fetch(`assets/tr/mahalle/${plate}.json`);
    if (!r.ok) throw new Error("Mahalle listesi yüklenemedi");
    hoodCache.set(plate, await r.json());
  }
  return hoodCache.get(plate);
}

/** Aramada Türkçe karakter ve büyük/küçük harf farkını yok sayar: "sisli" → "Şişli" */
export function normalizeTr(s) {
  return String(s || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
    .replace(/\s+/g, " ")
    .trim();
}

/** En yakın il merkezi (GPS'ten il adı bulunamadığında yedek) */
export async function nearestProvince(lat, lng) {
  const list = await loadProvinces().catch(() => []);
  let best = null, bestD = Infinity;
  for (const p of list) {
    const d = (p.lat - lat) ** 2 + ((p.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

async function nominatimSearch(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=tr&limit=1&accept-language=tr&q=${encodeURIComponent(q)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const [hit] = await res.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

/**
 * Listeden seçilen yerin yaklaşık koordinatı.
 * Sıra: pilot bölgenin kayıtlı mahalle merkezi → OpenStreetMap (mahalle, sonra ilçe) → il merkezi.
 * Döner: { lat, lng, precision: "mahalle" | "ilce" | "il" }
 */
export async function locateSelection({ province, district, neighborhood, knownLocations = [] }) {
  const plainHood = neighborhood ? neighborhood.replace(/\s*\(.*\)$/, "") : null;
  const known = knownLocations.find((l) =>
    normalizeTr(l.city) === normalizeTr(province.n) && normalizeTr(l.district) === normalizeTr(district) &&
    plainHood && normalizeTr(l.neighborhood) === normalizeTr(plainHood));
  if (known) return { lat: known.lat, lng: known.lng, precision: "mahalle" };

  if (plainHood) {
    const hit = await nominatimSearch(`${plainHood} Mahallesi, ${district}, ${province.n}`)
      || await nominatimSearch(`${plainHood}, ${district}, ${province.n}`);
    if (hit) return { ...hit, precision: "mahalle" };
  }
  if (district) {
    const hit = await nominatimSearch(`${district}, ${province.n}`);
    if (hit) return { ...hit, precision: "ilce" };
  }
  return { lat: province.lat, lng: province.lng, precision: "il" };
}
