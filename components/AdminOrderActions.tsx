"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelAdminOrder,
  expireAdminOrder,
} from "@/app/[locale]/admin/orders/actions";
import type { AdminOrderActionResult } from "@/lib/admin-orders";
import { adminOrdersUi } from "@/lib/i18n";
import type { Database } from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export function AdminOrderActions({
  locale,
  orderId,
  orderStatus,
  paymentStatus,
  expiresAt,
  deadlinePassed,
}: {
  locale: Locale;
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  expiresAt: string | null;
  deadlinePassed: boolean;
}) {
  const ui = adminOrdersUi[locale];
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const trimmedReason = reason.trim();
  const validReason = trimmedReason.length >= 5 && trimmedReason.length <= 500;
  const cancellableStatus = [
    "awaiting_payment",
    "confirmed",
    "preparing",
  ].includes(orderStatus);
  const cancellablePayment = ["unpaid", "pending", "failed"].includes(
    paymentStatus,
  );
  const canCancel = cancellableStatus && cancellablePayment;
  const canExpire =
    orderStatus === "awaiting_payment" &&
    paymentStatus === "unpaid" &&
    expiresAt !== null &&
    deadlinePassed;

  function handleResult(
    result: AdminOrderActionResult,
    successMessage: string,
  ) {
    if (result.status === "success") {
      setFeedback({ type: "success", text: successMessage });
      setReason("");
      router.refresh();
      return;
    }
    setFeedback({
      type: "error",
      text:
        result.status === "conflict" || result.status === "invalid"
          ? ui.conflict
          : ui.operationFailed,
    });
  }

  return (
    <section
      className="admin-order-actions"
      aria-labelledby="admin-order-actions-title"
    >
      <h2 id="admin-order-actions-title">{ui.actions}</h2>
      <p className="admin-order-warning">{ui.paymentWarning}</p>
      {feedback ? (
        <p
          className={`admin-review-feedback ${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      ) : null}

      {paymentStatus === "paid" ? (
        <p className="admin-order-risk" role="status">
          {ui.paidCancellationBlocked}
        </p>
      ) : canCancel ? (
        <form
          className="admin-cancel-order-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validReason || pending) return;
            setFeedback(null);
            startTransition(async () =>
              handleResult(
                await cancelAdminOrder({
                  locale,
                  orderId,
                  reason: trimmedReason,
                }),
                ui.cancelledSuccessfully,
              ),
            );
          }}
        >
          <label htmlFor="admin-cancellation-reason">
            <span>{ui.cancellationReason}</span>
            <textarea
              id="admin-cancellation-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 500))}
              minLength={5}
              maxLength={500}
              placeholder={ui.cancellationPlaceholder}
              required
              disabled={pending}
            />
          </label>
          <small>
            {trimmedReason.length} / 500 · {ui.cancellationHint}
          </small>
          <button
            className="btn btn-secondary admin-danger-button"
            type="submit"
            disabled={pending || !validReason}
            aria-busy={pending}
          >
            {pending ? ui.processing : ui.cancelConfirm}
          </button>
        </form>
      ) : (
        <p className="admin-order-warning">{ui.cancelNotEligible}</p>
      )}

      {orderStatus === "awaiting_payment" && paymentStatus === "unpaid" ? (
        <div className="admin-expire-order-action">
          {!expiresAt ? (
            <p>{ui.expireMissingDate}</p>
          ) : !canExpire ? (
            <p>{ui.expireFutureDate}</p>
          ) : (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => {
                if (pending) return;
                setFeedback(null);
                startTransition(async () =>
                  handleResult(
                    await expireAdminOrder({ locale, orderId }),
                    ui.expiredSuccessfully,
                  ),
                );
              }}
            >
              {pending ? ui.processing : ui.expireOrder}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
