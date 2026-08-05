export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];

export type CategoryId =
  | "homemade"
  | "frozen"
  | "dried"
  | "jewelry"
  | "bags"
  | "crafts";

export type ProductWorld = "kitchen" | "workshop";

export type DeliveryType = "courier" | "pickup" | "shipping";

export type LocalizedText = Record<Locale, string>;

export interface CatalogCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  kind: "food" | "craft";
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  world: ProductWorld;
  category: string;
  categoryName?: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  producer: string;
  producerId?: string;
  producerStory: LocalizedText;
  price: number;
  priceMinor?: number;
  currency: string;
  stockMode?: "in_stock" | "made_to_order" | "unavailable";
  stockQuantity?: number | null;
  preparationDays?: number;
  commerceReady?: boolean;
  city: string;
  district: string;
  distanceKm?: number;
  rating?: number;
  reviews?: number;
  delivery: DeliveryType[];
  preparation: Record<Locale, string>;
  portion?: Record<Locale, string>;
  material?: Record<Locale, string>;
  customizable?: boolean;
  deliveryDetails: {
    pickup?: {
      area: Record<Locale, string>;
      readyAt: Record<Locale, string>;
      window: Record<Locale, string>;
    };
    courier?: {
      districts: Record<Locale, string>;
      estimate: Record<Locale, string>;
      fee: Record<Locale, string>;
    };
    shipping?: {
      estimate: Record<Locale, string>;
    };
  };
  image: string;
  imageAlt?: LocalizedText;
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
    category?: string;
    query?: string;
  }): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
}
