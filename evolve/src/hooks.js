// Small hooks shared by screens.
import { useApp } from "./ctx.js";
import { linkResting } from "./lib/burnweek.js";

// Your resting energy: the one inside your Shortcut link (saved when you copied
// it), else the one Evolve works out from your InBody / profile.
export function useResting() {
  const { derived, user } = useApp();
  return linkResting(user?.id) || derived.maint?.bmr?.kcal || null;
}
