// EVOLVE — which muscles an exercise works, for the body map.
//
// Every movement group has a default (main muscles + helpers); exercises that
// load the body differently (close-grip bench → triceps, hammer curls → forearms,
// deadlifts → the whole back chain) override it.
import { BY_ID, GROUPS } from "./exercises.js";

export const MUSCLE_LABELS = {
  chest: ["Chest", "الصدر"],
  frontDelts: ["Front shoulders", "الكتف الأمامي"],
  sideDelts: ["Side shoulders", "الكتف الجانبي"],
  rearDelts: ["Rear shoulders", "الكتف الخلفي"],
  triceps: ["Triceps", "الترايسبس"],
  biceps: ["Biceps", "البايسبس"],
  forearms: ["Forearms", "الساعد"],
  lats: ["Lats", "المجنص"],
  midBack: ["Mid back", "منتصف الظهر"],
  traps: ["Traps", "الترابيس"],
  lowerBack: ["Lower back", "أسفل الظهر"],
  abs: ["Abs", "البطن"],
  obliques: ["Obliques", "الخواصر"],
  quads: ["Quads", "الفخذ الأمامي"],
  hamstrings: ["Hamstrings", "الفخذ الخلفي"],
  glutes: ["Glutes", "المؤخرة"],
  adductors: ["Inner thighs", "الفخذ الداخلي"],
  abductors: ["Side glutes", "جانب المؤخرة"],
  calves: ["Calves", "السمانة"],
};

// The regions of the map (bodymap.js) each muscle lights up, front and back.
export const REGIONS = {
  chest: { front: ["chest"] },
  frontDelts: { front: ["front-deltoids"] },
  sideDelts: { front: ["front-deltoids"], back: ["back-deltoids"] },
  rearDelts: { back: ["back-deltoids"] },
  triceps: { front: ["triceps"], back: ["triceps"] },
  biceps: { front: ["biceps"] },
  forearms: { front: ["forearm"], back: ["forearm"] },
  lats: { back: ["upper-back"] },
  midBack: { back: ["upper-back"] },
  traps: { front: ["neck"], back: ["trapezius"] },
  lowerBack: { back: ["lower-back"] },
  abs: { front: ["abs"] },
  obliques: { front: ["obliques"] },
  quads: { front: ["quadriceps"] },
  hamstrings: { back: ["hamstring"] },
  glutes: { back: ["gluteal"] },
  adductors: { front: ["abductors"], back: ["adductor"] },   // the source names the inner-thigh shape "abductors" on the front view
  abductors: { back: ["gluteal"] },
  calves: { front: ["calves"], back: ["calves", "left-soleus", "right-soleus"] },
};

// [main muscles, helpers] for each movement group.
const BY_GROUP = {
  hpress: [["chest"], ["frontDelts", "triceps"]],
  incline: [["chest", "frontDelts"], ["triceps"]],
  fly: [["chest"], ["frontDelts"]],
  triceps: [["triceps"], []],
  row: [["midBack", "lats"], ["biceps", "rearDelts", "traps"]],
  vpull: [["lats"], ["biceps", "midBack", "rearDelts"]],
  ohp: [["frontDelts", "sideDelts"], ["triceps", "traps"]],
  lateral: [["sideDelts"], ["traps"]],
  frontraise: [["frontDelts"], ["sideDelts"]],
  rear: [["rearDelts"], ["midBack", "traps"]],
  shrug: [["traps"], ["forearms"]],
  curl: [["biceps"], ["forearms"]],
  squat: [["quads", "glutes"], ["adductors", "lowerBack"]],
  hinge: [["hamstrings", "glutes"], ["lowerBack"]],
  legpress: [["quads", "glutes"], ["adductors"]],
  lunge: [["quads", "glutes"], ["adductors", "hamstrings"]],
  glutes: [["glutes"], ["hamstrings"]],
  legcurl: [["hamstrings"], ["calves"]],
  legext: [["quads"], []],
  calf: [["calves"], []],
  abduction: [["abductors"], []],
  adduction: [["adductors"], []],
  core: [["abs"], ["obliques"]],
};

