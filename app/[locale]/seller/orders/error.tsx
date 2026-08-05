"use client";
import { useParams } from "next/navigation";
import { getLocale, sellerOrdersUi } from "@/lib/i18n";
export default function SellerOrdersError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const locale = getLocale(String(useParams().locale));
  const ui = sellerOrdersUi[locale];
  return (
    <section className="section">
      <div className="container empty-state">
        <h2>{ui.operationFailed}</h2>
        <button className="btn btn-primary" onClick={reset}>
          {ui.retry}
        </button>
      </div>
    </section>
  );
}
