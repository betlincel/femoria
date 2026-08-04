import { sellerUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function SellerProductStatusBadge({ status, locale }: { status: "draft" | "pending" | "approved" | "rejected"; locale: Locale }) {
  return <span className={`seller-status-badge ${status}`}>{sellerUi[locale][status]}</span>;
}
