import { describe, expect, it } from "vitest";
import { mockCatalogService } from "@/lib/services";

describe("mock catalog service", () => {
  it("filters localized titles", async () => {
    const result = await mockCatalogService.listProducts({
      locale: "tr",
      query: "mantı",
    });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("ev-yapimi-kayseri-mantisi");
  });

  it("filters categories without losing type safety", async () => {
    const result = await mockCatalogService.listProducts({
      locale: "en",
      category: "crafts",
    });
    expect(result.map((product) => product.slug)).toEqual(["seramik-mumluk"]);
  });
});
