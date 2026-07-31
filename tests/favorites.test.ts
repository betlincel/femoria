import { describe, expect, it } from "vitest";
import { isDatabaseProductId, mergeFavoriteIds } from "@/lib/favorites";

const productA = "11111111-1111-4111-8111-111111111111";
const productB = "22222222-2222-4222-8222-222222222222";
const productC = "33333333-3333-4333-8333-333333333333";

describe("favorite migration", () => {
  it("never treats mock identifiers as database foreign keys", () => {
    expect(isDatabaseProductId("p1")).toBe(false);
    expect(isDatabaseProductId(productA)).toBe(true);
  });

  it("merges remote favorites with only locally verified products", () => {
    expect(mergeFavoriteIds(
      ["p1", productA, productB],
      [productC, productA],
      [productA, productB],
    )).toEqual([productC, productA, productB]);
  });

  it("drops local UUIDs that do not exist in the visible product catalog", () => {
    expect(mergeFavoriteIds([productB], [], [])).toEqual([]);
  });
});
