import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProductReviewPanel } from "@/components/AdminProductReviewPanel";
import { AdminSectionNav } from "@/components/AdminSectionNav";
import { SafeImage } from "@/components/SafeImage";
import { adminProductIdSchema, getAdminProductReviewState } from "@/lib/admin-products";
import { adminProductsUi, getLocale } from "@/lib/i18n";
import { hasActiveAdminProfile } from "@/lib/supabase/admin";
import { getAdminProduct } from "@/lib/supabase/admin-products";
import { requireUser } from "@/lib/supabase/auth";
import type { Locale } from "@/lib/types";

function formatDate(value: string | null, locale: Locale, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  return { title: adminProductsUi[locale].reviewProduct };
}

export default async function AdminProductDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const values = await params;
  const locale = getLocale(values.locale);
  const ui = adminProductsUi[locale];
  const { supabase, user } = await requireUser(locale, `/${locale}/admin/products/${values.id}`);
  const activeAdmin = await hasActiveAdminProfile(supabase, user.id);

  if (!activeAdmin) {
    return (
      <section className="prototype-page admin-access-denied"><div className="prototype-card">
        <span className="prototype-icon" aria-hidden="true"><span>403</span></span><p className="eyebrow">{ui.eyebrow}</p><h1>{ui.accessDeniedTitle}</h1><p>{ui.accessDeniedText}</p><Link className="btn btn-primary" href={`/${locale}/account`}>{ui.backAccount}</Link>
      </div></section>
    );
  }

  const productId = adminProductIdSchema.safeParse(values.id);
  if (!productId.success) notFound();
  const product = await getAdminProduct(supabase, productId.data);
  if (!product) notFound();
  const reviewState = getAdminProductReviewState(product.status);
  const localizedTitle = locale === "tr" ? product.title_tr : product.title_en || product.title_tr;
  const producerStory = locale === "tr" ? product.producer.producerProfile?.story_tr : product.producer.producerProfile?.story_en || product.producer.producerProfile?.story_tr;

  return (
    <>
      <section className="page-hero admin-product-detail-hero"><div className="container">
        <p className="eyebrow">{ui.eyebrow}</p><div><h1 className="page-title">{localizedTitle}</h1><span className={`admin-status-badge ${product.status}`}>{ui.statusLabels[product.status]}</span></div><p><code>{product.slug}</code></p>
      </div></section>
      <section className="section admin-product-detail-section"><div className="container">
        <AdminSectionNav locale={locale} active="products" />
        <div className="admin-product-detail-layout">
          <div className="admin-product-detail-main">
            <section className="admin-detail-card" aria-labelledby="admin-product-info-title">
              <h2 id="admin-product-info-title">{ui.productInfo}</h2>
              <dl className="admin-product-detail-facts">
                <div><dt>{ui.titleTr}</dt><dd>{product.title_tr}</dd></div><div><dt>{ui.titleEn}</dt><dd>{product.title_en || ui.notProvided}</dd></div>
                <div><dt>{ui.slug}</dt><dd><code>{product.slug}</code></dd></div><div><dt>{ui.price}</dt><dd>{new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: product.currency }).format(product.price_minor / 100)}</dd></div>
                <div><dt>{ui.category}</dt><dd>{locale === "tr" ? product.category.name_tr : product.category.name_en}</dd></div><div><dt>{ui.categoryKind}</dt><dd>{ui.kindLabels[product.category.kind]}</dd></div>
                <div><dt>{ui.location}</dt><dd>{product.district}, {product.city}</dd></div><div><dt>{ui.stockStatus}</dt><dd>{ui.stockModes[product.stock_mode]}</dd></div>
                <div><dt>{ui.stockQuantity}</dt><dd>{product.stock_quantity ?? ui.notProvided}</dd></div><div><dt>{ui.preparation}</dt><dd>{product.preparation_days} {ui.days}</dd></div>
                <div><dt>{ui.createdAt}</dt><dd>{formatDate(product.created_at, locale, ui.notProvided)}</dd></div><div><dt>{ui.updatedAt}</dt><dd>{formatDate(product.updated_at, locale, ui.notProvided)}</dd></div>
              </dl>
              <div className="admin-product-descriptions"><article><h3>{ui.descriptionTr}</h3><p>{product.description_tr}</p></article><article><h3>{ui.descriptionEn}</h3><p>{product.description_en || ui.notProvided}</p></article></div>
            </section>

            <section className="admin-detail-card" aria-labelledby="admin-product-images-title">
              <h2 id="admin-product-images-title">{ui.images}</h2>
              {product.images.length ? <div className="admin-product-gallery">{product.images.map((image, index) => <article key={image.id}>
                <div className="admin-product-gallery-image"><SafeImage src={image.publicUrl} alt={(locale === "tr" ? image.alt_tr : image.alt_en) || localizedTitle} sizes="(max-width: 700px) 100vw, 460px" />{index === 0 ? <span>{ui.mainImage}</span> : null}</div>
                <dl><div><dt>{ui.altTr}</dt><dd>{image.alt_tr || ui.notProvided}</dd></div><div><dt>{ui.altEn}</dt><dd>{image.alt_en || ui.notProvided}</dd></div></dl>
              </article>)}</div> : <p>{ui.noImage}</p>}
            </section>
          </div>

          <aside className="admin-product-detail-sidebar">
            <section className="admin-detail-card" aria-labelledby="admin-producer-info-title"><h2 id="admin-producer-info-title">{ui.producerInfo}</h2><dl className="admin-product-detail-facts compact">
              <div><dt>{ui.producer}</dt><dd>{product.producer.display_name}</dd></div>
              <div><dt>{ui.approximateArea}</dt><dd>{product.producer.producerProfile?.approximate_area || product.producer.neighborhood_public || [product.producer.district, product.producer.city].filter(Boolean).join(", ") || ui.notProvided}</dd></div>
              <div><dt>{ui.verificationStatus}</dt><dd>{product.producer.producerProfile?.verification_status ? ui.statusLabels[product.producer.producerProfile.verification_status] : ui.notProvided}</dd></div>
            </dl>{producerStory ? <div className="admin-producer-story"><h3>{ui.producerStory}</h3><p>{producerStory}</p></div> : null}</section>

            <section className="admin-detail-card" aria-labelledby="admin-review-history-title"><h2 id="admin-review-history-title">{ui.reviewHistory}</h2><dl className="admin-product-detail-facts compact">
              <div><dt>{ui.status}</dt><dd>{ui.statusLabels[product.status]}</dd></div>
              {reviewState.isReviewed && product.reviewed_at ? <div><dt>{ui.reviewedAt}</dt><dd>{formatDate(product.reviewed_at, locale, ui.notProvided)}</dd></div> : null}
              {reviewState.isReviewed && product.reviewer ? <div><dt>{ui.reviewedBy}</dt><dd>{product.reviewer.display_name}</dd></div> : null}
            </dl>{product.status === "rejected" && product.rejection_reason ? <div className="admin-full-rejection"><h3>{ui.rejectionReason}</h3><p>{product.rejection_reason}</p></div> : null}</section>

            {reviewState.canReview || reviewState.isReviewed ? <AdminProductReviewPanel locale={locale} productId={product.id} productTitle={localizedTitle} status={product.status} /> : null}
          </aside>
        </div>
        <Link className="text-link" href={`/${locale}/admin/products`}>{ui.backList}</Link>
      </div></section>
    </>
  );
}
