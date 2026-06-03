import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
  client = null;
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("請設定 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!client) {
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
