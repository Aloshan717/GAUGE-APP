// Shared Supabase settings for the serverless functions.
// The URL and publishable key are public (they ship in the app as well).
// The secret key, used only for invites, comes from Vercel's environment.
export const SUPABASE_URL = process.env.SUPABASE_URL || "https://mhksjkzpyurcspcnvxtr.supabase.co";
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_SnjjsrjYxe_SEWJqwht3pQ_i0yA91tr";

// Who is calling? Returns the Supabase user for a "Bearer <token>" header, or null.
export async function userFromAuthHeader(header) {
  const token = String(header || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { user: null, status: 401 };
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (r.ok) return { user: await r.json(), status: 200 };
    return { user: null, status: r.status === 401 || r.status === 403 ? 401 : 503 };
  } catch {
    return { user: null, status: 503 };
  }
}

// Read a JSON body whether or not Vercel already parsed it.
export function jsonBody(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  if (typeof b === "string") { try { return JSON.parse(b); } catch { return {}; } }
  return {};
}
