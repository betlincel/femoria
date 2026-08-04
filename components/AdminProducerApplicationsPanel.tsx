"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewProducerApplication } from "@/app/[locale]/admin/producer-applications/actions";
import type { AdminProducerApplication } from "@/lib/admin-producer-applications";
import { adminProducerApplicationsUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

type ReviewAction = "approve" | "reject";

function formatDate(value: string | null, locale: Locale, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminProducerApplicationsPanel({
  applications,
  locale,
}: {
  applications: AdminProducerApplication[];
  locale: Locale;
}) {
  const ui = adminProducerApplicationsUi[locale];
  const router = useRouter();
  const [selection, setSelection] = useState<{
    profileId: string;
    displayName: string;
    action: ReviewAction;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmReview() {
    if (!selection || pending) return;
    const review = selection;
    startTransition(async () => {
      const result = await reviewProducerApplication({ profileId: review.profileId, action: review.action });
      if (result.status === "success") {
        setFeedback({
          type: "success",
          text: result.action === "approve" ? ui.successApprove : ui.successReject,
        });
        setSelection(null);
        router.refresh();
        return;
      }
      if (result.status === "conflict") {
        setFeedback({ type: "error", text: ui.staleApplication });
        setSelection(null);
        router.refresh();
        return;
      }
      setFeedback({ type: "error", text: ui.operationFailed });
    });
  }

  return (
    <div className="admin-applications-panel">
      {feedback ? (
        <p className={`admin-review-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
          {feedback.text}
        </p>
      ) : null}
      <div className="admin-application-list">
        {applications.map((application) => (
          <article className="admin-application-card" key={application.profileId}>
            <header>
              <div>
                <span className={`admin-status-badge ${application.verificationStatus}`}>
                  {ui.statusLabels[application.verificationStatus]}
                </span>
                <h2>{application.displayName}</h2>
                <p>{[application.city, application.district, application.approximateArea].filter(Boolean).join(" · ") || ui.notProvided}</p>
              </div>
              <time dateTime={application.createdAt}>{formatDate(application.createdAt, locale, ui.notProvided)}</time>
            </header>

            <details>
              <summary>{ui.openDetails}<Icon name="arrow" size={16} /></summary>
              <div className="admin-application-detail-grid">
                <dl className="admin-application-facts">
                  <div><dt>{ui.profileId}</dt><dd><code>{application.profileId}</code></dd></div>
                  <div><dt>{ui.displayName}</dt><dd>{application.displayName}</dd></div>
                  <div><dt>{ui.city}</dt><dd>{application.city || ui.notProvided}</dd></div>
                  <div><dt>{ui.district}</dt><dd>{application.district || ui.notProvided}</dd></div>
                  <div><dt>{ui.approximateArea}</dt><dd>{application.approximateArea || ui.notProvided}</dd></div>
                  <div><dt>{ui.status}</dt><dd>{ui.statusLabels[application.verificationStatus]}</dd></div>
                  <div><dt>{ui.createdAt}</dt><dd>{formatDate(application.createdAt, locale, ui.notProvided)}</dd></div>
                  <div><dt>{ui.updatedAt}</dt><dd>{formatDate(application.updatedAt, locale, ui.notProvided)}</dd></div>
                  <div><dt>{ui.approvedAt}</dt><dd>{formatDate(application.approvedAt, locale, ui.notProvided)}</dd></div>
                </dl>

                <div className="admin-application-narrative">
                  <section><h3>{ui.storyTr}</h3><p>{application.storyTr || ui.notProvided}</p></section>
                  <section><h3>{ui.storyEn}</h3><p>{application.storyEn || ui.notProvided}</p></section>
                </div>

                {application.deliveryPayloadValid ? (
                  <dl className="admin-application-production">
                    <div><dt>{ui.deliveryRegions}</dt><dd>{application.deliveryRegions.length ? application.deliveryRegions.map((region) => ui.deliveryOptions[region]).join(", ") : ui.notProvided}</dd></div>
                    <div><dt>{ui.productionArea}</dt><dd>{application.productionArea ? ui.productionOptions[application.productionArea] : ui.notProvided}</dd></div>
                    <div><dt>{ui.productTypes}</dt><dd>{application.productTypes || ui.notProvided}</dd></div>
                    <div><dt>{ui.productionMethod}</dt><dd>{application.productionMethod || ui.notProvided}</dd></div>
                    <div><dt>{ui.madeToOrder}</dt><dd>{application.madeToOrder ? ui.madeToOrderOptions[application.madeToOrder] : ui.notProvided}</dd></div>
                  </dl>
                ) : (
                  <p className="admin-payload-warning" role="note"><Icon name="shield" size={18} />{ui.payloadUnavailable}</p>
                )}
              </div>
            </details>

            {application.verificationStatus === "pending" ? (
              <footer>
                <button className="btn btn-primary" type="button" disabled={pending} onClick={() => setSelection({ profileId: application.profileId, displayName: application.displayName, action: "approve" })}>
                  {ui.approve}
                </button>
                <button className="btn btn-secondary admin-reject-button" type="button" disabled={pending} onClick={() => setSelection({ profileId: application.profileId, displayName: application.displayName, action: "reject" })}>
                  {ui.reject}
                </button>
              </footer>
            ) : null}
          </article>
        ))}
      </div>

      {selection ? (
        <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setSelection(null);
        }}>
          <section className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title" aria-describedby="admin-confirm-text">
            <span className="admin-confirm-icon" aria-hidden="true"><Icon name="shield" /></span>
            <p className="eyebrow">{selection.displayName}</p>
            <h2 id="admin-confirm-title">{selection.action === "approve" ? ui.approve : ui.reject}</h2>
            <p id="admin-confirm-text">{selection.action === "approve" ? ui.approveConfirm : ui.rejectConfirm}</p>
            {selection.action === "reject" ? <p className="admin-rejection-note">{ui.rejectionReasonNote}</p> : null}
            <div className="admin-confirm-actions">
              <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setSelection(null)}>{ui.cancel}</button>
              <button className="btn btn-primary" type="button" disabled={pending} aria-busy={pending} onClick={confirmReview}>
                {pending ? ui.processing : ui.confirm}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
