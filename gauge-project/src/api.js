// GAUGE — Supabase session + data access.
// Everything that talks to Supabase lives here; screens only call `sb`.
import { tokenNeedsRefresh, isJwtError, isFatalRefreshFailure } from "./logic";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mhksjkzpyurcspcnvxtr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SnjjsrjYxe_SEWJqwht3pQ_i0yA91tr";

// ─── LOCAL STORAGE (never throws) ────────────────────────────────────────────
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* full or blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};
export const cacheKey = (uid) => `gauge_cache_${uid}`;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// App-level message sink for failed saves. App wires it to a banner.
let notify = (msg) => console.error(msg);
export const setNotify = (fn) => { notify = fn || ((msg) => console.error(msg)); };

// ─── AUTH SESSION ────────────────────────────────────────────────────────────
// One place owns the token. Every request asks it for a valid token at the
// moment it is sent, instead of using whatever token a component received as
// a prop an hour ago. That stale-token path is what blanked the screen after
// the phone had been idle: requests failed with "JWT expired" and the failed
// results replaced the data on screen.
export const auth = {
  _inflight: null,
  onFatal: null,   // App: the session is really over (refresh token rejected)

  token() { return store.get("gauge_token"); },

  save(res) {
    if (res?.access_token) store.set("gauge_token", res.access_token);
    if (res?.refresh_token) store.set("gauge_refresh", res.refresh_token);
  },

  clear() { store.del("gauge_token"); store.del("gauge_refresh"); },

  // One refresh at a time. Two parallel refreshes with the same refresh token
  // can trip Supabase's reuse detection and revoke the whole session.
  refresh() {
    if (this._inflight) return this._inflight;
    this._inflight = (async () => {
      const rt = store.get("gauge_refresh");
      if (!rt) { this.onFatal?.(); return { ok: false, fatal: true }; }

      let status = null, body = null;
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ refresh_token: rt }),
        });
        status = r.status;
        body = await r.json().catch(() => null);
      } catch {
        // Offline, or iOS resumed the app before the network was back.
        // Temporary — keep the session and the data.
        return { ok: false, fatal: false };
      }

      if (body?.access_token) {
        this.save(body);
        return { ok: true, token: body.access_token };
      }

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

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const errText = (res) =>
  res?.network
    ? "No connection — nothing was saved. Try again when you're back online."
    : `Couldn't save: ${res?.body?.message || res?.body?.msg || `server returned ${res?.status}`}`;

export const sb = {
  headers: (token) => ({
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Prefer": "return=representation",
  }),
  async signUp(email, password, name) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: this.headers(), body: JSON.stringify({ email, password, data: { name } }) });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: this.headers(), body: JSON.stringify({ email, password }) });
    return r.json();
  },
  async signOut() {
    try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: this.headers(auth.token()) }); }
    catch { /* signing out locally is what matters */ }
  },

  // Every authenticated call goes through here: fresh token, one retry on
  // JWT errors, and network failures come back as a value instead of throwing.
  async request(path, { method = "GET", body } = {}) {
    const run = async (tok) => {
      const r = await fetch(`${SUPABASE_URL}${path}`, {
        method,
        headers: this.headers(tok),
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
      // Expired → mint a new token. "Issued at future" is clock skew between
      // the auth server and Postgres; it clears by itself within a second.
      const expired = /expired/i.test(JSON.stringify(res.body || {})) || tokenNeedsRefresh(tok, Date.now(), 0);
      if (expired) {
        const r = await auth.refresh();
        if (r.ok) tok = r.token;
      }
      await sleep(1200);
      try { res = await run(tok); } catch { return offline; }
    }
    return res;
  },

  async getUser() {
    return this.request("/auth/v1/user");
  },

  // Returns rows on success, or an error object (never throws).
  async select(table, filter = "", order = "date.desc") {
    // NOTE: `goals` has no `date` column — ordering by it returns a Postgres
    // error object instead of rows, which silently reads back as "no goal".
    const res = await this.request(`/rest/v1/${table}?${filter}&order=${order}`);
    if (res.ok && Array.isArray(res.body)) return res.body;
    return {
      ...(res.body && typeof res.body === "object" ? res.body : {}),
      network: !!res.network,
      message: res.body?.message || res.body?.msg || `server returned ${res.status}`,
    };
  },

  // Returns { data, error }. On failure the caller keeps the form filled in.
  async insert(table, data) {
    const res = await this.request(`/rest/v1/${table}`, { method: "POST", body: data });
    if (res.ok) return { data: res.body, error: null };
    const error = errText(res);
    notify(error);
    return { data: null, error };
  },

  async delete(table, id) {
    const res = await this.request(`/rest/v1/${table}?id=eq.${id}`, { method: "DELETE" });
    if (res.ok) return { error: null };
    const error = res.network ? "No connection — nothing was deleted." : `Couldn't delete: ${res.body?.message || res.status}`;
    notify(error);
    return { error };
  },
};
