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
  gym: ["barbell", "dumbbell", "machine", "cable", "bench", "bar", "body", "band", "ball", "plate"],
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
  frontraise: { muscle: "Shoulders", compound: false, job: ["Front raise", "رفرفة أمامية"], main: ["Front shoulders", "الكتف الأمامي"], also: null, reps: { muscle: [12, 15], strength: [10, 12] } },
  shrug:    { muscle: "Shoulders", compound: false, job: ["Shrug", "رفع الكتفين"], main: ["Traps", "الترابيس"], also: ["Grip", "القبضة"], reps: { muscle: [10, 15], strength: [8, 12] } },
  curl:     { muscle: "Biceps", compound: false, job: ["Elbow flexion", "ثني الكوع"], main: ["Biceps", "البايسبس"], also: ["Forearms", "الساعد"], reps: { muscle: [10, 15], strength: [8, 12] } },
  squat:    { muscle: "Legs", compound: true, job: ["Squat", "سكوات"], main: ["Quads", "الفخذ الأمامي"], also: ["Glutes · inner thighs", "المؤخرة · الفخذ الداخلي"], reps: { muscle: [6, 10], strength: [4, 6] } },
  hinge:    { muscle: "Legs", compound: true, job: ["Hip hinge", "ثني الورك"], main: ["Hamstrings", "الفخذ الخلفي"], also: ["Glutes · lower back", "المؤخرة · أسفل الظهر"], reps: { muscle: [8, 10], strength: [5, 8] } },
  legpress: { muscle: "Legs", compound: true, job: ["Leg press", "دفع الرجل"], main: ["Quads", "الفخذ الأمامي"], also: ["Glutes", "المؤخرة"], reps: { muscle: [10, 12], strength: [6, 10] } },
  lunge:    { muscle: "Legs", compound: true, job: ["Single-leg squat", "سكوات برجل وحدة"], main: ["Quads · glutes", "الفخذ الأمامي · المؤخرة"], also: ["Balance", "الثبات"], reps: { muscle: [8, 12], strength: [6, 10] } },
  glutes:   { muscle: "Legs", compound: true, job: ["Hip extension", "مد الورك"], main: ["Glutes", "المؤخرة"], also: ["Hamstrings", "الفخذ الخلفي"], reps: { muscle: [8, 12], strength: [6, 10] } },
  legcurl:  { muscle: "Legs", compound: false, job: ["Knee flexion", "ثني الركبة"], main: ["Hamstrings", "الفخذ الخلفي"], also: ["Calves", "السمانة"], reps: { muscle: [10, 12], strength: [8, 10] } },
  legext:   { muscle: "Legs", compound: false, job: ["Knee extension", "مد الركبة"], main: ["Quads", "الفخذ الأمامي"], also: null, reps: { muscle: [10, 15], strength: [8, 12] } },
  calf:     { muscle: "Legs", compound: false, job: ["Calf raise", "رفع السمانة"], main: ["Calves", "السمانة"], also: null, reps: { muscle: [12, 15], strength: [10, 12] } },
  abduction: { muscle: "Legs", compound: false, job: ["Hip abduction", "فتح الورك"], main: ["Side glutes", "جانب المؤخرة"], also: null, reps: { muscle: [12, 20], strength: [10, 15] } },
  adduction: { muscle: "Legs", compound: false, job: ["Hip adduction", "ضم الورك"], main: ["Inner thighs", "الفخذ الداخلي"], also: null, reps: { muscle: [12, 20], strength: [10, 15] } },
  core:     { muscle: "Core", compound: false, job: ["Trunk flexion", "ثني الجذع"], main: ["Abs", "البطن"], also: ["Hip flexors", "عضلات الورك"], reps: { muscle: [10, 15], strength: [8, 12] } },
};

