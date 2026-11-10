// Mağaza — satıcının herkese açık sayfası: tanıtım, puan, takipçi, satış sayısı, ürünleri ve yorumları.
import { h, loading, emptyState, toast, icon, withIcon, monthsSince } from "../ui.js";
import { state } from "../store.js";
import { sellerStore, sellerReviews, setFollow } from "../api.js";
import { productGrid, breadcrumb } from "../components.js";
import { requireAuth } from "../router.js";

export const starsText = (rating) => {
  const r = Math.min(5, Math.floor((Number(rating) || 0) + 0.25)); // 4,5 → 4 yıldız (abartma), 4,8 → 5
  return h("span", { class: "stars", "aria-label": `5 üzerinden ${rating}` }, "★".repeat(r), h("span", { class: "off" }, "★".repeat(5 - r)));
};

export default async function render(root, { params: [id] }) {
  root.append(loading());
  const store = await sellerStore(id).catch((e) => { console.error("[Mağaza]", e); return null; });
  root.replaceChildren();
  if (!store) {
    root.append(h("div", { class: "card" }, emptyState("user", "Mağaza bulunamadı", "Bu satıcı hesabını kapatmış olabilir.", h("a", { class: "btn btn-primary", href: "#/urunler" }, "Ürünlere bak"))));
    return;
  }
  const { profile: p, stats: s } = store;
  const mine = state.user?.id === id;
  const name = p.full_name || "Komşu";
  const months = monthsSince(p.created_at);
  let following = !!s.following;
  let followers = Number(s.followers) || 0;

  const followBtn = h("button", { type: "button", class: "btn btn-primary follow-btn" });
  const followersEl = h("strong");
  const paintFollow = () => {
    followBtn.replaceChildren(...withIcon(following ? "check" : "plus", following ? "Takip ediliyor" : "Takip et"));
    followBtn.classList.toggle("is-on", following);
    followBtn.setAttribute("aria-pressed", String(following));
    followersEl.textContent = followers;
  };
  followBtn.onclick = async () => {
    if (!requireAuth(`/magaza/${id}`)) return;
    followBtn.disabled = true;
    try {
      await setFollow(id, !following);
      following = !following;
      followers += following ? 1 : -1;
      toast(following ? `${name} takip ediliyor. Yeni ürünleri ana sayfanızda öne çıkar.` : "Takip bırakıldı.");
      paintFollow();
    } catch (e) { toast(e.message || "Yapılamadı."); }
    followBtn.disabled = false;
  };
  paintFollow();

  const stat = (value, label) => h("div", { class: "store-stat" }, value, h("span", {}, label));
  const tabs = h("div", { class: "tabs", role: "tablist" });
  const body = h("div");
  let tab = "urunler";
  const drawTabs = () => tabs.replaceChildren(...[["urunler", `Ürünler (${store.products.length})`], ["yorumlar", `Yorumlar (${s.review_count || 0})`]].map(([k, l]) =>
    h("button", { role: "tab", "aria-selected": String(tab === k), onclick: () => { tab = k; drawTabs(); drawBody(); } }, l)));

  async function drawBody() {
    if (tab === "urunler") {
      body.replaceChildren(store.products.length ? productGrid(store.products) : h("div", { class: "card" },
        emptyState("bag", "Şu an satışta ürün yok", mine ? "İlk ürününüzü ekleyin." : "Takip ederseniz yeni ürünleri kaçırmazsınız.",
          mine ? h("a", { class: "btn btn-primary", href: "#/sat" }, "Ürün ekle") : null)));
      return;
    }
    body.replaceChildren(loading());
    const reviews = await sellerReviews(id).catch(() => []);
    body.replaceChildren(reviews.length ? h("div", { class: "stack" }, reviews.map((r) => h("article", { class: "card review" },
      h("div", { class: "review-head" }, starsText(r.rating), h("strong", {}, r.reviewer_name),
        h("span", { class: "small muted" }, new Date(r.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }))),
      r.product_title ? h("div", { class: "small muted" }, r.product_title) : null,
      r.comment ? h("p", { style: { margin: 0 } }, r.comment) : null)))
      : h("div", { class: "card" }, emptyState("award", "Henüz yorum yok", "Teslim alınan siparişlerden sonra alıcılar puan verebilir.")));
  }

  root.append(
    breadcrumb(["Ana sayfa", "#/"], ["Mağazalar", "#/urunler"], [name]),
    h("section", { class: "card store-head" },
      h("span", { class: "avatar avatar-lg" }, p.avatar_url ? h("img", { src: p.avatar_url, alt: "" }) : name[0].toLocaleUpperCase("tr-TR")),
      h("div", { class: "store-info" },
        h("h1", {}, name),
        h("div", { class: "small muted store-meta" },
          s.rating ? h("span", {}, starsText(s.rating), ` ${String(s.rating).replace(".", ",")} (${s.review_count} yorum)`) : h("span", {}, "Henüz puan yok"),
          h("span", {}, months > 0 ? `${months} aydır Femoria'da` : "Femoria'ya yeni katıldı"),
          p.email_verified || p.phone_verified ? h("span", { class: "chip chip-ok" }, icon("shield-check"), "Doğrulanmış") : null,
          p.payout_ready ? h("span", { class: "chip" }, icon("lock"), "Güvenli ödeme") : null),
        p.bio ? h("p", { class: "store-bio" }, p.bio)
          : mine ? h("a", { class: "link-btn", href: "#/ayarlar?bolum=magaza" }, ...withIcon("pencil", "Mağaza tanıtımı ekleyin (Ayşe Abla yardım eder)")) : null),
      h("div", { class: "store-side" },
        h("div", { class: "store-stats" },
          stat(followersEl, "takipçi"), stat(h("strong", {}, s.sold || 0), "satış"), stat(h("strong", {}, s.active || 0), "ürün")),
        mine ? h("a", { class: "btn btn-secondary", href: "#/profil" }, "Profilime git") : followBtn)),
    tabs, body,
  );
  drawTabs();
  drawBody();
}
