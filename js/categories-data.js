// Ürün kategorileri — TEK KAYNAK. Evde yapılan / el emeği ürünler: ana kategori (grup) + alt kategori.
// Buradan üretilenler (scripts/build-categories.mjs): veritabanı migration'ı, seed.sql bloğu,
// Ayşe Abla'nın kategori listesi (supabase/functions/_shared/categories.ts).
// Değiştirince: `node scripts/build-categories.mjs` çalıştırın (check.mjs güncel olup olmadığını denetler).
//
// words: yapay zeka kapalıyken "sesle anlat → tür bul" için anahtar kelimeler (küçük harf, Türkçe).
// Bir ürün hem ana kategoriye (alt tür seçilmemişse) hem alt kategoriye bağlanabilir.

const c = (slug, name, words = []) => ({ slug, name, words });

export const TAXONOMY = [
  { slug: "yemek", name: "Yemek", words: ["yemek", "ev yapımı", "katkısız"], children: [
    c("recel", "Reçel & Marmelat", ["reçel", "marmelat", "jam"]),
    c("pekmez-bal", "Pekmez, Bal & Tahin", ["pekmez", "bal", "tahin", "petimezi"]),
    c("salca-sos", "Salça & Sos", ["salça", "sos", "ketçap", "acı sos"]),
    c("tursu", "Turşu & Zeytin", ["turşu", "zeytin", "kornişon"]),
    c("hamur-isi", "Mantı, Erişte & Tarhana", ["mantı", "erişte", "tarhana", "makarna"]),
    c("borek", "Börek, Gözleme & Poğaça", ["börek", "yufka", "gözleme", "poğaça", "açma", "pide"]),
    c("kek-kurabiye", "Kek, Kurabiye & Pasta", ["kek", "kurabiye", "pasta", "bisküvi", "çörek"]),
    c("tatli", "Tatlı & Baklava", ["baklava", "tatlı", "helva", "lokum", "sütlaç", "revani", "kadayıf"]),
    c("hazir-yemek", "Hazır Yemek & Sarma", ["sarma", "dolma", "çorba", "köfte", "yaprak"]),
    c("sut-urunleri", "Peynir & Süt Ürünleri", ["peynir", "yoğurt", "tereyağ", "kaymak", "süt", "lor", "kefir"]),
    c("icecek", "İçecek & Şerbet", ["şerbet", "limonata", "komposto", "içecek", "şalgam", "boza"]),
  ] },
  { slug: "orgu", name: "Örgü", words: ["örgü", "tığ", "yün", "şiş"], children: [
    c("orgu-bebek", "Bebek Örgüleri", ["patik", "patiğ", "tulum", "bebek takımı"]),
    c("orgu-giyim", "Atkı, Bere & Eldiven", ["atkı", "bere", "eldiven", "kaşkol", "boyunluk", "çorap"]),
    c("orgu-hirka", "Hırka, Kazak & Yelek", ["hırka", "kazak", "yelek", "süveter", "panço"]),
    c("orgu-canta", "Örgü Çanta & File", ["örgü çanta", "tığ çanta", "file çanta", "örgü sepet"]),
    c("amigurumi", "Amigurumi & Örgü Oyuncak", ["amigurumi", "örgü oyuncak", "tığ oyuncak"]),
    c("orgu-ortu", "Battaniye & Örgü Örtü", ["battaniye", "pike", "örgü örtü", "koltuk şalı"]),
  ] },
  { slug: "taki", name: "Takı", words: ["takı", "boncuk", "doğal taş", "aksesuar", "telkari"], children: [
    c("kolye", "Kolye & Gerdanlık", ["kolye", "gerdanlık", "zincir"]),
    c("bileklik", "Bileklik & Bilezik", ["bileklik", "bilezik", "halhal"]),
    c("kupe", "Küpe", ["küpe"]),
    c("yuzuk", "Yüzük", ["yüzük"]),
    c("tesbih", "Tesbih", ["tesbih", "tespih"]),
    c("sac-aksesuari", "Saç Aksesuarı & Broş", ["toka", "taç", "saç bandı", "broş", "bandana"]),
  ] },
  { slug: "ev-susu", name: "Ev süsü", words: ["süs", "dekor", "ev süsü", "dekoratif"], children: [
    c("dantel-ortu", "Dantel & Masa Örtüsü", ["dantel", "masa örtüsü", "örtü", "runner", "servis altlığı", "amerikan servis"]),
    c("seramik", "Seramik & Vazo", ["seramik", "vazo", "çömlek", "fincan", "tabak", "kupa"]),
    c("mum", "Mum & Kokulu Ürünler", ["mum", "kokulu taş", "tütsü", "oda spreyi"]),
    c("duvar-susu", "Tablo & Duvar Süsü", ["tablo", "pano", "duvar süsü", "makrome", "çerçeve"]),
    c("sepet-hasir", "Sepet & Hasır", ["hasır", "sepet", "bambu", "sele"]),
    c("kuru-cicek", "Kuru Çiçek & Çelenk", ["kuru çiçek", "çelenk", "buket", "aranjman", "yapay çiçek"]),
    c("ceyiz-tekstil", "Çeyiz & Ev Tekstili", ["çeyiz", "yastık", "kırlent", "perde", "yorgan", "çarşaf", "nevresim"]),
  ] },
  { slug: "kurutmalik", name: "Kurutmalık", words: ["kuru", "kurutulmuş", "kurutmalık"], children: [
    c("kuru-sebze", "Kuru Sebze (Biber, Patlıcan)", ["kuru biber", "kuru patlıcan", "kuru domates", "kurutulmuş sebze", "dolmalık"]),
    c("kuru-meyve", "Kuru Meyve & Pestil", ["pestil", "kuru kayısı", "kuru incir", "kuru üzüm", "kuru elma", "köme", "kayısı", "incir", "dut"]),
    c("baharat-cay", "Baharat & Bitki Çayı", ["baharat", "nane", "kekik", "pul biber", "isot", "kuşburnu", "çay", "adaçayı", "ıhlamur", "kimyon", "karabiber"]),
    c("tahil-bakliyat", "Bulgur, Un & Bakliyat", ["bulgur", "un", "mercimek", "nohut", "fasulye", "pirinç", "kavut", "irmik"]),
    c("kuruyemis", "Kuruyemiş & Cevizli Sucuk", ["ceviz", "fındık", "badem", "kuruyemiş", "fıstık", "cevizli sucuk"]),
  ] },
  { slug: "giyim", name: "Giyim", words: ["giyim", "tekstil", "dikiş", "kumaş"], children: [
    c("el-giyim", "Elbise, Gömlek & Önlük", ["elbise", "gömlek", "önlük", "etek", "pantolon", "tunik", "entari", "şalvar"]),
    c("sal-esarp", "Şal, Eşarp & Yazma", ["şal", "eşarp", "yazma", "oya", "tülbent", "başörtüsü", "fular"]),
    c("nakis", "Nakış & İşleme", ["nakış", "işleme", "etamin", "kasnak", "kanaviçe"]),
    c("kece-dokuma", "Keçe & El Dokuma", ["keçe", "dokuma", "kilim", "el dokuma", "peştemal", "havlu"]),
    c("canta-cuzdan", "Çanta, Cüzdan & Kılıf", ["çanta", "cüzdan", "kılıf", "kese", "bez çanta", "kumaş çanta", "patchwork", "kartlık"]),
  ] },
  { slug: "bebek", name: "Bebek & Çocuk", words: ["çocuk", "bebek seti"], children: [
    c("bebek-aksesuar", "Bebek Aksesuarı & Lohusa", ["lohusa", "kundak", "bebek bandı", "emzik zinciri", "hastane çıkışı"]),
    c("bez-oyuncak", "Bez & Ahşap Oyuncak", ["oyuncak", "bez bebek", "ahşap oyuncak", "kukla", "oyun halısı"]),
    c("cocuk-giyim", "Çocuk Giyim", ["çocuk elbise", "çocuk giyim", "bebek elbise", "pijama"]),
  ] },
  { slug: "bakim", name: "Doğal Bakım", words: ["doğal", "bakım", "bitkisel", "kozmetik"], children: [
    c("sabun", "Doğal Sabun", ["sabun", "defne sabunu", "katı sabun"]),
    c("krem-merhem", "Krem, Merhem & Balsam", ["krem", "merhem", "balsam", "dudak", "losyon"]),
    c("kolonya-yag", "Kolonya & Bitkisel Yağ", ["kolonya", "lavanta yağı", "badem yağı", "aromaterapi", "esans", "gül suyu", "gülsuyu"]),
    c("banyo-lifi", "Banyo Lifi & Kese", ["banyo lifi", "lif", "banyo", "keseli"]),
  ] },
  { slug: "hediyelik", name: "Hediyelik", words: ["hediyelik", "hediye", "özel gün"], children: [
    c("kisiye-ozel", "Kişiye Özel & İsimli", ["isimli", "kişiye özel", "baskılı", "kişiselleştirilmiş"]),
    c("hediye-seti", "Hediye Seti & Sepeti", ["hediye seti", "hediye sepeti", "hediye kutusu", "kutu"]),
    c("dugun-nisan", "Nişan, Düğün & Kına", ["nişan", "düğün", "kına", "nikah", "gelin", "söz"]),
    c("ozel-gun", "Doğum, Bayram & Özel Gün", ["doğum günü", "bayram", "anneler günü", "yılbaşı", "mevlüt", "sevgililer günü"]),
    c("magnet-hatira", "Magnet, Anahtarlık & Hatıra", ["magnet", "anahtarlık", "hatıra", "biblo", "kitap ayracı"]),
  ] },
  { slug: "bahce", name: "Bahçe", words: ["bahçe", "organik", "köy"], children: [
    c("fide-tohum", "Fide, Fidan & Tohum", ["fide", "tohum", "fidan", "sebze fidesi"]),
    c("saksi-cicek", "Saksı & Çiçek", ["saksı", "çiçek", "sukulent", "kaktüs", "orkide", "bitki"]),
    c("taze-urun", "Taze Sebze, Meyve & Yumurta", ["taze", "yumurta", "köy yumurtası", "sebze", "meyve", "domates", "salatalık"]),
  ] },
  { slug: "diger", name: "Diğer", words: [], children: [] },
];

