import Link from "next/link";
import type { SellerAccessState } from "@/lib/account-access";
import { sellerUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function SellerAccessStatePanel({ locale, state, admin }: { locale: Locale; state: SellerAccessState; admin: boolean }) {
  const ui = sellerUi[locale];
  const text = state === "pending" ? ui.pendingText : state === "rejected" ? ui.rejectedText : state === "suspended" ? ui.suspendedText : ui.noneText;
  return (
    <section className="prototype-page seller-access-state">
      <div className="prototype-card">
        <span className="prototype-icon" aria-hidden="true"><Icon name="shield" /></span>
        <p className="eyebrow">{ui.eyebrow}</p><h1>{ui.accessDenied}</h1><p>{text}</p>
        <div className="prototype-actions">
          {!admin && state === "none" ? <Link className="btn btn-primary" href={`/${locale}/info/producer-application`}>{ui.apply}</Link> : null}
          {(state === "pending" || state === "rejected") ? <Link className="btn btn-primary" href={`/${locale}/info/producer-application`}>{ui.applicationStatus}</Link> : null}
          <Link className="btn btn-secondary" href={`/${locale}/account`}>{ui.backAccount}</Link>
        </div>
      </div>
    </section>
  );
}
