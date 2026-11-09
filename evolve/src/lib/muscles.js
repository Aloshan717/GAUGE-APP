// EVOLVE — which muscles an exercise works, for the body map.
//
// Every movement group has a default (main muscles + helpers); exercises that
// load the body differently (close-grip bench → triceps, hammer curls → forearms,
// deadlifts → the whole back chain) override it.
import { BY_ID, GROUPS, EXERCISES } from "./exercises.js";
import { FRONT, BACK } from "./bodymap.js";

export const MUSCLE_LABELS = {
  upperChest: ["Upper chest", "أعلى الصدر"],
  midChest: ["Mid chest", "منتصف الصدر"],
  lowerChest: ["Lower chest", "أسفل الصدر"],
  frontDelts: ["Front shoulders", "الكتف الأمامي"],
  sideDelts: ["Side shoulders", "الكتف الجانبي"],
  rearDelts: ["Rear shoulders", "الكتف الخلفي"],
  triceps: ["Triceps", "الترايسبس"],
  biceps: ["Biceps", "البايسبس"],
  forearms: ["Forearms", "الساعد"],
  traps: ["Upper traps", "الترابيس العلوي"],
  midBack: ["Mid back", "منتصف الظهر"],
  lats: ["Lats", "المجنص"],
  lowerBack: ["Lower back", "أسفل الظهر"],
  upperAbs: ["Upper abs", "أعلى البطن"],
  lowerAbs: ["Lower abs", "أسفل البطن"],
  obliques: ["Obliques", "الخواصر"],
  quads: ["Quads", "الفخذ الأمامي"],
  hamstrings: ["Hamstrings", "الفخذ الخلفي"],
  glutes: ["Glutes", "المؤخرة"],
  abductors: ["Side glutes", "جانب المؤخرة"],
  adductors: ["Inner thighs", "الفخذ الداخلي"],
  calves: ["Calves", "السمانة"],
  soleus: ["Lower calves", "السمانة السفلية"],
};

// The parts of the map (bodymap.js) each muscle lights up, front and back.
export const REGIONS = {
  upperChest: { front: ["chest-upper"] },
  midChest: { front: ["chest-mid"] },
  lowerChest: { front: ["chest-lower"] },
  frontDelts: { front: ["delt-front"] },
  sideDelts: { front: ["delt-side-f"], back: ["delt-side-b"] },
  rearDelts: { back: ["delt-rear"] },
  triceps: { front: ["triceps"], back: ["triceps"] },
  biceps: { front: ["biceps"] },
  forearms: { front: ["forearm"], back: ["forearm"] },
  traps: { front: ["neck"], back: ["traps-upper"] },
  midBack: { back: ["traps-mid"] },
  lats: { back: ["upper-back"] },
  lowerBack: { back: ["lower-back"] },
  upperAbs: { front: ["abs-upper"] },
  lowerAbs: { front: ["abs-lower"] },
  obliques: { front: ["obliques"] },
  quads: { front: ["quadriceps"] },
  hamstrings: { back: ["hamstring"] },
  glutes: { back: ["glute-max"] },
  abductors: { back: ["glute-med"] },
  adductors: { front: ["abductors"], back: ["adductor"] },   // the source names the inner-thigh shape "abductors" on the front view
  calves: { front: ["calves"], back: ["calves"] },
  soleus: { back: ["left-soleus", "right-soleus"] },
};

// The parts you can pick for your own exercise, per muscle on the Train page.
export const PARTS = {
  Chest: ["upperChest", "midChest", "lowerChest"],
  Back: ["lats", "midBack", "lowerBack", "traps"],
  Shoulders: ["frontDelts", "sideDelts", "rearDelts", "traps"],
  Biceps: ["biceps", "forearms"],
  Triceps: ["triceps"],
  Legs: ["quads", "hamstrings", "glutes", "abductors", "adductors", "calves"],
  Core: ["upperAbs", "lowerAbs", "obliques"],
};

const CHEST = ["upperChest", "midChest", "lowerChest"];
const ABS = ["upperAbs", "lowerAbs"];

