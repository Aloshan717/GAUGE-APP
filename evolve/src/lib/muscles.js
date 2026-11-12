// EVOLVE — which muscles an exercise works, for the body map.
//
// Every movement group has a default (main muscles + helpers); exercises that
// load the body differently override it, down to the part of the muscle:
// incline curls → the biceps' long head, preacher curls → the short head,
// hammer curls → brachialis and forearm, overhead extensions → the triceps'
// long head, pushdowns → the outer heads, wide pulldowns → upper lats,
// leg extensions → the middle of the quads, RDLs → upper hamstrings…
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
  tricepsLong: ["Triceps long head", "الرأس الطويل للترايسبس"],
  tricepsLateral: ["Triceps outer (lateral) head", "الرأس الجانبي للترايسبس (الخارجي)"],
  tricepsMedial: ["Triceps medial head (above the elbow)", "الرأس الإنسي للترايسبس (فوق الكوع)"],
  biceps: ["Biceps", "البايسبس"],
  bicepsLong: ["Biceps long head (outer)", "الرأس الطويل للبايسبس (الخارجي)"],
  bicepsShort: ["Biceps short head (inner)", "الرأس القصير للبايسبس (الداخلي)"],
  brachialis: ["Brachialis (under the biceps)", "العضلة العضدية (تحت البايسبس)"],
  forearms: ["Forearms", "الساعد"],
  brachioradialis: ["Top of the forearm (brachioradialis)", "أعلى الساعد (العضدية الكعبرية)"],
  forearmFlexors: ["Grip (inner forearm)", "القبضة (باطن الساعد)"],
  forearmExtensors: ["Back of the forearm", "ظهر الساعد"],
  traps: ["Upper traps", "الترابيس العلوي"],
  midBack: ["Mid back", "منتصف الظهر"],
  lats: ["Lats", "المجنص"],
  upperLats: ["Upper lats (width)", "أعلى المجنص (العرض)"],
  lowerLats: ["Lower lats", "أسفل المجنص"],
  lowerBack: ["Lower back", "أسفل الظهر"],
  upperAbs: ["Upper abs", "أعلى البطن"],
  lowerAbs: ["Lower abs", "أسفل البطن"],
  obliques: ["Obliques", "الخواصر"],
  quads: ["Quads", "الفخذ الأمامي"],
  quadsOuter: ["Outer quads", "الفخذ الأمامي الخارجي"],
  rectusFemoris: ["Middle quads (rectus femoris)", "منتصف الفخذ الأمامي"],
  quadsInner: ["Inner quads (teardrop)", "الفخذ الأمامي الداخلي (الدمعة)"],
  hamstrings: ["Hamstrings", "الفخذ الخلفي"],
  hamsUpper: ["Upper hamstrings (under the glutes)", "أعلى الفخذ الخلفي (تحت المؤخرة)"],
  hamsLower: ["Lower hamstrings (above the knee)", "أسفل الفخذ الخلفي (فوق الركبة)"],
  glutes: ["Glutes", "المؤخرة"],
  abductors: ["Side glutes", "جانب المؤخرة"],
  adductors: ["Inner thighs", "الفخذ الداخلي"],
  calves: ["Calves", "السمانة"],
  soleus: ["Lower calves", "السمانة السفلية"],
};

