"use client";
import { usePathname } from "next/navigation";
import { sellerUi } from "@/lib/i18n";
export default function SellerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { const locale = usePathname().startsWith("/en") ? "en" : "tr"; const ui = sellerUi[locale]; return <section className="prototype-page"><div className="prototype-card"><h1>{ui.errorTitle}</h1><p>{ui.errorText}</p><button className="btn btn-primary" type="button" onClick={reset}>{ui.retry}</button></div></section>; }
