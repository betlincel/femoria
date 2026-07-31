"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";
import { translations } from "@/lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "tr";
  const m = translations[locale];

  return (
    <section className="prototype-page">
      <div className="prototype-card">
        <span className="prototype-icon" aria-hidden="true"><Icon name="shield" /></span>
        <h1>{m.errorTitle}</h1>
        <p>{m.errorText}</p>
        <button className="btn btn-primary" type="button" onClick={reset}>{m.retry}</button>
      </div>
    </section>
  );
}
