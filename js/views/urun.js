// Ürün sayfası — solda galeri, sağda fiyat ve "Satıcıya yaz" kutusu, altında satıcı ve güven bilgisi.
import { h, formatPrice, formatDistance, monthsSince, toast, loading, emptyState, ask, icon, withIcon } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state } from "../store.js";
import { getProduct, photoUrl, categoryOf, startConversation, setProductStatus, removeProduct, restoreProduct, daysUntilPurge, PHOTO_RETENTION_DAYS, track, DELIVERY_LABEL } from "../api.js";
import { badgeChips, breadcrumb } from "../components.js";
import { navigate, requireAuth } from "../router.js";

const km = (a, b) => {
  if (a?.lat == null || b?.approx_lat == null) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.approx_lat - a.lat) * rad, dLng = (b.approx_lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.approx_lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default async function render(root, { params: [id] }) {
  root.append(loading());
  const p = await getProduct(id).catch(() => null);
  root.replaceChildren();
  if (!p) {
    root.append(h("div", { class: "card" }, emptyState("bag", "Bu ürün bulunamadı", "Satılmış ya da kaldırılmış olabilir.", h("a", { class: "btn btn-primary", href: "#/yakinimda" }, "Yakınımdakilere bak"))));
    return;
  }

  const mine = state.user?.id === p.seller_id;
  const cat = categoryOf(p.category);
  const photos = p.photos.map(photoUrl).filter(Boolean);
  const main = photos.length
    ? h("img", { class: "main-img", src: photos[0], alt: p.title })
    : h("div", { class: "main-img", style: { display: "grid", placeItems: "center", color: "var(--text-faint)" } }, icon(categoryIconName(p.category), 96));
  const distance = km(state.location, p);
  const seller = p.seller || {};
  const months = seller.created_at ? monthsSince(seller.created_at) : 0;
  const verified = seller.email_verified || seller.phone_verified;

  root.append(
    breadcrumb(["Ana sayfa", "#/"], [cat.name, `#/yakinimda?kategori=${p.category}`], [p.title]),
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
        h("div", { class: "buy-box stack" },
          h("div", { class: "price-tag" },
            h("span", { class: "price-figure" }, formatPrice(p.price)),
          ),
          h("div", { class: "fact-rows" },
            h("div", { class: "fact-row" },
              h("span", { class: "fact-row-label" }, "Teslim"),
              h("span", { class: "fact-row-value" }, icon("truck", 18), DELIVERY_LABEL[p.delivery]),
            ),
            distance != null || p.neighborhood ? h("div", { class: "fact-row" },
              h("span", { class: "fact-row-label" }, "Konum"),
              h("span", { class: "fact-row-value" }, icon("map-pin", 18), distance != null ? `${formatDistance(distance)} uzakta` : p.neighborhood),
            ) : null,
          ),
          p.status === "satildi" ? h("p", { class: "notice" }, icon("alert", 20), "Bu ürün satıldı.") : null,
          p.status === "kaldirildi" && !mine ? h("p", { class: "notice" }, icon("alert", 20), "Bu ürün satıcı tarafından vitrinden kaldırıldı.") : null,
          mine ? ownerActions(p) : buyerActions(p),
          h("div", { class: "small muted row", style: { gap: "8px" } }, icon("shield-check", 18),
            h("span", { style: { flex: "1" } }, "Ödemeyi teslimde yapın; ev adresi ve banka bilgisi paylaşmayın.")),
        ),

        p.description ? h("section", { class: "section-block" },
          h("h2", { class: "block-head" }, "Ürün açıklaması"),
          h("p", { class: "block-body", style: { whiteSpace: "pre-line" } }, p.description),
        ) : null,

        h("section", { class: "section-block stack" },
          h("h2", { class: "block-head" }, "Satıcı"),
          h("div", { class: "profile-head" },
            h("span", { class: "avatar avatar-sm" }, seller.avatar_url ? h("img", { src: seller.avatar_url, alt: "" }) : (seller.full_name || "?")[0].toLocaleUpperCase("tr-TR")),
            h("div", {},
              h("strong", {}, seller.full_name || "Komşu"),
              h("div", { class: "meta" }, months ? `Femoria'da ${months} aydır` : "Femoria'ya yeni katıldı"),
            ),
          ),
          verified ? h("div", { class: "badges" }, h("span", { class: "chip chip-ok chip-status" }, icon("check"), "Doğrulanmış")) : null,
          badgeChips(p.sellerBadges),
        ),
      ),
    ),
  );
}

