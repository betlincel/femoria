import type { LocalizedText, Product } from "./types";
import { PRODUCT_IMAGE_FALLBACK } from "./catalog-mapper";

export interface ProducerDirectoryEntry {
  id: string;
  name: string;
  area: string;
  specialty: LocalizedText;
  story: LocalizedText;
  image: string;
  imageAlt: LocalizedText;
  productCount: number;
}

function producerId(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "producer";
}

export function buildProducerDirectory(products: Product[]): ProducerDirectoryEntry[] {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const current = groups.get(product.producer) ?? [];
    current.push(product);
    groups.set(product.producer, current);
  }

  return [...groups.entries()]
    .map(([name, makerProducts]) => {
      const first = makerProducts[0];
      const trCategories = [...new Set(makerProducts.map((item) => item.categoryName?.tr).filter(Boolean))].join(", ");
      const enCategories = [...new Set(makerProducts.map((item) => item.categoryName?.en).filter(Boolean))].join(", ");
      return {
        id: producerId(name),
        name,
        area: [first.district, first.city].filter(Boolean).join(", "),
        specialty: {
          tr: trCategories || "Onaylı katalog ürünleri",
          en: enCategories || "Approved catalog products",
        },
        story: first.producerStory,
        image: first.image || PRODUCT_IMAGE_FALLBACK,
        imageAlt: {
          tr: `${name} üreticisinden ürün seçkisi`,
          en: `Product selection from ${name}`,
        },
        productCount: makerProducts.length,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "tr"));
}

