"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewAdminProduct } from "@/app/[locale]/admin/products/actions";
import { getAdminProductReviewState, type AdminProductWorkflowStatus } from "@/lib/admin-products";
import { adminProductsUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

type ReviewAction = "approve" | "reject";

export function AdminProductReviewPanel({
  locale,
  productId,
  productTitle,
  status,
}: {
  locale: Locale;
  productId: string;
  productTitle: string;
  status: AdminProductWorkflowStatus;
}) {
  const ui = adminProductsUi[locale];
  const router = useRouter();
  const [selection, setSelection] = useState<ReviewAction | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLElement>(null);
  const { isPending, isReviewed, canReview } = getAdminProductReviewState(status);

  useEffect(() => {
    if (!selection) return;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setSelection(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [pending, selection]);

  if (isReviewed) {
    return <p className="admin-product-reviewed-note" role="status"><Icon name="shield" />{ui.alreadyReviewed}</p>;
  }

  if (!isPending || !canReview) return null;

  const trimmedReason = rejectionReason.trim();
  const validReason = trimmedReason.length >= 10 && trimmedReason.length <= 1_000;

  function beginReview(action: ReviewAction) {
    setFeedback(null);
    setRejectionReason("");
    setSelection(action);
  }

  function confirmReview() {
    if (!selection || pending || (selection === "reject" && !validReason)) return;
    const action = selection;
    startTransition(async () => {
      const result = await reviewAdminProduct({
        locale,
        productId,
        action,
        rejectionReason: action === "reject" ? trimmedReason : "",
      });
      if (result.status === "success") {
        setFeedback({ type: "success", text: result.action === "approve" ? ui.successApprove : ui.successReject });
        setSelection(null);
        router.refresh();
        return;
      }
      if (result.status === "conflict") {
        setFeedback({ type: "error", text: ui.operationFailed });
        setSelection(null);
        router.refresh();
        return;
      }
      setFeedback({ type: "error", text: ui.operationFailed });
    });
  }

  return (
    <section className="admin-product-review-panel" aria-labelledby="admin-product-review-actions">
      <h2 id="admin-product-review-actions">{ui.title}</h2>
      {feedback ? <p className={`admin-review-feedback ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      <div className="admin-product-review-actions">
        <button className="btn btn-primary" type="button" disabled={pending} onClick={() => beginReview("approve")}><Icon name="check" />{ui.approve}</button>
        <button className="btn btn-secondary admin-reject-button" type="button" disabled={pending} onClick={() => beginReview("reject")}><Icon name="shield" />{ui.reject}</button>
      </div>

      {selection ? (
        <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) setSelection(null);
        }}>
          <section
            className="admin-confirm-dialog admin-product-review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-product-confirm-title"
            aria-describedby="admin-product-confirm-text"
            tabIndex={-1}
            ref={dialogRef}
          >
            <p className="eyebrow">{productTitle}</p>
            <h2 id="admin-product-confirm-title">{selection === "approve" ? ui.approve : ui.reject}</h2>
            <p id="admin-product-confirm-text">{selection === "approve" ? ui.approveConfirm : ui.rejectConfirm}</p>
            {selection === "reject" ? (
              <label className="admin-rejection-field">
                <span>{ui.rejectionReason}</span>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value.slice(0, 1_000))}
                  minLength={10}
                  maxLength={1_000}
                  required
                  disabled={pending}
                  placeholder={ui.rejectionPlaceholder}
                  autoFocus
                />
                <small className={trimmedReason.length > 0 && !validReason ? "invalid" : ""}>{trimmedReason.length} / 1000 {ui.characterCount}</small>
              </label>
            ) : null}
            <div className="admin-confirm-actions">
              <button className="btn btn-secondary" type="button" disabled={pending} onClick={() => setSelection(null)}>{ui.cancel}</button>
              <button className="btn btn-primary" type="button" disabled={pending || (selection === "reject" && !validReason)} aria-busy={pending} onClick={confirmReview}>
                {pending ? ui.processing : ui.confirm}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
