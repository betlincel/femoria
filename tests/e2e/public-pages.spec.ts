import { expect, test } from "@playwright/test";

for (const locale of ["tr", "en"]) {
  test(`${locale} public routes render and stay within the viewport`, async ({ page }) => {
    for (const path of ["", "/products", "/nearby", "/guide"]) {
      await page.goto(`/${locale}${path}`);
      await expect(page.locator("header")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    }
  });
}

test("product discovery filters and empty state work", async ({ page }) => {
  await page.goto("/tr/products");
  await page.getByLabel("Ürün ara").fill("bulunmayan ürün");
  await expect(page.getByText("Bu seçimde ürün bulamadık")).toBeVisible();
  await page.getByRole("button", { name: "Filtreleri temizle" }).click();
  await expect(page.locator(".product-card")).toHaveCount(6);
});
