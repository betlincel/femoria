import Link from "next/link";
import { producerApplicationUi } from "@/lib/i18n";
import {
  getProducerApplicationStatusContent,
  type ProducerApplicationStatus,
} from "@/lib/producer-application";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function ProducerApplicationStatusCard({
  locale,
  status,
  profileRole,
}: {
  locale: Locale;
  status: ProducerApplicationStatus | "success" | "unavailable";
  profileRole: "buyer" | "producer" | "admin";
}) {
  const ui = producerApplicationUi[locale];
  const content = getProducerApplicationStatusContent(locale, status, profileRole);

  return (
    <section className={`producer-application-status ${status}`} aria-live="polite">
      <span className="producer-application-status-icon" aria-hidden="true">
        <Icon name={status === "approved" || status === "success" ? "check" : status === "rejected" ? "shield" : "spark"} />
      </span>
      <div>
        <p className="eyebrow">{ui.statusEyebrow}</p>
        <h2>{content.title}</h2>
        <p>{content.text}</p>
        {status === "unavailable" ? (
          <Link className="btn btn-secondary" href={`/${locale}/info/producer-application`}>
            {ui.refresh}<Icon name="arrow" size={17} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
