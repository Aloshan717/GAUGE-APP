// Invite-only accounts.
//
// GET  /api/invite            → { admin, configured }  (may this user invite?)
// POST /api/invite { email }  → sends a Supabase invite email
//
// Needs two Vercel environment variables:
//   SUPABASE_SERVICE_ROLE_KEY — Supabase → Project Settings → API keys → secret key
//   ADMIN_EMAILS              — comma-separated emails allowed to invite
// Without them nobody can invite from the app; invites can still be sent from
// Supabase → Authentication → Users → Invite user.
import { SUPABASE_URL, userFromAuthHeader, jsonBody } from "./_supabase.js";

const admins = () => String(process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function adminHeaders(key) {
  const h = { "Content-Type": "application/json", apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;   // legacy service_role JWT
  return h;
}

export default async function handler(req, res) {
  const { user, status } = await userFromAuthHeader(req.headers?.authorization);
  if (!user) return res.status(status).json({ ok: false, error: "Sign in again, then retry." });

  const isAdmin = admins().includes(String(user.email || "").toLowerCase());
  const configured = !!secret() && admins().length > 0;

  if (req.method === "GET") return res.status(200).json({ admin: isAdmin, configured });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });
  if (!configured) return res.status(501).json({ ok: false, error: "not-configured" });
  if (!isAdmin) return res.status(403).json({ ok: false, error: "Only the admin can send invites." });

  const body = jsonBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: "That email doesn't look right." });

  // The invite link opens Evolve wherever it is served (e.g. /evolve/ on Gauge's site).
  const origin = req.headers?.origin || (req.headers?.host ? `https://${req.headers.host}` : "");
  const asked = String(body.redirect || "");
  const redirect = origin && asked.startsWith(origin + "/") ? asked : origin ? origin + "/" : "";
  const url = `${SUPABASE_URL}/auth/v1/invite${redirect ? `?redirect_to=${encodeURIComponent(redirect)}` : ""}`;
  try {
    const r = await fetch(url, { method: "POST", headers: adminHeaders(secret()), body: JSON.stringify({ email }) });
    const body = await r.json().catch(() => null);
    if (r.ok) return res.status(200).json({ ok: true });
    if (r.status === 422) return res.status(409).json({ ok: false, error: "exists" });
    return res.status(502).json({ ok: false, error: body?.msg || body?.message || `Supabase returned ${r.status}` });
  } catch {
    return res.status(503).json({ ok: false, error: "Couldn't reach Supabase. Try again." });
  }
}