const BY_EXERCISE = {
  chest_dip: [["chest", "triceps"], ["frontDelts"]],
  incline_cable_fly: [["chest", "frontDelts"], []],
  incline_db_fly: [["chest", "frontDelts"], []],

  close_push_up: [["triceps"], ["chest", "frontDelts"]],
  close_grip_bench: [["triceps"], ["chest", "frontDelts"]],
  close_grip_db_press: [["triceps"], ["chest", "frontDelts"]],
  bench_dip: [["triceps"], ["chest", "frontDelts"]],
  dip_machine: [["triceps"], ["chest", "frontDelts"]],
  parallel_bar_dip: [["triceps"], ["chest", "frontDelts"]],

  underhand_bb_row: [["lats", "midBack"], ["biceps", "rearDelts"]],
  db_pullover: [["lats", "chest"], ["triceps"]],
  straight_arm_pulldown: [["lats"], ["triceps"]],
  rope_straight_arm: [["lats"], ["triceps", "rearDelts"]],
  chin_up: [["lats", "biceps"], ["midBack"]],
  underhand_pulldown: [["lats", "biceps"], ["midBack"]],

  push_press: [["frontDelts", "sideDelts"], ["triceps", "quads", "glutes"]],
  upright_bb_row: [["sideDelts", "traps"], ["frontDelts", "biceps"]],
  upright_cable_row: [["sideDelts", "traps"], ["frontDelts", "biceps"]],
  lateral_to_front: [["sideDelts", "frontDelts"], []],
  alternating_deltoid_raise: [["frontDelts", "sideDelts"], []],
  rear_delt_row: [["rearDelts", "midBack"], ["traps", "biceps"]],
  rope_rear_row: [["rearDelts", "midBack"], ["traps", "biceps"]],

  hammer_curl: [["biceps", "forearms"], []],
  alt_hammer_curl: [["biceps", "forearms"], []],
  cross_body_hammer: [["biceps", "forearms"], []],
  rope_hammer_curl: [["biceps", "forearms"], []],
  incline_hammer_curl: [["biceps", "forearms"], []],
  zottman_curl: [["biceps", "forearms"], []],
  reverse_bb_curl: [["forearms", "biceps"], []],
  reverse_cable_curl: [["forearms", "biceps"], []],

  front_squat: [["quads", "glutes"], ["abs", "lowerBack"]],
  zercher_squat: [["quads", "glutes"], ["abs", "lowerBack", "biceps"]],
  sumo_db_squat: [["quads", "glutes", "adductors"], []],
  side_split_squat: [["quads", "glutes", "adductors"], ["hamstrings"]],
  db_step_up: [["quads", "glutes"], ["hamstrings", "calves"]],
  bb_step_up: [["quads", "glutes"], ["hamstrings", "calves"]],

  deadlift: [["hamstrings", "glutes", "lowerBack"], ["traps", "quads", "forearms", "midBack"]],
  sumo_deadlift: [["glutes", "adductors", "hamstrings"], ["quads", "lowerBack", "traps", "forearms"]],
  trap_bar_deadlift: [["quads", "glutes", "hamstrings"], ["lowerBack", "traps", "forearms"]],
  good_morning: [["hamstrings", "lowerBack"], ["glutes"]],
  back_extension: [["lowerBack", "glutes"], ["hamstrings"]],
  floor_back_ext: [["lowerBack", "glutes"], ["hamstrings"]],
  reverse_hyper: [["glutes", "hamstrings"], ["lowerBack"]],
  single_leg_bridge: [["glutes", "hamstrings"], []],
  cable_pull_through: [["glutes", "hamstrings"], ["lowerBack"]],

  nordic_curl: [["hamstrings"], ["glutes", "calves"]],
  glute_ham_raise: [["hamstrings"], ["glutes", "calves"]],
  floor_glute_ham: [["hamstrings"], ["glutes", "calves"]],
  ball_leg_curl: [["hamstrings"], ["glutes", "calves"]],
  monster_walk: [["abductors"], ["glutes", "quads"]],

  russian_twist: [["obliques"], ["abs"]],
  cable_russian_twist: [["obliques"], ["abs"]],
  oblique_crunch: [["obliques"], ["abs"]],
  pallof_press: [["obliques", "abs"], []],
  cross_body_crunch: [["abs", "obliques"], []],
  bicycle_crunch: [["abs", "obliques"], []],
  ab_wheel: [["abs"], ["obliques", "lats"]],
  ab_rollout_knees: [["abs"], ["obliques", "lats"]],
};

// For your own exercises: the muscle you filed it under.
const BY_CHIP = {
  Chest: [["chest"], ["frontDelts", "triceps"]],
  Back: [["lats", "midBack"], ["biceps", "rearDelts"]],
  Shoulders: [["frontDelts", "sideDelts", "rearDelts"], []],
  Biceps: [["biceps"], ["forearms"]],
  Triceps: [["triceps"], []],
  Legs: [["quads", "glutes", "hamstrings"], ["calves"]],
  Core: [["abs"], ["obliques"]],
};

const shape = ([main, helpers] = [[], []]) => ({ primary: main, secondary: helpers.filter((m) => !main.includes(m)) });

// { primary: [muscle keys], secondary: [muscle keys] } for an exercise (object or id).
export function musclesOf(exOrId) {
  const ex = typeof exOrId === "string" ? BY_ID[exOrId] : exOrId;
  if (!ex || !GROUPS[ex.group]) return { primary: [], secondary: [] };
  return shape(BY_EXERCISE[ex.id] || BY_GROUP[ex.group]);
}

// The same for a training slot: a library exercise, or your own one by its muscle.
export const slotMuscles = (slot) => (slot?.custom ? shape(BY_CHIP[slot.muscle]) : musclesOf(slot?.ex));

// Which regions of one view light up, and how strongly: { region: "primary" | "secondary" }.
export function regionLevels({ primary = [], secondary = [] } = {}, view = "front") {
  const out = {};
  for (const m of secondary) for (const r of REGIONS[m]?.[view] || []) out[r] = "secondary";
  for (const m of primary) for (const r of REGIONS[m]?.[view] || []) out[r] = "primary";
  return out;
}

export const muscleNames = (keys, lang) => (keys || []).map((k) => (MUSCLE_LABELS[k] || [k, k])[lang === "ar" ? 1 : 0]);