// The parts of the map (bodymap.js) each muscle lights up, front and back.
// A whole muscle (biceps, triceps, lats, quads…) lights all of its parts.
export const REGIONS = {
  upperChest: { front: ["chest-upper"] },
  midChest: { front: ["chest-mid"] },
  lowerChest: { front: ["chest-lower"] },
  frontDelts: { front: ["delt-front"] },
  sideDelts: { front: ["delt-side-f"], back: ["delt-side-b"] },
  rearDelts: { back: ["delt-rear"] },
  triceps: { front: ["tri-long"], back: ["tri-long", "tri-lateral", "tri-medial"] },
  tricepsLong: { front: ["tri-long"], back: ["tri-long"] },
  tricepsLateral: { back: ["tri-lateral"] },
  tricepsMedial: { back: ["tri-medial"] },
  biceps: { front: ["biceps-long", "biceps-short", "brachialis"] },
  bicepsLong: { front: ["biceps-long"] },
  bicepsShort: { front: ["biceps-short"] },
  brachialis: { front: ["brachialis"] },
  forearms: { front: ["brachiorad", "forearm-flex"], back: ["brachiorad", "forearm-ext"] },
  brachioradialis: { front: ["brachiorad"], back: ["brachiorad"] },
  forearmFlexors: { front: ["forearm-flex"] },
  forearmExtensors: { back: ["forearm-ext"] },
  traps: { front: ["neck"], back: ["traps-upper"] },
  midBack: { back: ["traps-mid"] },
  lats: { back: ["lats-upper", "lats-lower"] },
  upperLats: { back: ["lats-upper"] },
  lowerLats: { back: ["lats-lower"] },
  lowerBack: { back: ["lower-back"] },
  upperAbs: { front: ["abs-upper"] },
  lowerAbs: { front: ["abs-lower"] },
  obliques: { front: ["obliques"] },
  quads: { front: ["quad-vl", "quad-rf", "quad-vm"] },
  quadsOuter: { front: ["quad-vl"] },
  rectusFemoris: { front: ["quad-rf"] },
  quadsInner: { front: ["quad-vm"] },
  hamstrings: { back: ["ham-upper", "ham-lower"] },
  hamsUpper: { back: ["ham-upper"] },
  hamsLower: { back: ["ham-lower"] },
  glutes: { back: ["glute-max"] },
  abductors: { back: ["glute-med"] },
  adductors: { front: ["abductors"], back: ["adductor"] },   // the source names the inner-thigh shape "abductors" on the front view
  calves: { front: ["calves"], back: ["calves"] },
  soleus: { back: ["left-soleus", "right-soleus"] },
};

// The parts you can pick for your own exercise, per muscle on the Train page.
export const PARTS = {
  Chest: ["upperChest", "midChest", "lowerChest"],
  Back: ["upperLats", "lowerLats", "midBack", "lowerBack", "traps"],
  Shoulders: ["frontDelts", "sideDelts", "rearDelts", "traps"],
  Biceps: ["bicepsLong", "bicepsShort", "brachialis", "brachioradialis"],
  Triceps: ["tricepsLong", "tricepsLateral", "tricepsMedial"],
  Legs: ["quadsOuter", "rectusFemoris", "quadsInner", "hamsUpper", "hamsLower", "glutes", "abductors", "adductors", "calves"],
  Core: ["upperAbs", "lowerAbs", "obliques"],
};

const CHEST = ["upperChest", "midChest", "lowerChest"];
const ABS = ["upperAbs", "lowerAbs"];
const VASTI = ["quadsOuter", "quadsInner"];   // squats and presses work these most; leg extensions the middle

// [main muscles, helpers] for each movement group.
const BY_GROUP = {
  hpress: [["midChest"], ["upperChest", "lowerChest", "frontDelts", "triceps"]],
  incline: [["upperChest"], ["midChest", "frontDelts", "triceps"]],
  fly: [["midChest"], ["upperChest", "lowerChest", "frontDelts"]],
  triceps: [["triceps"], []],
  row: [["midBack", "lats"], ["rearDelts", "biceps", "traps"]],
  vpull: [["lats"], ["midBack", "biceps", "rearDelts"]],
  ohp: [["frontDelts"], ["sideDelts", "triceps", "traps", "upperChest"]],   // presses lead with the front; raises build the side
  lateral: [["sideDelts"], ["traps"]],
  frontraise: [["frontDelts"], ["sideDelts", "upperChest"]],
  rear: [["rearDelts"], ["midBack", "traps"]],
  shrug: [["traps"], ["forearmFlexors"]],
  curl: [["biceps"], ["brachioradialis"]],
  squat: [[...VASTI, "glutes"], ["rectusFemoris", "adductors", "lowerBack"]],
  hinge: [["hamsUpper", "glutes"], ["hamsLower", "lowerBack"]],
  legpress: [[...VASTI, "glutes"], ["rectusFemoris", "adductors"]],
  lunge: [["glutes", ...VASTI], ["rectusFemoris", "adductors", "hamstrings", "abductors"]],
  glutes: [["glutes"], ["hamsUpper", "abductors"]],
  legcurl: [["hamsLower"], ["hamsUpper", "calves"]],
  legext: [["rectusFemoris"], VASTI],
  calf: [["calves"], ["soleus"]],
  abduction: [["abductors"], ["glutes"]],
  adduction: [["adductors"], []],
  core: [["upperAbs"], ["lowerAbs", "obliques"]],
};

