import Link from "next/link";
import { adminOrdersUi, adminProductsUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function AdminSectionNav({ locale, active }: { locale: Locale; active: "applications" | "products" | "orders" }) {
  const ui = adminProductsUi[locale];
  return (
    <nav className="admin-section-nav" aria-label={locale === "tr" ? "Yönetim bölümleri" : "Administration sections"}>
      <Link className={active === "applications" ? "active" : ""} href={`/${locale}/admin/producer-applications`} aria-current={active === "applications" ? "page" : undefined}>
        {ui.producerApplications}
      </Link>
      <Link className={active === "products" ? "active" : ""} href={`/${locale}/admin/products`} aria-current={active === "products" ? "page" : undefined}>
        {ui.productReviews}
      </Link>
      <Link className={active === "orders" ? "active" : ""} href={`/${locale}/admin/orders`} aria-current={active === "orders" ? "page" : undefined}>
        {adminOrdersUi[locale].orders}
      </Link>
    </nav>
  );
}
