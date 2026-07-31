import type { Product } from "./types";

export const products: Product[] = [
  {
    id: "p1",
    slug: "ev-yapimi-kayseri-mantisi",
    world: "kitchen",
    category: "homemade",
    title: { tr: "Ev Yapımı Kayseri Mantısı", en: "Homemade Kayseri Manti" },
    description: {
      tr: "İncecik açılmış hamur, özenle hazırlanmış kıymalı iç ve geleneksel Kayseri lezzeti. Siparişiniz teslimat gününde taze hazırlanır.",
      en: "Paper-thin dough, carefully seasoned filling, and the traditional taste of Kayseri. Freshly prepared on your delivery day.",
    },
    producer: "Nermin’in Mutfağı",
    producerStory: {
      tr: "Üç kuşaktır aile tariflerini Ankara’da sofralarla buluşturuyor.",
      en: "Sharing three generations of family recipes with Ankara tables.",
    },
    price: 320, currency: "TRY", city: "Ankara", district: "Çankaya",
    distanceKm: 2.4, rating: 4.9, reviews: 86,
    delivery: ["courier", "pickup"], preparation: { tr: "2 günde hazırlanır", en: "Ready in 2 days" },
    portion: { tr: "1 kg · 6–8 porsiyon", en: "1 kg · 6–8 servings" },
    deliveryDetails: {
      pickup: {
        area: { tr: "Çankaya merkez çevresi", en: "Central Çankaya area" },
        readyAt: { tr: "18.00 sonrası", en: "After 6 PM" },
        window: { tr: "18.00–20.30", en: "6–8:30 PM" },
      },
      courier: {
        districts: { tr: "Çankaya, Yenimahalle", en: "Çankaya, Yenimahalle" },
        estimate: { tr: "45–70 dakika", en: "45–70 minutes" },
        fee: { tr: "45 ₺", en: "45 TRY" },
      },
    },
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=85",
    producerImage: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=300&q=80",
    details: [
      { label: { tr: "İçindekiler", en: "Ingredients" }, value: { tr: "Un, yumurta, dana kıyma, soğan, baharat", en: "Flour, egg, beef, onion, spices" } },
      { label: { tr: "Alerjenler", en: "Allergens" }, value: { tr: "Gluten, yumurta", en: "Gluten, egg" } },
      { label: { tr: "Net miktar", en: "Net amount" }, value: { tr: "1 kg", en: "1 kg" } },
      { label: { tr: "Saklama", en: "Storage" }, value: { tr: "-18°C’de 3 ay", en: "3 months at -18°C" } },
    ],
  },
  {
    id: "p2", slug: "dondurulmus-su-boregi", world: "kitchen", category: "frozen",
    title: { tr: "Dondurulmuş Su Böreği", en: "Frozen Su Böreği" },
    description: { tr: "El açması yufka ve Erzincan tulum peyniriyle, fırına girmeye hazır altı porsiyonluk su böreği.", en: "Hand-rolled pastry with Erzincan tulum cheese, ready for the oven in six portions." },
    producer: "Ayşe Hanım’ın Fırını", producerStory: { tr: "Mahalle fırınından evinize gelen geleneksel hamur işleri.", en: "Traditional pastries from a neighborhood kitchen to your home." },
    price: 285, currency: "TRY", city: "İstanbul", district: "Kadıköy", distanceKm: 3.1, rating: 4.8, reviews: 64,
    delivery: ["courier", "pickup"], preparation: { tr: "Dondurulmuş", en: "Frozen" },
    portion: { tr: "900 g · 6 porsiyon", en: "900 g · 6 servings" },
    deliveryDetails: {
      pickup: {
        area: { tr: "Kadıköy merkez çevresi", en: "Central Kadıköy area" },
        readyAt: { tr: "Aynı gün hazır", en: "Ready the same day" },
        window: { tr: "12.00–19.00", en: "12–7 PM" },
      },
      courier: {
        districts: { tr: "Kadıköy, Üsküdar", en: "Kadıköy, Üsküdar" },
        estimate: { tr: "60–90 dakika", en: "60–90 minutes" },
        fee: { tr: "55 ₺", en: "55 TRY" },
      },
    },
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=85",
    producerImage: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=300&q=80",
    details: [
      { label: { tr: "İçindekiler", en: "Ingredients" }, value: { tr: "Un, yumurta, tereyağı, peynir", en: "Flour, egg, butter, cheese" } },
      { label: { tr: "Alerjenler", en: "Allergens" }, value: { tr: "Gluten, yumurta, süt", en: "Gluten, egg, dairy" } },
      { label: { tr: "Net miktar", en: "Net amount" }, value: { tr: "900 g", en: "900 g" } },
      { label: { tr: "Saklama", en: "Storage" }, value: { tr: "-18°C’de 2 ay", en: "2 months at -18°C" } },
    ],
  },
  {
    id: "p3", slug: "kurutulmus-eriste", world: "kitchen", category: "dried",
    title: { tr: "Köy Yumurtalı Erişte", en: "Village Egg Noodles" },
    description: { tr: "Köy yumurtası ve taş değirmen unuyla kesilip doğal yöntemlerle kurutulan ev eriştesi.", en: "Homemade noodles cut with village eggs and stone-ground flour, then naturally dried." },
    producer: "Emine’nin Kileri", producerStory: { tr: "Mevsiminde üretir, geleneksel yöntemlerle uzun ömürlü lezzetlere dönüştürür.", en: "Produces in season and preserves flavor with traditional methods." },
    price: 145, currency: "TRY", city: "İzmir", district: "Urla", distanceKm: 6.7, rating: 4.9, reviews: 42,
    delivery: ["shipping"], preparation: { tr: "Doğal kurutulmuş", en: "Naturally dried" },
    portion: { tr: "500 g · 5 porsiyon", en: "500 g · 5 servings" },
    deliveryDetails: {
      shipping: { estimate: { tr: "2–4 iş günü", en: "2–4 business days" } },
    },
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=85",
    producerImage: "https://images.unsplash.com/photo-1556911073-52527ac43761?auto=format&fit=crop&w=300&q=80",
    details: [
      { label: { tr: "İçindekiler", en: "Ingredients" }, value: { tr: "Buğday unu, köy yumurtası, süt, tuz", en: "Wheat flour, free-range egg, milk, salt" } },
      { label: { tr: "Alerjenler", en: "Allergens" }, value: { tr: "Gluten, yumurta, süt", en: "Gluten, egg, dairy" } },
      { label: { tr: "Net miktar", en: "Net amount" }, value: { tr: "500 g", en: "500 g" } },
      { label: { tr: "Saklama", en: "Storage" }, value: { tr: "Serin ve kuru yerde 6 ay", en: "6 months in a cool, dry place" } },
    ],
  },
  {
    id: "p4", slug: "gumus-renkli-kolye", world: "workshop", category: "jewelry",
    title: { tr: "Gümüş Renkli İnci Kolye", en: "Silver-Tone Pearl Necklace" },
    description: { tr: "Doğal inci dokusundan ilham alan, ayarlanabilir zincirli ve elde şekillendirilmiş zarif kolye.", en: "An elegant hand-shaped necklace with an adjustable chain, inspired by natural pearl textures." },
    producer: "Lale Atölye", producerStory: { tr: "Küçük detaylardan ilham alan, zamansız takıları elde üretiyor.", en: "Handcrafts timeless jewelry inspired by small details." },
    price: 480, currency: "TRY", city: "İstanbul", district: "Beşiktaş", distanceKm: 4.8, rating: 4.7, reviews: 31,
    delivery: ["shipping", "pickup"], preparation: { tr: "3 günde hazırlanır", en: "Ready in 3 days" },
    material: { tr: "Gümüş kaplama · İnci", en: "Silver plated · Pearl" },
    customizable: true,
    deliveryDetails: {
      pickup: {
        area: { tr: "Beşiktaş çarşı çevresi", en: "Beşiktaş market area" },
        readyAt: { tr: "3 gün içinde", en: "Within 3 days" },
        window: { tr: "14.00–18.00", en: "2–6 PM" },
      },
      shipping: { estimate: { tr: "2–3 iş günü", en: "2–3 business days" } },
    },
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=85",
    producerImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    details: [
      { label: { tr: "Malzeme", en: "Material" }, value: { tr: "Pirinç üzeri gümüş kaplama, kültür incisi", en: "Silver-plated brass, cultured pearl" } },
      { label: { tr: "Ölçü", en: "Size" }, value: { tr: "42 + 5 cm", en: "42 + 5 cm" } },
      { label: { tr: "Renk", en: "Color" }, value: { tr: "Gümüş, inci beyazı", en: "Silver, pearl white" } },
      { label: { tr: "Kişiselleştirme", en: "Customization" }, value: { tr: "Harf eklenebilir", en: "Initial can be added" } },
    ],
  },
  {
    id: "p5", slug: "orgu-omuz-cantasi", world: "workshop", category: "bags",
    title: { tr: "Örgü Omuz Çantası", en: "Crochet Shoulder Bag" },
    description: { tr: "Pamuk kordonla elde örülmüş, astarlı ve iç cepli günlük omuz çantası.", en: "A lined everyday shoulder bag with an inner pocket, hand-crocheted from cotton cord." },
    producer: "Sibel’in İlmekleri", producerStory: { tr: "Her ilmeği yavaş üretim ilkesiyle, sağlam ve özenli biçimde örüyor.", en: "Crochets every stitch slowly, sturdily, and with care." },
    price: 690, currency: "TRY", city: "Bursa", district: "Nilüfer", distanceKm: 5.2, rating: 4.9, reviews: 27,
    delivery: ["shipping", "courier"], preparation: { tr: "Sipariş üzerine", en: "Made to order" },
    material: { tr: "Pamuk kordon · Pamuk astar", en: "Cotton cord · Cotton lining" },
    customizable: true,
    deliveryDetails: {
      courier: {
        districts: { tr: "Nilüfer, Osmangazi", en: "Nilüfer, Osmangazi" },
        estimate: { tr: "Sipariş sonrası planlanır", en: "Scheduled after ordering" },
        fee: { tr: "60 ₺", en: "60 TRY" },
      },
      shipping: { estimate: { tr: "3–5 iş günü", en: "3–5 business days" } },
    },
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=85",
    producerImage: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=300&q=80",
    details: [
      { label: { tr: "Malzeme", en: "Material" }, value: { tr: "Pamuk kordon, pamuk astar", en: "Cotton cord, cotton lining" } },
      { label: { tr: "Ölçü", en: "Size" }, value: { tr: "28 × 22 cm", en: "28 × 22 cm" } },
      { label: { tr: "Renk", en: "Color" }, value: { tr: "Tarçın", en: "Cinnamon" } },
      { label: { tr: "Kişiselleştirme", en: "Customization" }, value: { tr: "Renk seçilebilir", en: "Color can be selected" } },
    ],
  },
  {
    id: "p6", slug: "seramik-mumluk", world: "workshop", category: "crafts",
    title: { tr: "El Yapımı Seramik Mumluk", en: "Handmade Ceramic Candleholder" },
    description: { tr: "Her biri tek tek şekillendirilen, doğal dokulu ve benekli sırla tamamlanan seramik mumluk.", en: "Individually shaped ceramic candleholder finished with a natural texture and speckled glaze." },
    producer: "Toprak & İz", producerStory: { tr: "Toprağın doğal kusurlarını benzersiz ev objelerine dönüştürüyor.", en: "Turns clay’s natural imperfections into one-of-a-kind home objects." },
    price: 360, currency: "TRY", city: "Muğla", district: "Bodrum", distanceKm: 8.4, rating: 4.8, reviews: 19,
    delivery: ["shipping"], preparation: { tr: "Stokta", en: "In stock" },
    material: { tr: "Yüksek derece seramik", en: "High-fired ceramic" },
    customizable: false,
    deliveryDetails: {
      shipping: { estimate: { tr: "2–4 iş günü", en: "2–4 business days" } },
    },
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=85",
    producerImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
    details: [
      { label: { tr: "Malzeme", en: "Material" }, value: { tr: "Yüksek derece seramik", en: "High-fired ceramic" } },
      { label: { tr: "Ölçü", en: "Size" }, value: { tr: "11 × 8 cm", en: "11 × 8 cm" } },
      { label: { tr: "Renk", en: "Color" }, value: { tr: "Kırık beyaz, benekli", en: "Speckled off-white" } },
      { label: { tr: "Kişiselleştirme", en: "Customization" }, value: { tr: "Hediye notu eklenebilir", en: "Gift note available" } },
    ],
  },
];

export const getProduct = (slug: string) =>
  products.find((product) => product.slug === slug);