const LOWER_CHEST_PRESS = [["lowerChest"], ["midChest", "triceps", "frontDelts"]];
const UPPER_FLY = [["upperChest"], ["midChest", "frontDelts"]];
// Presses and dips: the outer and medial heads; overhead work stretches the long head.
const DIP_TRICEPS = [["tricepsLateral", "tricepsMedial"], ["tricepsLong", "lowerChest", "frontDelts"]];
const CLOSE_PRESS = [["tricepsLateral", "tricepsMedial"], ["tricepsLong", "midChest", "frontDelts"]];
const TRI_LONG = [["tricepsLong"], ["tricepsLateral", "tricepsMedial"]];
const TRI_OUTER = [["tricepsLateral"], ["tricepsMedial", "tricepsLong"]];
const TRI_PUSHDOWN = [["tricepsLateral", "tricepsMedial"], ["tricepsLong"]];
const TRI_MEDIAL = [["tricepsMedial"], ["tricepsLateral", "tricepsLong"]];
// Curls: arm behind you → long head; arm in front (preacher, spider) → short head;
// neutral grip → brachialis and forearm; palms down → the forearm most.
const CURL_LONG = [["bicepsLong"], ["bicepsShort", "brachialis"]];
const CURL_SHORT = [["bicepsShort"], ["bicepsLong", "brachialis"]];
const HAMMER = [["brachialis", "brachioradialis"], ["bicepsLong"]];
const REVERSE_CURL = [["brachioradialis", "brachialis"], ["forearmExtensors", "biceps"]];
// Back: wide pulls → upper lats (width); elbows close to the body → lower lats.
const ROW_UPPER = [["midBack", "upperLats"], ["rearDelts", "biceps", "traps"]];
const ROW_LOWER = [["lowerLats", "midBack"], ["upperLats", "biceps"]];
const ROW_ONE_ARM = [["lowerLats"], ["upperLats", "midBack", "biceps"]];
const PULL_WIDE = [["upperLats"], ["lowerLats", "midBack", "biceps", "rearDelts"]];
const PULL_CLOSE = [["lowerLats"], ["upperLats", "midBack", "biceps"]];
const PULL_UNDER = [["lowerLats", "biceps"], ["upperLats", "midBack"]];
const LOWER_ABS = [["lowerAbs"], ["upperAbs", "obliques"]];
const OBLIQUES = [["obliques"], ABS];
const SEATED_CALF = [["soleus"], ["calves"]];
const NORDIC = [["hamsLower"], ["hamsUpper", "glutes", "calves"]];
const OUTER_QUADS = [["quadsOuter"], ["quadsInner", "rectusFemoris", "glutes"]];
const STEP_UP = [["glutes", ...VASTI], ["hamstrings", "calves"]];
const BACK_EXT = [["lowerBack", "glutes"], ["hamsUpper"]];

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
  overhead_cable_ext: TRI_LONG, skull_crusher: TRI_LONG, db_overhead_ext: TRI_LONG, seated_triceps_press: TRI_LONG,
  lying_db_triceps_ext: TRI_LONG, cable_lying_triceps_ext: TRI_LONG, kneeling_cable_ext: TRI_LONG, overhead_bar_ext: TRI_LONG,
  low_cable_triceps_ext: TRI_LONG, incline_cable_triceps_ext: TRI_LONG,
  rope_pushdown: TRI_OUTER, db_kickback: TRI_OUTER,
  bar_pushdown: TRI_PUSHDOWN, vbar_pushdown: TRI_PUSHDOWN,
  reverse_pushdown: TRI_MEDIAL, one_arm_cable_ext: TRI_MEDIAL,

  seated_cable_row: ROW_LOWER, low_row_machine: ROW_LOWER,
  chest_supported_db_row: ROW_UPPER, inverted_row: ROW_UPPER, chest_supported_tbar: ROW_UPPER, incline_bench_pull: ROW_UPPER, trx_row: ROW_UPPER,
  high_row_machine: [["upperLats", "midBack"], ["rearDelts", "biceps"]],
  kneeling_high_row: [["upperLats", "midBack"], ["rearDelts", "biceps"]],
  one_arm_db_row: ROW_ONE_ARM, one_arm_cable_row: ROW_ONE_ARM, shotgun_row: ROW_ONE_ARM,
  neutral_db_row: [["lats"], ["midBack", "biceps"]],
  barbell_row: [["midBack", "lats"], ["rearDelts", "traps", "lowerBack", "biceps"]],
  underhand_bb_row: [["lowerLats", "midBack"], ["biceps", "upperLats"]],
  lat_pulldown: PULL_WIDE, pull_up: PULL_WIDE, assisted_pull_up: PULL_WIDE,
  close_grip_pulldown: PULL_CLOSE, vbar_pulldown: PULL_CLOSE, vbar_pull_up: PULL_CLOSE,
  chin_up: PULL_UNDER, underhand_pulldown: PULL_UNDER,
  mixed_grip_chin: [["lats", "biceps"], ["midBack"]],
  db_pullover: [["lats", "lowerChest"], ["tricepsLong", "midChest"]],
  straight_arm_pulldown: [["lats"], ["tricepsLong"]],
  rope_straight_arm: [["lats"], ["tricepsLong", "rearDelts"]],
  pullover_machine: [["lats"], ["lowerChest", "tricepsLong"]],

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
  smith_shrug: [["traps", "midBack"], ["forearmFlexors"]],

  incline_db_curl: CURL_LONG, close_ez_curl: CURL_LONG, drag_curl: CURL_LONG,
  machine_preacher_curl: CURL_SHORT, db_preacher_curl: CURL_SHORT, cable_preacher_curl: CURL_SHORT, spider_curl: CURL_SHORT,
  prone_incline_curl: CURL_SHORT, concentration_curl: CURL_SHORT, high_cable_curl: CURL_SHORT, overhead_cable_curl: CURL_SHORT, machine_curl: CURL_SHORT,
  preacher_curl: [["bicepsShort", "brachialis"], ["bicepsLong"]],
  hammer_curl: HAMMER, alt_hammer_curl: HAMMER, rope_hammer_curl: HAMMER,
  cross_body_hammer: [["brachialis"], ["brachioradialis", "bicepsLong"]],
  incline_hammer_curl: [["brachialis", "bicepsLong"], ["brachioradialis"]],
  zottman_curl: [["biceps", "brachioradialis"], ["forearmExtensors"]],
  reverse_bb_curl: REVERSE_CURL, reverse_cable_curl: REVERSE_CURL,

  front_squat: [VASTI, ["glutes", "rectusFemoris", "upperAbs", "lowerBack"]],
  zercher_squat: [[...VASTI, "glutes"], ["upperAbs", "lowerBack", "biceps"]],
  hack_squat: [VASTI, ["glutes", "rectusFemoris"]],
  narrow_hack_squat: OUTER_QUADS,
  narrow_leg_press: OUTER_QUADS,
  sumo_db_squat: [["adductors", "glutes", "quadsInner"], ["quadsOuter"]],
  pendulum_squat: [VASTI, ["rectusFemoris", "glutes", "adductors"]],
  belt_squat: [[...VASTI, "glutes"], ["adductors"]],
  side_split_squat: [["adductors", "glutes", "quadsInner"], ["quadsOuter", "hamstrings"]],
  db_step_up: STEP_UP,
  bb_step_up: STEP_UP,
  deficit_reverse_lunge: [["glutes"], [...VASTI, "adductors", "hamsUpper"]],
  sissy_squat: [["rectusFemoris", "quadsInner"], ["quadsOuter"]],

  deadlift: [["hamstrings", "glutes", "lowerBack"], ["traps", "midBack", "lats", "quads", "forearmFlexors"]],
  sumo_deadlift: [["glutes", "adductors", "hamstrings"], ["quads", "lowerBack", "traps", "forearmFlexors"]],
  trap_bar_deadlift: [["quads", "glutes", "hamstrings"], ["lowerBack", "traps", "forearmFlexors"]],
  machine_deadlift: [["quads", "glutes", "hamstrings"], ["lowerBack", "traps", "forearmFlexors"]],
  good_morning: [["hamsUpper", "lowerBack"], ["glutes", "hamsLower"]],
  back_extension: BACK_EXT,
  floor_back_ext: BACK_EXT,
  reverse_hyper: [["glutes", "hamsUpper"], ["lowerBack"]],
  single_leg_bridge: [["glutes", "hamstrings"], []],
  cable_pull_through: [["glutes", "hamsUpper"], ["lowerBack"]],

  seated_leg_curl: [["hamstrings"], ["calves"]],
  nordic_curl: NORDIC,
  floor_glute_ham: NORDIC,
  glute_ham_raise: [["hamstrings"], ["glutes", "calves"]],
  ball_leg_curl: [["hamsLower"], ["glutes", "calves"]],
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
  Biceps: [["biceps"], ["brachioradialis"]],
  Triceps: [["triceps"], []],
  Legs: [["quads", "glutes", "hamstrings"], ["calves"]],
  Core: [ABS, ["obliques"]],
};

