"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addProductToCart } from "@/app/[locale]/cart/actions";
import { commerceUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function AddToCartButton({ productId, locale, disabled = false, compact = false }: { productId: string; locale: Locale; disabled?: boolean; compact?: boolean }) {
  const ui = commerceUi[locale];
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function add() {
    if (disabled || pending) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await addProductToCart({ locale, productId, quantity: 1, returnTo: pathname });
      const message = result.status === "success" ? ui.addedToCart
        : result.status === "insufficient_stock" ? ui.insufficientStock
          : result.status === "unavailable" ? ui.unavailable
            : result.status === "forbidden" ? ui.ownProduct : ui.operationFailed;
      setFeedback(message);
      if (result.status === "success") router.refresh();
    });
  }

  return (
    <div className={`add-cart-control ${compact ? "compact" : ""}`}>
      <button className={compact ? "card-cart-button" : "btn btn-primary order-button"} type="button" disabled={disabled || pending} aria-busy={pending} onClick={add}>
        <Icon name="bag" size={18} />{compact ? <span className="sr-only">{ui.addToCart}</span> : pending ? ui.processing : ui.addToCart}
      </button>
      {feedback ? <span className={feedback === ui.addedToCart ? "success" : "error"} role="status">{feedback}</span> : null}
    </div>
  );
}
