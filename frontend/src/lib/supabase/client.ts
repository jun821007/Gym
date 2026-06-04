import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const REMEMBER_PREF_KEY = "gym-auth-remember";

/** 只保留專案根網址，勿含 /rest/v1 等路徑 */
function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.replace(/\/rest\/v1$/i, "");
}

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && url.includes(".supabase.co"));
}

/** 讀取「保持登入」偏好（預設 true = 關閉瀏覽器後仍登入） */
export function getRememberPreference(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(REMEMBER_PREF_KEY) !== "0";
}

function createStorage(remember: boolean) {
  const store = remember ? localStorage : sessionStorage;
  return {
    getItem: (key: string) => store.getItem(key),
    setItem: (key: string, value: string) => store.setItem(key, value),
    removeItem: (key: string) => store.removeItem(key),
  };
}

let client: SupabaseClient | null = null;
let rememberSession = true;

export function setAuthPersistence(remember: boolean) {
  rememberSession = remember;
  if (typeof window !== "undefined") {
    localStorage.setItem(REMEMBER_PREF_KEY, remember ? "1" : "0");
  }
  client = null;
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("請設定 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!client) {
    if (typeof window !== "undefined") {
      rememberSession = getRememberPreference();
    }
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createStorage(rememberSession),
      },
    });
  }
  return client;
}
