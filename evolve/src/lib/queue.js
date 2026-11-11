// EVOLVE — a workout keeps saving without a connection (gyms in basements):
// what couldn't be sent waits on the phone, in order, and goes out by itself
// as soon as you're online again.
import { store, sb } from "./api.js";

const key = (uid) => `evolve_queue_${uid}`;
const listeners = new Set();
export const onQueue = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((f) => { try { f(); } catch { /* listener gone */ } });

export const queued = (uid) => (uid ? store.json(key(uid)) || [] : []);
const save = (uid, q) => { store.setJson(key(uid), q); emit(); };

let seq = 0;
const nextId = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
export const tempId = () => nextId("tmp_");
export const isTemp = (id) => typeof id === "string" && id.startsWith("tmp_");

// op: { op: "insert" | "update" | "delete", table, data?, id?, optional?, temp? }
export function enqueue(uid, op) { save(uid, [...queued(uid), { ...op, qid: nextId("q"), at: Date.now() }]); }

// A set saved offline and changed again before it was sent: change the waiting copy.
export function patchQueued(uid, temp, data) {
  save(uid, queued(uid).map((o) => (o.op === "insert" && o.temp === temp ? { ...o, data: { ...o.data, ...data } } : o)));
}
// …or deleted before it was sent: it never goes out.
export function dropQueued(uid, temp) { save(uid, queued(uid).filter((o) => o.temp !== temp)); }

let running = false;
// Send everything in order; stop at the first network failure and keep the rest.
// A change the server refuses would never go through, so it is dropped (and reported).
// Returns { sent, left, ids: { tempId: realId }, refused: [message] }.
export async function flush(uid, api = sb) {
  const out = { sent: 0, left: queued(uid).length, ids: {}, refused: [] };
  if (running || !uid || !out.left) return out;
  running = true;
  try {
    for (;;) {
      const q = queued(uid);
      if (!q.length) break;
      const o = q[0];
      let r;
      if (o.op === "insert") r = await api.insert(o.table, o.data, { optional: o.optional || [], quiet: true });
      else if (o.op === "update") r = await api.update(o.table, o.id, o.data, { optional: o.optional || [], quiet: true });
      else if (o.op === "delete") r = await api.delete(o.table, o.id, { quiet: true });
      else r = { error: null };
      if (r?.network) break;
      if (r?.error) {
        out.refused.push(r.error);
        if (o.op === "insert" && o.temp) out.ids[o.temp] = false;      // shows as not saved again
      } else if (o.op === "insert" && o.temp) out.ids[o.temp] = r?.data?.id ?? null;
      save(uid, queued(uid).filter((x) => x.qid !== o.qid));
      out.sent++;
    }
  } finally {
    running = false;
  }
  out.left = queued(uid).length;
  return out;
}

// Point today's logged sets at the ids the server gave them.
export function remapDone(session, ids, allSent) {
  if (!session?.done) return session;
  const done = {};
  for (const [slot, list] of Object.entries(session.done)) {
    done[slot] = (list || []).map((d) => {
      if (!d) return d;
      if (d.logId && d.logId in ids) return ids[d.logId] === false ? null : { ...d, logId: ids[d.logId], pending: false };
      return allSent && d.pending ? { ...d, pending: false } : d;
    });
  }
  return { ...session, done, finishPending: allSent ? false : session.finishPending };
}
