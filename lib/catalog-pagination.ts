import type { Product } from "./types";

export const PRODUCT_PAGE_SIZE = 4;

export interface ProductPage {
  items: Product[];
  nextCursor: number | null;
}

export interface ProductPaginationService {
  page(products: Product[], cursor: number | null, limit: number): ProductPage;
}

export const mockProductPaginationService: ProductPaginationService = {
  page(products, cursor, limit) {
    const start = cursor ?? 0;
    const items = products.slice(start, start + limit);
    const next = start + items.length;
    return { items, nextCursor: next < products.length ? next : null };
  },
};

export function resetPaginationOnFilterChange(): number {
  return PRODUCT_PAGE_SIZE;
}
