// Mesajlar — sohbet listesi
import { h, loading, emptyState, timeAgo, icon } from "../ui.js";
import { state } from "../store.js";
import { myConversations, photoUrl, subscribeIncoming } from "../api.js";
import { requireAuth } from "../router.js";

export default async function render(root) {
  root.append(h("h1", {}, "Mesajlar"));
  if (!state.user) {
    root.append(emptyState("message", "Mesajlarınız burada görünür", "Mesajlaşmak için hesabınıza giriş yapın ya da üye olun.",
      h("button", { class: "btn btn-primary", onclick: () => requireAuth("/mesajlar") }, "Giriş yap")));
    return;
  }
  const list = h("div", { class: "stack" }, loading());
  root.append(list);

  async function load() {
    const convs = await myConversations().catch(() => []);
    if (!convs.length) {
      list.replaceChildren(emptyState("message", "Henüz mesajınız yok", "Beğendiğiniz bir ürünün sayfasında \"Satıcıya yaz\"a dokunun.",
        h("a", { class: "btn btn-primary", href: "#/yakinimda" }, "Yakınımdakilere bak")));
      return;
    }
    list.replaceChildren(...convs.map((c) => {
      const img = photoUrl(c.products?.photos?.[0]);
      return h("a", { class: "card card-link conv-item", href: `#/sohbet/${c.id}` },
        img ? h("img", { src: img, alt: "" }) : h("div", { class: "ph", "aria-hidden": "true" }, icon("bag")),
        h("div", {},
          h("strong", {}, c.other.full_name || "Komşu"),
          h("div", { class: "meta" }, c.products?.title || "Ürün"),
          h("div", { class: "meta small" }, c.iAmBuyer ? "Siz alıcısınız" : "Siz satıcısınız", " · ", timeAgo(c.last_message_at)),
        ),
        c.unread ? h("span", { class: "dot", style: { position: "static" }, "aria-label": "Okunmamış" }) : h("span"),
      );
    }));
  }

  await load();
  return subscribeIncoming(load);
}