const shape = ([main, helpers] = [[], []]) => ({ primary: main, secondary: helpers.filter((m) => !main.includes(m)) });

// A whole muscle stands for all of its parts.
export const SUBPARTS = {
  biceps: ["bicepsLong", "bicepsShort", "brachialis"],
  triceps: ["tricepsLong", "tricepsLateral", "tricepsMedial"],
  lats: ["upperLats", "lowerLats"],
  quads: ["quadsOuter", "rectusFemoris", "quadsInner"],
  hamstrings: ["hamsUpper", "hamsLower"],
  forearms: ["brachioradialis", "forearmFlexors", "forearmExtensors"],
};
export const partsOf = (keys) => [...new Set((keys || []).flatMap((k) => [k, ...(SUBPARTS[k] || [])]))];

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

// Same angle: two exercises that work the same part of the muscle — the same
// main muscles, or the same one first (preacher and concentration curls both
// lead with the short head; hammer and cross-body hammer with the brachialis).
export function sameAngle(a, b) {
  const A = musclesOf(a).primary, B = musclesOf(b).primary;
  if (!A.length || !B.length) return false;
  return A[0] === B[0] || (A.length === B.length && A.every((k) => B.includes(k)));
}

export const muscleNames = (keys, lang) => (keys || []).map((k) => (MUSCLE_LABELS[k] || [k, k])[lang === "ar" ? 1 : 0]);

