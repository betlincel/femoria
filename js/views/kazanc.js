// Kazancım — satıcının bekleyen / aktarılan / iade edilen tutarları ve siparişleri.
import { h, loading, emptyState, formatPrice, icon } from "../ui.js";
import { pageTitle } from "../components.js";
import { state } from "../store.js";
import { myEarningsDetail } from "../api.js";
import { COMMISSION_RATE } from "../config.js";
import { requireAuth } from "../router.js";

const net = (gross) => Math.round(gross * (1 - COMMISSION_RATE) * 100) / 100;
const pct = Math.round(COMMISSION_RATE * 100);

function state_(o) {
  if (o.dispute_status === "acik") return ["Sorun bildirildi", "chip-warn"];
  if (o.payout_status === "iade" || o.payment_status === "iade") return ["İade edildi", ""];
  if (o.payout_status === "onaylandi") return ["Hesabınıza aktarıldı", "chip-ok"];
  if (o.payment_status === "odendi") return [o.shipping_status === "kargoda" ? "Kargoda · alıcı onayı bekleniyor" : "Ödendi · kargoya verin", "chip-warn"];
  if (o.status === "teslim_edildi") return ["Elden teslim", "chip-ok"];
  return ["Anlaşıldı", ""];
}

export default async function render(root) {
  if (!requireAuth("/kazanc")) return;
  root.append(pageTitle("Kazancım", { back: "/profil" }), loading());
  const d = await myEarningsDetail().catch(() => null);
  root.replaceChildren(pageTitle("Kazancım", { back: true }));
  if (!d) {
    root.append(h("div", { class: "card" }, emptyState("wallet", "Kazanç bilgisi yüklenemedi", "Veritabanı güncellemesi (20261118000019_admin_earnings.sql) henüz yapılmamış olabilir.")));
    return;
  }
  const stat = (num, lbl, sub, cls = "") => h("div", { class: `stat ${cls}` }, h("div", { class: "num" }, formatPrice(num)), h("div", { class: "lbl" }, lbl), sub ? h("div", { class: "small muted" }, sub) : null);
  root.append(
    h("div", { class: "stats earn-stats" },
      stat(net(d.pending), "Emanette bekleyen", `${d.pending_n} sipariş · alıcı onaylayınca hesabınıza geçer`),
      stat(net(d.released), "Hesabınıza aktarılan", `${d.released_n} sipariş`, "stat-ok"),
      d.cash > 0 ? stat(d.cash, "Elden satışlar", "Ödeme sizinle alıcı arasında") : null,
      d.refunded > 0 ? stat(d.refunded, "İade edilen", "Hesabınıza geçmez") : null,
    ),
    h("p", { class: "small muted" }, `Tutarlar, Femoria'nın online satıştan aldığı %${pct} pay düşüldükten sonraki tahmini net tutardır. Kesin tutar ödeme sağlayıcısının kaydındadır. Para, alıcı teslimi onayladığında ya da onay süresi dolduğunda aktarılır.`),
    d.disputes ? h("p", { class: "notice" }, icon("alert", 20), `${d.disputes} siparişte açık sorun bildirimi var; çözülene kadar ödeme aktarılmaz.`) : null,
    state.profile && !state.profile.payout_ready
      ? h("a", { class: "card card-link", href: "#/odeme-hesabi" }, h("strong", {}, "Online ödeme almak için ödeme hesabınızı açın"), h("p", { class: "small muted", style: { margin: 0 } }, "IBAN bilgilerinizi bir kez girin; kartla yapılan satışlar hesabınıza geçsin."))
      : null,
    h("section", { class: "section" },
      h("div", { class: "section-title" }, h("h2", {}, "Siparişlerim (satış)")),
      d.orders?.length
        ? h("div", { class: "list" }, d.orders.map((o) => {
            const [label, cls] = state_(o);
            const online = o.payment_status !== "yok";
            return h("a", { class: "list-item", href: `#/sohbet/${o.conversation_id}` },
              h("div", { class: "body" },
                h("strong", {}, o.product_title),
                h("div", { class: "small muted" }, `${o.quantity} adet · ${new Date(o.created_at).toLocaleDateString("tr-TR")}`),
                h("span", { class: `chip ${cls}` }, label)),
              h("div", { class: "earn-amt" }, h("strong", {}, formatPrice(online ? net(o.amount) : o.amount)), online ? h("div", { class: "small muted" }, `brüt ${formatPrice(o.amount)}`) : null));
          }))
        : emptyState("package", "Henüz satış yok", "Siparişleriniz burada görünür."),
    ),
  );
}