/** Düz liste: { slug, name, parent, sort, words } — ana kategoriler önce, alt kategoriler arkasından. */
export const FLAT_CATEGORIES = TAXONOMY.flatMap((g, gi) => [
  { slug: g.slug, name: g.name, parent: null, sort: (gi + 1) * 100, icon: `cat-${g.slug}`, words: g.words },
  ...g.children.map((ch, ci) => ({ slug: ch.slug, name: ch.name, parent: g.slug, sort: (gi + 1) * 100 + ci + 1, icon: `cat-${g.slug}`, words: ch.words })),
]);

const GROUP_OF = new Map(FLAT_CATEGORIES.map((x) => [x.slug, x.parent || x.slug]));
/** Bir kategorinin ana kategorisi (kendisi ana kategoriyse kendisi). Bilinmeyen: "diger". */
export const groupSlugOf = (slug) => GROUP_OF.get(slug) || "diger";

/** Türkçe küçük harfe çevirip kelimelere ayırır. */
const tokens = (text) => String(text || "").toLocaleLowerCase("tr-TR").split(/[^a-zçğıöşüâîû0-9]+/i).filter(Boolean);

// Kelime eşleşmesi: "reçelim", "reçeller" → "reçel". Ek en çok 4 harf; çok kısa anahtarlar (bal, un, kek)
// çok kısa ek alır ("balık", "zeytinyağlı" yanlış eşleşmesin).
function wordMatches(token, kw) {
  if (token === kw) return true;
  const extra = kw.length >= 5 ? 4 : kw.length === 4 ? 3 : kw.length === 3 ? 1 : 2;
  return token.startsWith(kw) && token.length - kw.length <= extra;
}

/** Yapay zeka yokken: metinden en uygun kategoriyi bulur. Alt kategori anahtarı, ana kategori anahtarından
 *  önce gelir; aynı katmanda en uzun (en özel) anahtar kazanır. */
export function matchCategory(text) {
  const low = String(text || "").toLocaleLowerCase("tr-TR");
  const toks = tokens(low);
  let best = null, bestScore = 0;
  for (const cat of FLAT_CATEGORIES) {
    for (const kw of cat.words) {
      const hit = kw.includes(" ") ? low.includes(kw) : toks.some((t) => wordMatches(t, kw));
      if (!hit) continue;
      const score = (cat.parent ? 1000 : 0) + kw.length;
      if (score > bestScore) { best = cat.slug; bestScore = score; }
    }
  }
  return best || "diger";
}
