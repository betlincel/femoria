// Ürün sayfası — solda galeri, sağda fiyat ve "Satıcıya yaz" kutusu, altında satıcı ve güven bilgisi.
import { h, formatPrice, formatDistance, monthsSince, toast, loading, emptyState, ask, icon, withIcon } from "../ui.js";
import { categoryIconName } from "../icons.js";
import { state } from "../store.js";
import { getProduct, photoUrl, categoryOf, startConversation, setProductStatus, removeProduct, track, DELIVERY_LABEL } from "../api.js";
import { badgeChips, breadcrumb } from "../components.js";
import { navigate, requireAuth } from "../router.js";

export default async function render(root, { params: [id] }) {
  root.append(loading());
  const p = await getProduct(id).catch(() => null);
  root.replaceChildren();
  if (!p) {
    root.append(h("div", { class: "card" }, emptyState("bag", "Bu ürün bulunamadı", "Satılmış ya da kaldırılmış olabilir.", h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak"))));
    return;
  }

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
    breadcrumb(["Ana sayfa", "#/"], [cat.name, `#/urunler?kategori=${p.category}`], [p.title]),
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
          h("div", { class: "badges" },
            h("span", { class: "chip" }, icon("truck"), DELIVERY_LABEL[p.delivery]),
            p.neighborhood || p.district ? h("span", { class: "chip" }, icon("map-pin"), [p.neighborhood, p.district, p.city].filter(Boolean).join(", ")) : null,
          ),
          p.status === "satildi" ? h("p", { class: "notice" }, icon("alert", 20), "Bu ürün satıldı.") : null,
          mine ? ownerActions(p) : buyerActions(p),
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
