// Profil — tek hesap: alıcı ve satıcı. "Sattıklarım" / "Aldıklarım" + "Kazancım".
import { h, loading, emptyState, formatPrice, monthsSince, toast, prepareImage } from "../ui.js";
import { state, updateProfile } from "../store.js";
import { myEarnings, myProducts, myPurchases, userBadges, uploadAvatar } from "../api.js";
import { productCard, badgeChips, productPhoto } from "../components.js";
import { requireAuth } from "../router.js";

const STATUS = { satista: "Satışta", satildi: "Satıldı", taslak: "Taslak" };
const ORDER_STATUS = { teklif: "Onay bekliyor", anlasildi: "Anlaşıldı", teslim_edildi: "Teslim alındı" };

export default async function render(root) {
  if (!state.user) {
    root.append(h("h1", {}, "Profilim"),
      emptyState("👤", "Henüz giriş yapmadınız", "Önce üye olmadan etrafa bakabilirsiniz. Üyelik ancak bir şey satmak ya da almak istediğinizde sorulur.",
        h("button", { class: "btn btn-primary", onclick: () => requireAuth("/profil") }, "Telefonumla giriş yap")),
      h("a", { class: "btn btn-secondary", href: "#/ayarlar" }, "⚙️ Ayarlar"),
      h("div", { class: "spacer" }),
      h("a", { class: "btn btn-secondary", href: "#/rehber" }, "📖 Femoria'yı nasıl kullanırım?"),
    );
    return;
  }

  const p = state.profile || {};
  const months = monthsSince(p.created_at || Date.now());
  const avatarInput = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadAvatar(await prepareImage(f, 512));
      await updateProfile({ avatar_url: url });
      toast("Fotoğrafınız güncellendi.");
      avatar.replaceChildren(h("img", { src: url, alt: "" }));
    } catch { toast("Fotoğraf yüklenemedi."); }
  } });
  const avatar = h("button", { class: "avatar avatar-lg", "aria-label": "Profil fotoğrafını değiştir", onclick: () => avatarInput.click(), style: { cursor: "pointer" } },
    p.avatar_url ? h("img", { src: p.avatar_url, alt: "" }) : (p.full_name || "?")[0]);

  const badgesEl = h("div");
  const earningsEl = h("div", { class: "card section" }, loading());
  const tabBody = h("div", { class: "stack" });
  let tab = "sattiklarim";

  const tabs = h("div", { class: "tabs", role: "tablist" });
  const drawTabs = () => tabs.replaceChildren(...[["sattiklarim", "Sattıklarım"], ["aldiklarim", "Aldıklarım"]].map(([k, l]) =>
    h("button", { role: "tab", "aria-selected": String(tab === k), onclick: () => { tab = k; drawTabs(); loadTab(); } }, l)));

  root.append(
    h("div", { class: "profile-head" }, avatar, avatarInput,
      h("div", {},
        h("h1", {}, p.full_name || "Adınız"),
        h("div", { class: "meta" }, [p.neighborhood, p.district].filter(Boolean).join(", ") || "Mahalle seçilmedi"),
        h("div", { class: "meta" }, months ? `Femoria'da ${months} aydır` : "Femoria'ya yeni katıldınız 🌱"),
      ),
    ),
    badgesEl,
    earningsEl,
    tabs,
    tabBody,
    h("div", { class: "spacer" }),
    h("a", { class: "btn btn-secondary", href: "#/ayarlar" }, h("span", { class: "ico", "aria-hidden": "true" }, "⚙️"), "Ayarlar"),
    h("div", { class: "spacer" }),
    h("a", { class: "btn btn-secondary", href: "#/rehber" }, h("span", { class: "ico", "aria-hidden": "true" }, "📖"), "Femoria'yı nasıl kullanırım?"),
  );
  drawTabs();

  // Güven rozetleri
  userBadges(state.user.id).then((b) => badgesEl.replaceChildren(badgeChips(b) || h("span")));

  // "Kazancım" / Emek Defteri
  myEarnings().then((e) => {
    earningsEl.replaceChildren(
      h("h2", {}, "💰 Kazancım — bu ay"),
      h("div", { class: "earnings" },
        h("div", {}, h("div", { class: "num" }, e.items_sold), h("div", { class: "muted" }, "ürün sattınız")),
        h("div", {}, h("div", { class: "num" }, formatPrice(e.total)), h("div", { class: "muted" }, "toplam")),
      ),
      e.new_neighbors ? h("p", { class: "center", style: { marginTop: "8px" } }, `📒 Bu ay ${e.new_neighbors} yeni komşuya ulaştınız.`) : null,
    );
  }).catch(() => earningsEl.replaceChildren(h("p", { class: "muted" }, "Kazanç bilgisi şu an yüklenemedi.")));

  async function loadTab() {
    tabBody.replaceChildren(loading());
    if (tab === "sattiklarim") {
      const items = await myProducts().catch(() => []);
      tabBody.replaceChildren(...(items.length
        ? items.map((it) => { const c = productCard(it); c.querySelector(".meta").prepend(h("span", { class: "chip" }, STATUS[it.status] || it.status), " "); return c; })
        : [emptyState("📸", "Henüz ürün koymadınız", "İlk ürününüzü bugün çekin; gerisini birlikte hallederiz.", h("a", { class: "btn btn-primary", href: "#/sat" }, "Bir şey sat"))]));
    } else {
      const orders = await myPurchases().catch(() => []);
      tabBody.replaceChildren(...(orders.length
        ? orders.map((o) => h("a", { class: "card card-link product-card", href: `#/sohbet/${o.conversation_id}` },
            productPhoto({ photos: o.products?.photos, category: "diger", title: o.products?.title }),
            h("div", {},
              h("div", { class: "title" }, o.products?.title || "Ürün"),
              h("div", { class: "price" }, formatPrice(o.unit_price * o.quantity)),
              h("div", { class: "meta" }, `${o.quantity} adet · ${ORDER_STATUS[o.status] || o.status}`),
            )))
        : [emptyState("🛍️", "Henüz bir şey almadınız", "Mahallenizdeki el emeği ürünlere bakın.", h("a", { class: "btn btn-primary", href: "#/yakinimda" }, "Yakınımda"))]));
    }
  }
  loadTab();
}
