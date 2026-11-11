// Ürün sayfası — solda galeri, sağda fiyat ve "Satıcıya yaz" kutusu, altında satıcı ve güven bilgisi.
import { h, formatPrice, formatDistance, monthsSince, toast, loading, emptyState, ask, icon, withIcon } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state } from "../store.js";
import { getProduct, similarProducts, photoUrl, categoryOf, categoryPath, startConversation, setProductStatus, removeProduct, track, DELIVERY_LABEL } from "../api.js";
import { badgeChips, breadcrumb, favButton, cartButton, productRow } from "../components.js";
import { rememberProduct } from "../recent.js";
import { navigate, requireAuth } from "../router.js";
import { offerSheet } from "./siparislerim.js";
import { starsText } from "./magaza.js";
import { sellerStats } from "../api.js";

export default async function render(root, { params: [id] }) {
  root.append(loading());
  const p = await getProduct(id).catch(() => null);
  root.replaceChildren();
  if (!p) {
    root.append(h("div", { class: "card" }, emptyState("bag", "Bu ürün bulunamadı", "Satılmış ya da kaldırılmış olabilir.", h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak"))));
    return;
  }

  rememberProduct(p.id);
  document.title = `${p.title} — Femoria`;
  const mine = state.user?.id === p.seller_id;
  const cat = categoryOf(p.category);
  const photos = p.photos.map(photoUrl).filter(Boolean);
  const main = photos.length
    ? h("img", { class: "main-img", src: photos[0], alt: p.title })
    : h("div", { class: "main-img", style: { display: "grid", placeItems: "center", color: "var(--text-faint)" } }, icon(categoryIconName(p.category), 96));
  const seller = p.seller || {};
  const months = seller.created_at ? monthsSince(seller.created_at) : 0;
  const verified = seller.email_verified || seller.phone_verified;

  root.append(
    breadcrumb(["Ana sayfa", "#/"], ...categoryPath(p.category).map((c) => [c.name, `#/urunler?kategori=${c.slug}`]), [p.title]),
    h("div", { class: "product-layout" },
      // ----- Galeri -----
      h("div", { class: "product-gallery stack" },
        main,
        photos.length > 1 ? h("div", { class: "thumbs" }, photos.map((u, i) => h("button", {
          style: { padding: 0, border: 0, background: "none", cursor: "pointer" }, "aria-label": `Fotoğraf ${i + 1}`,
          onclick: () => (main.src = u),
        }, h("img", { src: u, alt: "" })))) : null,
      ),

      // ----- Bilgi + satın alma kutusu -----
      h("div", { class: "product-info stack" },
        h("div", { class: "eyebrow" }, cat.name),
        h("h1", {}, p.title),
        h("div", { class: "card buy-box stack" },
          h("div", { class: "price", style: { fontSize: "2rem", letterSpacing: "-.02em" } }, formatPrice(p.price)),
          p.status === "satista" && p.stock != null ? h("div", { class: `stock-note ${p.stock <= 2 ? "low" : ""}` },
            p.stock === 1 ? "Son 1 adet" : p.stock <= 3 ? `Son ${p.stock} adet` : `Stokta ${p.stock} adet`) : null,
          h("div", { class: "badges" },
            h("span", { class: "chip" }, icon("truck"), DELIVERY_LABEL[p.delivery]),
            p.neighborhood || p.district ? h("span", { class: "chip" }, icon("map-pin"), [p.neighborhood, p.district, p.city].filter(Boolean).join(", ")) : null,
          ),
          p.status === "satildi" ? h("p", { class: "notice" }, icon("alert", 20), "Bu ürün satıldı.") : null,
          mine ? ownerActions(p) : buyerActions(p),
          mine ? null : favButton(p.id, { cls: "btn btn-secondary fav-wide", withText: true }),
          h("button", { type: "button", class: "btn btn-secondary", onclick: () => shareProduct(p) }, ...withIcon("share", "Paylaş")),
          h("div", { class: "small muted row", style: { gap: "8px" } }, icon("shield-check", 18),
            h("span", { style: { flex: "1" } }, "Ödemeyi teslimde yapın; ev adresi ve banka bilgisi paylaşmayın.")),
        ),

        p.description ? h("section", { class: "card" }, h("h2", {}, "Ürün açıklaması"), h("p", { style: { margin: 0, whiteSpace: "pre-line" } }, p.description)) : null,

        h("section", { class: "card stack" },
          h("h2", { style: { margin: 0 } }, "Satıcı"),
          h("div", { class: "profile-head" },
            h("span", { class: "avatar avatar-sm" }, seller.avatar_url ? h("img", { src: seller.avatar_url, alt: "" }) : (seller.full_name || "?")[0].toLocaleUpperCase("tr-TR")),
            h("div", {},
              h("strong", {}, seller.full_name || "Komşu"),
              h("div", { class: "meta" }, months ? `Femoria'da ${months} aydır` : "Femoria'ya yeni katıldı"),
            ),
          ),
          verified ? h("div", { class: "badges" }, h("span", { class: "chip chip-ok" }, icon("check"), "E-postası doğrulanmış")) : null,
          badgeChips(p.sellerBadges),
          sellerRating(p.seller_id),
          h("a", { class: "btn btn-secondary", href: `#/magaza/${p.seller_id}` }, ...withIcon("bag", "Mağazayı gör")),
        ),
      ),
    ),
  );

  similarProducts(p).then((items) => {
    if (!items.length) return;
    const row = productRow(items, "Benzer ürünler");
    root.append(h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Benzer ürünler"), h("div", { class: "section-actions" }, row.arrows)), row.rail));
  }).catch(() => {});

}

// Paylaş: telefonda paylaşım menüsü, olmazsa bağlantıyı panoya kopyalar
async function shareProduct(p) {
  const url = `${location.origin}${location.pathname}#/urun/${p.id}`;
  const data = { title: p.title, text: `${p.title} — ${formatPrice(p.price)} · Femoria`, url };
  try {
    if (navigator.share) { await navigator.share(data); track("product_shared", { how: "native" }); return; }
    await navigator.clipboard.writeText(url);
    toast("Bağlantı kopyalandı.");
    track("product_shared", { how: "copy" });
  } catch (e) { if (e?.name !== "AbortError") toast("Paylaşılamadı; adres çubuğundaki bağlantıyı kopyalayabilirsiniz."); }
}

function buyerActions(p) {
  if (p.status !== "satista") return null;
  const online = !!p.seller?.payout_ready;
  return h("div", { class: "stack" }, cartButton(p),
    online
      ? h("p", { class: "small muted pay-note" }, icon("lock", 16), " Kartla güvenli ödeme · para, ürünü teslim aldığınızı onaylayınca satıcıya geçer.")
      : h("p", { class: "small muted pay-note" }, "Bu satıcı henüz online ödeme almıyor; sepetten sipariş kartı gönderip teslimde ödersiniz."),
    h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn btn-secondary", "data-highlight": "teklif-ver", onclick: () => offerSheet(p) }, ...withIcon("tag", "Teklif ver")),
      h("button", { class: "btn btn-secondary", onclick: async () => {
    if (!requireAuth(`/urun/${p.id}`)) return;
    try {
      const convId = await startConversation(p.id);
      track("chat_started", { product_id: p.id });
      navigate(`/sohbet/${convId}`);
    } catch (e) {
      toast(e.message || "Şu an mesaj gönderilemiyor.");
    }
  } }, withIcon("message", "Satıcıya yaz"))));
}

// Satıcının ortalama puanı (mağaza özetinden)
function sellerRating(sellerId) {
  const el = h("div", { class: "small muted" });
  sellerStats(sellerId).then((st) => {
    const s = st || {};
    el.replaceChildren(...(s.rating
      ? [starsText(s.rating), ` ${String(s.rating).replace(".", ",")} · ${s.review_count} yorum · ${s.sold || 0} satış · ${s.followers || 0} takipçi`]
      : [`${s.sold || 0} satış · ${s.followers || 0} takipçi`]));
  }).catch(() => el.remove());
  return el;
}


function ownerActions(p) {
  return h("div", { class: "stack" },
    h("p", { class: "notice" }, icon("user", 20), "Bu sizin ürününüz."),
    h("a", { class: "btn btn-primary", href: `#/sat?duzenle=${p.id}`, "data-highlight": "urunu-duzenle" }, ...withIcon("pencil", "Ürünü düzenle")),
    p.status === "satista" ? h("button", { class: "btn btn-success", onclick: async () => {
      await setProductStatus(p.id, "satildi"); toast("Satıldı olarak işaretlendi. Hayırlı olsun!"); navigate("/profil");
    } }, withIcon("check", "Satıldı olarak işaretle")) : null,
    p.status === "satildi" ? h("button", { class: "btn btn-secondary", onclick: async () => {
      await setProductStatus(p.id, "satista"); toast("Yeniden satışta."); navigate(`/urun/${p.id}`, { replace: true });
    } }, "Yeniden satışa çıkar") : null,
    h("button", { class: "btn btn-danger", onclick: async () => {
      if (!(await ask("Ürünü vitrinden kaldıralım mı?",
        "Ürün ve fotoğrafları hemen ve kalıcı olarak silinir; geri alınamaz. Bu ürünle ilgili sohbetleriniz silinmez, sohbette yalnızca ürünün adı ve fiyatı görünmeye devam eder.",
        "Evet, sil"))) return;
      try {
        await removeProduct(p.id);
        track("product_removed", { deleted: true });
        toast("Ürün ve fotoğrafları silindi.");
        navigate("/profil");
      } catch (e) { toast(e.message || "Kaldırılamadı, tekrar deneyin."); }
    } }, withIcon("trash", "Vitrinden kaldır")),
  );
}
