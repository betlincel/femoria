"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";
import { adminProductsUi } from "@/lib/i18n";

export default function AdminProductsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "tr";
  const ui = adminProductsUi[locale];
  return <section className="prototype-page"><div className="prototype-card"><span className="prototype-icon" aria-hidden="true"><Icon name="shield" /></span><h1>{ui.errorTitle}</h1><p>{ui.errorText}</p><div className="prototype-actions"><button className="btn btn-primary" type="button" onClick={reset}>{ui.retry}</button><Link className="btn btn-secondary" href={`/${locale}/account`}>{ui.backAccount}</Link></div></div></section>;
}
