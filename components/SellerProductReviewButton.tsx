"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSellerProductForReview } from "@/app/[locale]/seller/products/actions";
import { sellerUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export function SellerProductReviewButton({ locale, productId, hasImage }: { locale: Locale; productId: string; hasImage: boolean }) {
  const ui = sellerUi[locale];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  function submit() {
    if (!hasImage) { setFeedback(ui.needImage); return; }
    if (!window.confirm(ui.submitConfirm)) return;
    startTransition(async () => {
      const result = await submitSellerProductForReview({ locale, productId });
      setFeedback(result.status === "success" ? ui.submitted : result.status === "locked" ? ui.needImage : ui.operationFailed);
      if (result.status === "success") router.refresh();
    });
  }
  return <div className="seller-review-action"><button className="btn btn-primary" type="button" disabled={pending} onClick={submit}>{pending ? ui.saving : ui.submitReview}</button>{feedback ? <p role="status">{feedback}</p> : null}</div>;
}
