export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];

export type CategoryId =
  | "homemade"
  | "frozen"
  | "dried"
  | "jewelry"
  | "bags"
  | "crafts";

export type DeliveryType = "courier" | "pickup" | "shipping";

export interface Product {
  id: string;
  slug: string;
  category: CategoryId;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  producer: string;
  producerStory: Record<Locale, string>;
  price: number;
  currency: "TRY";
  city: string;
  district: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  delivery: DeliveryType[];
  preparation: Record<Locale, string>;
  image: string;
  producerImage: string;
  details: {
    label: Record<Locale, string>;
    value: Record<Locale, string>;
  }[];
}

export interface AiAssistantService {
  suggestForBuyer(input: {
    locale: Locale;
    query: string;
    verifiedProductIds: string[];
  }): Promise<{ answer: string; productIds: string[] }>;
  suggestForProducer(input: {
    locale: Locale;
    draft: string;
    category?: CategoryId;
  }): Promise<{ title: string; description: string; disclaimer: string }>;
}

export interface CatalogService {
  listProducts(input: {
    locale: Locale;
    category?: CategoryId;
    query?: string;
  }): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
}