// [id, group, photo, equipment, joints loaded, "same" movement or a different "angle",
//  name en, name ar, gear en, gear ar, why en, why ar]
const RAW = [
  ["bench_press", "hpress", "Barbell_Bench_Press_-_Medium_Grip", "barbell bench", "shoulder wrist", "same", "Bench press", "بنش برس", "Barbell · flat bench", "بار · بنش مستوي", "Heaviest loading — best for strength", "يتحمل أعلى وزن — الأفضل للقوة"],
  ["db_bench_press", "hpress", "Dumbbell_Bench_Press", "dumbbell bench", "shoulder", "same", "Dumbbell bench press", "بنش دمبل", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Each side works alone, deeper stretch", "كل جهة تشتغل لحالها ومدى أعمق"],
  ["machine_chest_press", "hpress", "Leverage_Chest_Press", "machine", "", "same", "Plate-loaded chest press", "جهاز ضغط الصدر بالأقراص", "Chest press machine (plate-loaded, each arm alone)", "جهاز ضغط صدر بالأقراص (كل يد لحالها)", "Push to the last rep safely — no spotter", "تضغط لآخر تكرار بأمان بدون مساعد"],
  ["smith_bench_press", "hpress", "Smith_Machine_Bench_Press", "machine bench", "shoulder", "same", "Smith machine bench press", "بنش سميث", "Smith machine · flat bench", "جهاز السميث · بنش مستوي", "Fixed path — quick to set up", "مسار ثابت وسريع التجهيز"],
  ["push_up", "hpress", "Pushups", "body", "wrist", "same", "Push-up", "ضغط أرضي", "Bodyweight", "وزن الجسم", "No equipment — add reps or a backpack", "بدون أدوات — زد التكرار أو شنطة على ظهرك"],

  ["incline_db_press", "incline", "Incline_Dumbbell_Press", "dumbbell bench", "", "same", "Incline dumbbell press", "ضغط دمبل مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Free path — kind to the shoulders", "حركة حرة ومريحة للكتف"],
  ["incline_machine_press", "incline", "Leverage_Incline_Chest_Press", "machine", "", "same", "Incline chest press machine", "جهاز ضغط صدر مائل", "Incline press machine (plate-loaded)", "جهاز ضغط مائل بالأقراص", "Stable — easy to add weight", "ثابت وسهل تزيد عليه"],
  ["incline_bench_press", "incline", "Barbell_Incline_Bench_Press_-_Medium_Grip", "barbell bench", "shoulder wrist", "same", "Incline barbell press", "بنش مائل بار", "Barbell · incline bench", "بار · بنش مائل", "Takes the heaviest load", "يتحمل أعلى وزن"],
  ["incline_cable_fly", "incline", "Incline_Cable_Flye", "cable bench", "", "angle", "Incline cable fly", "تفتيح كيبل مائل", "Cables · incline bench", "كيبل · بنش مائل", "Upper chest without pressing", "أعلى الصدر بدون ضغط"],
  ["feet_up_push_up", "incline", "Push-Ups_With_Feet_Elevated", "body", "wrist shoulder", "same", "Feet-up push-up", "ضغط أرضي والرجل مرفوعة", "Bodyweight · step or bench", "وزن الجسم · درج أو كرسي", "Tilts the work to the upper chest", "يحوّل الشغل لأعلى الصدر"],

  ["cable_fly", "fly", "Flat_Bench_Cable_Flyes", "cable bench", "", "same", "Cable fly", "تفتيح كيبل", "Cables · flat bench", "كيبل · بنش مستوي", "Tension through the whole rep", "شد ثابت طول الحركة"],
  ["pec_deck", "fly", "Butterfly", "machine", "", "same", "Pec fly machine (pec deck)", "جهاز الفراشة للصدر (بيك دك)", "Pec fly / rear delt machine · handles or pads", "جهاز الفراشة (صدر وكتف خلفي) · مقابض أو مساند", "Back on the pad, bring the handles together in front", "ظهرك على المسند وضم المقابض قدامك"],
  ["db_fly", "fly", "Dumbbell_Flyes", "dumbbell bench", "shoulder", "same", "Dumbbell fly", "تفتيح دمبل", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Big stretch at the bottom", "تمدد كبير تحت"],

  ["rope_pushdown", "triceps", "Triceps_Pushdown_-_Rope_Attachment", "cable", "", "same", "Triceps pushdown", "ترايسبس بوش داون", "Cable · rope", "كيبل · حبل", "Easy on the elbows", "مريح للكوع"],
  ["overhead_cable_ext", "triceps", "Cable_Rope_Overhead_Triceps_Extension", "cable", "shoulder", "angle", "Overhead cable extension", "تمديد كيبل خلف الرأس", "Cable · rope", "كيبل · حبل", "Stretches the long head more", "يمدد الرأس الطويل أكثر"],
  ["skull_crusher", "triceps", "EZ-Bar_Skullcrusher", "barbell bench", "wrist", "angle", "EZ-bar skull crusher", "سكل كرشر بار EZ", "EZ bar · flat bench", "بار EZ · بنش مستوي", "Heavy load for the long head", "حمل عالي للرأس الطويل"],
  ["db_overhead_ext", "triceps", "Dumbbell_One-Arm_Triceps_Extension", "dumbbell", "shoulder", "angle", "Dumbbell overhead extension", "تمديد دمبل خلف الرأس", "Dumbbell", "دمبل", "Long-head stretch with one dumbbell", "تمدد للرأس الطويل بدمبل واحد"],
  ["dip_machine", "triceps", "Dip_Machine", "machine", "shoulder", "angle", "Machine dip", "جهاز الديبس", "Dip machine", "جهاز الديبس", "Heavier — the chest helps too", "وزن أعلى والصدر يساعد"],
  ["bench_dip", "triceps", "Bench_Dips", "body", "shoulder wrist", "angle", "Bench dip", "ديبس على الكرسي", "Bodyweight · bench or chair", "وزن الجسم · بنش أو كرسي", "No equipment needed", "بدون أدوات"],
  ["close_push_up", "triceps", "Push-Ups_-_Close_Triceps_Position", "body", "wrist", "angle", "Close-grip push-up", "ضغط أرضي ضيق", "Bodyweight", "وزن الجسم", "A push-up aimed at the triceps", "ضغط يركز على الترايسبس"],

  ["seated_cable_row", "row", "Seated_Cable_Rows", "cable", "", "same", "Seated cable row", "سحب كيبل جالس", "Cable row station", "جهاز السحب الأرضي", "Smooth and easy to control", "سلس وسهل التحكم"],
  ["machine_row", "row", "Leverage_Iso_Row", "machine", "", "same", "Row machine (chest pad)", "جهاز السحب بمسند صدر", "Row machine (plate-loaded, each arm alone)", "جهاز سحب بالأقراص (كل يد لحالها)", "Chest pad — no lower-back strain", "مسند صدر — ما يضغط أسفل الظهر"],
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
  ["reverse_pec_deck", "rear", "Reverse_Machine_Flyes", "machine", "", "same", "Rear delt fly machine (reverse pec deck)", "جهاز الفراشة العكسي (كتف خلفي)", "Same pec fly machine · chest on the pad", "نفس جهاز الفراشة · صدرك على المسند", "Locks you in — no swinging", "يثبتك وما تتمرجح"],
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
  ["db_calf_raise", "calf", "Standing_Dumbbell_Calf_Raise", "dumbbell", "", "same", "Dumbbell calf raise", "سمانة دمبل", "Dumbbell · step", "دمبل · درجة", "Works at home", "ينفع بالبيت"],
  ["bw_calf_raise", "calf", "Calf_Raise_On_A_Dumbbell", "body", "", "same", "Single-leg calf raise", "سمانة برجل وحدة", "Bodyweight · step", "وزن الجسم · درجة", "No equipment needed", "بدون أدوات"],

  ["cable_crunch", "core", "Cable_Crunch", "cable", "", "same", "Cable crunch", "كرنش كيبل", "Cable · rope", "كيبل · حبل", "Easy to add weight", "سهل تزيد الوزن"],
  ["crunch_machine", "core", "Ab_Crunch_Machine", "machine", "", "same", "Ab crunch machine", "جهاز البطن", "Ab crunch machine", "جهاز البطن", "Stable and easy to load", "ثابت وسهل تزيد عليه"],
  ["hanging_leg_raise", "core", "Hanging_Leg_Raise", "bar", "", "same", "Hanging leg raise", "رفع الرجل معلّق", "Pull-up bar", "بار العقلة", "Builds grip too", "يقوي القبضة بعد"],
  ["lying_leg_raise", "core", "Flat_Bench_Lying_Leg_Raise", "body", "back", "same", "Lying leg raise", "رفع الرجل منبطح", "Bodyweight · bench or floor", "وزن الجسم · بنش أو أرض", "No equipment needed", "بدون أدوات"],
  ["crunch", "core", "Crunches", "body", "", "same", "Crunch", "كرنش", "Bodyweight", "وزن الجسم", "Simple — works anywhere", "بسيط وينفع بأي مكان"],
  ["ab_wheel", "core", "Ab_Roller", "body", "back shoulder", "angle", "Ab wheel rollout", "عجلة البطن", "Ab wheel", "عجلة البطن", "Hard — builds strong abs", "صعب ويقوي البطن"],
  // ── More choices (added): appended so existing defaults stay first in each group ──
  ["neutral_db_press", "hpress", "Dumbbell_Bench_Press_with_Neutral_Grip", "dumbbell bench", "", "same", "Neutral-grip dumbbell press", "ضغط دمبل بقبضة متوازية", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Palms facing in — kindest on the shoulders", "الكفوف متقابلة — الأريح للكتف"],
  ["machine_bench_press", "hpress", "Machine_Bench_Press", "machine", "", "same", "Seated chest press machine", "جهاز ضغط صدر جالس", "Chest press machine (seated)", "جهاز ضغط الصدر جالس", "Fixed path — easy to push hard", "مسار ثابت وتقدر تضغط بقوة"],
  ["cable_chest_press", "hpress", "Cable_Chest_Press", "cable", "", "same", "Cable chest press", "ضغط صدر كيبل", "Cables · standing or on a bench", "كيبل · واقف أو على بنش", "Tension through the whole rep", "شد ثابت طول الحركة"],
  ["wide_push_up", "hpress", "Push-Up_Wide", "body", "wrist shoulder", "same", "Wide push-up", "ضغط أرضي واسع", "Bodyweight", "وزن الجسم", "More chest than a normal push-up", "يشغل الصدر أكثر من الضغط العادي"],
  ["incline_push_up", "hpress", "Incline_Push-Up", "body", "wrist", "same", "Incline push-up", "ضغط أرضي مائل", "Bodyweight · hands on a bench", "وزن الجسم · اليدين على بنش", "An easier push-up — good to start with", "ضغط أسهل — مناسب للبداية"],
  ["db_floor_press", "hpress", "Dumbbell_Floor_Press", "dumbbell", "", "angle", "Dumbbell floor press", "ضغط دمبل على الأرض", "Dumbbells · floor", "دمبل · أرض", "No bench needed, easy on the shoulders", "بدون بنش ومريح للكتف"],
  ["decline_bench_press", "hpress", "Decline_Barbell_Bench_Press", "barbell bench", "wrist", "angle", "Decline bench press", "بنش مائل للأسفل بار", "Barbell · decline bench", "بار · بنش مائل للأسفل", "Lower chest, heavy load", "أسفل الصدر بحمل عالي"],
  ["decline_db_press", "hpress", "Decline_Dumbbell_Bench_Press", "dumbbell bench", "", "angle", "Decline dumbbell press", "ضغط دمبل مائل للأسفل", "Dumbbells · decline bench", "دمبل · بنش مائل للأسفل", "Lower chest, each side alone", "أسفل الصدر وكل جهة لحالها"],
  ["chest_dip", "hpress", "Dips_-_Chest_Version", "bar", "shoulder", "angle", "Chest dip", "ديبس للصدر", "Dip bars", "بار الديبس", "Lean forward — lower chest and triceps", "مائل للأمام — أسفل الصدر والترايسبس"],

  ["hammer_incline_db_press", "incline", "Hammer_Grip_Incline_DB_Bench_Press", "dumbbell bench", "", "same", "Neutral-grip incline press", "ضغط مائل بقبضة متوازية", "Dumbbells · incline bench", "دمبل · بنش مائل", "Upper chest with a shoulder-friendly grip", "أعلى الصدر بقبضة مريحة للكتف"],
  ["smith_incline_press", "incline", "Smith_Machine_Incline_Bench_Press", "machine bench", "", "same", "Smith incline press", "بنش مائل سميث", "Smith machine · incline bench", "جهاز السميث · بنش مائل", "Fixed path — push hard safely", "مسار ثابت وتضغط بقوة بأمان"],
  ["incline_cable_press", "incline", "Incline_Cable_Chest_Press", "cable bench", "", "same", "Incline cable press", "ضغط مائل كيبل", "Cables · incline bench", "كيبل · بنش مائل", "Constant tension on the upper chest", "شد ثابت على أعلى الصدر"],
  ["incline_db_fly", "incline", "Incline_Dumbbell_Flyes", "dumbbell bench", "shoulder", "angle", "Incline dumbbell fly", "تفتيح دمبل مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Upper chest with a big stretch", "أعلى الصدر مع تمدد كبير"],

  ["cable_crossover", "fly", "Cable_Crossover", "cable", "", "same", "Cable crossover (high)", "كروس أوفر كيبل من فوق", "Cable crossover · high pulleys", "جهاز الكيبل · من فوق", "Squeezes the lower and middle chest", "يعصر أسفل ووسط الصدر"],
  ["single_arm_crossover", "fly", "Single-Arm_Cable_Crossover", "cable", "", "same", "Single-arm cable fly", "تفتيح كيبل بيد وحدة", "Cable · handle", "كيبل · مقبض", "One side at a time, full squeeze", "جهة وحدة مع عصر كامل"],
  ["low_cable_crossover", "fly", "Low_Cable_Crossover", "cable", "", "angle", "Low cable crossover", "كروس أوفر من تحت", "Cable crossover · low pulleys", "جهاز الكيبل · من تحت", "Upper chest, from below", "أعلى الصدر من تحت لفوق"],
  ["decline_db_fly", "fly", "Decline_Dumbbell_Flyes", "dumbbell bench", "", "angle", "Decline dumbbell fly", "تفتيح دمبل مائل للأسفل", "Dumbbells · decline bench", "دمبل · بنش مائل للأسفل", "Lower chest stretch", "تمدد أسفل الصدر"],

  ["bar_pushdown", "triceps", "Triceps_Pushdown", "cable", "", "same", "Straight-bar pushdown", "بوش داون بار", "Cable · straight bar", "كيبل · بار مستقيم", "Heavier than the rope", "وزن أثقل من الحبل"],
  ["vbar_pushdown", "triceps", "Triceps_Pushdown_-_V-Bar_Attachment", "cable", "", "same", "V-bar pushdown", "بوش داون مقبض V", "Cable · V-bar", "كيبل · مقبض V", "Comfortable grip, easy to load", "قبضة مريحة وسهل تزيد الوزن"],
  ["reverse_pushdown", "triceps", "Reverse_Grip_Triceps_Pushdown", "cable", "wrist", "same", "Reverse-grip pushdown", "بوش داون قبضة عكسية", "Cable · straight bar", "كيبل · بار مستقيم", "Palms up — the inner head", "الكفوف لفوق — الرأس الداخلي"],
  ["machine_triceps_ext", "triceps", "Machine_Triceps_Extension", "machine", "", "same", "Triceps extension machine", "جهاز الترايسبس", "Triceps extension machine", "جهاز مد الترايسبس", "Locked in — push to failure safely", "ثابت وتقدر توصل للفشل بأمان"],
  ["db_kickback", "triceps", "Tricep_Dumbbell_Kickback", "dumbbell bench", "", "same", "Dumbbell kickback", "كيك باك دمبل", "Dumbbell · bench", "دمبل · بنش", "Strong squeeze at the top", "عصر قوي فوق"],
  ["seated_triceps_press", "triceps", "Seated_Triceps_Press", "dumbbell bench", "shoulder", "angle", "Seated two-hand overhead extension", "تمديد دمبل جالس خلف الرأس", "One dumbbell · upright bench", "دمبل واحد · بنش قائم", "Both hands, long-head stretch", "باليدين مع تمدد الرأس الطويل"],
  ["lying_db_triceps_ext", "triceps", "Lying_Dumbbell_Tricep_Extension", "dumbbell bench", "", "angle", "Lying dumbbell extension", "تمديد دمبل منبطح", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Skull crusher with dumbbells — easier on the wrists", "سكل كرشر بالدمبل — أريح للرسغ"],
  ["cable_lying_triceps_ext", "triceps", "Cable_Lying_Triceps_Extension", "cable bench", "", "angle", "Lying cable extension", "تمديد كيبل منبطح", "Cable · bench", "كيبل · بنش", "Tension even at the top", "شد حتى فوق"],
  ["kneeling_cable_ext", "triceps", "Kneeling_Cable_Triceps_Extension", "cable", "shoulder", "angle", "Kneeling overhead cable extension", "تمديد كيبل وأنت راكع", "Cable · rope", "كيبل · حبل", "Overhead stretch from a stable position", "تمدد فوق الرأس بوضعية ثابتة"],
  ["overhead_bar_ext", "triceps", "Standing_Overhead_Barbell_Triceps_Extension", "barbell", "shoulder", "angle", "Overhead barbell extension", "تمديد بار خلف الرأس", "Barbell or EZ bar", "بار أو بار EZ", "Long head under heavy load", "الرأس الطويل بحمل عالي"],
  ["close_grip_bench", "triceps", "Close-Grip_Barbell_Bench_Press", "barbell bench", "wrist shoulder", "angle", "Close-grip bench press", "بنش ضيق", "Barbell · flat bench", "بار · بنش مستوي", "The heaviest triceps lift", "أثقل تمرين ترايسبس"],
  ["close_grip_db_press", "triceps", "Close-Grip_Dumbbell_Press", "dumbbell bench", "", "angle", "Close-grip dumbbell press", "ضغط دمبل ضيق", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Heavy triceps press at home", "ضغط ترايسبس ثقيل بالبيت"],
  ["parallel_bar_dip", "triceps", "Parallel_Bar_Dip", "bar", "shoulder", "angle", "Parallel-bar dip", "ديبس على البار", "Dip bars", "بار الديبس", "Upright body — mostly triceps", "الجسم مستقيم — ترايسبس أكثر"],

  ["tbar_row", "row", "T-Bar_Row_with_Handle", "barbell", "back", "same", "T-bar row", "تي بار رو", "Landmine bar · V-handle", "بار مثبت · مقبض V", "Heavy row with a neutral grip", "سحب ثقيل بقبضة متوازية"],
  ["chest_supported_tbar", "row", "Lying_T-Bar_Row", "machine", "", "same", "Chest-supported T-bar row", "تي بار بمسند صدر", "T-bar row machine", "جهاز التي بار", "Heavy rows, no lower-back load", "سحب ثقيل بدون ضغط أسفل الظهر"],
  ["one_arm_cable_row", "row", "Seated_One-arm_Cable_Pulley_Rows", "cable", "", "same", "One-arm cable row", "سحب كيبل بيد وحدة", "Cable row station · handle", "جهاز السحب الأرضي · مقبض", "Each side alone, long range", "كل جهة لحالها ومدى طويل"],
  ["two_db_row", "row", "Bent_Over_Two-Dumbbell_Row", "dumbbell", "back", "same", "Bent-over dumbbell row", "سحب دمبل منحني", "Dumbbells", "دمبل", "Both sides at once, no bench", "الجهتين مع بعض بدون بنش"],
  ["neutral_db_row", "row", "Bent_Over_Two-Dumbbell_Row_With_Palms_In", "dumbbell", "back", "same", "Neutral-grip dumbbell row", "سحب دمبل قبضة متوازية", "Dumbbells", "دمبل", "Elbows close — more lats", "الكوع قريب — مجنص أكثر"],
  ["incline_bench_pull", "row", "Incline_Bench_Pull", "barbell bench", "", "same", "Chest-supported barbell row", "سحب بار بمسند صدر", "Barbell · incline bench", "بار · بنش مائل", "Upper back with zero cheating", "أعلى الظهر بدون غش"],
  ["smith_row", "row", "Smith_Machine_Bent_Over_Row", "machine", "back", "same", "Smith machine row", "سحب سميث منحني", "Smith machine", "جهاز السميث", "Fixed bar path", "مسار البار ثابت"],
  ["underhand_bb_row", "row", "Reverse_Grip_Bent-Over_Rows", "barbell", "back", "same", "Underhand barbell row", "سحب بار قبضة عكسية", "Barbell", "بار", "More lats and biceps", "مجنص وبايسبس أكثر"],
  ["trx_row", "row", "Inverted_Row_with_Straps", "body", "", "same", "Suspension-strap row", "سحب بالأحزمة المعلقة", "Suspension straps (TRX)", "أحزمة معلقة (TRX)", "Lean back further to make it harder", "مِل أكثر عشان يصعب"],
  ["high_row_machine", "row", "Leverage_High_Row", "machine", "", "angle", "High row machine", "جهاز هاي رو", "High row machine", "جهاز السحب العالي المائل", "Upper back and lats together", "أعلى الظهر والمجنص مع بعض"],

  ["vbar_pulldown", "vpull", "V-Bar_Pulldown", "cable", "", "same", "V-bar pulldown", "سحب أمامي مقبض V", "Lat pulldown · V-handle", "جهاز السحب العالي · مقبض V", "Neutral grip, strong pull", "قبضة متوازية وسحب قوي"],
  ["underhand_pulldown", "vpull", "Underhand_Cable_Pulldowns", "cable", "", "same", "Underhand pulldown", "سحب أمامي قبضة عكسية", "Lat pulldown machine", "جهاز السحب العالي", "More biceps, longer pull", "بايسبس أكثر ومدى أطول"],
  ["full_rom_pulldown", "vpull", "Full_Range-Of-Motion_Lat_Pulldown", "cable", "", "same", "Full-range pulldown", "سحب أمامي بمدى كامل", "Lat pulldown machine", "جهاز السحب العالي", "Deep stretch at the top", "تمدد عميق فوق"],
  ["chin_up", "vpull", "Chin-Up", "bar", "", "same", "Chin-up", "عقلة قبضة عكسية", "Pull-up bar", "بار العقلة", "Palms facing you — lats and biceps", "الكفوف لوجهك — مجنص وبايسبس"],
  ["vbar_pull_up", "vpull", "V-Bar_Pullup", "bar", "", "same", "Neutral-grip pull-up", "عقلة قبضة متوازية", "Pull-up bar · V-handle", "بار العقلة · مقبض V", "Easier on the shoulders than a wide grip", "أريح للكتف من القبضة الواسعة"],
  ["straight_arm_pulldown", "vpull", "Straight-Arm_Pulldown", "cable", "", "angle", "Straight-arm pulldown", "سحب بذراع مفرودة", "Cable · straight bar", "كيبل · بار مستقيم", "Lats alone, no biceps", "المجنص لحاله بدون بايسبس"],
  ["rope_straight_arm", "vpull", "Rope_Straight-Arm_Pulldown", "cable", "", "angle", "Rope straight-arm pulldown", "سحب بذراع مفرودة بالحبل", "Cable · rope", "كيبل · حبل", "Lats with a bigger finish", "المجنص مع نهاية أوسع"],

  ["seated_bb_press", "ohp", "Seated_Barbell_Military_Press", "barbell bench", "shoulder", "same", "Seated barbell press", "ضغط بار جالس", "Barbell · upright bench", "بار · بنش قائم", "Heavy press without the lower back", "ضغط ثقيل بدون أسفل الظهر"],
  ["smith_shoulder_press", "ohp", "Smith_Machine_Overhead_Shoulder_Press", "machine bench", "", "same", "Smith shoulder press", "ضغط كتف سميث", "Smith machine · upright bench", "جهاز السميث · بنش قائم", "Fixed path — push hard safely", "مسار ثابت وتضغط بقوة بأمان"],
  ["leverage_shoulder_press", "ohp", "Leverage_Shoulder_Press", "machine", "", "same", "Plate-loaded shoulder press", "جهاز ضغط كتف بالأقراص", "Plate-loaded press machine", "جهاز ضغط كتف بالأقراص", "Natural arc, heavy loads", "حركة طبيعية وأوزان عالية"],
  ["cable_shoulder_press", "ohp", "Seated_Cable_Shoulder_Press", "cable bench", "", "same", "Cable shoulder press", "ضغط كتف كيبل", "Cables · upright bench", "كيبل · بنش قائم", "Tension even at the top", "شد حتى فوق"],
  ["standing_db_press", "ohp", "Standing_Dumbbell_Press", "dumbbell", "back", "same", "Standing dumbbell press", "ضغط دمبل واقف", "Dumbbells", "دمبل", "Shoulders plus whole-body stability", "أكتاف مع ثبات الجسم كامل"],
  ["one_arm_db_press", "ohp", "Dumbbell_One-Arm_Shoulder_Press", "dumbbell", "", "same", "One-arm dumbbell press", "ضغط كتف دمبل بيد وحدة", "Dumbbell", "دمبل", "Each side alone, trains your core", "كل جهة لحالها ويشغل البطن"],
  ["push_press", "ohp", "Push_Press", "barbell", "shoulder back", "angle", "Push press", "بوش برس", "Barbell", "بار", "Legs help — lift heavier", "الرجلين يساعدون وترفع أثقل"],
  ["handstand_push_up", "ohp", "Handstand_Push-Ups", "body", "shoulder wrist", "angle", "Wall handstand push-up", "ضغط مقلوب على الجدار", "Bodyweight · wall", "وزن الجسم · جدار", "The hardest shoulder move with no weights", "أصعب تمرين كتف بدون أوزان"],

  ["seated_lateral_raise", "lateral", "Seated_Side_Lateral_Raise", "dumbbell bench", "", "same", "Seated lateral raise", "رفرفة جانبية جالس", "Dumbbells · bench", "دمبل · بنش", "No swinging — strict reps", "بدون تمرجح — تكرارات نظيفة"],
  ["one_arm_lateral", "lateral", "One-Arm_Side_Laterals", "dumbbell", "", "same", "One-arm lateral raise", "رفرفة جانبية بيد وحدة", "Dumbbell · hold something steady", "دمبل · امسك شي ثابت", "Each side alone, better focus", "كل جهة لحالها وتركيز أعلى"],
  ["band_lateral_raise", "lateral", "Lateral_Raise_-_With_Bands", "band", "", "same", "Band lateral raise", "رفرفة جانبية بالمطاط", "Resistance band", "مطاط مقاومة", "Light, joint-friendly tension", "مقاومة خفيفة ومريحة للمفاصل"],
  ["lying_lateral_raise", "lateral", "Lying_One-Arm_Lateral_Raise", "dumbbell bench", "", "angle", "Side-lying lateral raise", "رفرفة جانبية منبطح على الجنب", "Dumbbell · flat bench", "دمبل · بنش مستوي", "Hardest at the bottom", "أصعب في البداية"],
  ["lateral_to_front", "lateral", "Side_Laterals_to_Front_Raise", "dumbbell", "", "angle", "Lateral-to-front raise", "رفرفة جانبية وأمامية", "Dumbbells", "دمبل", "Side and front shoulders in one", "الكتف الجانبي والأمامي مع بعض"],
  ["upright_bb_row", "lateral", "Upright_Barbell_Row", "barbell", "shoulder wrist", "angle", "Upright row", "سحب عمودي بار", "Barbell or EZ bar", "بار أو بار EZ", "Side shoulders and traps, heavier", "الكتف الجانبي والترابيس بوزن أعلى"],
  ["upright_cable_row", "lateral", "Upright_Cable_Row", "cable", "shoulder", "angle", "Cable upright row", "سحب عمودي كيبل", "Cable · straight bar", "كيبل · بار مستقيم", "Smooth tension all the way", "شد سلس طول الحركة"],

  ["front_db_raise", "frontraise", "Front_Dumbbell_Raise", "dumbbell", "", "same", "Front dumbbell raise", "رفرفة أمامية دمبل", "Dumbbells", "دمبل", "Front shoulders alone", "الكتف الأمامي لحاله"],
  ["front_cable_raise", "frontraise", "Front_Cable_Raise", "cable", "", "same", "Front cable raise", "رفرفة أمامية كيبل", "Cable · handle", "كيبل · مقبض", "Tension from the very start", "شد من أول الحركة"],
  ["front_plate_raise", "frontraise", "Front_Plate_Raise", "plate", "", "same", "Front plate raise", "رفرفة أمامية بالقرص", "Weight plate", "قرص حديد", "Both hands, steady grip", "باليدين وقبضة ثابتة"],
  ["incline_front_raise", "frontraise", "Front_Incline_Dumbbell_Raise", "dumbbell bench", "", "angle", "Incline front raise", "رفرفة أمامية على بنش مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Longer stretch, no swinging", "تمدد أطول وبدون تمرجح"],
  ["alternating_deltoid_raise", "frontraise", "Alternating_Deltoid_Raise", "dumbbell", "", "angle", "Front-to-side alternating raise", "رفرفة أمامية وجانبية بالتناوب", "Dumbbells", "دمبل", "Front and side shoulders together", "الكتف الأمامي والجانبي مع بعض"],

  ["cable_rear_fly", "rear", "Cable_Rear_Delt_Fly", "cable", "", "same", "Cable rear-delt fly", "رفرفة خلفي كيبل", "Cables · crossed", "كيبل · متقاطع", "Constant tension on the rear shoulders", "شد ثابت على الكتف الخلفي"],
  ["seated_rear_raise", "rear", "Seated_Bent-Over_Rear_Delt_Raise", "dumbbell bench", "", "same", "Seated rear-delt raise", "رفرفة خلفي جالس", "Dumbbells · bench", "دمبل · بنش", "No lower-back strain", "ما يضغط أسفل الظهر"],
  ["lying_rear_raise", "rear", "Lying_Rear_Delt_Raise", "dumbbell bench", "", "same", "Lying rear-delt raise", "رفرفة خلفي منبطح", "Dumbbells · flat bench", "دمبل · بنش مستوي", "Chest on the bench — no cheating", "صدرك على البنش — بدون غش"],
  ["head_supported_rear_raise", "rear", "Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench", "dumbbell bench", "", "same", "Head-supported rear-delt raise", "رفرفة خلفي والرأس على البنش", "Dumbbells · incline bench", "دمبل · بنش مائل", "Neck and back stay relaxed", "الرقبة والظهر مرتاحين"],
  ["reverse_fly_rotation", "rear", "Reverse_Flyes_With_External_Rotation", "dumbbell", "", "angle", "Reverse fly with rotation", "رفرفة خلفي مع لف", "Dumbbells", "دمبل", "Rear shoulders plus rotator cuff", "الكتف الخلفي مع عضلات الدوران"],
  ["rear_delt_row", "rear", "Barbell_Rear_Delt_Row", "barbell", "back", "angle", "Rear-delt barbell row", "سحب بار للكتف الخلفي", "Barbell · wide grip", "بار · قبضة واسعة", "Elbows out — rear shoulders", "الأكواع للخارج — الكتف الخلفي"],
  ["rope_rear_row", "rear", "Cable_Rope_Rear-Delt_Rows", "cable", "", "angle", "Rope rear-delt row", "سحب حبل للكتف الخلفي", "Cable · rope", "كيبل · حبل", "Rear shoulders and upper back", "الكتف الخلفي وأعلى الظهر"],

  ["barbell_shrug", "shrug", "Barbell_Shrug", "barbell", "", "same", "Barbell shrug", "ترابيس بار", "Barbell", "بار", "The heaviest trap builder", "أثقل تمرين للترابيس"],
  ["db_shrug", "shrug", "Dumbbell_Shrug", "dumbbell", "", "same", "Dumbbell shrug", "ترابيس دمبل", "Dumbbells", "دمبل", "Natural path at your sides", "مسار طبيعي على جنبك"],
  ["machine_shrug", "shrug", "Leverage_Shrug", "machine", "", "same", "Shrug machine", "جهاز الترابيس", "Shrug machine", "جهاز الترابيس", "Heavy and stable", "ثقيل وثابت"],
  ["cable_shrug", "shrug", "Cable_Shrugs", "cable", "", "same", "Cable shrug", "ترابيس كيبل", "Cable · straight bar", "كيبل · بار مستقيم", "Tension at the top", "شد فوق"],
  ["smith_shrug", "shrug", "Smith_Machine_Behind_the_Back_Shrug", "machine", "", "angle", "Smith behind-the-back shrug", "ترابيس سميث من الخلف", "Smith machine", "جهاز السميث", "Bar behind you — middle traps", "البار خلفك — وسط الترابيس"],

  ["barbell_curl", "curl", "Barbell_Curl", "barbell", "wrist", "same", "Barbell curl", "بايسبس بار مستقيم", "Straight barbell", "بار مستقيم", "The heaviest curl", "أثقل تمرين بايسبس"],
  ["close_ez_curl", "curl", "Close-Grip_EZ_Bar_Curl", "barbell", "", "same", "Close-grip EZ curl", "بايسبس بار EZ ضيق", "EZ bar · close grip", "بار EZ · قبضة ضيقة", "Hits the outer (long) head", "يركز على الرأس الخارجي"],
  ["concentration_curl", "curl", "Concentration_Curls", "dumbbell bench", "", "same", "Concentration curl", "بايسبس تركيز", "Dumbbell · bench", "دمبل · بنش", "Strict reps, strong peak squeeze", "حركة نظيفة وعصر قوي فوق"],
  ["one_arm_cable_curl", "curl", "Standing_One-Arm_Cable_Curl", "cable", "", "same", "One-arm cable curl", "بايسبس كيبل بيد وحدة", "Cable · handle", "كيبل · مقبض", "Each arm alone, constant tension", "كل يد لحالها بشد ثابت"],
  ["machine_curl", "curl", "Machine_Bicep_Curl", "machine", "", "same", "Biceps curl machine", "جهاز بايسبس", "Curl machine", "جهاز البايسبس", "Locked in — safe to go to failure", "ثابت وتوصل للفشل بأمان"],
  ["preacher_curl", "curl", "Preacher_Curl", "barbell bench", "", "angle", "Preacher curl", "بايسبس بريتشر", "EZ bar · preacher bench", "بار EZ · كرسي بريتشر", "No swinging — lower biceps", "بدون تمرجح — أسفل البايسبس"],
  ["db_preacher_curl", "curl", "One_Arm_Dumbbell_Preacher_Curl", "dumbbell bench", "", "angle", "One-arm dumbbell preacher curl", "بريتشر دمبل بيد وحدة", "Dumbbell · preacher bench", "دمبل · كرسي بريتشر", "Strict, each arm alone", "نظيف وكل يد لحالها"],
  ["cable_preacher_curl", "curl", "Cable_Preacher_Curl", "cable bench", "", "angle", "Cable preacher curl", "بايسبس بريتشر كيبل", "Cable · preacher bench", "كيبل · كرسي بريتشر", "Tension even in the easy part", "شد حتى في الجزء السهل"],
  ["spider_curl", "curl", "Spider_Curl", "barbell bench", "", "angle", "Spider curl", "سبايدر كيرل", "EZ bar · incline bench (chest down)", "بار EZ · بنش مائل (صدرك عليه)", "Hardest at the top — strong peak", "أصعب فوق — قمة قوية"],
  ["prone_incline_curl", "curl", "Dumbbell_Prone_Incline_Curl", "dumbbell bench", "", "angle", "Prone incline curl", "بايسبس منبطح على بنش مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Arms hang — short head focus", "الذراع معلّقة — الرأس القصير"],
  ["drag_curl", "curl", "Drag_Curl", "barbell", "", "angle", "Drag curl", "دراق كيرل", "Barbell", "بار", "Bar slides up your body — long head", "البار يمشي على جسمك — الرأس الطويل"],
  ["high_cable_curl", "curl", "High_Cable_Curls", "cable", "", "angle", "High cable curl", "بايسبس كيبل من فوق", "Cables · high pulleys", "كيبل · من فوق", "Arms up — peak contraction", "الذراع فوق — عصر القمة"],
  ["overhead_cable_curl", "curl", "Overhead_Cable_Curl", "cable", "", "angle", "Overhead cable curl", "بايسبس كيبل فوق الرأس", "Cable · handle", "كيبل · مقبض", "Peak squeeze with the arm raised", "عصر القمة والذراع مرفوعة"],
  ["lying_cable_curl", "curl", "Lying_Cable_Curl", "cable", "", "angle", "Lying cable curl", "بايسبس كيبل منبطح", "Cable · straight bar · floor", "كيبل · بار · أرض", "No body swing possible", "ما تقدر تتمرجح أبداً"],
  ["alt_hammer_curl", "curl", "Alternate_Hammer_Curl", "dumbbell", "", "angle", "Alternating hammer curl", "هامر كيرل بالتناوب", "Dumbbells", "دمبل", "Thicker arms — forearms too", "ذراع أعرض والساعد معه"],
  ["cross_body_hammer", "curl", "Cross_Body_Hammer_Curl", "dumbbell", "", "angle", "Cross-body hammer curl", "هامر كيرل عرضي", "Dumbbells", "دمبل", "Brachialis and forearms", "العضلة العضدية والساعد"],
  ["rope_hammer_curl", "curl", "Cable_Hammer_Curls_-_Rope_Attachment", "cable", "", "angle", "Rope hammer curl", "هامر كيرل بالحبل", "Cable · rope", "كيبل · حبل", "Hammer curl with constant tension", "هامر كيرل بشد ثابت"],
  ["incline_hammer_curl", "curl", "Incline_Hammer_Curls", "dumbbell bench", "", "angle", "Incline hammer curl", "هامر كيرل مائل", "Dumbbells · incline bench", "دمبل · بنش مائل", "Hammer curl with a stretch", "هامر كيرل بتمدد"],
  ["zottman_curl", "curl", "Zottman_Curl", "dumbbell", "", "angle", "Zottman curl", "زوتمان كيرل", "Dumbbells", "دمبل", "Biceps going up, forearms coming down", "بايسبس بالطلوع وساعد بالنزول"],
  ["reverse_bb_curl", "curl", "Reverse_Barbell_Curl", "barbell", "wrist", "angle", "Reverse barbell curl", "بايسبس بار قبضة عكسية", "Barbell · palms down", "بار · الكفوف لتحت", "Forearms and brachialis", "الساعد والعضلة العضدية"],
  ["reverse_cable_curl", "curl", "Reverse_Cable_Curl", "cable", "wrist", "angle", "Reverse cable curl", "بايسبس كيبل قبضة عكسية", "Cable · straight bar", "كيبل · بار مستقيم", "Forearms with smooth tension", "الساعد بشد سلس"],

  ["front_squat", "squat", "Front_Barbell_Squat", "barbell", "knee wrist", "same", "Front squat", "فرونت سكوات", "Barbell · rack", "بار · رف", "Upright torso — more quads, less back", "جذع مستقيم — فخذ أكثر وظهر أقل"],
  ["smith_squat", "squat", "Smith_Machine_Squat", "machine", "knee", "same", "Smith machine squat", "سكوات سميث", "Smith machine", "جهاز السميث", "Fixed path — no spotter", "مسار ثابت بدون مساعد"],
  ["db_squat", "squat", "Dumbbell_Squat", "dumbbell", "knee", "same", "Dumbbell squat", "سكوات دمبل", "Dumbbells at your sides", "دمبل على الجنب", "Easy to set up at home", "سهل تجهزه بالبيت"],
  ["narrow_hack_squat", "squat", "Narrow_Stance_Hack_Squats", "machine", "knee", "same", "Narrow-stance hack squat", "هاك سكوات بقدم ضيقة", "Hack squat machine", "جهاز الهاك سكوات", "Outer quads focus", "تركيز على الفخذ الخارجي"],
  ["leverage_squat", "squat", "Lying_Machine_Squat", "machine", "knee", "same", "Machine squat (lever)", "جهاز سكوات", "Squat machine", "جهاز السكوات", "Back supported, heavy legs", "الظهر مسنود ووزن عالي"],
  ["box_squat", "squat", "Box_Squat", "barbell bench", "back knee", "same", "Box squat", "سكوات على صندوق", "Barbell · box or bench", "بار · صندوق أو بنش", "Same depth every rep", "نفس العمق كل تكرار"],
  ["sumo_db_squat", "squat", "Plie_Dumbbell_Squat", "dumbbell", "knee", "angle", "Sumo (plié) dumbbell squat", "سكوات سومو بالدمبل", "Dumbbell · wide stance", "دمبل · وقفة واسعة", "Inner thighs and glutes", "الفخذ الداخلي والمؤخرة"],
  ["zercher_squat", "squat", "Zercher_Squats", "barbell", "back knee", "angle", "Zercher squat", "زيرشر سكوات", "Barbell in the elbows", "البار على الأكواع", "Quads and core, upright", "فخذ وبطن والجسم مستقيم"],

  ["stiff_leg_deadlift", "hinge", "Stiff-Legged_Barbell_Deadlift", "barbell", "back", "same", "Stiff-leg deadlift", "ستيف ليق ديدلفت", "Barbell", "بار", "Maximum hamstring stretch", "أقصى تمدد للفخذ الخلفي"],
  ["single_leg_rdl", "hinge", "Kettlebell_One-Legged_Deadlift", "dumbbell", "", "same", "Single-leg Romanian deadlift", "رومانيان برجل وحدة", "Dumbbell or kettlebell", "دمبل أو كيتل بل", "Each leg alone, balance too", "كل رجل لحالها مع توازن"],
  ["smith_stiff_leg", "hinge", "Smith_Machine_Stiff-Legged_Deadlift", "machine", "back", "same", "Smith stiff-leg deadlift", "ستيف ليق سميث", "Smith machine", "جهاز السميث", "Fixed bar path, easier balance", "مسار ثابت وتوازن أسهل"],
  ["cable_pull_through", "hinge", "Pull_Through", "cable", "", "same", "Cable pull-through", "بول ثرو كيبل", "Cable · rope between the legs", "كيبل · حبل بين الرجلين", "Teaches the hinge, easy on the back", "يعلمك الحركة ومريح للظهر"],
  ["good_morning", "hinge", "Good_Morning", "barbell", "back", "same", "Good morning", "قود مورننق", "Barbell on your back", "بار على ظهرك", "Hamstrings and lower back", "الفخذ الخلفي وأسفل الظهر"],
  ["deadlift", "hinge", "Barbell_Deadlift", "barbell", "back", "angle", "Deadlift", "ديدلفت", "Barbell", "بار", "Whole back and legs — the big one", "الظهر كامل والرجلين — التمرين الأقوى"],
  ["sumo_deadlift", "hinge", "Sumo_Deadlift", "barbell", "back", "angle", "Sumo deadlift", "سومو ديدلفت", "Barbell · wide stance", "بار · وقفة واسعة", "More glutes and inner thighs, shorter pull", "مؤخرة وفخذ داخلي أكثر ومسافة أقصر"],
  ["trap_bar_deadlift", "hinge", "Trap_Bar_Deadlift", "barbell", "", "angle", "Trap-bar deadlift", "ديدلفت بار سداسي", "Trap (hex) bar", "بار سداسي", "A heavy pull that's kinder to the back", "سحب ثقيل وأريح للظهر"],
  ["reverse_hyper", "hinge", "Reverse_Hyperextension", "machine", "", "angle", "Reverse hyperextension", "ريفيرس هايبر", "Reverse hyper machine", "جهاز الريفيرس هايبر", "Glutes and hamstrings, decompresses the back", "المؤخرة والفخذ الخلفي ويريح الظهر"],
  ["floor_back_ext", "hinge", "Hyperextensions_With_No_Hyperextension_Bench", "body", "", "angle", "Floor back extension", "تمديد الظهر على الأرض", "Bodyweight · floor", "وزن الجسم · أرض", "Lower back with no equipment", "أسفل الظهر بدون أدوات"],

  ["smith_leg_press", "legpress", "Smith_Machine_Leg_Press", "machine", "knee", "same", "Smith leg press", "ليج برس سميث", "Smith machine", "جهاز السميث", "When the leg press is busy", "بديل الليج برس إذا الجهاز مشغول"],

  ["db_reverse_lunge", "lunge", "Dumbbell_Rear_Lunge", "dumbbell", "", "same", "Reverse lunge", "طعن خلفي", "Dumbbells", "دمبل", "The easiest lunge on the knees", "أريح طعن للركبة"],
  ["bb_lunge", "lunge", "Barbell_Lunge", "barbell", "knee", "same", "Barbell lunge", "طعن بار", "Barbell on your back", "بار على ظهرك", "Heavier lunges", "طعن بوزن أعلى"],
  ["bb_walking_lunge", "lunge", "Barbell_Walking_Lunge", "barbell", "knee", "same", "Barbell walking lunge", "طعن مشي بالبار", "Barbell on your back", "بار على ظهرك", "Legs and balance together", "رجلين وتوازن مع بعض"],
  ["bb_step_up", "lunge", "Barbell_Step_Ups", "barbell bench", "", "same", "Barbell step-up", "صعود بالبار", "Barbell · box or bench", "بار · بوكس أو بنش", "Heavy step-ups", "صعود بوزن عالي"],
  ["side_split_squat", "lunge", "Barbell_Side_Split_Squat", "barbell", "knee", "angle", "Side (lateral) lunge", "طعن جانبي", "Barbell", "بار", "Inner thighs and glutes", "الفخذ الداخلي والمؤخرة"],
  ["deficit_reverse_lunge", "lunge", "Elevated_Back_Lunge", "barbell", "knee", "angle", "Deficit reverse lunge", "طعن خلفي من منصة", "Barbell · low step", "بار · منصة منخفضة", "A deeper stretch for the glutes", "تمدد أعمق للمؤخرة"],

  ["cable_glute_kickback", "glutes", "One-Legged_Cable_Kickback", "cable", "", "same", "Cable glute kickback", "ركلة خلفية كيبل", "Cable · ankle strap", "كيبل · رباط الكاحل", "Glutes alone, easy to load", "المؤخرة لحالها وسهل تزيد الوزن"],
  ["butt_lift_bridge", "glutes", "Butt_Lift_Bridge", "body", "", "same", "Glute bridge", "جسر المؤخرة", "Bodyweight · floor", "وزن الجسم · أرض", "No equipment — squeeze at the top", "بدون أدوات — اعصر فوق"],
  ["band_hip_lift", "glutes", "Hip_Lift_with_Band", "band", "", "same", "Banded hip lift", "جسر الورك بالمطاط", "Resistance band", "مطاط مقاومة", "Glutes with a band", "المؤخرة بالمطاط"],

  ["hip_abduction_machine", "abduction", "Thigh_Abductor", "machine", "", "same", "Hip abduction machine", "جهاز فتح الرجل (أبدكشن)", "Hip abductor machine", "جهاز فتح الورك", "Side glutes — shape and hip stability", "جانب المؤخرة — شكل وثبات للورك"],
  ["monster_walk", "abduction", "Monster_Walk", "band", "", "same", "Band monster walk", "مشي جانبي بالمطاط", "Resistance band", "مطاط مقاومة", "Side glutes, a great warm-up", "جانب المؤخرة وإحماء ممتاز"],

  ["hip_adduction_machine", "adduction", "Thigh_Adductor", "machine", "", "same", "Hip adduction machine", "جهاز ضم الرجل (أدكشن)", "Hip adductor machine", "جهاز ضم الورك", "Inner thighs, easy to load", "الفخذ الداخلي وسهل تزيد الوزن"],
  ["cable_hip_adduction", "adduction", "Cable_Hip_Adduction", "cable", "", "same", "Cable hip adduction", "ضم الرجل بالكيبل", "Cable · ankle strap", "كيبل · رباط الكاحل", "Each leg alone", "كل رجل لحالها"],
  ["band_hip_adduction", "adduction", "Band_Hip_Adductions", "band", "", "same", "Band hip adduction", "ضم الرجل بالمطاط", "Resistance band", "مطاط مقاومة", "Light and joint-friendly", "خفيف ومريح للمفاصل"],

  ["glute_ham_raise", "legcurl", "Glute_Ham_Raise", "machine", "knee", "angle", "Glute-ham raise", "جلوت هام ريز", "GHD machine", "جهاز GHD", "A very strong hamstring builder", "يبني الفخذ الخلفي بقوة"],
  ["ball_leg_curl", "legcurl", "Ball_Leg_Curl", "ball", "", "angle", "Swiss-ball leg curl", "ثني الرجل على الكرة", "Swiss ball", "كرة التمارين", "Hamstrings and glutes, no machine", "الفخذ الخلفي والمؤخرة بدون جهاز"],
  ["floor_glute_ham", "legcurl", "Floor_Glute-Ham_Raise", "body", "knee", "angle", "Floor glute-ham raise", "جلوت هام على الأرض", "Bodyweight · feet anchored · pad", "وزن الجسم · ثبّت رجليك · وسادة", "Nordic-style, no machine", "مثل النوردك وبدون جهاز"],

  ["sissy_squat", "legext", "Weighted_Sissy_Squat", "body", "knee", "angle", "Sissy squat", "سيسي سكوات", "Bodyweight or a plate", "وزن الجسم أو قرص", "Quads with no machine", "الفخذ الأمامي بدون جهاز"],

  ["smith_calf_raise", "calf", "Smith_Machine_Calf_Raise", "machine", "", "same", "Smith calf raise", "سمانة سميث", "Smith machine · step", "جهاز السميث · درجة", "Heavy and stable", "ثقيل وثابت"],
  ["calf_press_machine", "calf", "Calf_Press", "machine", "", "same", "Calf press machine", "جهاز ضغط السمانة", "Calf press machine", "جهاز ضغط السمانة", "Simple and heavy", "بسيط وثقيل"],
  ["donkey_calf", "calf", "Donkey_Calf_Raises", "machine", "", "same", "Donkey calf raise", "سمانة دونكي", "Donkey calf machine", "جهاز سمانة دونكي", "Deep stretch at the bottom", "تمدد عميق تحت"],
  ["bb_seated_calf", "calf", "Barbell_Seated_Calf_Raise", "barbell bench", "", "angle", "Seated barbell calf raise", "سمانة جالس بالبار", "Barbell on the knees · bench", "بار على الركب · بنش", "Lower calf without the machine", "السمانة السفلية بدون جهاز"],
  ["db_seated_calf", "calf", "Dumbbell_Seated_One-Leg_Calf_Raise", "dumbbell bench", "", "angle", "Seated dumbbell calf raise", "سمانة جالس بالدمبل", "Dumbbell · bench", "دمبل · بنش", "Each leg alone, at home", "كل رجل لحالها بالبيت"],

  ["cable_seated_crunch", "core", "Cable_Seated_Crunch", "cable", "", "same", "Seated cable crunch", "كرنش كيبل جالس", "Cable · rope", "كيبل · حبل", "Easy to add weight", "سهل تزيد الوزن"],
  ["captains_chair", "core", "Knee_Hip_Raise_On_Parallel_Bars", "bar", "", "same", "Captain's chair knee raise", "رفع الركبة على جهاز الكابتن", "Captain's chair or dip bars", "جهاز الكابتن أو بار الديبس", "Lower abs, back supported", "أسفل البطن والظهر مسنود"],
  ["decline_crunch", "core", "Decline_Crunch", "bench", "", "same", "Decline crunch", "كرنش على بنش مائل", "Decline bench", "بنش مائل للأسفل", "Harder than a floor crunch", "أصعب من الكرنش العادي"],
  ["reverse_crunch", "core", "Reverse_Crunch", "body", "", "same", "Reverse crunch", "كرنش عكسي", "Bodyweight · floor", "وزن الجسم · أرض", "Lower abs", "أسفل البطن"],
  ["cable_reverse_crunch", "core", "Cable_Reverse_Crunch", "cable", "", "same", "Cable reverse crunch", "كرنش عكسي كيبل", "Cable · ankle strap", "كيبل · رباط الكاحل", "Lower abs with load", "أسفل البطن بوزن"],
  ["leg_pull_in", "core", "Flat_Bench_Leg_Pull-In", "bench", "", "same", "Bench leg pull-in", "سحب الركب على البنش", "Flat bench", "بنش مستوي", "Lower abs, easy to learn", "أسفل البطن وسهل تتعلمه"],
  ["hanging_pike", "core", "Hanging_Pike", "bar", "", "angle", "Hanging pike", "رفع الرجل معلّق للبار", "Pull-up bar", "بار العقلة", "Advanced — the whole abs", "متقدم — البطن كامل"],
  ["cross_body_crunch", "core", "Cross-Body_Crunch", "body", "", "angle", "Cross-body crunch", "كرنش عرضي", "Bodyweight", "وزن الجسم", "Abs and obliques", "البطن والخواصر"],
  ["oblique_crunch", "core", "Oblique_Crunches", "body", "", "angle", "Oblique crunch", "كرنش جانبي", "Bodyweight", "وزن الجسم", "The sides of your abs", "جوانب البطن"],
  ["bicycle_crunch", "core", "Air_Bike", "body", "", "angle", "Bicycle crunch", "كرنش الدراجة", "Bodyweight", "وزن الجسم", "Abs and obliques together", "البطن والخواصر مع بعض"],
  ["russian_twist", "core", "Russian_Twist", "body", "back", "angle", "Russian twist", "روشن تويست", "Bodyweight or a plate", "وزن الجسم أو قرص", "Obliques and rotation", "الخواصر والدوران"],
  ["cable_russian_twist", "core", "Cable_Russian_Twists", "cable", "", "angle", "Cable Russian twist", "روشن تويست كيبل", "Cable · handle", "كيبل · مقبض", "Rotation with steady tension", "دوران بشد ثابت"],
  ["dead_bug", "core", "Dead_Bug", "body", "", "angle", "Dead bug", "ديد بق", "Bodyweight · floor", "وزن الجسم · أرض", "Deep core, safe for the back", "العضلات العميقة وآمن للظهر"],
  ["jackknife_sit_up", "core", "Jackknife_Sit-Up", "body", "back", "angle", "Jackknife sit-up", "جاك نايف", "Bodyweight", "وزن الجسم", "Upper and lower abs at once", "أعلى وأسفل البطن مع بعض"],
  ["ab_rollout_knees", "core", "Barbell_Ab_Rollout_-_On_Knees", "barbell", "back shoulder", "angle", "Barbell rollout (on knees)", "رول أوت بالبار على الركب", "Barbell with round plates", "بار مع أقراص دائرية", "Ab-wheel work without a wheel", "مثل عجلة البطن بدون عجلة"],
  ["pallof_press", "core", "Pallof_Press", "cable", "", "angle", "Pallof press", "بالوف برس", "Cable · handle", "كيبل · مقبض", "Core strength against twisting — kind to the back", "قوة البطن ضد اللف — مريح للظهر"],

  // ── Gym machines and cable moves (added) ──
  ["wide_chest_press", "hpress", null, "machine", "", "same", "Wide chest press machine", "جهاز ضغط صدر واسع", "Wide chest press (plate-loaded)", "جهاز ضغط صدر واسع (أقراص)", "Big stretch — mid and lower chest", "تمدد كبير — منتصف وأسفل الصدر"],
  ["standing_cable_press", "hpress", "Standing_Cable_Chest_Press", "cable", "", "same", "Standing cable chest press", "ضغط صدر كيبل واقف", "Cables at chest height · standing", "كيبل بمستوى الصدر · واقف", "Chest with core stability", "صدر مع ثبات للبطن"],
  ["trx_push_up", "hpress", "Suspended_Push-Up", "body", "shoulder wrist", "angle", "Suspension-strap push-up", "ضغط بالأحزمة المعلقة", "Suspension straps (TRX)", "أحزمة معلقة (TRX)", "Harder than a floor push-up", "أصعب من الضغط العادي"],
  ["decline_machine_press", "hpress", "Leverage_Decline_Chest_Press", "machine", "", "angle", "Decline chest press machine", "جهاز ضغط صدر مائل للأسفل", "Decline press machine (plate-loaded)", "جهاز ضغط مائل للأسفل (أقراص)", "Lower chest with a fixed path", "أسفل الصدر بمسار ثابت"],
  ["smith_decline_press", "hpress", "Smith_Machine_Decline_Press", "machine bench", "", "angle", "Smith decline press", "ضغط سميث مائل للأسفل", "Smith machine · decline bench", "جهاز السميث · بنش مائل للأسفل", "Lower chest, safe to push hard", "أسفل الصدر وتضغط بقوة بأمان"],
  ["svend_press", "hpress", "Svend_Press", "plate", "", "angle", "Plate squeeze press", "ضغط القرص بين الكفين", "Weight plate", "قرص حديد", "Squeeze the plate hard — mid chest", "اعصر القرص بقوة — منتصف الصدر"],
  ["cable_iron_cross", "fly", "Cable_Iron_Cross", "cable", "shoulder", "same", "Standing cable fly", "تفتيح كيبل واقف", "Cable crossover · high pulleys", "جهاز الكيبل · من فوق", "Big stretch across the chest", "تمدد كبير على الصدر"],

  ["assisted_dip", "triceps", null, "machine", "shoulder", "angle", "Assisted dip machine", "جهاز الديبس المساعد", "Assisted dip / pull-up machine", "جهاز المساعدة للديبس والعقلة", "Dips with help — work up to bodyweight", "ديبس بمساعدة لين توصل لوزن جسمك"],
  ["one_arm_cable_ext", "triceps", "Cable_One_Arm_Tricep_Extension", "cable", "", "same", "One-arm reverse-grip pushdown", "بوش داون بيد وحدة قبضة عكسية", "Cable · handle · palm up", "كيبل · مقبض · الكف لفوق", "Each arm alone", "كل يد لحالها"],
  ["low_cable_triceps_ext", "triceps", "Low_Cable_Triceps_Extension", "cable bench", "shoulder", "angle", "Lying low-cable extension", "تمديد كيبل منبطح من تحت", "Low pulley · rope · bench", "كيبل من تحت · حبل · بنش", "Long head with a deep stretch", "الرأس الطويل مع تمدد عميق"],
  ["incline_cable_triceps_ext", "triceps", "Cable_Incline_Triceps_Extension", "cable bench", "", "angle", "Incline cable extension", "تمديد كيبل على بنش مائل", "High pulley · bar · incline bench", "كيبل من فوق · بار · بنش مائل", "Long head under steady tension", "الرأس الطويل بشد ثابت"],
  ["smith_close_grip_bench", "triceps", "Smith_Machine_Close-Grip_Bench_Press", "machine bench", "wrist", "angle", "Smith close-grip bench", "بنش ضيق سميث", "Smith machine · flat bench", "جهاز السميث · بنش مستوي", "Heavy triceps on a fixed path", "ترايسبس ثقيل بمسار ثابت"],

  ["low_row_machine", "row", null, "machine", "", "same", "Low row machine", "جهاز السحب السفلي", "Low row machine (plate-loaded)", "جهاز السحب السفلي (أقراص)", "Lats and mid back, chest supported", "المجنص ومنتصف الظهر والصدر مسنود"],
  ["shotgun_row", "row", "Shotgun_Row", "cable", "", "same", "Standing one-arm cable row", "سحب كيبل واقف بيد وحدة", "Low pulley · handle", "كيبل من تحت · مقبض", "Each side alone with a long pull", "كل جهة لحالها مع سحبة طويلة"],
  ["kneeling_high_row", "row", "Kneeling_High_Pulley_Row", "cable", "", "angle", "Kneeling high-pulley row", "سحب كيبل عالي وأنت راكع", "High pulley · rope", "كيبل من فوق · حبل", "Lats and mid back from above", "المجنص ومنتصف الظهر من فوق"],
  ["iso_pulldown", "vpull", null, "machine", "", "same", "Plate-loaded pulldown", "جهاز سحب أمامي بالأقراص", "Front pulldown machine (each arm alone)", "جهاز سحب أمامي (كل يد لحالها)", "Strong pull, each side alone", "سحب قوي وكل جهة لحالها"],
  ["kneeling_one_arm_pulldown", "vpull", "Kneeling_Single-Arm_High_Pulley_Row", "cable", "", "angle", "Kneeling one-arm pulldown", "سحب عالي بيد وحدة وأنت راكع", "High pulley · handle", "كيبل من فوق · مقبض", "Each lat alone, full stretch", "كل مجنص لحاله مع تمدد كامل"],
  ["mixed_grip_chin", "vpull", "Mixed_Grip_Chin", "bar", "", "angle", "Mixed-grip pull-up", "عقلة بقبضة مختلطة", "Pull-up bar", "بار العقلة", "One palm each way — stronger grip", "كف لكل جهة — قبضة أقوى"],
  ["pullover_machine", "vpull", null, "machine", "", "angle", "Pullover machine", "جهاز البلوفر", "Pullover machine", "جهاز البلوفر", "Lats without the biceps", "المجنص بدون بايسبس"],

  ["lateral_raise_machine", "lateral", null, "machine", "", "same", "Lateral raise machine", "جهاز الرفرفة الجانبية", "Lateral raise machine", "جهاز الرفرفة الجانبية", "Side shoulders, no swinging", "الكتف الجانبي بدون تمرجح"],
  ["smith_upright_row", "lateral", "Smith_Machine_Upright_Row", "machine", "shoulder wrist", "angle", "Smith upright row", "سحب عمودي سميث", "Smith machine", "جهاز السميث", "Side shoulders and traps on a fixed path", "الكتف الجانبي والترابيس بمسار ثابت"],
  ["cable_shoulder_press_standing", "ohp", "Cable_Shoulder_Press", "cable", "", "same", "Standing cable shoulder press", "ضغط كتف كيبل واقف", "Cables · low pulleys", "كيبل · من تحت", "Smooth press with constant tension", "ضغط سلس بشد ثابت"],
  ["bent_cable_rear_raise", "rear", "Bent_Over_Low-Pulley_Side_Lateral", "cable", "back", "same", "Bent-over cable rear raise", "رفرفة خلفي كيبل منحني", "Low pulley · handle", "كيبل من تحت · مقبض", "Rear shoulders with tension at the bottom", "الكتف الخلفي بشد حتى تحت"],
  ["cable_row_to_neck", "rear", "Low_Pulley_Row_To_Neck", "cable", "", "angle", "Cable row to neck", "سحب كيبل للرقبة", "Low pulley · rope · seated", "كيبل من تحت · حبل · جالس", "Rear shoulders and upper back", "الكتف الخلفي وأعلى الظهر"],
  ["cable_external_rotation", "rear", "External_Rotation_with_Cable", "cable", "", "angle", "Cable external rotation", "تدوير خارجي بالكيبل", "Cable at elbow height · handle", "كيبل بمستوى الكوع · مقبض", "Rotator cuff — keeps the shoulders healthy", "عضلات الدوران — تحمي الكتف"],

  ["pendulum_squat", "squat", null, "machine", "knee", "same", "Pendulum squat", "بندولم سكوات", "Pendulum squat machine", "جهاز البندولم سكوات", "Deep quads with the back supported", "فخذ أمامي عميق والظهر مسنود"],
  ["belt_squat", "squat", null, "machine", "", "same", "Belt squat", "سكوات بالحزام", "Belt squat machine", "جهاز سكوات الحزام", "Heavy legs, nothing on the spine", "أرجل ثقيلة بدون ضغط على الظهر"],
  ["horizontal_leg_press", "legpress", null, "machine", "knee", "same", "Seated leg press", "ليج برس جالس", "Seated (horizontal) leg press", "جهاز ليج برس أفقي", "Easy on the back", "مريح للظهر"],
  ["machine_deadlift", "hinge", "Leverage_Deadlift", "machine", "", "angle", "Machine deadlift", "جهاز الديدلفت", "Lever deadlift machine", "جهاز الديدلفت بالأقراص", "Heavy pull on a guided path", "سحب ثقيل بمسار ثابت"],
  ["hip_thrust_machine", "glutes", null, "machine", "", "same", "Hip thrust machine", "جهاز الهيب ثرست", "Hip thrust machine", "جهاز الهيب ثرست", "Heavy glutes, quick to set up", "مؤخرة بوزن عالي وتجهيز سريع"],
  ["glute_kickback_machine", "glutes", null, "machine", "", "same", "Glute kickback machine", "جهاز الركلة الخلفية", "Glute kickback machine", "جهاز الركلة الخلفية", "Glutes alone, one leg at a time", "المؤخرة لحالها وكل رجل لحالها"],
  ["kneeling_leg_curl", "legcurl", null, "machine", "", "same", "Kneeling leg curl", "ثني الرجل وأنت راكع", "Kneeling leg curl machine", "جهاز ثني الرجل راكع", "Each leg alone", "كل رجل لحالها"],

  ["torso_rotation", "core", null, "machine", "", "angle", "Torso rotation machine", "جهاز لف الجذع", "Rotary torso machine", "جهاز لف الجذع", "Obliques with a safe range", "الخواصر بمدى آمن"],
  ["wood_chop", "core", "Standing_Cable_Wood_Chop", "cable", "", "angle", "Cable wood chop", "وود تشوب كيبل", "High pulley · handle", "كيبل من فوق · مقبض", "Obliques with power", "الخواصر بقوة"],
  ["cable_side_bend", "core", "One-Arm_High-Pulley_Cable_Side_Bends", "cable", "", "angle", "Cable side bend", "ميل جانبي بالكيبل", "High pulley · handle", "كيبل من فوق · مقبض", "Obliques, one side at a time", "الخواصر جهة جهة"],
  ["plate_twist", "core", "Plate_Twist", "plate", "back", "angle", "Seated plate twist", "لف القرص جالس", "Weight plate", "قرص حديد", "Obliques with load", "الخواصر بوزن"],
  ["suspended_reverse_crunch", "core", "Suspended_Reverse_Crunch", "body", "", "angle", "Suspension knee tuck", "سحب الركب بالأحزمة المعلقة", "Suspension straps (TRX)", "أحزمة معلقة (TRX)", "Lower abs, hard", "أسفل البطن وصعب"],
];

const split = (s) => (s ? s.split(" ").filter(Boolean) : []);

export const EXERCISES = RAW.map(([id, group, img, equip, loads, tag, en, ar, gearEn, gearAr, whyEn, whyAr]) => ({
  id, group, img, equip: split(equip), loads: split(loads), tag,
  name: [en, ar], gear: [gearEn, gearAr], why: [whyEn, whyAr],
}));

export const BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
// Ids that were renamed: old sessions, plans and logs keep working.
const RENAMED = { cable_kickback: "cable_glute_kickback" };
Object.entries(RENAMED).forEach(([o, n]) => { BY_ID[o] = BY_ID[n]; });
export const canonicalId = (id) => RENAMED[id] || id;
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

// Library id for a logged set: the stored id, else matched from the typed name
// — but not across unrelated muscles, so a triceps "kickback" you typed never
// turns into a glute exercise. (Rear delts under Back, dips under Chest… fine.)
const NEAR = {
  Chest: ["Chest", "Triceps", "Shoulders"], Back: ["Back", "Shoulders", "Biceps", "Legs"], Shoulders: ["Shoulders", "Back", "Chest", "Triceps"],
  Biceps: ["Biceps", "Back"], Triceps: ["Triceps", "Chest", "Shoulders"], Legs: ["Legs", "Back", "Core"], Core: ["Core", "Legs"],
};
export const logExerciseId = (log) => {
  if (log?.exercise_id && BY_ID[log.exercise_id]) return canonicalId(log.exercise_id);
  const id = matchExercise(log?.exercise);
  if (!id) return null;
  const m = log?.muscle_group;
  return NEAR[m] && !NEAR[m].includes(GROUPS[BY_ID[id].group].muscle) ? null : id;
};

// Alternatives for a swap: same group, usable here, not already in today's
// session. Same-movement options first, then different angles.
export function swapOptions(currentId, { equipment, pain, exclude = [] } = {}) {
  const cur = BY_ID[currentId];
  if (!cur) return [];
  return groupItems(cur.group)
    .filter((e) => e.id !== currentId && !exclude.includes(e.id) && usable(e, { equipment, pain }))
    .sort((a, b) => (a.tag === b.tag ? 0 : a.tag === "same" ? -1 : 1));
}
