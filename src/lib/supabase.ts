import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

let _client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_client) {
    _client = createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "ats-maker-auth" },
    });
  }
  return _client;
}

export const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-72d8818c`;

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; token?: string } = {}
): Promise<T> {
  const { method = "GET", body, token } = opts;
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? publicAnonKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-json response */ }
  if (!res.ok) {
    const msg = json?.message || json?.error || text || `Request failed: ${res.status}`;
    console.error(`[api ${method} ${path}]`, msg);
    // Create error with the message but also attach the full response
    const error: any = new Error(msg);
    error.status = res.status;
    error.code = json?.error;
    error.details = json;
    throw error;
  }
  return json as T;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}
