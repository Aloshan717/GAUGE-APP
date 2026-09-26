// Daily ping so the free-tier Supabase project is never paused for inactivity.
// Supabase pauses free projects after ~7 days without activity; while paused
// the app cannot reach any data, which looks exactly like "everything is gone".
// Triggered by the cron in vercel.json. Harmless to call by hand.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mhksjkzpyurcspcnvxtr.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_SnjjsrjYxe_SEWJqwht3pQ_i0yA91tr";

export default async function handler(req, res) {
  try {
    // A real query against Postgres (RLS returns no rows to the anon key,
    // but the database still does the work, which is what counts as activity).
    const r = await fetch(`${SUPABASE_URL}/rest/v1/goals?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    return res.status(200).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
