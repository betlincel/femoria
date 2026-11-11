// Son gezilen ürünler (yalnız bu cihazda tutulur; sunucuya gönderilmez).
import { LS } from "./store.js";

const KEY = "recent_products", MAX = 20;
export const recentIds = () => (LS.get(KEY, []) || []).filter((x) => typeof x === "string");
export function rememberProduct(id) {
  if (!id) return;
  LS.set(KEY, [id, ...recentIds().filter((x) => x !== id)].slice(0, MAX));
}
