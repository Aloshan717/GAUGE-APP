// EVOLVE — Supabase session and data access (same project as Gauge).
// Everything that talks to Supabase lives here; screens only call `sb`.
import { tokenNeedsRefresh, isJwtError, isFatalRefreshFailure } from "./core.js";

export const SUPABASE_URL = "https://mhksjkzpyurcspcnvxtr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_SnjjsrjYxe_SEWJqwht3pQ_i0yA91tr";

// Evolve's own address (it may live under a path, e.g. /evolve/).
export const appUrl = () => `${location.origin}${import.meta.env?.BASE_URL || "/"}`;

// ─── Local storage (never throws) ────────────────────────────────────────────
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* full or blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* blocked */ } },
  json(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
  setJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Session ─────────────────────────────────────────────────────────────────
// One owner of the token. Requests ask for a valid token when they are sent,
// so an idle phone never sends an expired one. Only a rejected refresh token
// ends the session (signed out for months otherwise).
export const auth = {
  _inflight: null,
  onFatal: null,
  token() { return store.get("evolve_token"); },
  hasSession() { return !!(store.get("evolve_token") || store.get("evolve_refresh")); },
  save(res) {
    if (res?.access_token) store.set("evolve_token", res.access_token);
    if (res?.refresh_token) store.set("evolve_refresh", res.refresh_token);
  },
  clear() { store.del("evolve_token"); store.del("evolve_refresh"); },
  refresh() {
    if (this._inflight) return this._inflight;
    this._inflight = (async () => {
      const rt = store.get("evolve_refresh");
      if (!rt) { this.onFatal?.(); return { ok: false, fatal: true }; }
      let status = null, body = null;
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY }, body: JSON.stringify({ refresh_token: rt }),
        });
        status = r.status; body = await r.json().catch(() => null);
      } catch { return { ok: false, fatal: false }; }
      if (body?.access_token) { this.save(body); return { ok: true, token: body.access_token }; }
      const fatal = isFatalRefreshFailure(status, body);
      if (fatal) this.onFatal?.();
      return { ok: false, fatal };
    })().finally(() => { this._inflight = null; });
    return this._inflight;
  },
  async validToken() {
    const tok = this.token();
    if (tok && !tokenNeedsRefresh(tok)) return tok;
    const r = await this.refresh();
    return r.ok ? r.token : tok;
  },
};

// Links from invite / password-reset emails land with the session in the URL
// hash: #access_token=…&refresh_token=…&type=invite|recovery
export function readAuthHash(hash = typeof location !== "undefined" ? location.hash : "") {
  const h = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  if (h.get("error") || h.get("error_code")) return { error: h.get("error_description") || h.get("error") };
  const access_token = h.get("access_token");
  if (!access_token) return null;
  return { access_token, refresh_token: h.get("refresh_token"), type: h.get("type") || "magiclink" };
}

const errText = (res, lang) => {
  if (res?.network) return lang === "ar" ? "ما فيه اتصال — ما انحفظ شي. جرّب لما يرجع النت." : "No connection — nothing was saved. Try again when you're back online.";
  const msg = res?.body?.message || res?.body?.msg || `server returned ${res?.status}`;
  return lang === "ar" ? `ما قدرنا نحفظ: ${msg}` : `Couldn't save: ${msg}`;
};

let notify = (msg) => console.error(msg);
export const setNotify = (fn) => { notify = fn || ((m) => console.error(m)); };
let currentLang = "en";
export const setApiLang = (l) => { currentLang = l; };

// Missing table/function (setup SQL not run yet).
export const isMissingTable = (r) => /PGRST205|PGRST202|42P01|does not exist|Could not find the table/i.test(`${r?.code || ""} ${r?.message || ""}`);