// [main muscles, helpers] for each movement group.
const BY_GROUP = {
  hpress: [["midChest"], ["upperChest", "lowerChest", "frontDelts", "triceps"]],
  incline: [["upperChest"], ["midChest", "frontDelts", "triceps"]],
  fly: [["midChest"], ["upperChest", "lowerChest", "frontDelts"]],
  triceps: [["triceps"], []],
  row: [["midBack", "lats"], ["rearDelts", "biceps", "traps"]],
  vpull: [["lats"], ["midBack", "biceps", "rearDelts"]],
  ohp: [["frontDelts", "sideDelts"], ["triceps", "traps", "upperChest"]],
  lateral: [["sideDelts"], ["traps"]],
  frontraise: [["frontDelts"], ["sideDelts", "upperChest"]],
  rear: [["rearDelts"], ["midBack", "traps"]],
  shrug: [["traps"], ["forearms"]],
  curl: [["biceps"], ["forearms"]],
  squat: [["quads", "glutes"], ["adductors", "lowerBack"]],
  hinge: [["hamstrings", "glutes"], ["lowerBack"]],
  legpress: [["quads", "glutes"], ["adductors"]],
  lunge: [["quads", "glutes"], ["adductors", "hamstrings", "abductors"]],
  glutes: [["glutes"], ["hamstrings", "abductors"]],
  legcurl: [["hamstrings"], ["calves"]],
  legext: [["quads"], []],
  calf: [["calves"], ["soleus"]],
  abduction: [["abductors"], ["glutes"]],
  adduction: [["adductors"], []],
  core: [["upperAbs"], ["lowerAbs", "obliques"]],
};

const LOWER_CHEST_PRESS = [["lowerChest"], ["midChest", "triceps", "frontDelts"]];
const UPPER_FLY = [["upperChest"], ["midChest", "frontDelts"]];
const DIP_TRICEPS = [["triceps"], ["lowerChest", "frontDelts"]];
const CLOSE_PRESS = [["triceps"], ["midChest", "frontDelts"]];
const HAMMER = [["biceps", "forearms"], []];
const REVERSE_CURL = [["forearms", "biceps"], []];
const LOWER_ABS = [["lowerAbs"], ["upperAbs", "obliques"]];
const OBLIQUES = [["obliques"], ABS];
const SEATED_CALF = [["soleus"], ["calves"]];

const BY_EXERCISE = {
  decline_bench_press: LOWER_CHEST_PRESS,
  decline_db_press: LOWER_CHEST_PRESS,
  decline_machine_press: LOWER_CHEST_PRESS,
  smith_decline_press: LOWER_CHEST_PRESS,
  incline_push_up: [["midChest", "lowerChest"], ["frontDelts", "triceps"]],
  chest_dip: [["lowerChest", "triceps"], ["midChest", "frontDelts"]],
  incline_cable_fly: UPPER_FLY,
  incline_db_fly: UPPER_FLY,
  low_cable_crossover: UPPER_FLY,
  cable_crossover: [["lowerChest", "midChest"], ["frontDelts"]],
  decline_db_fly: [["lowerChest"], ["midChest"]],
  svend_press: [["midChest"], ["upperChest", "frontDelts", "triceps"]],
  wide_chest_press: [["midChest", "lowerChest"], ["upperChest", "frontDelts", "triceps"]],

  close_push_up: CLOSE_PRESS,
  close_grip_bench: CLOSE_PRESS,
  close_grip_db_press: CLOSE_PRESS,
  smith_close_grip_bench: CLOSE_PRESS,
  bench_dip: DIP_TRICEPS,
  dip_machine: DIP_TRICEPS,
  parallel_bar_dip: DIP_TRICEPS,
  assisted_dip: DIP_TRICEPS,

  underhand_bb_row: [["lats", "midBack"], ["biceps", "rearDelts"]],
  db_pullover: [["lats", "lowerChest"], ["triceps", "midChest"]],
  straight_arm_pulldown: [["lats"], ["triceps"]],
  rope_straight_arm: [["lats"], ["triceps", "rearDelts"]],
  chin_up: [["lats", "biceps"], ["midBack"]],
  underhand_pulldown: [["lats", "biceps"], ["midBack"]],
  mixed_grip_chin: [["lats", "biceps"], ["midBack"]],
  pullover_machine: [["lats"], ["lowerChest", "triceps"]],

  push_press: [["frontDelts", "sideDelts"], ["triceps", "quads", "glutes"]],
  upright_bb_row: [["sideDelts", "traps"], ["frontDelts", "biceps"]],
  upright_cable_row: [["sideDelts", "traps"], ["frontDelts", "biceps"]],
  smith_upright_row: [["sideDelts", "traps"], ["frontDelts", "biceps"]],
  lateral_to_front: [["sideDelts", "frontDelts"], []],
  alternating_deltoid_raise: [["frontDelts", "sideDelts"], []],
  rear_delt_row: [["rearDelts", "midBack"], ["traps", "biceps"]],
  rope_rear_row: [["rearDelts", "midBack"], ["traps", "biceps"]],
  face_pull: [["rearDelts", "midBack"], ["traps"]],
  cable_row_to_neck: [["rearDelts", "midBack"], ["traps", "biceps"]],
  cable_external_rotation: [["rearDelts"], ["midBack"]],
  smith_shrug: [["traps", "midBack"], ["forearms"]],

  hammer_curl: HAMMER, alt_hammer_curl: HAMMER, cross_body_hammer: HAMMER, rope_hammer_curl: HAMMER, incline_hammer_curl: HAMMER, zottman_curl: HAMMER,
  reverse_bb_curl: REVERSE_CURL, reverse_cable_curl: REVERSE_CURL,

  front_squat: [["quads", "glutes"], ["upperAbs", "lowerBack"]],
  zercher_squat: [["quads", "glutes"], ["upperAbs", "lowerBack", "biceps"]],
  sumo_db_squat: [["quads", "glutes", "adductors"], []],
  pendulum_squat: [["quads"], ["glutes", "adductors"]],
  belt_squat: [["quads", "glutes"], ["adductors"]],
  side_split_squat: [["quads", "glutes", "adductors"], ["hamstrings"]],
  db_step_up: [["quads", "glutes"], ["hamstrings", "calves"]],
  bb_step_up: [["quads", "glutes"], ["hamstrings", "calves"]],

  deadlift: [["hamstrings", "glutes", "lowerBack"], ["traps", "midBack", "lats", "quads", "forearms"]],
  sumo_deadlift: [["glutes", "adductors", "hamstrings"], ["quads", "lowerBack", "traps", "forearms"]],
  trap_bar_deadlift: [["quads", "glutes", "hamstrings"], ["lowerBack", "traps", "forearms"]],
  machine_deadlift: [["quads", "glutes", "hamstrings"], ["lowerBack", "traps", "forearms"]],
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

  seated_calf_raise: SEATED_CALF, bb_seated_calf: SEATED_CALF, db_seated_calf: SEATED_CALF,

  hanging_leg_raise: LOWER_ABS, lying_leg_raise: LOWER_ABS, captains_chair: LOWER_ABS, reverse_crunch: LOWER_ABS,
  cable_reverse_crunch: LOWER_ABS, leg_pull_in: LOWER_ABS, hanging_pike: [["lowerAbs", "upperAbs"], ["obliques"]],
  suspended_reverse_crunch: LOWER_ABS,
  dead_bug: [["lowerAbs"], ["upperAbs", "obliques"]],
  jackknife_sit_up: [ABS, ["obliques"]],
  ab_wheel: [ABS, ["obliques", "lats"]],
  ab_rollout_knees: [ABS, ["obliques", "lats"]],
  russian_twist: OBLIQUES, cable_russian_twist: OBLIQUES, oblique_crunch: OBLIQUES, pallof_press: OBLIQUES,
  wood_chop: OBLIQUES, torso_rotation: OBLIQUES, cable_side_bend: [["obliques"], []], plate_twist: OBLIQUES,
  cross_body_crunch: [["upperAbs", "obliques"], ["lowerAbs"]],
  bicycle_crunch: [["obliques", "upperAbs"], ["lowerAbs"]],
};

