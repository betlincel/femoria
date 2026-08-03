import { translations } from "./i18n";
import {
  catalogCategoryRowSchema,
  catalogProductRowSchema,
  type CatalogProductRow,
} from "./catalog-schemas";
import type { CatalogCategory, LocalizedText, Product } from "./types";

export const PRODUCT_IMAGE_FALLBACK = "/brand/product-placeholder.svg";

type ImageUrlBuilder = (storagePath: string) => string;

function firstRelation<Value>(value: Value | Value[] | null | undefined): Value | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function localized(
  trValue: string,
  enValue: string,
  fallback: LocalizedText,
): LocalizedText {
  const tr = trValue.trim() || enValue.trim() || fallback.tr;
  const en = enValue.trim() || trValue.trim() || fallback.en;
  return { tr, en };
}

export function mapCatalogCategory(value: unknown): CatalogCategory | null {
  const parsed = catalogCategoryRowSchema.safeParse(value);
  if (!parsed.success || !parsed.data.active) return null;
  return {
    id: parsed.data.id,
    slug: parsed.data.slug,
    name: { tr: parsed.data.name_tr, en: parsed.data.name_en },
    kind: parsed.data.kind,
    sortOrder: parsed.data.sort_order,
  };
}

function preparationText(row: CatalogProductRow): LocalizedText {
  if (row.stock_mode === "in_stock") {
    return { tr: translations.tr.catalogInStock, en: translations.en.catalogInStock };
  }
  if (row.stock_mode === "unavailable") {
    return {
      tr: translations.tr.catalogUnavailable,
      en: translations.en.catalogUnavailable,
    };
  }
  return {
    tr: translations.tr.catalogMadeToOrder,
    en: translations.en.catalogMadeToOrder,
  };
}

export function mapCatalogProduct(
  value: unknown,
  buildImageUrl: ImageUrlBuilder,
): Product | null {
  const parsed = catalogProductRowSchema.safeParse(value);
  if (!parsed.success) return null;

  const row = parsed.data;
  const categoryRow = firstRelation(row.category);
  const producer = firstRelation(row.producer);
  const producerProfile = producer
    ? firstRelation(producer.producer_profile)
    : null;

  if (
    !categoryRow?.active ||
    !producer ||
    producerProfile?.verification_status !== "approved"
  ) {
    return null;
  }

  const category = mapCatalogCategory(categoryRow);
  if (!category) return null;

  const title = localized(row.title_tr, row.title_en, {
    tr: translations.tr.catalogProductFallback,
    en: translations.en.catalogProductFallback,
  });
  const description = localized(row.description_tr, row.description_en, title);
  const producerStory = localized(
    producerProfile.story_tr,
    producerProfile.story_en,
    { tr: "", en: "" },
  );
  const mainImage = [...row.images].sort(
    (left, right) => left.sort_order - right.sort_order,
  )[0];
  const image = mainImage
    ? buildImageUrl(mainImage.storage_path)
    : PRODUCT_IMAGE_FALLBACK;
  const imageAlt = mainImage
    ? localized(mainImage.alt_tr, mainImage.alt_en, title)
    : title;

  return {
    id: row.id,
    slug: row.slug,
    world: category.kind === "food" ? "kitchen" : "workshop",
    category: category.slug,
    categoryName: category.name,
    title,
    description,
    producer:
      producer.display_name.trim() || translations.tr.catalogProducerFallback,
    producerStory,
    price: row.price_minor / 100,
    currency: row.currency,
    city: row.city?.trim() ?? "",
    district: row.district?.trim() ?? "",
    delivery: [],
    preparation: preparationText(row),
    deliveryDetails: {},
    image,
    imageAlt,
    producerImage: PRODUCT_IMAGE_FALLBACK,
    details: [],
  };
}

export function mapCatalogProducts(
  values: readonly unknown[],
  buildImageUrl: ImageUrlBuilder,
): Product[] {
  return values.flatMap((value) => {
    const product = mapCatalogProduct(value, buildImageUrl);
    return product ? [product] : [];
  });
}
