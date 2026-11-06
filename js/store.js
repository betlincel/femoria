// Uygulama durumu: oturum, profil, konum ve ayarlar.
import { supabase, isConfigured } from "./supabase.js";
import { setTTS } from "./ui.js";

const LS = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem(`femoria:${key}`)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(`femoria:${key}`);
      else localStorage.setItem(`femoria:${key}`, JSON.stringify(value));
    } catch { /* gizli sekme vb. */ }
  },
};
export { LS };

export const state = {
  session: null,
  user: null,
  profile: null,
  location: LS.get("location"), // { lat, lng, city, district, neighborhood, source }
  categories: [],
  settings: { font_scale: 1, tts_enabled: false, notifications_enabled: true, ...LS.get("settings", {}) },
  sessionId: sessionStorage.getItem("femoria:sid") || crypto.randomUUID(),
};
sessionStorage.setItem("femoria:sid", state.sessionId);

const listeners = new Set();
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn(state));

export const isLoggedIn = () => !!state.user;

export async function initAuth() {
  applySettings();
  if (!isConfigured) return;
  const { data } = await supabase.auth.getSession();
  await setSession(data.session);
  cleanAuthParams();
  supabase.auth.onAuthStateChange((event, session) => {
    // E-postadaki "şifremi yenile" bağlantısından gelindi
    if (event === "PASSWORD_RECOVERY") state.passwordRecovery = true;
    // Supabase önerisi: geri çağırım içinde await etmeyin.
    setTimeout(() => setSession(session), 0);
  });
}

// E-posta bağlantısından dönüşte adres çubuğundaki ?code=… / ?error=… parametrelerini temizle.
function cleanAuthParams() {
  const params = new URLSearchParams(location.search);
  if (params.has("error_description")) state.authLinkError = params.get("error_description");
  if (["code", "error", "error_code", "error_description"].some((k) => params.has(k))) {
    history.replaceState(null, "", location.pathname + location.hash);
  }
}

/**
 * Giriş / üyelik sonrası oturumu HEMEN işle. onAuthStateChange geri çağırımı bir an sonra
 * (setTimeout) çalıştığından, beklemeden profil okunursa boş gelir ve kullanıcı yanlışlıkla
 * "Son adım" formuna düşerdi. Aynı kullanıcı için profil ikinci kez yüklenmez.
 */
export const syncSession = (session) => setSession(session);

async function setSession(session) {
  const prevUser = state.user?.id;
  state.session = session;
  state.user = session?.user ?? null;
  if (state.user && state.user.id !== prevUser) await loadProfile();
  if (!state.user) state.profile = null;
  emit();
}

export async function loadProfile() {
  if (!state.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
  state.profile = data;
  if (data) {
    state.settings = {
      font_scale: Number(data.font_scale) || 1,
      tts_enabled: data.tts_enabled,
      notifications_enabled: data.notifications_enabled,
    };
    LS.set("settings", state.settings);
    applySettings();
    // Giriş yapmadan verilen konum rızasını profile taşı
    const localConsent = LS.get("location_consent");
    if (localConsent && !data.location_consent_at) {
      updateProfile({ location_consent_at: localConsent.at }).catch(() => {});
    }
  }
  emit();
  return data;
}

export async function updateProfile(patch) {
  if (!state.user) throw new Error("Giriş yapmanız gerekiyor");
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", state.user.id).select().single();
  if (error) throw error;
  state.profile = data;
  emit();
  return data;
}

/**
 * En son kullanılan konum: bir sonraki ürünü satarken öneri olarak gelir. Yalnız bu cihazda
 * saklanır; profile ya da sunucuya yazılmaz. Ürünlerin konumu her ürün için ayrıca kaydedilir.
 */
export async function saveLocation(loc) {
  state.location = loc;
  LS.set("location", loc);
  emit();
}

// ---------- Konum rızası (KVKK açık rıza) ----------
export const hasLocationConsent = () => !!(state.profile?.location_consent_at || LS.get("location_consent"));

export async function recordLocationConsent() {
  const at = new Date().toISOString();
  LS.set("location_consent", { at });
  if (state.user) await updateProfile({ location_consent_at: at }).catch(() => {});
}

/** Rızayı geri al: bu cihazdaki konum silinir, rıza kaydı kaldırılır. */
export async function withdrawLocation() {
  LS.set("location_consent", null);
  LS.set("location", null);
  state.location = null;
  if (state.user) await updateProfile({ location_consent_at: null });
  emit();
}

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  LS.set("settings", state.settings);
  applySettings();
  if (state.user) await updateProfile(patch).catch(() => {});
  emit();
}

export function applySettings() {
  document.documentElement.style.setProperty("--font-scale", state.settings.font_scale || 1);
  setTTS(state.settings.tts_enabled === true); // sesli okuma isteğe bağlı, varsayılan kapalı
}

export async function signOut() {
  if (isConfigured) await supabase.auth.signOut();
  state.profile = null;
  emit();
}