// For your own exercises: the muscle you filed it under (or the parts you picked).
const BY_CHIP = {
  Chest: [CHEST, ["frontDelts", "triceps"]],
  Back: [["lats", "midBack"], ["biceps", "rearDelts"]],
  Shoulders: [["frontDelts", "sideDelts", "rearDelts"], []],
  Biceps: [["biceps"], ["forearms"]],
  Triceps: [["triceps"], []],
  Legs: [["quads", "glutes", "hamstrings"], ["calves"]],
  Core: [ABS, ["obliques"]],
};

const shape = ([main, helpers] = [[], []]) => ({ primary: main, secondary: helpers.filter((m) => !main.includes(m)) });

// { primary: [muscle keys], secondary: [muscle keys] } for an exercise (object or id).
export function musclesOf(exOrId) {
  const ex = typeof exOrId === "string" ? BY_ID[exOrId] : exOrId;
  if (!ex || !GROUPS[ex.group]) return { primary: [], secondary: [] };
  return shape(BY_EXERCISE[ex.id] || BY_GROUP[ex.group]);
}

// The same for a training slot: a library exercise, or your own one (the parts
// you picked, else the muscle you added it under).
export const customMuscles = (muscle, parts) => (parts?.length ? { primary: parts, secondary: [] } : shape(BY_CHIP[muscle]));
export const slotMuscles = (slot) => (slot?.custom ? customMuscles(slot.muscle, slot.parts) : musclesOf(slot?.ex));

// Which regions of one view light up, and how strongly: { region: "primary" | "secondary" }.
export function regionLevels({ primary = [], secondary = [] } = {}, view = "front") {
  const out = {};
  for (const m of secondary) for (const r of REGIONS[m]?.[view] || []) out[r] = "secondary";
  for (const m of primary) for (const r of REGIONS[m]?.[view] || []) out[r] = "primary";
  return out;
}

