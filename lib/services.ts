import { z } from "zod";
import { products } from "./mock-data";
import type { CatalogService } from "./types";

const catalogInput = z.object({
  locale: z.enum(["tr", "en"]),
  category: z
    .enum(["homemade", "frozen", "dried", "jewelry", "bags", "crafts"])
    .optional(),
  query: z.string().trim().max(120).optional(),
});

export const mockCatalogService: CatalogService = {
  async listProducts(input) {
    const parsed = catalogInput.parse(input);
    const query = parsed.query?.toLocaleLowerCase(parsed.locale);
    return products.filter((product) => {
      const categoryMatches =
        !parsed.category || product.category === parsed.category;
      const queryMatches =
        !query ||
        product.title[parsed.locale]
          .toLocaleLowerCase(parsed.locale)
          .includes(query);
      return categoryMatches && queryMatches;
    });
  },
  async getProductBySlug(slug) {
    return products.find((product) => product.slug === slug) ?? null;
  },
};