// ── Zoom: small maps show the target up close ───────────────────────────────
const parsePts = (str) => { const v = str.trim().split(/\s+/).map(Number); const p = []; for (let i = 0; i < v.length; i += 2) p.push([v[i], v[i + 1]]); return p; };
const GEO = { front: Object.fromEntries(FRONT.map(([r, ps]) => [r, ps.map(parsePts)])), back: Object.fromEntries(BACK.map(([r, ps]) => [r, ps.map(parsePts)])) };
const areaOf = (p) => Math.abs(p.reduce((a, [x, y], i) => { const [x2, y2] = p[(i + 1) % p.length]; return a + x * y2 - x2 * y; }, 0)) / 2;

// The view (front or back) where the main muscles show most. Back-side jobs
// (rows, pulldowns, triceps, hinges, shrugs, calves…) are always drawn from behind.
const BACK_GROUPS = new Set(["row", "vpull", "rear", "shrug", "triceps", "hinge", "legcurl", "glutes", "abduction", "calf"]);
// Squats, presses, extensions and lunges are drawn from the front (the quads)
// unless the exercise has no main muscle there (a glute-only lunge).
const FRONT_GROUPS = new Set(["squat", "legpress", "legext", "lunge"]);
export function mainView(m, group) {
  if (group && BACK_GROUPS.has(group)) return "back";
  if (group && FRONT_GROUPS.has(group) && Object.values(regionLevels(m, "front")).includes("primary")) return "front";
  const weight = (view) => Object.entries(regionLevels(m, view))
    .reduce((a, [r, lv]) => a + (lv === "primary" ? 1 : 0.1) * (GEO[view][r] || []).reduce((s, p) => s + areaOf(p), 0), 0);
  return weight("back") > weight("front") ? "back" : "front";
}

// A viewBox [x, y, w, h] around the lit parts of one view (main muscles only,
// or with helpers when `all`), padded and kept to a pleasant shape. When only
// the arms light up, the box takes one arm (the one on the right of the
// picture) with its shoulder — big enough to see which head is working.
const ARM = /^(biceps|brachialis|tri-|brachiorad|forearm)/;
const SHOULDER = { front: ["delt-front", "delt-side-f"], back: ["delt-rear", "delt-side-b"] };   // so an arm reads as an arm
const midX = (p) => p.reduce((a, [x]) => a + x, 0) / p.length;
export function focusBox(m, view, { all = false, pad = 6, minH = 46 } = {}) {
  const lit = Object.entries(regionLevels(m, view)).filter(([, lv]) => all || lv === "primary").map(([r]) => r);
  const arm = lit.length > 0 && lit.every((r) => ARM.test(r));
  if (arm) minH = Math.min(minH, 34);
  const frame = arm ? [...lit, ...SHOULDER[view]] : lit;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of frame) {
    for (const p of GEO[view][r] || []) {
      if (arm && midX(p) < 50) continue;
      for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
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
