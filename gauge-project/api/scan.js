// Reads an InBody (or similar) body-composition sheet.
//
// The browser sends only the file: { media_type, data } (base64). The prompt,
// model and output schema live here, so this endpoint can't be used as an
// open proxy to the API key, and the reply always has the same JSON shape.
// Unit conversion and the muscle-% maths happen in src/logic.js
// (parseScanReading), where they are covered by tests.

import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mhksjkzpyurcspcnvxtr.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_SnjjsrjYxe_SEWJqwht3pQ_i0yA91tr";

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });

const SCHEMA = {
  type: "object",
  properties: {
    is_body_composition_report: { type: "boolean" },
    scan_date: nullable({ type: "string" }),
    weight_unit: { type: "string", enum: ["kg", "lb"] },
    weight: nullable({ type: "number" }),
    percent_body_fat: nullable({ type: "number" }),
    body_fat_mass: nullable({ type: "number" }),
    skeletal_muscle_mass: nullable({ type: "number" }),
    notes: { type: "string" },
  },
  required: [
    "is_body_composition_report", "scan_date", "weight_unit", "weight",
    "percent_body_fat", "body_fat_mass", "skeletal_muscle_mass", "notes",
  ],
  additionalProperties: false,
};

const PROMPT = `This is a photo, screenshot or PDF of a body-composition result sheet (usually InBody). Report the values printed for the CURRENT test.

- weight: body weight ("Weight").
- percent_body_fat: "PBF" / "Percent Body Fat", in %.
- body_fat_mass: "Body Fat Mass".
- skeletal_muscle_mass: "SMM" / "Skeletal Muscle Mass". Not "Soft Lean Mass", "Fat Free Mass" or "Lean Body Mass".
- weight_unit: the unit the masses are printed in.
- scan_date: the test date as YYYY-MM-DD. InBody prints dates like 2026.10.10; use the sheet's language and layout to get day and month the right way round.

Copy the numbers exactly as printed. Do not convert units and do not calculate anything. Ignore the history table, the normal/ideal ranges and the targets. Use null for any value you cannot read with confidence. The sheet may be photographed at an angle, cropped, or printed in another language such as Arabic.
Set is_body_composition_report to false if this is not a body-composition result. Put anything unclear in notes (one short sentence, or an empty string).`;

// A request is only allowed from a signed-in Gauge user, so nobody else can
// spend the API key. Fails closed: if the session can't be checked, no scan.
async function checkUser(authHeader) {
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, status: 401, error: "You're signed out. Sign in again, then retry the scan." };
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (r.ok) return { ok: true };
    if (r.status === 401 || r.status === 403) {
      return { ok: false, status: 401, error: "Your session expired. Reopen the app (or sign in again), then retry the scan." };
    }
    return { ok: false, status: 503, error: `Couldn't verify your session (auth server returned ${r.status}). Try again in a minute.` };
  } catch {
    return { ok: false, status: 503, error: "Couldn't reach the auth server to verify your session. Try again in a minute." };
  }
}

function apiErrorMessage(err) {
  const status = err?.status;
  const detail = err?.error?.error?.message || err?.message || "";
  if (status === 401 || status === 403) return { status: 500, error: "The ANTHROPIC_API_KEY in Vercel was rejected. Check the key in Vercel → Settings → Environment Variables." };
  if (status === 429) return { status: 429, error: "Too many scans at once. Wait a minute and try again." };
  if (status === 529 || (status >= 500 && status < 600)) return { status: 503, error: "The reader is busy right now. Try again in a minute." };
  if (status === 413) return { status: 413, error: "That file is too large for the reader. Use a photo instead of a PDF, or a smaller PDF." };
  if (status === 400) return { status: 400, error: `The reader couldn't open that file: ${detail}` };
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { status: 504, error: "Reading the scan took too long. Try again, or use a closer, sharper photo." };
  if (err instanceof Anthropic.APIConnectionError) return { status: 502, error: "Couldn't reach the reader. Try again." };
  return { status: 502, error: `Reader failed: ${detail || "unknown error"}` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is not set in Vercel environment variables.",
    });
  }

  const user = await checkUser(req.headers?.authorization);
  if (!user.ok) return res.status(user.status).json({ error: user.error });

  const { media_type, data } = req.body || {};
  if (!MEDIA_TYPES.includes(media_type) || typeof data !== "string" || !data) {
    return res.status(400).json({ error: "Send the scan as a photo (JPG/PNG) or a PDF." });
  }

  const file = media_type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type, data } }
    : { type: "image", source: { type: "base64", media_type, data } };

  // Vercel stops the function at 60 s (vercel.json). One attempt plus one retry
  // on a quick 429/529 fits; a slow attempt is cut off before Vercel kills us.
  const client = new Anthropic({ timeout: 50 * 1000, maxRetries: 1 });

  try {
    const msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // Reading four printed numbers needs little deliberation; low effort
      // keeps the reply well inside the 60 s function limit.
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      // If a safety classifier declines, retry on Anthropic's recommended model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: [file, { type: "text", text: PROMPT }] }],
    });

    if (msg.stop_reason === "refusal") {
      return res.status(422).json({ error: "The reader declined this file. Enter the numbers manually instead." });
    }
    if (msg.stop_reason === "max_tokens") {
      return res.status(502).json({ error: "The reader's answer was cut off. Try again." });
    }

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    let reading;
    try { reading = JSON.parse(text); } catch {
      return res.status(502).json({ error: "The reader replied in an unexpected format. Try again." });
    }

    return res.status(200).json({ reading });
  } catch (err) {
    const { status, error } = apiErrorMessage(err);
    console.error("scan failed:", err?.status, err?.message);
    return res.status(status).json({ error });
  }
}
