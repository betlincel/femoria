import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "femoria-auth",
        // PKCE: e-posta onay ve şifre yenileme bağlantıları ?code=... ile döner;
        // hash tabanlı yönlendiriciyle (#/...) çakışmaz.
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    })
  : null;

export const NOT_CONFIGURED = "Supabase bağlantısı ayarlanmadı (js/config.js).";

/** E-posta bağlantılarının döneceği adres (hash olmadan). */
export const authRedirectUrl = () => `${location.origin}${location.pathname}`;
