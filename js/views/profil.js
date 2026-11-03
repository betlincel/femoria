// Profil — tek hesap: alıcı ve satıcı. "Sattıklarım" / "Aldıklarım" + "Kazancım".
import { h, loading, emptyState, formatPrice, monthsSince, toast, prepareImage, icon, withIcon } from "../ui.js";
import { state, updateProfile } from "../store.js";
import { myEarnings, myProducts, myPurchases, userBadges, uploadAvatar, myRemovedProducts, restoreProduct, daysUntilPurge, PHOTO_RETENTION_DAYS } from "../api.js";
import { productCard, badgeChips, productPhoto } from "../components.js";
import { requireAuth } from "../router.js";

const STATUS = { satista: "Satışta", satildi: "Satıldı", taslak: "Taslak" };
const ORDER_STATUS = { teklif: "Onay bekliyor", anlasildi: "Anlaşıldı", teslim_edildi: "Teslim alındı" };

function linkList() {
  const row = (href, ico, label) => h("a", { class: "list-item", href }, icon(ico), h("div", { class: "body" }, h("strong", {}, label)), icon("chevron-right"));
  return h("div", { class: "list" },
    row("#/ayarlar", "settings", "Ayarlar"),
    row("#/rehber", "book", "Femoria'yı nasıl kullanırım?"),
  );
}

export default async function render(root) {
  if (!state.user) {
    root.append(h("h1", {}, "Profilim"),
      emptyState("user", "Henüz giriş yapmadınız", "Önce üye olmadan etrafa bakabilirsiniz. Üyelik ancak bir şey satmak ya da almak istediğinizde sorulur.",
        h("div", { class: "stack", style: { maxWidth: "320px", margin: "0 auto" } },
          h("a", { class: "btn btn-primary", href: "#/giris" }, "Giriş yap"),
          h("a", { class: "btn btn-secondary", href: "#/giris?mod=kayit" }, "Üye ol"),
        )),
      linkList(),
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
    p.avatar_url ? h("img", { src: p.avatar_url, alt: "" }) : (p.full_name || "?")[0].toLocaleUpperCase("tr-TR"));

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
        h("div", { class: "meta" }, icon("map-pin"), [p.neighborhood, p.district].filter(Boolean).join(", ") || "Mahalle seçilmedi"),
        h("div", { class: "meta" }, icon("calendar"), months ? `Femoria'da ${months} aydır` : "Femoria'ya yeni katıldınız"),
        state.user.email ? h("div", { class: "meta" }, icon("message"), state.user.email, p.email_verified ? h("span", { class: "chip chip-ok" }, "Doğrulandı") : null) : null,
      ),
    ),
    badgesEl,
    earningsEl,
    tabs,
    tabBody,
    h("div", { class: "section" }, linkList()),
  );
  drawTabs();

  // Güven rozetleri
  userBadges(state.user.id).then((b) => badgesEl.replaceChildren(badgeChips(b) || h("span")));

  // "Kazancım" / Emek Defteri
  myEarnings().then((e) => {
    earningsEl.replaceChildren(
      h("div", { class: "section-title" }, h("h2", {}, "Kazancım"), h("span", { class: "chip" }, "Bu ay")),
      h("div", { class: "stats" },
        h("div", { class: "stat" }, h("div", { class: "num" }, e.items_sold), h("div", { class: "lbl" }, "ürün sattınız")),
        h("div", { class: "stat" }, h("div", { class: "num" }, formatPrice(e.total)), h("div", { class: "lbl" }, "toplam kazanç")),
      ),
      e.new_neighbors ? h("p", { class: "meta", style: { marginTop: "12px" } }, icon("users"), `Bu ay ${e.new_neighbors} yeni komşuya ulaştınız.`) : null,
    );
  }).catch(() => earningsEl.replaceChildren(h("p", { class: "muted" }, "Kazanç bilgisi şu an yüklenemedi.")));

  // Vitrinden kaldırılanlar: 30 gün içinde geri alınabilir, sonra fotoğrafları silinir
  function removedSection(list) {
    return h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Kaldırılanlar")),
      h("p", { class: "muted small" }, `Bu ürünlerle ilgili mesajlaşmanız olduğu için sohbetleriniz bozulmasın diye saklanıyor. Kaldırdıktan ${PHOTO_RETENTION_DAYS} gün sonra fotoğrafları kalıcı olarak silinir.`),
      h("div", { class: "stack" }, list.map((it) => {
        const purged = !!it.photos_purged_at;
        const days = daysUntilPurge(it.removed_at);
        return h("div", { class: "card product-card" },
          productPhoto(it),
          h("div", { class: "stack", style: { gap: "6px" } },
            h("div", { class: "title" }, it.title),
            h("div", { class: "meta" }, icon(purged ? "trash" : "calendar"),
              purged ? "Fotoğrafları silindi" : days > 0 ? `Fotoğrafları ${days} gün sonra silinecek` : "Fotoğrafları bu gece silinecek"),
            purged ? null : h("button", { class: "btn btn-secondary btn-inline", style: { alignSelf: "flex-start" }, onclick: async (e) => {
              e.currentTarget.disabled = true;
              try { await restoreProduct(it.id); toast("Ürününüz yeniden vitrinde."); loadTab(); }
              catch (err) { toast(err.message || "Geri alınamadı."); e.currentTarget.disabled = false; }
            } }, ...withIcon("refresh", "Geri al")),
          ),
        );
      })),
    );
  }

  async function loadTab() {
    tabBody.replaceChildren(loading());
    if (tab === "sattiklarim") {
      const [items, removed] = await Promise.all([myProducts().catch(() => []), myRemovedProducts().catch(() => [])]);
      tabBody.replaceChildren(...(items.length
        ? [h("div", { class: "pgrid pgrid-4" }, items.map((it) => { const c = productCard(it); c.querySelector(".meta").prepend(h("span", { class: `chip ${it.status === "satista" ? "chip-ok" : ""}` }, STATUS[it.status] || it.status)); return c; }))]
        : [emptyState("camera", "Henüz ürün koymadınız", "İlk ürününüzü bugün çekin; gerisini birlikte hallederiz.", h("a", { class: "btn btn-primary", href: "#/sat" }, "Bir şey sat"))]),
        removed.length ? removedSection(removed) : "");
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
        : [emptyState("bag", "Henüz bir şey almadınız", "Mahallenizdeki el emeği ürünlere bakın.", h("a", { class: "btn btn-primary", href: "#/yakinimda" }, "Yakınımda"))]));
    }
  }
  loadTab();
}
