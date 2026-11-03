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
  settings: { font_scale: 1, tts_enabled: true, notifications_enabled: true, ...LS.get("settings", {}) },
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
  supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase önerisi: geri çağırım içinde await etmeyin.
    setTimeout(() => setSession(session), 0);
  });
}

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
    // Cihazda seçilmiş konum varsa ve profilde yoksa profile taşı.
    if (!data.neighborhood && state.location?.neighborhood) await saveLocation(state.location);
    else if (data.neighborhood && !state.location) {
      state.location = {
        lat: data.approx_lat, lng: data.approx_lng, city: data.city,
        district: data.district, neighborhood: data.neighborhood, source: "profil",
      };
      LS.set("location", state.location);
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

export async function saveLocation(loc) {
  state.location = loc;
  LS.set("location", loc);
  if (state.user) {
    // Sunucu bu koordinatı ~500 m rastgele kaydırarak saklar.
    await updateProfile({
      approx_lat: loc.lat, approx_lng: loc.lng,
      city: loc.city, district: loc.district, neighborhood: loc.neighborhood,
    }).catch(() => {});
  }
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
  setTTS(state.settings.tts_enabled !== false);
}

export async function signOut() {
  if (isConfigured) await supabase.auth.signOut();
  state.profile = null;
  emit();
}
