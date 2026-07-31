import { describe, expect, it } from "vitest";
import { resetPaginationOnFilterChange } from "@/lib/catalog-pagination";
import { toggleFavorite } from "@/lib/favorites";
import { fallbackLocationStatus } from "@/lib/location";
import { preserveLocalePath, reduceMegaMenu } from "@/lib/navigation";

describe("public interaction helpers", () => {
  it("adds and removes a favorite without duplicates", () => {
    expect(toggleFavorite([], "p1")).toEqual(["p1"]);
    expect(toggleFavorite(["p1", "p2"], "p1")).toEqual(["p2"]);
    expect(toggleFavorite(["p1"], "p2")).toEqual(["p1", "p2"]);
  });

  it("resets pagination after a filter change", () => {
    expect(resetPaginationOnFilterChange()).toBe(4);
  });

  it("preserves the route while changing locale", () => {
    expect(preserveLocalePath("/tr/products/example", "en")).toBe(
      "/en/products/example",
    );
    expect(preserveLocalePath("/products", "tr")).toBe("/tr/products");
  });

  it("keeps only one mega menu open and closes on command", () => {
    expect(reduceMegaMenu(null, { type: "toggle", menu: "kitchen" })).toBe(
      "kitchen",
    );
    expect(
      reduceMegaMenu("kitchen", { type: "toggle", menu: "workshop" }),
    ).toBe("workshop");
    expect(reduceMegaMenu("workshop", { type: "close" })).toBeNull();
  });

  it("uses a manual fallback state after location denial or failure", () => {
    expect(fallbackLocationStatus(1)).toBe("denied");
    expect(fallbackLocationStatus(2)).toBe("error");
    expect(fallbackLocationStatus(undefined)).toBe("error");
  });
});