export const muscleNames = (keys, lang) => (keys || []).map((k) => (MUSCLE_LABELS[k] || [k, k])[lang === "ar" ? 1 : 0]);

// ── Zoom: small maps show the target up close ───────────────────────────────
const parsePts = (str) => { const v = str.trim().split(/\s+/).map(Number); const p = []; for (let i = 0; i < v.length; i += 2) p.push([v[i], v[i + 1]]); return p; };
const GEO = { front: Object.fromEntries(FRONT.map(([r, ps]) => [r, ps.map(parsePts)])), back: Object.fromEntries(BACK.map(([r, ps]) => [r, ps.map(parsePts)])) };
const areaOf = (p) => Math.abs(p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + x * y2 - x2 * y; }, 0)) / 2;

// The view (front or back) where the main muscles show most. Back-side jobs
// (rows, pulldowns, hinges, shrugs, calves…) are always drawn from behind.
const BACK_GROUPS = new Set(["row", "vpull", "rear", "shrug", "hinge", "legcurl", "glutes", "abduction", "calf"]);
export function mainView(m, group) {
  if (group && BACK_GROUPS.has(group)) return "back";
  const weight = (view) => Object.entries(regionLevels(m, view))
    .reduce((a, [r, lv]) => a + (lv === "primary" ? 1 : 0.1) * (GEO[view][r] || []).reduce((s, p) => s + areaOf(p), 0), 0);
  return weight("back") > weight("front") ? "back" : "front";
}

// A viewBox [x, y, w, h] around the lit parts of one view (main muscles only,
// or with helpers when `all`), padded and kept to a pleasant shape.
export function focusBox(m, view, { all = false, pad = 6, minH = 46 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [r, lv] of Object.entries(regionLevels(m, view))) {
    if (!all && lv !== "primary") continue;
    for (const p of GEO[view][r] || []) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  if (!Number.isFinite(x0)) return null;
  let w = x1 - x0 + pad * 2, h = Math.max(minH, y1 - y0 + pad * 2);
  if (w < h * 0.75) w = h * 0.75;
  if (w > h * 1.15) h = w / 1.15;
  w = Math.min(w, 100); h = Math.min(h, 220);
  const x = Math.max(0, Math.min(100 - w, (x0 + x1) / 2 - w / 2));
  const y = Math.max(0, Math.min(220 - h, (y0 + y1) / 2 - h / 2));
  return [x, y, w, h].map((v) => Math.round(v * 10) / 10);
}


// ── Search: any exercise by name, gear or muscle part, in English or Arabic ──
export const fold = (s) => String(s || "").toLowerCase().normalize("NFKD")
  .replace(/[ً-ٰٟـ]/g, "")          // harakat, tatweel
  .replace(/[آأإ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();
const TAGS = {
  pec_deck: "butterfly pec fly chest fly machine فراشه فراشة بيك دك تفتيح",
  reverse_pec_deck: "rear delt fly reverse butterfly reverse fly فراشه عكسي",
  machine_chest_press: "hammer iso lateral chest press",
  incline_machine_press: "hammer iso lateral incline",
  machine_row: "hammer iso lateral row",
  lat_pulldown: "lat pull down",
  leg_press: "45",
  cable_crossover: "crossover cross over",
  hip_abduction_machine: "abductor outer thigh",
  hip_adduction_machine: "adductor inner thigh",
};
let HAY = null;
// Every word must match; names count most, then the main muscles, then the rest.
export function searchExercises(q) {
  const words = fold(q).split(" ").filter(Boolean);
  if (!words.length) return [];
  if (!HAY) {
    HAY = EXERCISES.map((e, i) => {
      const m = musclesOf(e);
      const label = (keys) => keys.flatMap((k) => MUSCLE_LABELS[k]).join(" ");
      return { e, i, f: [
        [fold(`${e.name[0]} ${e.name[1]}`), 4],
        [fold(`${label(m.primary)} ${GROUPS[e.group].job.join(" ")}`), 3],
        [fold(`${e.gear[0]} ${e.gear[1]} ${e.id.replace(/_/g, " ")} ${TAGS[e.id] || ""}`), 2],
        [fold(label(m.secondary)), 1],
      ] };
    });
  }
  const out = [];
  for (const h of HAY) {
    let score = 0, ok = true;
    for (const w of words) {
      const best = Math.max(0, ...h.f.filter(([txt]) => txt.includes(w)).map(([, wt]) => wt));
      if (!best) { ok = false; break; }
      score += best;
    }
    if (ok) out.push([score, h.i, h.e]);
  }
  return out.sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((x) => x[2]);
}
