// EVOLVE — exercises you added yourself (name, muscle, the parts it works and
// an optional photo), kept on this phone so they are one tap away next time.
// The sets themselves are in your history like any other exercise.
import { store } from "./api.js";

const norm = (n) => String(n || "").trim().toLowerCase();
const keyFor = () => `evolve_myex_${store.json("evolve_user")?.id || "me"}`;
let cache = { key: null, list: [] };

export function myExercises() {
  const key = keyFor();
  if (cache.key !== key) {
    const l = store.json(key);
    cache = { key, list: Array.isArray(l) ? l : [] };
  }
  return cache.list;
}
export const findMine = (name) => (name ? myExercises().find((e) => norm(e.name) === norm(name)) || null : null);

// false when the phone's storage is full (the exercise still works, without the photo).
export function saveMine(entry) {
  const key = keyFor();
  const list = [entry, ...myExercises().filter((e) => norm(e.name) !== norm(entry.name))].slice(0, 60);
  try { localStorage.setItem(key, JSON.stringify(list)); cache = { key, list }; return true; } catch {
    if (!entry.photo) return false;
    return saveMine({ ...entry, photo: null }) && false;
  }
}
export function removeMine(name) {
  const key = keyFor();
  const list = myExercises().filter((e) => norm(e.name) !== norm(name));
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* blocked */ }
  cache = { key, list };
}

// A photo from the camera or library, shrunk to a small JPEG data URL.
export async function shrinkPhoto(file, max = 480, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const w = img.naturalWidth || max, h = img.naturalHeight || max;
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality);
  } finally { URL.revokeObjectURL(url); }
}
