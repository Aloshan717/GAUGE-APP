// EVOLVE — progress photos (front, side, back), kept only on this phone in
// IndexedDB — never uploaded. Shrunk to ~1080 px so hundreds fit.
const DB = "evolve-photos", STORE = "photos";
export const ANGLES = ["front", "side", "back"];
let dbp = null;

function db() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") { reject(new Error("no storage")); return; }
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("uid", "uid"); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    dbp.catch(() => { dbp = null; });
  }
  return dbp;
}
const done = (t) => new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); });

export async function savePhoto({ uid, date, angle, blob }) {
  const d = await db();
  const t = d.transaction(STORE, "readwrite");
  t.objectStore(STORE).put({ id: `${uid}|${date}|${angle}`, uid, date, angle, blob, at: Date.now() });
  await done(t);
  try { navigator.storage?.persist?.(); } catch { /* best effort */ }
}

// Newest first.
export async function listPhotos(uid) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const out = [];
    const req = d.transaction(STORE, "readonly").objectStore(STORE).index("uid").openCursor(IDBKeyRange.only(uid));
    req.onsuccess = () => { const c = req.result; if (c) { out.push(c.value); c.continue(); } else resolve(out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))); };
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhotos(uid, date, angle) {
  const list = (await listPhotos(uid)).filter((p) => p.date === date && (!angle || p.angle === angle));
  const d = await db();
  const t = d.transaction(STORE, "readwrite");
  list.forEach((p) => t.objectStore(STORE).delete(p.id));
  await done(t);
}

// [{ date, front, side, back }] newest first.
export function byDate(list) {
  const m = new Map();
  for (const p of list || []) {
    if (!m.has(p.date)) m.set(p.date, { date: p.date });
    m.get(p.date)[p.angle] = p;
  }
  return [...m.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function lastPhotoDate(uid) {
  try { return (await listPhotos(uid))[0]?.date || null; } catch { return null; }
}

// Camera / library photo → JPEG blob, longest side ≤ max.
export async function shrinkToBlob(file, max = 1080, quality = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
    const w = img.naturalWidth || max, h = img.naturalHeight || max;
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", quality));
  } finally { URL.revokeObjectURL(url); }
}
