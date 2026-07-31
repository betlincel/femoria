import type { Locale } from "./types";
import { products } from "./mock-data";

export interface ProducerProfile {
  id: string;
  name: string;
  city: string;
  specialty: Record<Locale, string>;
  story: Record<Locale, string>;
  image: string;
  productCount: number;
  rating: number;
}

export const producerProfiles: ProducerProfile[] = [
  {
    id: "nermin",
    name: "Nermin’in Mutfağı",
    city: "Çankaya, Ankara",
    specialty: { tr: "Ev yapımı hamur işleri", en: "Homemade pastries" },
    story: {
      tr: "Üç kuşaklık aile tariflerini günlük üretim disipliniyle hazırlıyor.",
      en: "Makes three generations of family recipes with a daily production rhythm.",
    },
    image: products[0].producerImage,
    productCount: 12,
    rating: 4.9,
  },
  {
    id: "ayse",
    name: "Ayşe Hanım’ın Fırını",
    city: "Kadıköy, İstanbul",
    specialty: { tr: "Börek ve hamur işleri", en: "Börek and pastries" },
    story: {
      tr: "Mahalle fırını sıcaklığını sipariş üzerine hazırlanan tariflere taşıyor.",
      en: "Brings neighborhood bakery warmth to made-to-order recipes.",
    },
    image: products[1].producerImage,
    productCount: 8,
    rating: 4.8,
  },
  {
    id: "emine",
    name: "Emine’nin Kileri",
    city: "Urla, İzmir",
    specialty: { tr: "Kurutulmuş kiler ürünleri", en: "Dried pantry goods" },
    story: {
      tr: "Mevsiminde ürettiği ürünleri geleneksel yöntemlerle saklıyor.",
      en: "Preserves seasonal produce using traditional methods.",
    },
    image: products[2].producerImage,
    productCount: 15,
    rating: 4.9,
  },
  {
    id: "lale",
    name: "Lale Atölye",
    city: "Beşiktaş, İstanbul",
    specialty: { tr: "Takı ve kişiselleştirme", en: "Jewelry and personalization" },
    story: {
      tr: "Doğal dokulardan ilham alan zamansız takıları elde şekillendiriyor.",
      en: "Hand-shapes timeless jewelry inspired by natural textures.",
    },
    image: products[3].producerImage,
    productCount: 18,
    rating: 4.7,
  },
  {
    id: "sibel",
    name: "Sibel’in İlmekleri",
    city: "Nilüfer, Bursa",
    specialty: { tr: "Örgü çanta ve tekstil", en: "Crochet bags and textiles" },
    story: {
      tr: "Her ilmeği yavaş üretim ilkesiyle sağlam ve özenli biçimde örüyor.",
      en: "Crochets every stitch slowly, sturdily, and with care.",
    },
    image: products[4].producerImage,
    productCount: 11,
    rating: 4.9,
  },
  {
    id: "toprak",
    name: "Toprak & İz",
    city: "Bodrum, Muğla",
    specialty: { tr: "Seramik ve ev dekorasyonu", en: "Ceramics and home decor" },
    story: {
      tr: "Toprağın doğal izlerini benzersiz ve kullanışlı ev objelerine dönüştürüyor.",
      en: "Turns clay’s natural marks into one-of-a-kind functional home objects.",
    },
    image: products[5].producerImage,
    productCount: 9,
    rating: 4.8,
  },
];