function buyerActions(p) {
  if (p.status !== "satista") return null;
  return h("button", { class: "btn btn-primary btn-xl", onclick: async () => {
    if (!requireAuth(`/urun/${p.id}`)) return;
    try {
      const convId = await startConversation(p.id);
      track("chat_started", { product_id: p.id });
      navigate(`/sohbet/${convId}`);
    } catch (e) {
      toast(e.message || "Şu an mesaj gönderilemiyor.");
    }
  } }, withIcon("message", "Satıcıya yaz"));
}

function removedNotice(p) {
  if (p.photos_purged_at) return h("p", { class: "notice" }, icon("trash", 20), "Bu ürün vitrinden kaldırıldı ve fotoğrafları silindi.");
  const days = daysUntilPurge(p.removed_at);
  return h("div", { class: "stack" },
    h("p", { class: "notice" }, icon("alert", 20), days > 0 ? `Bu ürün vitrinden kaldırıldı. Fotoğrafları ${days} gün sonra silinecek.` : "Bu ürün vitrinden kaldırıldı. Fotoğrafları bu gece silinecek."),
    h("button", { class: "btn btn-secondary", onclick: async () => {
      try { await restoreProduct(p.id); toast("Ürününüz yeniden vitrinde."); navigate(`/urun/${p.id}`, { replace: true }); }
      catch (e) { toast(e.message || "Geri alınamadı."); }
    } }, withIcon("refresh", "Geri al")),
  );
}

function ownerActions(p) {
  return h("div", { class: "stack" },
    h("p", { class: "notice" }, icon("user", 20), "Bu sizin ürününüz."),
    p.status === "satista" ? h("button", { class: "btn btn-success", onclick: async () => {
      await setProductStatus(p.id, "satildi"); toast("Satıldı olarak işaretlendi. Hayırlı olsun!"); navigate("/profil");
    } }, withIcon("check", "Satıldı olarak işaretle")) : null,
    p.status === "satildi" ? h("button", { class: "btn btn-secondary", onclick: async () => {
      await setProductStatus(p.id, "satista"); toast("Yeniden satışta."); navigate(`/urun/${p.id}`, { replace: true });
    } }, "Yeniden satışa çıkar") : null,
    p.status === "kaldirildi" ? removedNotice(p) : h("button", { class: "btn btn-danger", onclick: async () => {
      if (!(await ask("Ürünü vitrinden kaldıralım mı?",
        `Bu ürünle ilgili hiç mesajlaşma yoksa ürün ve fotoğrafları hemen kalıcı olarak silinir. Mesajlaşma varsa sohbetleriniz bozulmasın diye ${PHOTO_RETENTION_DAYS} gün saklanır; bu sürede geri alabilirsiniz, sonra fotoğrafları silinir.`,
        "Evet, kaldır"))) return;
      try {
        const res = await removeProduct(p.id);
        track("product_removed", { deleted: !!res?.deleted });
        toast(res?.deleted ? "Ürün ve fotoğrafları silindi." : `Vitrinden kaldırıldı. ${PHOTO_RETENTION_DAYS} gün içinde Profil → Kaldırılanlar'dan geri alabilirsiniz.`, 5000);
        navigate("/profil");
      } catch (e) { toast(e.message || "Kaldırılamadı, tekrar deneyin."); }
    } }, withIcon("trash", "Vitrinden kaldır")),
  );
}
