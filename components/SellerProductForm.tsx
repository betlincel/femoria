"use client";

import { useActionState, useState } from "react";
import { createSellerProduct, updateSellerProduct } from "@/app/[locale]/seller/products/actions";
import type { SellerCategory, SellerProduct } from "@/lib/seller-catalog";
import { sellerUi } from "@/lib/i18n";
import { initialSellerProductActionState, suggestSellerProductSlug } from "@/lib/seller-products";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function SellerProductForm({
  locale, categories, product,
}: {
  locale: Locale;
  categories: SellerCategory[];
  product?: SellerProduct;
}) {
  const ui = sellerUi[locale];
  const editable = !product || product.status === "draft" || product.status === "rejected";
  const action = product ? updateSellerProduct : createSellerProduct;
  const [state, formAction, pending] = useActionState(action, initialSellerProductActionState);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? "");
  const category = categories.find((item) => item.id === categoryId);
  const feedback = state.status === "success" ? ui.saved
    : state.status === "invalid" ? ui.invalid
      : state.status === "duplicate" ? ui.duplicateSlug
        : state.status === "locked" ? ui.locked
          : state.status === "forbidden" || state.status === "error" ? ui.operationFailed : null;

  return (
    <form className="seller-product-form" action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {!editable ? <p className="seller-form-lock" role="status">{product?.status === "approved" ? ui.approvedChangeSoon : ui.locked}</p> : null}
      {product?.status === "rejected" ? <p className="seller-form-notice">{ui.rejectedDraftNotice}</p> : null}

      <fieldset disabled={!editable || pending}>
        <legend>{ui.basicInfo}</legend>
        <div className="seller-form-grid">
          <label><span>{ui.category}</span><select name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            {categories.map((item) => <option value={item.id} key={item.id}>{item[locale === "tr" ? "name_tr" : "name_en"]} · {item.kind === "food" ? ui.kindFood : ui.kindCraft}</option>)}
          </select></label>
          <label><span>{ui.slug}</span><small>{ui.slugHint}</small><input name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value.toLowerCase()); }} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={140} required /></label>
          <label><span>{ui.titleTr}</span><input name="titleTr" defaultValue={product?.title_tr ?? ""} minLength={3} maxLength={120} onChange={(event) => { if (!slugEdited) setSlug(suggestSellerProductSlug(event.target.value)); }} required /></label>
          <label><span>{ui.titleEn}</span><input name="titleEn" defaultValue={product?.title_en ?? ""} minLength={3} maxLength={120} /></label>
          <label className="seller-form-wide"><span>{ui.descriptionTr}</span><small>{category?.kind === "food" ? ui.foodHelper : ui.craftHelper}</small><textarea name="descriptionTr" defaultValue={product?.description_tr ?? ""} minLength={30} maxLength={3000} rows={8} required /></label>
          <label className="seller-form-wide"><span>{ui.descriptionEn}</span><small>{category?.kind === "food" ? ui.foodHelper : ui.craftHelper}</small><textarea name="descriptionEn" defaultValue={product?.description_en ?? ""} minLength={30} maxLength={3000} rows={6} /></label>
          <label><span>{ui.price}</span><input name="price" defaultValue={product ? (product.price_minor / 100).toFixed(2) : ""} inputMode="decimal" pattern="\d+(?:[.,]\d{1,2})?" required /></label>
          <label><span>{ui.currency}</span><select name="currency" defaultValue="TRY"><option value="TRY">TRY</option></select></label>
          <label><span>{ui.city}</span><input name="city" defaultValue={product?.city ?? ""} minLength={2} maxLength={80} required /></label>
          <label><span>{ui.district}</span><input name="district" defaultValue={product?.district ?? ""} minLength={2} maxLength={80} required /></label>
        </div>
      </fieldset>

      <fieldset disabled={!editable || pending}>
        <legend>{ui.stockAndPreparation}</legend>
        <div className="seller-form-grid">
          <label><span>{ui.stockStatus}</span><select name="stockMode" defaultValue={product?.stock_mode ?? "made_to_order"}>{Object.entries(ui.stockModes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>{ui.stockQuantity}</span><input name="stockQuantity" defaultValue={product?.stock_quantity ?? ""} type="number" min={0} step={1} /></label>
          <label><span>{ui.preparationDays}</span><input name="preparationDays" defaultValue={product?.preparation_days ?? 0} type="number" min={0} max={60} step={1} required /></label>
        </div>
      </fieldset>

      {feedback ? <p className={state.status === "success" ? "form-success" : "form-error"} role={state.status === "success" ? "status" : "alert"}>{feedback}</p> : null}
      {editable ? <div className="seller-form-actions"><button className="btn btn-primary" type="submit" disabled={pending} aria-busy={pending}>{pending ? ui.saving : ui.saveDraft}<Icon name="arrow" size={18} /></button></div> : null}
    </form>
  );
}
