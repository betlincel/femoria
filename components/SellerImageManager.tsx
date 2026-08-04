"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSellerProductImage,
  reorderSellerProductImages,
  updateSellerProductImageAlt,
  uploadSellerProductImage,
} from "@/app/[locale]/seller/products/actions";
import type { SellerProduct } from "@/lib/seller-catalog";
import { sellerUi } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { SafeImage } from "./SafeImage";

export function SellerImageManager({ locale, product }: { locale: Locale; product: SellerProduct }) {
  const ui = sellerUi[locale];
  const router = useRouter();
  const editable = product.status === "draft" || product.status === "rejected";
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const ids = product.images.map((image) => image.id);

  function showResult(status: string) {
    setFeedback(status === "success" ? ui.saved : status === "cleanup_pending" ? ui.cleanupPending : status === "invalid" ? ui.invalid : ui.operationFailed);
  }

  function reorder(nextIds: string[]) {
    startTransition(async () => {
      const result = await reorderSellerProductImages({ locale, productId: product.id, imageIds: nextIds });
      showResult(result.status);
      if (result.status === "success") router.refresh();
    });
  }

  function move(imageId: string, direction: -1 | 1) {
    const index = ids.indexOf(imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next);
  }

  return (
    <section className="seller-image-manager" aria-labelledby="seller-images-title">
      <header><div><p className="eyebrow">{ui.images}</p><h2 id="seller-images-title">{ui.uploadImage}</h2><p>{ui.imageRules}</p></div><span>{product.images.length}/6</span></header>
      {editable && product.images.length < 6 ? (
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          data.set("locale", locale); data.set("productId", product.id);
          startTransition(async () => {
            const result = await uploadSellerProductImage(data); showResult(result.status);
            if (result.status === "success") { form.reset(); router.refresh(); }
          });
        }} className="seller-image-upload">
          <label><span>{ui.imageFile}</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
          <label><span>{ui.altTr}</span><input name="altTr" minLength={3} maxLength={160} required /></label>
          <label><span>{ui.altEn}</span><input name="altEn" minLength={3} maxLength={160} /></label>
          <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? ui.uploading : ui.upload}</button>
        </form>
      ) : editable ? <p className="seller-form-notice">{ui.imageLimit}</p> : <p className="seller-form-lock">{ui.locked}</p>}

      <div className="seller-image-grid">
        {product.images.map((image, index) => (
          <article className="seller-image-card" key={image.id}>
            <div className="seller-image-preview"><SafeImage src={image.publicUrl} alt={image[locale === "tr" ? "alt_tr" : "alt_en"] || image.alt_tr} sizes="(max-width: 700px) 100vw, 260px" />{index === 0 ? <span>{ui.mainImage}</span> : null}</div>
            <form onSubmit={(event) => {
              event.preventDefault(); const data = new FormData(event.currentTarget);
              startTransition(async () => { const result = await updateSellerProductImageAlt({ locale, imageId: image.id, altTr: data.get("altTr"), altEn: data.get("altEn") }); showResult(result.status); if (result.status === "success") router.refresh(); });
            }}>
              <label><span>{ui.altTr}</span><input name="altTr" defaultValue={image.alt_tr} minLength={3} maxLength={160} disabled={!editable || pending} required /></label>
              <label><span>{ui.altEn}</span><input name="altEn" defaultValue={image.alt_en} minLength={3} maxLength={160} disabled={!editable || pending} /></label>
              {editable ? <button className="text-button" type="submit" disabled={pending}>{ui.updateAlt}</button> : null}
            </form>
            {editable ? <div className="seller-image-actions">
              {index > 0 ? <button type="button" disabled={pending} onClick={() => move(image.id, -1)}>{index === 1 ? ui.makeMain : ui.moveUp}</button> : null}
              {index < product.images.length - 1 ? <button type="button" disabled={pending} onClick={() => move(image.id, 1)}>{ui.moveDown}</button> : null}
              <button className="danger" type="button" disabled={pending} onClick={() => {
                if (!window.confirm(ui.removeConfirm)) return;
                startTransition(async () => { const result = await deleteSellerProductImage({ locale, imageId: image.id }); showResult(result.status); if (result.status === "success" || result.status === "cleanup_pending") router.refresh(); });
              }}>{ui.removeImage}</button>
            </div> : null}
          </article>
        ))}
      </div>
      {feedback ? <p className="seller-image-feedback" role="status">{feedback}</p> : null}
    </section>
  );
}
