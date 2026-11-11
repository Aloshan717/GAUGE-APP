// EVOLVE — your frequent meals (name, calories, protein) for one-tap logging.
// No food database: just the meals you eat again and again. Kept on this phone.
import { store, sb } from "./api.js";
import { coerceNumber } from "./core.js";

const key = () => `evolve_meals_${store.json("evolve_user")?.id || "me"}`;
const norm = (s) => String(s || "").trim().toLowerCase();

// Most used first.
export const myMeals = () => [...(store.json(key()) || [])].sort((a, b) => (b.uses || 0) - (a.uses || 0) || a.name.localeCompare(b.name));
export function saveMeal({ name, kcal, protein }) {
  const n = String(name || "").trim();
  if (!n || !(kcal > 0 || protein > 0)) return false;
  const list = myMeals().filter((m) => norm(m.name) !== norm(n));
  const old = myMeals().find((m) => norm(m.name) === norm(n));
  list.push({ name: n, kcal: Math.round(kcal || 0), protein: Math.round(protein || 0), uses: old?.uses || 0 });
  store.setJson(key(), list.slice(-40));
  return true;
}
export function deleteMeal(name) { store.setJson(key(), myMeals().filter((m) => norm(m.name) !== norm(name))); }
const bump = (name) => store.setJson(key(), myMeals().map((m) => (norm(m.name) === norm(name) ? { ...m, uses: (m.uses || 0) + 1 } : m)));

// Add a meal to a day's totals. Returns { error, before } (before = to undo).
export async function addMealTo({ userId, date, meal, row }) {
  const before = { kcal_in: coerceNumber(row?.kcal_in) || 0, protein_g: coerceNumber(row?.protein_g) || 0 };
  const next = {
    user_id: userId, date,
    kcal_in: Math.max(0, Math.round(before.kcal_in + (meal.kcal || 0))),
    protein_g: Math.max(0, Math.round(before.protein_g + (meal.protein || 0))),
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.upsert("ev_days", next, "user_id,date");
  if (!error) bump(meal.name);
  return { error, before };
}
export async function restoreDay({ userId, date, before }) {
  return sb.upsert("ev_days", { user_id: userId, date, ...before, updated_at: new Date().toISOString() }, "user_id,date");
}
