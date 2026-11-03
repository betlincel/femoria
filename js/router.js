// Basit hash yönlendirici: #/yol?sorgu=deger
import { state } from "./store.js";

const routes = [];
let cleanup = null;
let current = { screen: "vitrin", path: "/" };
const listeners = new Set();

export const route = (pattern, screen, load) => routes.push({ pattern, screen, load });
export const currentScreen = () => current.screen;
export const onRoute = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (replace) history.replaceState(null, "", target);
  if (location.hash === target) render();
  else if (replace) render();
  else location.hash = target;
}

/** Giriş gerektiren işlemlerden önce çağrılır. Üyelik yalnız gerektiğinde istenir. */
export function requireAuth(next = location.hash.slice(1) || "/") {
  if (state.user) return true;
  navigate(`/giris?next=${encodeURIComponent(next)}`);
  return false;
}

function parse() {
  const raw = location.hash.slice(1) || "/";
  const [pathPart, qs = ""] = raw.split("?");
  const path = pathPart.split("#")[0]; // "/rehber#satmak" → "/rehber" (sayfa içi bölüm)
  return { path: path || "/", query: Object.fromEntries(new URLSearchParams(qs)) };
}

export async function render() {
  const { path, query } = parse();
  const root = document.getElementById("app");
  const match = routes.map((r) => ({ r, m: path.match(r.pattern) })).find((x) => x.m);
  if (typeof cleanup === "function") { try { cleanup(); } catch { /* yoksay */ } }
  cleanup = null;

  if (!match) return navigate("/", { replace: true });
  current = { screen: match.r.screen, path };
  listeners.forEach((fn) => fn(current));

  root.replaceChildren();
  document.getElementById("sheet-root")?.replaceChildren(); // önceki sayfanın açık alt sayfaları kapanır
  window.scrollTo(0, 0);
  try {
    const mod = await match.r.load();
    cleanup = await mod.default(root, { params: match.m.slice(1), query });
  } catch (err) {
    console.error(err);
    root.replaceChildren(Object.assign(document.createElement("div"), {
      className: "notice",
      textContent: "Bir şeyler ters gitti. İnternetinizi kontrol edip sayfayı yenileyebilir misiniz?",
    }));
  }
  root.focus({ preventScroll: true });
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  render();
}
