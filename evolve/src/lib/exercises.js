// EVOLVE — exercise library.
//
// Exercises are grouped by JOB: the movement they do and the main muscle they
// train. A swap only ever offers another exercise from the same group, so the
// replacement does the same work — never a random exercise.
//
// Each exercise also says what equipment it needs (filtered by where you train)
// and which joints it loads (filtered by the pain/injury answer).
//
// Photos: free-exercise-db (public domain, github.com/yuhonas/free-exercise-db).

// Served by jsDelivr's CDN; GitHub's raw host is the fallback if that fails.
export const IMG_BASES = [
  "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/",
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/",
];
export const exerciseImages = (ex, frame = 0) => (ex?.img ? IMG_BASES.map((b) => `${b}${ex.img}/${frame}.jpg`) : []);
export const exerciseImage = (ex, frame = 0) => exerciseImages(ex, frame)[0] || null;

// Muscles you can pick on the Train page. Same names Gauge stored, so old lifts line up.
export const MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core"];
export const MUSCLE_NAMES = {
  Chest: ["Chest", "الصدر"], Back: ["Back", "الظهر"], Shoulders: ["Shoulders", "الأكتاف"],
  Biceps: ["Biceps", "البايسبس"], Triceps: ["Triceps", "الترايسبس"], Legs: ["Legs", "الأرجل"], Core: ["Core", "البطن"],
};

// Equipment available in each place you can train.
export const EQUIPMENT = {
  gym: ["barbell", "dumbbell", "machine", "cable", "bench", "bar", "body"],
  home: ["dumbbell", "bench", "body"],
  bw: ["body"],
};

// key: { muscle chip, compound?, job, main muscle, helpers, rep ranges }
export const GROUPS = {
  hpress:   { muscle: "Chest", compound: true, job: ["Horizontal press", "ضغط أفقي"], main: ["Chest", "الصدر"], also: ["Triceps · front shoulders", "الترايسبس · الكتف الأمامي"], reps: { muscle: [6, 10], strength: [4, 6] } },
  incline:  { muscle: "Chest", compound: true, job: ["Incline press", "ضغط مائل"], main: ["Upper chest", "أعلى الصدر"], also: ["Front shoulders · triceps", "الكتف الأمامي · الترايسبس"], reps: { muscle: [8, 12], strength: [5, 8] } },
  fly:      { muscle: "Chest", compound: false, job: ["Chest fly", "تفتيح الصدر"], main: ["Chest", "الصدر"], also: ["Front shoulders", "الكتف الأمامي"], reps: { muscle: [12, 15], strength: [10, 12] } },
  triceps:  { muscle: "Triceps", compound: false, job: ["Elbow extension", "مد الكوع"], main: ["Triceps", "الترايسبس"], also: null, reps: { muscle: [10, 15], strength: [8, 12] } },
  row:      { muscle: "Back", compound: true, job: ["Horizontal pull", "سحب أفقي"], main: ["Upper back", "أعلى الظهر"], also: ["Lats · biceps · rear shoulders", "المجنص · البايسبس · الكتف الخلفي"], reps: { muscle: [8, 12], strength: [5, 8] } },
  vpull:    { muscle: "Back", compound: true, job: ["Vertical pull", "سحب عمودي"], main: ["Lats", "المجنص"], also: ["Biceps · upper back", "البايسبس · أعلى الظهر"], reps: { muscle: [8, 12], strength: [5, 8] } },
  ohp:      { muscle: "Shoulders", compound: true, job: ["Overhead press", "ضغط فوق الرأس"], main: ["Shoulders", "الأكتاف"], also: ["Triceps · upper chest", "الترايسبس · أعلى الصدر"], reps: { muscle: [8, 12], strength: [4, 6] } },
  lateral:  { muscle: "Shoulders", compound: false, job: ["Lateral raise", "رفرفة جانبية"], main: ["Side shoulders", "الكتف الجانبي"], also: null, reps: { muscle: [12, 20], strength: [10, 15] } },
  rear:     { muscle: "Shoulders", compound: false, job: ["Rear raise", "رفرفة خلفية"], main: ["Rear shoulders", "الكتف الخلفي"], also: ["Upper back", "أعلى الظهر"], reps: { muscle: [12, 20], strength: [10, 15] } },
  curl:     { muscle: "Biceps", compound: false, job: ["Elbow flexion", "ثني الكوع"], main: ["Biceps", "البايسبس"], also: ["Forearms", "الساعد"], reps: { muscle: [10, 15], strength: [8, 12] } },
  squat:    { muscle: "Legs", compound: true, job: ["Squat", "سكوات"], main: ["Quads", "الفخذ الأمامي"], also: ["Glutes · inner thighs", "المؤخرة · الفخذ الداخلي"], reps: { muscle: [6, 10], strength: [4, 6] } },
  hinge:    { muscle: "Legs", compound: true, job: ["Hip hinge", "ثني الورك"], main: ["Hamstrings", "الفخذ الخلفي"], also: ["Glutes · lower back", "المؤخرة · أسفل الظهر"], reps: { muscle: [8, 10], strength: [5, 8] } },
  legpress: { muscle: "Legs", compound: true, job: ["Leg press", "دفع الرجل"], main: ["Quads", "الفخذ الأمامي"], also: ["Glutes", "المؤخرة"], reps: { muscle: [10, 12], strength: [6, 10] } },
  lunge:    { muscle: "Legs", compound: true, job: ["Single-leg squat", "سكوات برجل وحدة"], main: ["Quads · glutes", "الفخذ الأمامي · المؤخرة"], also: ["Balance", "الثبات"], reps: { muscle: [8, 12], strength: [6, 10] } },
  glutes:   { muscle: "Legs", compound: true, job: ["Hip extension", "مد الورك"], main: ["Glutes", "المؤخرة"], also: ["Hamstrings", "الفخذ الخلفي"], reps: { muscle: [8, 12], strength: [6, 10] } },
  legcurl:  { muscle: "Legs", compound: false, job: ["Knee flexion", "ثني الركبة"], main: ["Hamstrings", "الفخذ الخلفي"], also: ["Calves", "السمانة"], reps: { muscle: [10, 12], strength: [8, 10] } },
  legext:   { muscle: "Legs", compound: false, job: ["Knee extension", "مد الركبة"], main: ["Quads", "الفخذ الأمامي"], also: null, reps: { muscle: [10, 15], strength: [8, 12] } },
  calf:     { muscle: "Legs", compound: false, job: ["Calf raise", "رفع السمانة"], main: ["Calves", "السمانة"], also: null, reps: { muscle: [12, 15], strength: [10, 12] } },
  core:     { muscle: "Core", compound: false, job: ["Trunk flexion", "ثني الجذع"], main: ["Abs", "البطن"], also: ["Hip flexors", "عضلات الورك"], reps: { muscle: [10, 15], strength: [8, 12] } },
};

