// Ürün sayfası — büyük fotoğraf, fiyat, mesafe, satıcı güveni ve "Satıcıya yaz".
import { h, formatPrice, formatDistance, monthsSince, toast, loading, emptyState, ask, icon, withIcon } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state } from "../store.js";
import { getProduct, photoUrl, categoryOf, startConversation, setProductStatus, track, DELIVERY_LABEL } from "../api.js";
import { pageTitle, badgeChips } from "../components.js";
import { navigate, requireAuth } from "../router.js";

const km = (a, b) => {
  if (a?.lat == null || b?.approx_lat == null) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.approx_lat - a.lat) * rad, dLng = (b.approx_lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.approx_lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default async function render(root, { params: [id] }) {
  root.append(pageTitle("Ürün", { back: true }), loading());
  const p = await getProduct(id).catch(() => null);
  root.lastChild.remove();
  if (!p) {
    root.append(emptyState("bag", "Bu ürün bulunamadı", "Satılmış ya da kaldırılmış olabilir.", h("a", { class: "btn btn-primary", href: "#/yakinimda" }, "Yakınımdakilere bak")));
    return;
  }

  const mine = state.user?.id === p.seller_id;
  const photos = p.photos.map(photoUrl).filter(Boolean);
  const main = photos.length
    ? h("img", { class: "card", style: { padding: 0, width: "100%", aspectRatio: "1", objectFit: "cover" }, src: photos[0], alt: p.title })
    : h("div", { class: "card", style: { aspectRatio: "1.4", display: "grid", placeItems: "center", color: "var(--text-faint)", background: "var(--surface-2)" } }, icon(categoryIconName(p.category), 72));
  const distance = km(state.location, p);
  const seller = p.seller || {};
  const months = seller.created_at ? monthsSince(seller.created_at) : 0;

  root.querySelector("h1").textContent = p.title;
  root.append(
    main,
    photos.length > 1 ? h("div", { class: "thumbs", style: { marginTop: "8px" } }, photos.map((u, i) => h("button", {
      style: { padding: 0, border: 0, background: "none", cursor: "pointer" }, "aria-label": `Fotoğraf ${i + 1}`,
      onclick: () => (main.src = u),
    }, h("img", { src: u, alt: "" })))) : null,

    h("div", { class: "stack section" },
      h("div", { class: "price", style: { fontSize: "1.8rem", letterSpacing: "-.02em" } }, formatPrice(p.price)),
      h("div", { class: "badges" },
        h("span", { class: "chip chip-brand" }, icon(categoryIconName(p.category)), categoryOf(p.category).name),
        h("span", { class: "chip" }, icon("truck"), DELIVERY_LABEL[p.delivery]),
        distance != null || p.neighborhood ? h("span", { class: "chip" }, icon("map-pin"), distance != null ? formatDistance(distance) : p.neighborhood) : null,
      ),
      p.status === "satildi" ? h("p", { class: "notice" }, icon("alert", 20), "Bu ürün satıldı.") : null,
      p.description ? h("p", {}, p.description) : null,
    ),

    h("div", { class: "card stack section" },
      h("div", { class: "eyebrow" }, "Satıcı"),
      h("div", { class: "profile-head" },
        h("span", { class: "avatar avatar-sm" }, seller.avatar_url ? h("img", { src: seller.avatar_url, alt: "" }) : (seller.full_name || "?")[0]),
        h("div", {},
          h("strong", {}, seller.full_name || "Komşu"),
          h("div", { class: "meta" }, [seller.neighborhood, months ? `Femoria'da ${months} aydır` : "Femoria'ya yeni katıldı"].filter(Boolean).join(" · ")),
        ),
      ),
      badgeChips(p.sellerBadges),
    ),
    h("div", { class: "spacer" }),
    mine ? ownerActions(p) : buyerActions(p),
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

function ownerActions(p) {
  return h("div", { class: "stack" },
    h("p", { class: "notice" }, icon("user", 20), "Bu sizin ürününüz."),
    p.status === "satista" ? h("button", { class: "btn btn-success", onclick: async () => {
      await setProductStatus(p.id, "satildi"); toast("Satıldı olarak işaretlendi. Hayırlı olsun!"); navigate("/profil");
    } }, withIcon("check", "Satıldı olarak işaretle")) : null,
    p.status === "satildi" ? h("button", { class: "btn btn-secondary", onclick: async () => {
      await setProductStatus(p.id, "satista"); toast("Yeniden satışta."); navigate(`/urun/${p.id}`, { replace: true });
    } }, "Yeniden satışa çıkar") : null,
    h("button", { class: "btn btn-danger", onclick: async () => {
      if (!(await ask("Ürünü kaldıralım mı?", "Vitrinden kaldırılır; sohbetleriniz kalır.", "Evet, kaldır"))) return;
      await setProductStatus(p.id, "kaldirildi"); toast("Kaldırıldı."); navigate("/profil");
    } }, withIcon("trash", "Vitrinden kaldır")),
  );
}