export const sb = {
  headers(token, extra = {}) {
    return { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`, Prefer: "return=representation", ...extra };
  },
  async signIn(email, password) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: this.headers(), body: JSON.stringify({ email, password }) });
      return { status: r.status, body: await r.json().catch(() => null) };
    } catch { return { status: 0, network: true, body: null }; }
  },
  async recover(email) {
    const redirect = appUrl();
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, { method: "POST", headers: this.headers(), body: JSON.stringify({ email }) });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
    } catch { return { ok: false, network: true }; }
  },
  async signOut() {
    try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: this.headers(auth.token()) }); } catch { /* local sign-out is what matters */ }
  },

  // Every authenticated call: fresh token, one retry on JWT errors,
  // network failures come back as a value instead of throwing.
  async request(path, { method = "GET", body, prefer } = {}) {
    const run = async (tok) => {
      const r = await fetch(`${SUPABASE_URL}${path}`, {
        method, headers: this.headers(tok, prefer ? { Prefer: prefer } : {}),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const text = await r.text();
      let json = null;
      if (text) { try { json = JSON.parse(text); } catch { json = { message: text.slice(0, 160) }; } }
      return { ok: r.ok, status: r.status, body: json };
    };
    const offline = { ok: false, status: null, network: true, body: { message: "No connection" } };
    let tok = await auth.validToken();
    let res;
    try { res = await run(tok); } catch { return offline; }
    if (!res.ok && isJwtError(res.status, res.body)) {
      const expired = /expired/i.test(JSON.stringify(res.body || {})) || tokenNeedsRefresh(tok, Date.now(), 0);
      if (expired) { const r = await auth.refresh(); if (r.ok) tok = r.token; }
      await sleep(1200);
      try { res = await run(tok); } catch { return offline; }
    }
    return res;
  },

  getUser() { return this.request("/auth/v1/user"); },
  updateUser(data) { return this.request("/auth/v1/user", { method: "PUT", body: data }); },

  // Rows on success, or an error object (never throws).
  async select(table, filter = "", order = "date.desc") {
    const res = await this.request(`/rest/v1/${table}?${filter}${order ? `&order=${order}` : ""}`);
    if (res.ok && Array.isArray(res.body)) return res.body;
    return { ...(res.body && typeof res.body === "object" ? res.body : {}), network: !!res.network, status: res.status, message: res.body?.message || res.body?.msg || `server returned ${res.status}` };
  },

  // { data, error }. `optional`: newer columns; if the database lacks them the row is saved without.
  async insert(table, data, { optional = [], quiet = false } = {}) {
    let res = await this.request(`/rest/v1/${table}`, { method: "POST", body: data });
    const missing = optional.filter((k) => k in data);
    if (!res.ok && missing.length && /PGRST204|column/i.test(`${res.body?.code || ""} ${res.body?.message || ""}`)) {
      const slim = { ...data };
      missing.forEach((k) => delete slim[k]);
      res = await this.request(`/rest/v1/${table}`, { method: "POST", body: slim });
    }
    if (res.ok) return { data: Array.isArray(res.body) ? res.body[0] : res.body, error: null };
    const error = isMissingTable(res.body) ? "setup" : errText(res, currentLang);
    if (!quiet && error !== "setup") notify(error);
    return { data: null, error };
  },

  // Insert or update by primary key / unique columns.
  async upsert(table, data, onConflict) {
    const res = await this.request(`/rest/v1/${table}?on_conflict=${onConflict}`, { method: "POST", body: data, prefer: "resolution=merge-duplicates,return=representation" });
    if (res.ok) return { data: Array.isArray(res.body) ? res.body[0] : res.body, error: null };
    const error = isMissingTable(res.body) ? "setup" : errText(res, currentLang);
    if (error !== "setup") notify(error);
    return { data: null, error };
  },

  // Change one row by id: { data, error }. data is null when nothing was changed
  // (no such row, or the database doesn't allow edits on this table).
  async update(table, id, data, { optional = [] } = {}) {
    const path = `/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
    let res = await this.request(path, { method: "PATCH", body: data });
    const missing = optional.filter((k) => k in data);
    if (!res.ok && missing.length && /PGRST204|column/i.test(`${res.body?.code || ""} ${res.body?.message || ""}`)) {
      const slim = { ...data };
      missing.forEach((k) => delete slim[k]);
      res = await this.request(path, { method: "PATCH", body: slim });
    }
    if (res.ok) return { data: Array.isArray(res.body) ? res.body[0] || null : res.body, error: null };
    const error = errText(res, currentLang);
    notify(error);
    return { data: null, error };
  },

  async delete(table, id) {
    const res = await this.request(`/rest/v1/${table}?id=eq.${id}`, { method: "DELETE" });
    if (res.ok) return { error: null };
    const error = errText(res, currentLang);
    notify(error);
    return { error };
  },

  // Calls to Evolve's own serverless functions.
  async fn(path, { method = "GET", body } = {}) {
    const tok = await auth.validToken();
    try {
      const r = await fetch(path, { method, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { ok: r.ok, status: r.status, body: await r.json().catch(() => null) };
    } catch { return { ok: false, network: true, status: 0, body: null }; }
  },
};

// SHA-256 hex (for the Apple Watch key — only the hash is stored).
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// A long random key without look-alike characters.
export function newSyncKey(len = 28) {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => abc[b % abc.length]).join("");
}