// [id, group, photo, equipment, joints loaded, "same" movement or a different "angle",
//  name en, name ar, gear en, gear ar, why en, why ar]
const RAW = [
  ["bench_press", "hpress", "Barbell_Bench_Press_-_Medium_Grip", "barbell bench", "shoulder wrist", "same", "Bench press", "بنش برس", "Barbell · flat bench", "بار · بنش مستوي", "Heaviest loading — best for strength", "يتحمل أعلى وزن — الأفضل للقوة"],
  ["db_bench_press", "hpress", "Dumbbell_Bench_Press", "dumbbell bench", "shoulder", "same", "Dumbbell bench press", "بنش دمبل", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Each side works alone, deeper stretch", "كل جهة تشتغل لحالها ومدى أعمق"],
  ["machine_chest_press", "hpress", "Leverage_Chest_Press", "machine", "", "same", "Machine chest press", "جهاز ضغط الصدر", "Chest press machine", "جهاز ضغط الصدر", "Push to the last rep safely — no spotter", "تضغط لآخر تكرار بأمان بدون مساعد"],
  ["smith_bench_press", "hpress", "Smith_Machine_Bench_Press", "machine bench", "shoulder", "same", "Smith machine bench press", "بنش سميث", "Smith machine · flat bench", "جهاز السميث · بنش مستوي", "Fixed path — quick to set up", "مسار ثابت وسريع التجهيز"],
  ["push_up", "hpress", "Pushups", "body", "wrist", "same", "Push-up", "ضغط أرضي", "Bodyweight", "وزن الجسم", "No equipment — add reps or a backpack", "بدون أدوات — زد التكرار أو شنطة على ظهرك"],

  ["incline_db_press", "incline", "Incline_Dumbbell_Press", "dumbbell bench", "", "same", "Incline dumbbell press", "ضغط دمبل مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Free path — kind to the shoulders", "حركة حرة ومريحة للكتف"],
  ["incline_machine_press", "incline", "Leverage_Incline_Chest_Press", "machine", "", "same", "Incline machine press", "جهاز ضغط مائل", "Incline press machine", "جهاز ضغط مائل", "Stable — easy to add weight", "ثابت وسهل تزيد عليه"],
  ["incline_bench_press", "incline", "Barbell_Incline_Bench_Press_-_Medium_Grip", "barbell bench", "shoulder wrist", "same", "Incline barbell press", "بنش مائل بار", "Barbell · incline bench", "بار · بنش مائل", "Takes the heaviest load", "يتحمل أعلى وزن"],
  ["incline_cable_fly", "incline", "Incline_Cable_Flye", "cable bench", "", "angle", "Incline cable fly", "تفتيح كيبل مائل", "Cables · incline bench", "كيبل · بنش مائل", "Upper chest without pressing", "أعلى الصدر بدون ضغط"],
  ["feet_up_push_up", "incline", "Push-Ups_With_Feet_Elevated", "body", "wrist shoulder", "same", "Feet-up push-up", "ضغط أرضي والرجل مرفوعة", "Bodyweight · step or bench", "وزن الجسم · درج أو كرسي", "Tilts the work to the upper chest", "يحوّل الشغل لأعلى الصدر"],

  ["cable_fly", "fly", "Flat_Bench_Cable_Flyes", "cable bench", "", "same", "Cable fly", "تفتيح كيبل", "Cables · flat bench", "كيبل · بنش مستوي", "Tension through the whole rep", "شد ثابت طول الحركة"],
  ["pec_deck", "fly", "Butterfly", "machine", "", "same", "Pec deck", "جهاز الفراشة", "Pec deck machine", "جهاز الفراشة", "Easiest to learn, very stable", "الأسهل والأثبت"],
  ["db_fly", "fly", "Dumbbell_Flyes", "dumbbell bench", "shoulder", "same", "Dumbbell fly", "تفتيح دمبل", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Big stretch at the bottom", "تمدد كبير تحت"],

  ["rope_pushdown", "triceps", "Triceps_Pushdown_-_Rope_Attachment", "cable", "", "same", "Triceps pushdown", "ترايسبس بوش داون", "Cable · rope", "كيبل · حبل", "Easy on the elbows", "مريح للكوع"],
  ["overhead_cable_ext", "triceps", "Cable_Rope_Overhead_Triceps_Extension", "cable", "shoulder", "angle", "Overhead cable extension", "تمديد كيبل خلف الرأس", "Cable · rope", "كيبل · حبل", "Stretches the long head more", "يمدد الرأس الطويل أكثر"],
  ["skull_crusher", "triceps", "EZ-Bar_Skullcrusher", "barbell bench", "wrist", "angle", "EZ-bar skull crusher", "سكل كرشر بار EZ", "EZ bar · flat bench", "بار EZ · بنش مستوي", "Heavy load for the long head", "حمل عالي للرأس الطويل"],
  ["db_overhead_ext", "triceps", "Dumbbell_One-Arm_Triceps_Extension", "dumbbell", "shoulder", "angle", "Dumbbell overhead extension", "تمديد دمبل خلف الرأس", "Dumbbell", "دمبل", "Long-head stretch with one dumbbell", "تمدد للرأس الطويل بدمبل واحد"],
  ["dip_machine", "triceps", "Dip_Machine", "machine", "shoulder", "angle", "Machine dip", "جهاز الديبس", "Dip machine", "جهاز الديبس", "Heavier — the chest helps too", "وزن أعلى والصدر يساعد"],
  ["bench_dip", "triceps", "Bench_Dips", "body", "shoulder wrist", "angle", "Bench dip", "ديبس على الكرسي", "Bodyweight · bench or chair", "وزن الجسم · بنش أو كرسي", "No equipment needed", "بدون أدوات"],
  ["close_push_up", "triceps", "Push-Ups_-_Close_Triceps_Position", "body", "wrist", "angle", "Close-grip push-up", "ضغط أرضي ضيق", "Bodyweight", "وزن الجسم", "A push-up aimed at the triceps", "ضغط يركز على الترايسبس"],

  ["seated_cable_row", "row", "Seated_Cable_Rows", "cable", "", "same", "Seated cable row", "سحب كيبل جالس", "Cable row station", "جهاز السحب الأرضي", "Smooth and easy to control", "سلس وسهل التحكم"],
  ["machine_row", "row", "Leverage_Iso_Row", "machine", "", "same", "Machine row", "جهاز السحب", "Row machine", "جهاز السحب", "Chest pad — no lower-back strain", "مسند صدر — ما يضغط أسفل الظهر"],
  ["chest_supported_db_row", "row", "Dumbbell_Incline_Row", "dumbbell bench", "", "same", "Chest-supported dumbbell row", "سحب دمبل على بنش مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "No strain on the lower back", "ما يضغط أسفل الظهر"],
  ["one_arm_db_row", "row", "One-Arm_Dumbbell_Row", "dumbbell bench", "", "same", "One-arm dumbbell row", "سحب دمبل بيد وحدة", "Dumbbell · bench", "دمبل · بنش", "Each side alone, long range", "كل جهة لحالها ومدى طويل"],
  ["barbell_row", "row", "Bent_Over_Barbell_Row", "barbell", "back", "same", "Barbell row", "سحب بار منحني", "Barbell", "بار", "Heaviest row — trains the whole back", "أثقل سحب ويشغل الظهر كامل"],
  ["inverted_row", "row", "Inverted_Row", "body", "", "same", "Inverted row", "سحب عكسي", "Bodyweight · low bar or sturdy table", "وزن الجسم · بار منخفض أو طاولة ثابتة", "A row with no weights", "سحب بدون أوزان"],

  ["lat_pulldown", "vpull", "Wide-Grip_Lat_Pulldown", "cable", "", "same", "Lat pulldown", "سحب أمامي", "Lat pulldown machine", "جهاز السحب العالي", "Any weight you need", "تختار أي وزن تبيه"],
  ["close_grip_pulldown", "vpull", "Close-Grip_Front_Lat_Pulldown", "cable", "", "same", "Close-grip pulldown", "سحب أمامي ضيق", "Lat pulldown · close handle", "جهاز السحب العالي · مقبض ضيق", "Longer range, easy on the shoulders", "مدى أطول ومريح للكتف"],
  ["assisted_pull_up", "vpull", "Band_Assisted_Pull-Up", "machine", "shoulder", "same", "Assisted pull-up", "عقلة بالمساعدة", "Assisted pull-up machine or band", "جهاز العقلة المساعد أو مطاط", "Builds up to real pull-ups", "يجهزك للعقلة الحقيقية"],
  ["one_arm_pulldown", "vpull", "One_Arm_Lat_Pulldown", "cable", "", "same", "Single-arm pulldown", "سحب كيبل بيد وحدة", "Cable · handle", "كيبل · مقبض", "Each side alone, deep stretch", "كل جهة لحالها مع تمدد عميق"],
  ["pull_up", "vpull", "Pullups", "bar", "shoulder", "same", "Pull-up", "عقلة", "Pull-up bar", "بار العقلة", "The classic back builder", "الكلاسيكي لبناء الظهر"],
  ["db_pullover", "vpull", "Bent-Arm_Dumbbell_Pullover", "dumbbell bench", "shoulder", "angle", "Dumbbell pullover", "بلوفر دمبل", "Dumbbell · bench", "دمبل · بنش", "Lats with only a dumbbell", "يشغل المجنص بدمبل بس"],

  ["db_shoulder_press", "ohp", "Dumbbell_Shoulder_Press", "dumbbell bench", "", "same", "Seated dumbbell press", "ضغط دمبل جالس", "Dumbbells · upright bench", "دمبل · بنش قائم", "Natural path for the shoulders", "مسار طبيعي للكتف"],
  ["machine_shoulder_press", "ohp", "Machine_Shoulder_Military_Press", "machine", "", "same", "Machine shoulder press", "جهاز ضغط الكتف", "Shoulder press machine", "جهاز ضغط الكتف", "Most stable — push hard safely", "الأثبت — تضغط بقوة بأمان"],
  ["barbell_ohp", "ohp", "Standing_Military_Press", "barbell", "shoulder back", "same", "Standing barbell press", "ضغط بار واقف", "Barbell", "بار", "Trains your core too", "يشغل البطن والثبات بعد"],
  ["arnold_press", "ohp", "Arnold_Dumbbell_Press", "dumbbell", "shoulder", "angle", "Arnold press", "ضغط أرنولد", "Dumbbells", "دمبل", "Front and side shoulders together", "يشغل الكتف الأمامي والجانبي مع بعض"],

  ["cable_lateral_raise", "lateral", "Cable_Seated_Lateral_Raise", "cable", "", "same", "Cable lateral raise", "رفرفة جانبية كيبل", "Cable · handle", "كيبل · مقبض", "Tension all the way up", "شد طول الحركة"],
  ["db_lateral_raise", "lateral", "Side_Lateral_Raise", "dumbbell", "", "same", "Dumbbell lateral raise", "رفرفة جانبية دمبل", "Dumbbells", "دمبل", "Simple — works anywhere", "بسيطة وتنفع بأي مكان"],
  ["incline_lateral_raise", "lateral", "One-Arm_Incline_Lateral_Raise", "dumbbell bench", "", "angle", "Lying incline lateral raise", "رفرفة جانبية على بنش مائل", "Dumbbell · incline bench", "دمبل · بنش مائل", "Harder at the bottom, no swinging", "أصعب تحت وما تتمرجح"],

  ["face_pull", "rear", "Face_Pull", "cable", "", "same", "Face pull", "فيس بول", "Cable · rope", "كيبل · حبل", "Rear shoulders and upper back, shoulder-friendly", "الكتف الخلفي وأعلى الظهر ومريح للكتف"],
  ["reverse_pec_deck", "rear", "Reverse_Machine_Flyes", "machine", "", "same", "Reverse pec deck", "فراشة عكسي", "Pec deck machine", "جهاز الفراشة", "Locks you in — no swinging", "يثبتك وما تتمرجح"],
  ["db_reverse_fly", "rear", "Reverse_Flyes", "dumbbell", "back", "same", "Dumbbell reverse fly", "رفرفة خلفي دمبل", "Dumbbells", "دمبل", "Needs only dumbbells", "تحتاج دمبل بس"],

  ["ez_curl", "curl", "EZ-Bar_Curl", "barbell", "", "same", "EZ-bar curl", "بايسبس بار EZ", "EZ bar", "بار EZ", "Easier on the wrists than a straight bar", "أريح للرسغ من البار المستقيم"],
  ["db_curl", "curl", "Dumbbell_Bicep_Curl", "dumbbell", "", "same", "Dumbbell curl", "بايسبس دمبل", "Dumbbells", "دمبل", "Each arm works alone", "كل يد تشتغل لحالها"],
  ["cable_curl", "curl", "Standing_Biceps_Cable_Curl", "cable", "", "same", "Cable curl", "بايسبس كيبل", "Cable · straight bar", "كيبل · بار", "Tension even at the top", "شد حتى فوق"],
  ["incline_db_curl", "curl", "Alternate_Incline_Dumbbell_Curl", "dumbbell bench", "shoulder", "angle", "Incline dumbbell curl", "بايسبس دمبل مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Bigger stretch", "تمدد أكبر"],
  ["hammer_curl", "curl", "Hammer_Curls", "dumbbell", "", "angle", "Hammer curl", "هامر كيرل", "Dumbbells", "دمبل", "Forearms work too", "يشغل الساعد بعد"],
  ["machine_preacher_curl", "curl", "Machine_Preacher_Curls", "machine", "", "angle", "Machine preacher curl", "جهاز البايسبس", "Preacher curl machine", "جهاز البايسبس", "No cheating — the arm stays fixed", "ما تقدر تغش — اليد ثابتة"],

  ["back_squat", "squat", "Barbell_Squat", "barbell", "back knee", "same", "Back squat", "سكوات بار", "Barbell · squat rack", "بار · رف السكوات", "The heaviest leg lift", "أثقل تمرين للرجل"],
  ["hack_squat", "squat", "Hack_Squat", "machine", "knee", "same", "Hack squat", "هاك سكوات", "Hack squat machine", "جهاز الهاك سكوات", "Less load on the lower back", "ضغط أقل على أسفل الظهر"],
  ["goblet_squat", "squat", "Goblet_Squat", "dumbbell", "knee", "same", "Goblet squat", "سكوات دمبل أمامي", "Dumbbell", "دمبل", "Easy to learn good form", "سهل تتعلم الحركة الصح"],
  ["bodyweight_squat", "squat", "Bodyweight_Squat", "body", "knee", "same", "Bodyweight squat", "سكوات بوزن الجسم", "Bodyweight", "وزن الجسم", "No equipment — go slower to make it harder", "بدون أدوات — بطّئ الحركة عشان تصعب"],

  ["romanian_deadlift", "hinge", "Romanian_Deadlift", "barbell", "back", "same", "Romanian deadlift", "رومانيان ديدلفت", "Barbell", "بار", "Strong stretch on the hamstrings", "تمدد قوي للفخذ الخلفي"],
  ["db_romanian_deadlift", "hinge", "Stiff-Legged_Dumbbell_Deadlift", "dumbbell", "back", "same", "Dumbbell Romanian deadlift", "رومانيان دمبل", "Dumbbells", "دمبل", "Lighter on grip and back", "أخف على القبضة والظهر"],
  ["back_extension", "hinge", "Hyperextensions_Back_Extensions", "machine", "", "same", "45° back extension", "تمديد الظهر 45°", "Back extension bench", "جهاز تمديد الظهر", "Light back load, easy to learn", "حمل خفيف على الظهر وسهل"],
  ["single_leg_bridge", "hinge", "Single_Leg_Glute_Bridge", "body", "", "angle", "Single-leg hip bridge", "جسر الورك برجل وحدة", "Bodyweight", "وزن الجسم", "Hamstrings and glutes with no weight", "الفخذ الخلفي والمؤخرة بدون وزن"],

  ["leg_press", "legpress", "Leg_Press", "machine", "knee", "same", "Leg press", "ليج برس", "Leg press machine", "جهاز الليج برس", "Heavy legs, no back load", "وزن عالي بدون ضغط على الظهر"],
  ["narrow_leg_press", "legpress", "Narrow_Stance_Leg_Press", "machine", "knee", "same", "Narrow-stance leg press", "ليج برس بقدم ضيقة", "Leg press machine", "جهاز الليج برس", "More on the front of the thigh", "تركيز أكثر على الفخذ الأمامي"],

  ["db_split_squat", "lunge", "Split_Squat_with_Dumbbells", "dumbbell", "knee", "same", "Dumbbell split squat", "سبلت سكوات دمبل", "Dumbbells", "دمبل", "Most work for the least weight", "أكثر شغل بأقل وزن"],
  ["db_lunge", "lunge", "Dumbbell_Lunges", "dumbbell", "knee", "same", "Dumbbell lunge", "طعن دمبل", "Dumbbells", "دمبل", "Trains balance too", "يشغل الثبات بعد"],
  ["db_step_up", "lunge", "Dumbbell_Step_Ups", "dumbbell bench", "", "same", "Step-up", "صعود على البوكس", "Dumbbells · box or bench", "دمبل · بوكس أو بنش", "Easier on the knees", "أريح للركبة"],
  ["smith_split_squat", "lunge", "Smith_Single-Leg_Split_Squat", "machine", "knee", "same", "Smith split squat", "سبلت سكوات سميث", "Smith machine", "جهاز السميث", "The machine balances you — push harder", "الجهاز يثبتك وتضغط أكثر"],
  ["walking_lunge", "lunge", "Bodyweight_Walking_Lunge", "body", "knee", "same", "Walking lunge", "طعن مشي", "Bodyweight", "وزن الجسم", "No equipment needed", "بدون أدوات"],

  ["hip_thrust", "glutes", "Barbell_Hip_Thrust", "barbell bench", "", "same", "Hip thrust", "هيب ثرست", "Barbell · bench", "بار · بنش", "Biggest glute load", "أعلى حمل للمؤخرة"],
  ["glute_bridge", "glutes", "Barbell_Glute_Bridge", "barbell", "", "same", "Barbell glute bridge", "جسر المؤخرة بالبار", "Barbell · floor", "بار · أرض", "Quick setup, no bench", "سريع التجهيز بدون بنش"],
  ["glute_kickback", "glutes", "Glute_Kickback", "body", "", "angle", "Glute kickback", "ركلة خلفية", "Bodyweight or cable", "وزن الجسم أو كيبل", "One side at a time", "جهة وحدة كل مرة"],

  ["lying_leg_curl", "legcurl", "Lying_Leg_Curls", "machine", "", "same", "Lying leg curl", "ليج كيرل منبطح", "Lying leg curl machine", "جهاز ثني الرجل منبطح", "Classic and simple", "الكلاسيكي والبسيط"],
  ["seated_leg_curl", "legcurl", "Seated_Leg_Curl", "machine", "", "same", "Seated leg curl", "ليج كيرل جالس", "Seated leg curl machine", "جهاز ثني الرجل جالس", "Stretched position — more growth", "وضعية تمدد — نمو أكثر"],
  ["standing_leg_curl", "legcurl", "Standing_Leg_Curl", "machine", "", "same", "Standing leg curl", "ليج كيرل واقف", "Standing leg curl machine", "جهاز ثني الرجل واقف", "One leg at a time", "رجل وحدة كل مرة"],
  ["nordic_curl", "legcurl", "Natural_Glute_Ham_Raise", "body", "knee", "angle", "Nordic curl", "نوردك كيرل", "Bodyweight · feet anchored", "وزن الجسم · تثبيت للرجلين", "No machine needed — hard", "بدون جهاز — صعب"],

  ["leg_extension", "legext", "Leg_Extensions", "machine", "knee", "same", "Leg extension", "ليج إكستنشن", "Leg extension machine", "جهاز مد الرجل", "Isolates the front of the thigh", "يعزل الفخذ الأمامي"],
  ["single_leg_extension", "legext", "Single-Leg_Leg_Extension", "machine", "knee", "same", "Single-leg extension", "ليج إكستنشن برجل وحدة", "Leg extension machine", "جهاز مد الرجل", "Each leg alone — evens out sides", "كل رجل لحالها وتعدّل الفرق"],

  ["standing_calf_raise", "calf", "Standing_Calf_Raises", "machine", "", "same", "Standing calf raise", "سمانة واقف", "Standing calf machine", "جهاز السمانة واقف", "Hits the big calf muscle", "يشغل عضلة السمانة الكبيرة"],
  ["seated_calf_raise", "calf", "Seated_Calf_Raise", "machine", "", "angle", "Seated calf raise", "سمانة جالس", "Seated calf machine", "جهاز السمانة جالس", "Targets the lower calf", "يركز على السمانة السفلية"],
  ["leg_press_calf", "calf", "Calf_Press_On_The_Leg_Press_Machine", "machine", "", "same", "Leg press calf raise", "سمانة على الليج برس", "Leg press machine", "جهاز الليج برس", "Heavy, with no load on the shoulders", "وزن عالي بدون ضغط على الكتف"],
  ["db_calf_raise", "calf", "Calf_Raise_On_A_Dumbbell", "dumbbell", "", "same", "Dumbbell calf raise", "سمانة دمبل", "Dumbbell · step", "دمبل · درجة", "Works at home", "ينفع بالبيت"],
  ["bw_calf_raise", "calf", null, "body", "", "same", "Single-leg calf raise", "سمانة برجل وحدة", "Bodyweight · step", "وزن الجسم · درجة", "No equipment needed", "بدون أدوات"],

  ["cable_crunch", "core", "Cable_Crunch", "cable", "", "same", "Cable crunch", "كرنش كيبل", "Cable · rope", "كيبل · حبل", "Easy to add weight", "سهل تزيد الوزن"],
  ["crunch_machine", "core", "Ab_Crunch_Machine", "machine", "", "same", "Ab crunch machine", "جهاز البطن", "Ab crunch machine", "جهاز البطن", "Stable and easy to load", "ثابت وسهل تزيد عليه"],
  ["hanging_leg_raise", "core", "Hanging_Leg_Raise", "bar", "", "same", "Hanging leg raise", "رفع الرجل معلّق", "Pull-up bar", "بار العقلة", "Builds grip too", "يقوي القبضة بعد"],
  ["lying_leg_raise", "core", "Flat_Bench_Lying_Leg_Raise", "body", "back", "same", "Lying leg raise", "رفع الرجل منبطح", "Bodyweight · bench or floor", "وزن الجسم · بنش أو أرض", "No equipment needed", "بدون أدوات"],
  ["crunch", "core", "Crunches", "body", "", "same", "Crunch", "كرنش", "Bodyweight", "وزن الجسم", "Simple — works anywhere", "بسيط وينفع بأي مكان"],
  ["ab_wheel", "core", "Ab_Roller", "body", "back shoulder", "angle", "Ab wheel rollout", "عجلة البطن", "Ab wheel", "عجلة البطن", "Hard — builds strong abs", "صعب ويقوي البطن"],
];

const split = (s) => (s ? s.split(" ").filter(Boolean) : []);

export const EXERCISES = RAW.map(([id, group, img, equip, loads, tag, en, ar, gearEn, gearAr, whyEn, whyAr]) => ({
  id, group, img, equip: split(equip), loads: split(loads), tag,
  name: [en, ar], gear: [gearEn, gearAr], why: [whyEn, whyAr],
}));

export const BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const groupItems = (group) => EXERCISES.filter((e) => e.group === group);

// Can this exercise be done here, without loading a sore joint?
export function usable(ex, { equipment = "gym", pain = [] } = {}) {
  if (!ex) return false;
  const have = EQUIPMENT[equipment] || EQUIPMENT.gym;
  if (!ex.equip.every((e) => have.includes(e))) return false;
  const sore = (pain || []).filter((p) => p && p !== "none");
  return !ex.loads.some((j) => sore.includes(j));
}

// Match a lift typed into Gauge ("Bench Press", "lat pull down") to the library.
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "");
const ALIASES = {
  benchpress: "bench_press", flatbenchpress: "bench_press", barbellbenchpress: "bench_press",
  dumbbellbenchpress: "db_bench_press", dbbenchpress: "db_bench_press", dumbbellpress: "db_bench_press",
  chestpress: "machine_chest_press", machinepress: "machine_chest_press",
  inclinedumbbellpress: "incline_db_press", inclinedbpress: "incline_db_press", inclinepress: "incline_db_press",
  inclinebenchpress: "incline_bench_press", inclinebarbellpress: "incline_bench_press",
  cablefly: "cable_fly", cableflye: "cable_fly", cablecrossover: "cable_fly", crossover: "cable_fly",
  pecdeck: "pec_deck", butterfly: "pec_deck", pecfly: "pec_deck", dumbbellfly: "db_fly",
  tricepspushdown: "rope_pushdown", tricepspushdown2: "rope_pushdown", tricepspushdowns: "rope_pushdown", pushdown: "rope_pushdown", ropepushdown: "rope_pushdown", triceppushdown: "rope_pushdown",
  overheadtricepsextension: "overhead_cable_ext", skullcrusher: "skull_crusher", skullcrushers: "skull_crusher", dips: "dip_machine",
  latpulldown: "lat_pulldown", latpulldowns: "lat_pulldown", pulldown: "lat_pulldown", widegrippulldown: "lat_pulldown",
  seatedrow: "seated_cable_row", cablerow: "seated_cable_row", seatedcablerow: "seated_cable_row", machinerow: "machine_row",
  dumbbellrow: "one_arm_db_row", onearmrow: "one_arm_db_row", barbellrow: "barbell_row", bentoverrow: "barbell_row",
  pullup: "pull_up", pullups: "pull_up", assistedpullup: "assisted_pull_up",
  shoulderpress: "db_shoulder_press", dumbbellshoulderpress: "db_shoulder_press", machineshoulderpress: "machine_shoulder_press",
  militarypress: "barbell_ohp", overheadpress: "barbell_ohp", ohp: "barbell_ohp", arnoldpress: "arnold_press",
  lateralraise: "db_lateral_raise", lateralraises: "db_lateral_raise", sideraise: "db_lateral_raise", cablelateralraise: "cable_lateral_raise",
  facepull: "face_pull", facepulls: "face_pull", reversefly: "db_reverse_fly", reversepecdeck: "reverse_pec_deck", reardeltfly: "reverse_pec_deck",
  bicepcurl: "db_curl", bicepscurl: "db_curl", dumbbellcurl: "db_curl", curl: "db_curl", ezbarcurl: "ez_curl", barbellcurl: "ez_curl", cablecurl: "cable_curl", hammercurl: "hammer_curl", hammercurls: "hammer_curl", preachercurl: "machine_preacher_curl",
  squat: "back_squat", squats: "back_squat", backsquat: "back_squat", hacksquat: "hack_squat", gobletsquat: "goblet_squat",
  rdl: "romanian_deadlift", romaniandeadlift: "romanian_deadlift", backextension: "back_extension", hyperextension: "back_extension",
  legpress: "leg_press", lunges: "db_lunge", lunge: "db_lunge", splitsquat: "db_split_squat", bulgariansplitsquat: "db_split_squat", stepup: "db_step_up", stepups: "db_step_up",
  hipthrust: "hip_thrust", gluteb: "glute_bridge", glutebridge: "glute_bridge",
  legcurl: "lying_leg_curl", lyinglegcurl: "lying_leg_curl", seatedlegcurl: "seated_leg_curl", hamstringcurl: "lying_leg_curl",
  legextension: "leg_extension", legextensions: "leg_extension",
  calfraise: "standing_calf_raise", calfraises: "standing_calf_raise", seatedcalfraise: "seated_calf_raise",
  cablecrunch: "cable_crunch", crunch: "crunch", crunches: "crunch", legraise: "hanging_leg_raise", hanginglegraise: "hanging_leg_raise", abwheel: "ab_wheel",
};
const NAME_INDEX = new Map();
EXERCISES.forEach((e) => { NAME_INDEX.set(norm(e.name[0]), e.id); NAME_INDEX.set(norm(e.name[1]), e.id); NAME_INDEX.set(norm(e.id), e.id); });
Object.entries(ALIASES).forEach(([k, v]) => { if (!NAME_INDEX.has(k)) NAME_INDEX.set(k, v); });

export function matchExercise(name) {
  const k = norm(name);
  if (!k) return null;
  return NAME_INDEX.get(k) || NAME_INDEX.get(k.replace(/s$/, "")) || null;
}

// Library id for a logged set: the stored id, else matched from the typed name.
export const logExerciseId = (log) => (log?.exercise_id && BY_ID[log.exercise_id] ? log.exercise_id : matchExercise(log?.exercise));

// Alternatives for a swap: same group, usable here, not already in today's
// session. Same-movement options first, then different angles.
export function swapOptions(currentId, { equipment, pain, exclude = [] } = {}) {
  const cur = BY_ID[currentId];
  if (!cur) return [];
  return groupItems(cur.group)
    .filter((e) => e.id !== currentId && !exclude.includes(e.id) && usable(e, { equipment, pain }))
    .sort((a, b) => (a.tag === b.tag ? 0 : a.tag === "same" ? -1 : 1));
}
