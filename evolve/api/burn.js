// Apple Watch burn, sent by the free iPhone Shortcut every morning.
//
// POST /api/burn  { "key": "...", "date": "2026-11-05", "active": 812, "resting": 1968 }
// (also accepts the same fields as query parameters)
//
// The Shortcut has no login, so it sends the personal key shown in
// Evolve → Account → Apple Watch sync. Supabase stores only its SHA-256 and the
// ev_sync_burn function can do one thing: save that day's burn for its owner.
import { SUPABASE_URL, SUPABASE_ANON_KEY, jsonBody } from "./_supabase.js";

// Shortcuts may send "1,234.5", "1 234 kcal" or a plain number.
export function toKcal(v) {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.replace(/[\s ]/g, "").replace(/kcal|cal/gi, "");
  const cleaned = /,\d{3}(\D|$)/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  const n = parseFloat(cleaned.replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : null;
}

const isoDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null);

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ ok: false, error: "Use POST" });
  const src = { ...(req.query || {}), ...jsonBody(req) };
  const key = String(src.key || "").trim();
  const active = toKcal(src.active);
  const resting = toKcal(src.resting);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const date = isoDate(src.date) || yesterday;

  if (!key) return res.status(400).json({ ok: false, error: "Missing key — copy it from Evolve → Account → Apple Watch sync." });
  if (active == null && resting == null) return res.status(400).json({ ok: false, error: "Missing active and resting energy." });

  let r, body = null;
  try {
    r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ev_sync_burn`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ p_key: key, p_date: date, p_active: active ?? 0, p_resting: resting ?? 0 }),
    });
    body = await r.json().catch(() => null);
  } catch {
    return res.status(503).json({ ok: false, error: "Couldn't reach the database. The Shortcut can try again later." });
  }
  if (r.ok) return res.status(200).json({ ok: true, date, kcal: body?.kcal ?? null });

  const code = body?.code || "";
  if (code === "28000") return res.status(401).json({ ok: false, error: "That key isn't valid any more — make a new one in Evolve → Account → Apple Watch sync." });
  if (code === "22008") return res.status(400).json({ ok: false, error: "The date must be within the last 30 days." });
  if (code === "22003") return res.status(400).json({ ok: false, error: "That burn looks wrong (Active + Resting should be 300–12,000 kcal)." });
  if (r.status === 404 || code === "PGRST202") return res.status(503).json({ ok: false, error: "Evolve's database setup hasn't been run yet." });
  return res.status(502).json({ ok: false, error: body?.message || `Database returned ${r.status}` });
}
