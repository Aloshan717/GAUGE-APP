// EVOLVE — every visible string, in English and Arabic.
// t("key", { params }) fills {param} placeholders. Missing Arabic falls back to English.

export const STR = {
  en: {
    langBtn: "ع", langAria: "Switch to Arabic", toLight: "Switch to light theme", toDark: "Switch to dark theme", accountAria: "Account and settings",
    close: "Close", back: "Back", save: "Save", saving: "Saving…", cancel: "Cancel", del: "Delete", delQ: "Delete?", edit: "Edit", next: "Next", done: "Done",
    today: "Today", yesterday: "Yesterday", kg: "kg", kcal: "kcal", g: "g", cm: "cm", min: "min", date: "Date",
    offline: "No connection — showing your last synced data.",
    setupMissing: "One-time setup needed (1 minute) — until then calories, protein, your profile, plans and Apple Watch sync can't be saved. Weight, scans, goal and lifts already work.",
    setupBtn: "Set up now", setupTitle: "One-time setup", setupText: "Evolve needs four small tables in your database for calories, protein, your profile, plans and Apple Watch sync. Your existing data is not touched.",
    setupSteps: ["Tap “Copy setup”.", "Tap “Open Supabase” and sign in if asked.", "Long-press in the editor → Paste → tap Run.", "Come back here — Evolve checks again by itself."],
    copySetup: "Copy setup", setupCopied: "Copied — now open Supabase", openSupabase: "Open Supabase", setupSafe: "Safe to run more than once. It only adds Evolve's tables; nothing existing is deleted.",
    loadFailed: "Some data couldn't load (what you had is still shown): {msg}",
    saved: "Saved", deleted: "Deleted",

    // Sign in
    tagline: "Weight, InBody, training and nutrition — one plan, built around your goal.",
    email: "Email", password: "Password", signIn: "Sign in", signingIn: "Signing in…", forgot: "Forgot password?",
    forgotSent: "If that email has an account, a reset link is on its way.", enterEmailFirst: "Type your email above first.",
    inviteOnly: "Invite only — ask the app owner for an invite.",
    faceId: "Your iPhone saves the password — next time Face ID fills it in.",
    badLogin: "Wrong email or password.", notConfirmed: "Open your invite email first to set a password.", tooMany: "Too many tries. Wait a minute and try again.",
    showPw: "Show password", hidePw: "Hide password", noNet: "No connection. Try again when you're online.",
    welcome: "Welcome to Evolve", resetTitle: "Set a new password",
    setSub: "Choose a password. Your iPhone can save it and fill it with Face ID next time.",
    yourName: "Your name", newPassword: "New password", pwHint: "At least 8 characters", pwShort: "Use at least 8 characters.",
    setPwBtn: "Save and continue", linkExpired: "This link has expired or was already used. Ask for a new invite, or use “Forgot password?”.",

    // Nav
    navHome: "Home", navTrain: "Train", navLog: "Log something", navBody: "Body", navGoal: "Goal",

    // Home
    morning: "Good morning, {name}", afternoon: "Good afternoon, {name}", evening: "Good evening, {name}", hello: "Hello",
    noGoalTitle: "Set your goal", noGoalText: "Targets for weight, body fat and Muscle Mass — Evolve then works out your calories, protein and training.", setGoal: "Set goal",
    daysLeft: "{n} days left", oneDayLeft: "1 day left", datePassed: "Date passed", noDate: "No date",
    goalLose: "Lose fat", goalGain: "Build muscle", goalRecomp: "Lose fat · keep muscle", goalMaintain: "Maintain",
    timeWord: "time", legendProgress: "Progress to target", legendTime: "Time used", noReading: "no reading",
    mWeight: "Weight", mFat: "Body fat", mMuscle: "Muscle Mass",
    sumOk: "On pace: {list}.", sumWarn: "A little behind: {list}.", sumBad: "Behind: {list}.", sumEarly: "Too early to judge: {list}.", sumDone: "Reached: {list}.", and: " and ",
    etaAll: "At this pace you reach all three around {date} — {when}.", etaLate: "{n} days after your date", etaEarly: "{n} days before your date", etaOnTime: "right on time",
    etaUnknown: "A few more weigh-ins and scans and Evolve can tell when you'll arrive.",
    fuelTitle: "Today's fuel", synced: "Watch synced · {date}", notSynced: "Watch not synced",
    calLabel: "Calories", proLabel: "Protein", left: "{n} {u} left", over: "{n} {u} over", reachedFuel: "Target reached",
    burnYesterday: "Burned yesterday", burnToday: "Burned today", noBurn: "No burn logged yet", addFuel: "+ Add calories & protein",
    noTargets: "Set a goal to get daily targets.", needProfile: "Add your sex, age and height so Evolve can work out your calories.", addProfile: "Add profile",
    trends: "Trends", lastNDays: "Last {n} days", changeIn: "{d} {u} in {n} days", eta: "ETA {date}", etaReached: "Reached", targetTxt: "Target {v}", noTrend: "Not enough readings yet",

    // Log menu
    logTitle: "Log",
    tScan: "InBody scan", tScanSub: "Photo, PDF or by hand", tWeigh: "Weigh-in", tWeighSub: "Today's weight",
    tFuel: "Calories & protein", tFuelSub: "Today's totals only", tBurn: "Apple Watch burn", tBurnSub: "Auto-sync or type it",
    tWorkout: "Start workout", tWorkoutSub: "Today's session", tMeasure: "Measurements", tMeasureSub: "Waist, chest, arms…",

    // Weigh / measure
    weighTitle: "Weigh-in", weightKg: "Weight (kg)", weighTip: "Same time each day — after waking, before eating — gives the cleanest trend.",
    measureTitle: "Measurements", waist: "Waist", chest: "Chest", hips: "Hips", arms: "Arms", thighs: "Thighs", measureTip: "Tape numbers in cm. Often move before the scale does.",
    needValue: "Fill in at least one value.",

    // Scan
    scanTitle: "InBody scan", scanIntro: "Photo or PDF of the result sheet. Weight, body fat and Muscle Mass are read for you — check them before saving.",
    takePhoto: "Take photo", chooseFile: "Choose file", typeIt: "Type it in", reading: "Reading the sheet…", readOk: "Read from your sheet — check the numbers, then save.",
    scanDate: "Scan date", scanWeight: "Weight (kg)", scanFat: "Body fat (%)", scanMuscle: "Muscle Mass (kg)", scanMuscleHint: "The row printed “Muscle Mass” — not Skeletal Muscle Mass.",
    saveScan: "Save scan", notReport: "That doesn't look like a body-composition sheet. Try another photo, or type it in.",
    scanNeedWeight: "Add the weight too — Muscle Mass is saved with it.", scanNeedOne: "Add at least the weight.",
    scanErr401: "Your session expired. Reopen the app, then retry.", scanErr413: "That file is too large. Use a photo instead of a PDF.", scanErr429: "Too many scans at once. Wait a minute.",
    scanErr5xx: "The reader is busy. Try again in a minute.", scanErrKey: "The scan reader isn't set up (Anthropic key in Vercel).",

    // Fuel
    fuelSheet: "Calories & protein", fuelIntro: "Totals only — no food list. Add what you just ate, or set the day's total.",
    modeAdd: "Add to the day", modeSet: "Set the total", fieldKcal: "Calories (kcal)", fieldProtein: "Protein (g)",
    soFar: "So far: {k} kcal · {p} g protein", targetsLine: "Target: {k} kcal · {p} g protein", forDay: "Day",

    // Burn
    burnSheet: "Apple Watch burn", autoOn: "Auto-sync is on — last sent {date}.", autoWaiting: "Auto-sync is set up — waiting for the first send tonight.",
    autoOff: "Set it up once and your iPhone sends each day's burn by itself — free.", setupSync: "Set up auto-sync",
    manualBurn: "Or type the day's Active + Resting energy (kcal)", burnWhere: "iPhone: Fitness → Activity, or Health → Browse → Activity → Active Energy + Resting Energy.",
    syncTitle: "Apple Watch auto-sync", syncKey: "Your personal key", syncKeyNote: "Shown once. It can only send your burn — nothing else. Make a new one any time (the old one stops working).",
    makeKey: "Make my key", newKey: "Make a new key", copy: "Copy", copied: "Copied", syncUrl: "Address",
    syncSteps: [
      "Shortcuts app → Automation → + → Time of Day → 11:55 PM, Daily → Run Immediately → New Blank Automation.",
      "Add “Find Health Samples”: Type is Active Energy, Start Date is Today.",
      "Add “Calculate Statistics”: Sum.",
      "Repeat both with Resting Energy.",
      "Add “Format Date”: Current Date, Custom format yyyy-MM-dd.",
      "Add “Get Contents of URL”: the address above, Method POST, Request Body JSON with key (your key), date (Formatted Date), active (first Statistics), resting (second Statistics).",
      "Tap Done. The first run asks for Health access — allow both.",
    ],
    syncPrivacy: "Your key is stored only as a fingerprint. Evolve never sees your Health data — only the two totals the Shortcut sends.",

    // Account
    accountSheet: "Account & settings", appearance: "Appearance", dark: "Dark", light: "Light", language: "Language",
    profile: "Profile", profileSub: "{sex} · {age} · {h} cm — used for your plan", profileEmpty: "Add sex, age and height", male: "Male", female: "Female",
    watchRow: "Apple Watch sync", watchOn: "On · last {date}", watchSet: "Set up — waiting for first send", watchOff: "Off", setUp: "Set up",
    invite: "Invite someone", inviteSub: "They get an email link to set a password", myData: "My data", myDataSub: "Private to you — nobody else can see it", private: "Private",
    signOut: "Sign out", version: "Evolve {v}",
    inviteTitle: "Invite someone", inviteEmail: "Their email", sendInvite: "Send invite", sending: "Sending…",
    inviteSent: "Invite sent to {email}.", inviteExists: "That email already has an account.", inviteOff: "Invites from the app aren't switched on yet. Meanwhile: Supabase → Authentication → Users → Invite user.",
    inviteNoAdmin: "Only the app owner can send invites.", badEmail: "That email doesn't look right.",
    profileTitle: "Your profile", age: "Age", height: "Height (cm)", activityQ: "Daily activity outside the gym", activityHint: "Only used when there's no Apple Watch data.",
    actSit: "Mostly sitting", actFeet: "On my feet", actJob: "Physical job", sexQ: "Sex", sexHint: "Changes your calorie burn and how fast muscle can grow.",

    // Body
    bodySub: "History and scans", bodyTitle: "Body", segWeight: "Weight", segInbody: "InBody", segMeasure: "Measure",
    currentWeight: "Current weight", trendLine: "Trend {r} kg / week", addWeigh: "+ Weigh-in", noWeights: "No weigh-ins yet", noWeightsText: "Weigh in a few times a week — Evolve reads the trend, not single days.",
    latestScan: "Latest InBody scan", addScan: "+ Add InBody scan", noScans: "No scans yet", noScansText: "An InBody every 2–4 weeks shows what's fat and what's muscle.",
    noMeasures: "No measurements yet", noMeasuresText: "Waist, chest, hips, arms and thighs — tape numbers often move before the scale.", addMeasure: "+ Add measurements",
    fromScan: "from scan", muscleShort: "muscle", fatShort: "fat",

    // Goal
    goalSub: "Targets, timeline and daily plan", goalTitle: "Goal", modeDate: "I pick the date", modeAuto: "Give me the date", yourTargets: "Your targets",
    tWeight: "Weight (kg)", tFat: "Body fat (%)", tMuscle: "Muscle Mass (kg)", tDate: "Target date", nowV: "Now {v}", saveGoal: "Save goal", goalSaved: "Goal saved",
    goalNeedOne: "Add at least one target.", goalNeedDate: "Pick a target date in the future.",
    fitTitle: "Your targets fit together.", fitText: "{w} kg at {f}% leaves {ffm} kg fat-free — about {m} kg Muscle Mass. Your {tm} kg matches.",
    misfitTitle: "These targets don't quite fit.", misfitText: "{w} kg at {f}% leaves about {m} kg of Muscle Mass, not {tm} kg. Change one of them:",
    useV: "Use {v}",
    realistic: "Is it realistic?", tagOk: "Realistic", tagWarn: "Ambitious", tagBad: "Unlikely", tagDone: "Reached",
    vLose: "{d} kg in {w} weeks ({p}% a week). The safe range is up to 1% a week.", vGain: "+{d} kg in {w} weeks ({p}% a week). Lean gain is up to 0.5% a week.",
    vFat: "−{kg} kg of fat in {w} weeks — needs a deficit of about {kcal} kcal a day.", vMuscle: "+{kg} kg in {w} weeks is {pm} kg a month. Typical for you: about {t} kg a month.",
    vDone: "Already there.", vNoDate: "Pick a date to check it.",
    suggestDate: "A realistic date for all three: {date}.", useDate: "Use {date}",
    earliest: "Earliest realistic date for all three", earliestNote: "Fat loss 0.5–1% of body weight a week; muscle grows slower while you're in a deficit.", useEarliest: "Use this date",
    planDaily: "Your daily plan", calories: "Calories", protein: "Protein", calMath: "Maintenance {m} {s} {d}", proMath: "{a}–{b} g range",
    basisFfm: "2.3–3.1 g per kg fat-free mass", basisBw: "1.6–2.2 g per kg body weight",
    from: "Maintenance from {list}. Rechecked every week against your real weight trend.", srcInbody: "your InBody", srcFormula: "your profile", srcWatch: "your Apple Watch average", srcAdaptive: "what you ate vs. your weight change",
    floorNote: "Kept at a safe minimum — going lower would cost muscle.",
    coach: "Coach",
    tip_onTrack: "You're on track. Keep calories and protein where they are.",
    tip_slower: "Losing slower than planned ({rate} kg a week). Eat about {kcal} kcal less a day.",
    tip_faster: "Losing faster than is safe for muscle. Add about {kcal} kcal a day.",
    tip_gainSlow: "Gaining slower than planned. Add about {kcal} kcal a day.",
    tip_gainFast: "Gaining faster than lean gain allows. Cut about {kcal} kcal a day.",
    tip_muscleDown: "Muscle Mass dropped {kg} kg since the scan before. Keep protein at {protein} g and keep the weights heavy.",
    tip_protein: "Protein averaged {avg} g this week — aim for {target} g.",
    tip_logFood: "Log calories and protein every day — the plan corrects itself from them.",
    tip_rescan: "Your last InBody was {days} days ago — re-scan this week.", tip_rescanNone: "No InBody yet — a scan shows what's fat and what's muscle.",
    planQ: "Want a training plan for this goal?", planQSub: "A few questions about you and your training. You review every exercise — and swap any — before it's final.",
    planYes: "Yes, build my plan", planNo: "No, I'll pick each day", planNoText: "OK — on Train you pick the muscles each day and get a suggested session.", planInstead: "Build a plan instead",
    planActiveTitle: "Your plan is active", planEdit: "Edit plan", planSummary: "{split} · {n} days a week · ~{m} min",

    // Train
    trainTitle: "Train", trainToday: "Today · {name}", trainPick: "Pick your session", restDay: "Rest day in your plan. Next: {name} on {day}.",
    pickInstead: "Pick muscles instead", usePlan: "Use today's plan", pickMuscles: "Pick today's muscles", pickHint: "Your session is built from your picks and your past sessions.",
    sessionTitle: "Your session", sessionMeta: "{n} exercises · ~{m} min", swap: "Swap", swappedTag: "Swapped",
    colSet: "Set", colPrev: "Last", colKg: "kg", colReps: "Reps", colEffort: "Effort", easy: "Easy", ok: "OK", hard: "Hard",
    effortHint: "After each set tap Easy · OK · Hard, then ✓.", swapNote: "Swap changes only that exercise, and only offers ones for the same muscle and movement.",
    finish: "Finish workout", finished: "Workout saved — {sets} sets in {min} min.", noSets: "Log at least one set first.", tapToLog: "Tap to log sets",
    lastTxt: "Last {sets}", firstTime: "First time", setsReps: "{s} × {lo}–{hi}", saveSet: "Save set", logged: "{n}/{t} sets",
    rec_up: "↑ Add weight", rec_same: "= Hold", rec_hold: "= Hold", rec_stall: "! Plateau", rec_down: "↓ Lighter", rec_fresh: "New", rec_reps: "↑ More reps",
    recT_up: "Every set hit {hi} → go to {w} kg.", recT_same: "Same {w} kg — aim for {r} reps.", recT_hold: "Same {w} kg — get every set to {lo}+.",
    recT_down: "Missed {lo} reps twice → drop to {w} kg and build back up.", recT_stall: "No progress in 3 sessions → aim for {r} reps, or swap.",
    recT_fresh: "Start with a weight you can do for {r} clean reps.", recT_reps: "Every set hit {hi} → add 2 reps or lower slower.",
    noMuscle: "Pick at least one muscle to build a session.", restartQ: "Start over", sessionDone: "Done today",

    // Swap
    swapSheet: "Swap exercise", swCurrent: "Current exercise", swExplain: "These train the same muscle with the same job. Pick the one that suits you.",
    swFiltered: "Exercises that need equipment you don't have, or load a sore spot, are already left out.", use: "Use",
    tagSame: "Same movement", tagAngle: "Different angle", tagOrig: "Original", swNone: "No other exercise for this muscle fits your equipment and joints.",

    // Planner
    plTitle: "Build my plan", plStep1: "Step 1 of 3 · About you", plStep2: "Step 2 of 3 · Your training", plStep3: "Step 3 of 3 · Review your week",
    pl1Intro: "So the plan fits your body. Weight and body fat come from your records.", pl2Intro: "So the plan fits your week, your gym and your body.",
    plBody: "Your body", plNext1: "Next", plNext2: "Build my plan", plNext3: "Approve plan",
    plFoot1: "Saved to your profile — asked once, editable any time.", plFoot2: "You can change any answer later.", plFoot3: "You can still swap any exercise later, from Train.",
    fromWeigh: "From weigh-in · {date}", fromInbody: "From InBody · {date}", noWeighYet: "No weigh-in yet", noScanYet: "No InBody yet",
    qExp: "Training experience", qExpHint: "Sets how much you start with and how fast you can expect to gain.", expNew: "Under 6 months", expMid: "6 months – 2 years", expAdv: "2+ years",
    qDays: "Which days do you train?", qDaysHint: "{n} days → {split} — each muscle twice a week.", qDaysMin: "Pick at least 2 days.",
    qMins: "Time per session", qMinsHint: "Sets and rest are fitted inside this time.",
    qWhere: "Where you train", qWhereHint: "Only exercises you can do there are used — swaps too.", whereGym: "Full gym", whereHome: "Home · dumbbells", whereBw: "Bodyweight only",
    qFocus: "Training style", qFocusHint: "Rep range for your main lifts.", focusMuscle: "Muscle · 8–12 reps", focusStrength: "Strength · 4–6 reps", focusMix: "Mix of both",
    qPain: "Pain or injury to protect", qPainHint: "Exercises that load it are left out — swaps skip them too.", painNone: "None", painShoulder: "Shoulder", painBack: "Lower back", painKnee: "Knee", painWrist: "Wrist",
    qCardio: "Cardio", qCardioHint: "Optional — counted in your daily burn.", cardioNone: "None", cardioC2: "2 × 20 min", cardioC3: "3 × 30 min",
    plSplitLabel: "Your split", plSplitWhy: "Each muscle twice a week, {a}–{b} hard sets — enough to keep and build muscle while you lose fat.",
    stDays: "days a week", stMins: "min a session", stSets: "sets per muscle a week", plFood: "Food: {k} kcal · {p} g protein a day",
    plSwapHint: "Swap only offers exercises for the same muscle and the same movement.", plReviewed: "Reviewed {k} of {n}",
    keep: "Suits me", kept: "✓ Suits me", approved: "Plan approved — it's on your Train page.", cardioNote: "+ cardio {c} a week",
  },

  ar: {
    langBtn: "EN", langAria: "التبديل إلى الإنجليزية", toLight: "التبديل للثيم الفاتح", toDark: "التبديل للثيم الداكن", accountAria: "الحساب والإعدادات",
    close: "إغلاق", back: "رجوع", save: "حفظ", saving: "يحفظ…", cancel: "إلغاء", del: "حذف", delQ: "تحذف؟", edit: "تعديل", next: "التالي", done: "تم",
    today: "اليوم", yesterday: "أمس", kg: "كجم", kcal: "سعرة", g: "غ", cm: "سم", min: "دقيقة", date: "التاريخ",
    offline: "ما فيه اتصال — نعرض آخر بيانات محفوظة.",
    setupMissing: "يحتاج إعداد مرة وحدة (دقيقة) — لين ذاك ما تنحفظ السعرات والبروتين والملف والخطط ومزامنة الساعة. الوزن والسكانات والهدف والتمارين شغّالة.",
    setupBtn: "جهّزه الحين", setupTitle: "إعداد مرة وحدة", setupText: "Evolve يحتاج أربع جداول صغيرة في قاعدة بياناتك للسعرات والبروتين والملف والخطط ومزامنة الساعة. بياناتك الحالية ما تتغير.",
    setupSteps: ["اضغط «انسخ الإعداد».", "اضغط «افتح Supabase» وسجّل دخول إذا طلب.", "اضغط مطولاً في المحرر ← لصق ← اضغط Run.", "ارجع هنا — Evolve يتأكد بنفسه."],
    copySetup: "انسخ الإعداد", setupCopied: "انتسخ — افتح Supabase الحين", openSupabase: "افتح Supabase", setupSafe: "آمن لو شغّلته أكثر من مرة. يضيف جداول Evolve بس، وما يحذف شي.",
    loadFailed: "بعض البيانات ما تحمّلت (اللي عندك باقي ظاهر): {msg}",
    saved: "انحفظ", deleted: "انحذف",

    tagline: "الوزن وInBody والتمرين والتغذية — خطة وحدة مبنية على هدفك.",
    email: "البريد الإلكتروني", password: "كلمة المرور", signIn: "تسجيل الدخول", signingIn: "يسجّل الدخول…", forgot: "نسيت كلمة المرور؟",
    forgotSent: "إذا البريد له حساب، رابط إعادة التعيين في الطريق.", enterEmailFirst: "اكتب بريدك فوق أول.",
    inviteOnly: "بالدعوة فقط — اطلب دعوة من صاحب التطبيق.",
    faceId: "الآيفون يحفظ كلمة المرور — والمرة الجاية Face ID يعبّيها لك.",
    badLogin: "البريد أو كلمة المرور غلط.", notConfirmed: "افتح إيميل الدعوة أول عشان تحط كلمة مرور.", tooMany: "محاولات كثيرة. انتظر دقيقة وجرّب.",
    showPw: "إظهار كلمة المرور", hidePw: "إخفاء كلمة المرور", noNet: "ما فيه اتصال. جرّب لما يرجع النت.",
    welcome: "أهلاً في Evolve", resetTitle: "كلمة مرور جديدة",
    setSub: "اختر كلمة مرور. الآيفون يقدر يحفظها ويعبّيها بـ Face ID المرة الجاية.",
    yourName: "اسمك", newPassword: "كلمة المرور الجديدة", pwHint: "8 أحرف على الأقل", pwShort: "استخدم 8 أحرف على الأقل.",
    setPwBtn: "احفظ وكمّل", linkExpired: "الرابط انتهى أو انستخدم قبل. اطلب دعوة جديدة، أو استخدم «نسيت كلمة المرور؟».",

    navHome: "الرئيسية", navTrain: "التمرين", navLog: "تسجيل", navBody: "الجسم", navGoal: "الهدف",

    morning: "صباح الخير، {name}", afternoon: "مساء الخير، {name}", evening: "مساء الخير، {name}", hello: "أهلاً",
    noGoalTitle: "حدد هدفك", noGoalText: "أهداف للوزن والدهون والكتلة العضلية — بعدها Evolve يحسب سعراتك وبروتينك وتمرينك.", setGoal: "حدد الهدف",
    daysLeft: "باقي {n} يوم", oneDayLeft: "باقي يوم", datePassed: "التاريخ فات", noDate: "بدون تاريخ",
    goalLose: "خسارة الدهون", goalGain: "بناء العضل", goalRecomp: "خسارة الدهون · مع الحفاظ على العضل", goalMaintain: "ثبات",
    timeWord: "الوقت", legendProgress: "التقدم نحو الهدف", legendTime: "الوقت المنقضي", noReading: "ما فيه قراءة",
    mWeight: "الوزن", mFat: "الدهون", mMuscle: "الكتلة العضلية",
    sumOk: "على المسار: {list}.", sumWarn: "متأخر قليلاً: {list}.", sumBad: "متأخر: {list}.", sumEarly: "بدري نحكم: {list}.", sumDone: "وصلت: {list}.", and: " و",
    etaAll: "بهذه السرعة توصل للأهداف الثلاثة تقريباً {date} — {when}.", etaLate: "بعد موعدك بـ {n} يوم", etaEarly: "قبل موعدك بـ {n} يوم", etaOnTime: "في موعدك بالضبط",
    etaUnknown: "كم وزن وسكان زيادة ويقدر Evolve يقول لك متى توصل.",
    fuelTitle: "وقود اليوم", synced: "مزامنة الساعة · {date}", notSynced: "الساعة ما تزامنت",
    calLabel: "السعرات", proLabel: "البروتين", left: "باقي {n} {u}", over: "زيادة {n} {u}", reachedFuel: "وصلت الهدف",
    burnYesterday: "الحرق أمس", burnToday: "الحرق اليوم", noBurn: "ما انسجل حرق للحين", addFuel: "+ أضف السعرات والبروتين",
    noTargets: "حدد هدف عشان تطلع لك أهداف يومية.", needProfile: "أضف جنسك وعمرك وطولك عشان Evolve يحسب سعراتك.", addProfile: "أضف ملفك",
    trends: "الاتجاهات", lastNDays: "آخر {n} يوم", changeIn: "{d} {u} في {n} يوم", eta: "متوقع {date}", etaReached: "وصلت", targetTxt: "الهدف {v}", noTrend: "القراءات للحين قليلة",

    logTitle: "تسجيل",
    tScan: "سكان InBody", tScanSub: "صورة أو PDF أو يدوي", tWeigh: "الوزن", tWeighSub: "وزن اليوم",
    tFuel: "السعرات والبروتين", tFuelSub: "مجموع اليوم فقط", tBurn: "حرق ساعة أبل", tBurnSub: "مزامنة تلقائية أو يدوي",
    tWorkout: "ابدأ التمرين", tWorkoutSub: "تمرين اليوم", tMeasure: "القياسات", tMeasureSub: "الخصر والصدر والذراع…",

    weighTitle: "الوزن", weightKg: "الوزن (كجم)", weighTip: "نفس الوقت كل يوم — بعد ما تصحى وقبل الأكل — يعطي أدق اتجاه.",
    measureTitle: "القياسات", waist: "الخصر", chest: "الصدر", hips: "الأرداف", arms: "الذراع", thighs: "الفخذ", measureTip: "بالسنتيمتر. المقاسات غالباً تتحرك قبل الميزان.",
    needValue: "عبّي قيمة وحدة على الأقل.",

    scanTitle: "سكان InBody", scanIntro: "صورة أو PDF لورقة النتائج. يقرأ الوزن والدهون والكتلة العضلية — وتراجعها قبل الحفظ.",
    takePhoto: "صوّر الورقة", chooseFile: "اختر ملف", typeIt: "أدخلها يدوياً", reading: "يقرأ الورقة…", readOk: "انقرأت من ورقتك — راجع الأرقام وبعدين احفظ.",
    scanDate: "تاريخ السكان", scanWeight: "الوزن (كجم)", scanFat: "نسبة الدهون (%)", scanMuscle: "الكتلة العضلية (كجم)", scanMuscleHint: "السطر المكتوب «Muscle Mass» — مو Skeletal Muscle Mass.",
    saveScan: "احفظ السكان", notReport: "هذي ما تبين ورقة InBody. جرّب صورة ثانية أو أدخلها يدوياً.",
    scanNeedWeight: "أضف الوزن بعد — الكتلة العضلية تنحفظ معه.", scanNeedOne: "أضف الوزن على الأقل.",
    scanErr401: "الجلسة انتهت. افتح التطبيق من جديد وجرّب.", scanErr413: "الملف كبير. استخدم صورة بدل PDF.", scanErr429: "سكانات كثيرة مرة وحدة. انتظر دقيقة.",
    scanErr5xx: "القارئ مشغول. جرّب بعد دقيقة.", scanErrKey: "قارئ السكان مو مجهّز (مفتاح Anthropic في Vercel).",

    fuelSheet: "السعرات والبروتين", fuelIntro: "المجموع فقط — بدون قائمة أكل. أضف اللي أكلته الحين، أو حط مجموع اليوم.",
    modeAdd: "أضف لليوم", modeSet: "حط المجموع", fieldKcal: "السعرات", fieldProtein: "البروتين (غ)",
    soFar: "لين الحين: {k} سعرة · {p} غ بروتين", targetsLine: "الهدف: {k} سعرة · {p} غ بروتين", forDay: "اليوم",

    burnSheet: "حرق ساعة أبل", autoOn: "المزامنة التلقائية شغّالة — آخر إرسال {date}.", autoWaiting: "المزامنة مجهّزة — ننتظر أول إرسال الليلة.",
    autoOff: "جهّزها مرة وحدة والآيفون يرسل حرق كل يوم بنفسه — مجاناً.", setupSync: "جهّز المزامنة التلقائية",
    manualBurn: "أو اكتب حرق اليوم (Active + Resting)", burnWhere: "الآيفون: Fitness ← Activity، أو Health ← تصفح ← النشاط ← Active Energy + Resting Energy.",
    syncTitle: "مزامنة ساعة أبل التلقائية", syncKey: "مفتاحك الشخصي", syncKeyNote: "يظهر مرة وحدة. يقدر يرسل حرقك بس — ولا شي ثاني. تقدر تسوي واحد جديد بأي وقت (والقديم يوقف).",
    makeKey: "سوّ مفتاحي", newKey: "سوّ مفتاح جديد", copy: "نسخ", copied: "انتسخ", syncUrl: "العنوان",
    syncSteps: [
      "تطبيق الاختصارات ← الأتمتة ← + ← وقت من اليوم ← 11:55 مساءً، يومياً ← تشغيل فوراً ← أتمتة فارغة جديدة.",
      "أضف «Find Health Samples»: النوع Active Energy، وتاريخ البدء اليوم (Today).",
      "أضف «Calculate Statistics»: المجموع (Sum).",
      "كرر الخطوتين مع Resting Energy.",
      "أضف «Format Date»: التاريخ الحالي، صيغة مخصصة yyyy-MM-dd.",
      "أضف «Get Contents of URL»: العنوان فوق، الطريقة POST، ونص الطلب JSON فيه key (مفتاحك)، و date (التاريخ المنسّق)، و active (الإحصائية الأولى)، و resting (الإحصائية الثانية).",
      "اضغط تم. أول تشغيل يطلب إذن Health — اسمح للاثنين.",
    ],
    syncPrivacy: "مفتاحك ينحفظ كبصمة بس. Evolve ما يشوف بيانات Health — بس الرقمين اللي يرسلها الاختصار.",

    accountSheet: "الحساب والإعدادات", appearance: "المظهر", dark: "داكن", light: "فاتح", language: "اللغة",
    profile: "ملفي", profileSub: "{sex} · {age} · {h} سم — تُستخدم لخطتك", profileEmpty: "أضف الجنس والعمر والطول", male: "ذكر", female: "أنثى",
    watchRow: "مزامنة ساعة أبل", watchOn: "شغّالة · آخر مزامنة {date}", watchSet: "مجهّزة — ننتظر أول إرسال", watchOff: "مطفية", setUp: "الإعداد",
    invite: "دعوة شخص", inviteSub: "يوصله رابط على بريده يحط فيه كلمة مرور", myData: "بياناتي", myDataSub: "خاصة فيك — ما أحد غيرك يشوفها", private: "خاصة",
    signOut: "تسجيل الخروج", version: "Evolve {v}",
    inviteTitle: "دعوة شخص", inviteEmail: "بريده", sendInvite: "أرسل الدعوة", sending: "يرسل…",
    inviteSent: "انرسلت الدعوة إلى {email}.", inviteExists: "هذا البريد له حساب من قبل.", inviteOff: "الدعوات من التطبيق مو مفعّلة للحين. مؤقتاً: Supabase ← Authentication ← Users ← Invite user.",
    inviteNoAdmin: "بس صاحب التطبيق يقدر يرسل دعوات.", badEmail: "البريد شكله غلط.",
    profileTitle: "ملفك", age: "العمر", height: "الطول (سم)", activityQ: "نشاطك اليومي خارج النادي", activityHint: "نستخدمه بس إذا ما فيه بيانات من ساعة أبل.",
    actSit: "أغلب يومي جالس", actFeet: "أتحرك كثير", actJob: "شغل بدني", sexQ: "الجنس", sexHint: "يغيّر حساب الحرق وسرعة بناء العضل.",

    bodySub: "السجل والسكانات", bodyTitle: "الجسم", segWeight: "الوزن", segInbody: "InBody", segMeasure: "القياسات",
    currentWeight: "الوزن الحالي", trendLine: "الاتجاه {r} كجم / أسبوع", addWeigh: "+ سجّل وزن", noWeights: "ما فيه أوزان للحين", noWeightsText: "توزن كم مرة بالأسبوع — Evolve يقرأ الاتجاه مو الأيام لحالها.",
    latestScan: "آخر سكان InBody", addScan: "+ أضف سكان InBody", noScans: "ما فيه سكانات للحين", noScansText: "سكان InBody كل 2–4 أسابيع يوضح وش دهون ووش عضل.",
    noMeasures: "ما فيه قياسات للحين", noMeasuresText: "الخصر والصدر والأرداف والذراع والفخذ — المقاسات غالباً تتحرك قبل الميزان.", addMeasure: "+ أضف قياسات",
    fromScan: "من السكان", muscleShort: "عضل", fatShort: "دهون",

    goalSub: "الأهداف والمدة والخطة اليومية", goalTitle: "الهدف", modeDate: "أنا أحدد التاريخ", modeAuto: "احسب لي التاريخ", yourTargets: "أهدافك",
    tWeight: "الوزن (كجم)", tFat: "نسبة الدهون (%)", tMuscle: "الكتلة العضلية (كجم)", tDate: "تاريخ الهدف", nowV: "الحين {v}", saveGoal: "احفظ الهدف", goalSaved: "انحفظ الهدف",
    goalNeedOne: "أضف هدف واحد على الأقل.", goalNeedDate: "اختر تاريخ هدف بالمستقبل.",
    fitTitle: "أهدافك متناسقة.", fitText: "{w} كجم بدهون {f}% يعني {ffm} كجم بدون دهون — تقريباً {m} كجم كتلة عضلية. هدفك {tm} كجم مناسب.",
    misfitTitle: "الأهداف هذي ما تركب مع بعض.", misfitText: "{w} كجم بدهون {f}% يعطيك تقريباً {m} كجم كتلة عضلية، مو {tm} كجم. غيّر وحدة منها:",
    useV: "استخدم {v}",
    realistic: "هل الهدف منطقي؟", tagOk: "منطقي", tagWarn: "طموح", tagBad: "غير واقعي", tagDone: "وصلت",
    vLose: "{d} كجم في {w} أسابيع ({p}% أسبوعياً). المدى الآمن حتى 1% أسبوعياً.", vGain: "+{d} كجم في {w} أسابيع ({p}% أسبوعياً). الزيادة النظيفة حتى 0.5% أسبوعياً.",
    vFat: "−{kg} كجم دهون في {w} أسابيع — يحتاج عجز تقريباً {kcal} سعرة يومياً.", vMuscle: "+{kg} كجم في {w} أسابيع يعني {pm} كجم بالشهر. المعتاد لك: تقريباً {t} كجم بالشهر.",
    vDone: "وصلت له.", vNoDate: "اختر تاريخ عشان نقيّمه.",
    suggestDate: "تاريخ منطقي للأهداف الثلاثة: {date}.", useDate: "استخدم {date}",
    earliest: "أقرب تاريخ منطقي للأهداف الثلاثة", earliestNote: "نزول الدهون 0.5–1% من وزنك أسبوعياً، وزيادة العضل أبطأ وأنت في عجز سعرات.", useEarliest: "استخدم هذا التاريخ",
    planDaily: "خطتك اليومية", calories: "السعرات", protein: "البروتين", calMath: "الثبات {m} {s} {d}", proMath: "المدى {a}–{b} غ",
    basisFfm: "2.3–3.1 غ لكل كجم بدون دهون", basisBw: "1.6–2.2 غ لكل كجم من وزنك",
    from: "سعرات الثبات من {list}. وتنعاد كل أسبوع حسب اتجاه وزنك الفعلي.", srcInbody: "سكان InBody", srcFormula: "ملفك", srcWatch: "متوسط ساعة أبل", srcAdaptive: "أكلك مقارنة بتغيّر وزنك",
    floorNote: "ثبّتناها على حد أدنى آمن — أقل من كذا يأكل من العضل.",
    coach: "المدرب",
    tip_onTrack: "أنت على المسار. خلّ السعرات والبروتين زي ما هي.",
    tip_slower: "تنزل أبطأ من الخطة ({rate} كجم بالأسبوع). قلّل تقريباً {kcal} سعرة يومياً.",
    tip_faster: "تنزل أسرع من الآمن للعضل. زد تقريباً {kcal} سعرة يومياً.",
    tip_gainSlow: "تزيد أبطأ من الخطة. زد تقريباً {kcal} سعرة يومياً.",
    tip_gainFast: "تزيد أسرع من الزيادة النظيفة. قلّل تقريباً {kcal} سعرة يومياً.",
    tip_muscleDown: "الكتلة العضلية نزلت {kg} كجم من السكان اللي قبل. ثبّت البروتين على {protein} غ وخلّ الأوزان ثقيلة.",
    tip_protein: "متوسط بروتينك هالأسبوع {avg} غ — استهدف {target} غ.",
    tip_logFood: "سجّل السعرات والبروتين كل يوم — الخطة تعدّل نفسها منها.",
    tip_rescan: "آخر سكان InBody قبل {days} يوم — سوّ سكان هالأسبوع.", tip_rescanNone: "ما فيه سكان InBody للحين — السكان يوضح وش دهون ووش عضل.",
    planQ: "تبي خطة تمارين توصلك لهدفك؟", planQSub: "كم سؤال عنك وعن تمرينك. تراجع كل تمرين — وتبدّل اللي تبيه — قبل ما تعتمدها.",
    planYes: "إيه، ابنِ لي خطة", planNo: "لا، أختار كل يوم بنفسي", planNoText: "تمام — في صفحة التمرين تختار عضلات اليوم ويقترح لك تمرين.", planInstead: "ابنِ لي خطة بدالها",
    planActiveTitle: "خطتك معتمدة", planEdit: "عدّل الخطة", planSummary: "{split} · {n} أيام بالأسبوع · ~{m} دقيقة",

    trainTitle: "التمرين", trainToday: "اليوم · {name}", trainPick: "اختر تمرينك", restDay: "اليوم راحة في خطتك. الجاي: {name} يوم {day}.",
    pickInstead: "اختر عضلات بدالها", usePlan: "استخدم خطة اليوم", pickMuscles: "اختر عضلات اليوم", pickHint: "التمرين مبني على اختيارك وتمارينك السابقة.",
    sessionTitle: "تمرينك", sessionMeta: "{n} تمارين · ~{m} دقيقة", swap: "بدّل", swappedTag: "تم التبديل",
    colSet: "مجموعة", colPrev: "السابق", colKg: "كجم", colReps: "تكرار", colEffort: "الصعوبة", easy: "سهل", ok: "مناسب", hard: "صعب",
    effortHint: "بعد كل مجموعة اضغط سهل · مناسب · صعب، وبعدها ✓.", swapNote: "التبديل يغيّر هذا التمرين بس، ويعرض لك تمارين لنفس العضلة ونفس الحركة.",
    finish: "إنهاء التمرين", finished: "انحفظ التمرين — {sets} مجموعات في {min} دقيقة.", noSets: "سجّل مجموعة وحدة على الأقل أول.", tapToLog: "اضغط عشان تسجّل",
    lastTxt: "السابق {sets}", firstTime: "أول مرة", setsReps: "{s} × {lo}–{hi}", saveSet: "احفظ المجموعة", logged: "{n}/{t} مجموعات",
    rec_up: "↑ زيادة", rec_same: "= ثبات", rec_hold: "= ثبات", rec_stall: "! ثبات طويل", rec_down: "↓ أخف", rec_fresh: "جديد", rec_reps: "↑ تكرار أكثر",
    recT_up: "وصلت {hi} في كل المجموعات ← ارفع لـ {w} كجم.", recT_same: "نفس {w} كجم — استهدف {r} تكرار.", recT_hold: "نفس {w} كجم — وصّل كل مجموعة لـ {lo} أو أكثر.",
    recT_down: "ما وصلت {lo} مرتين ← نزّل لـ {w} كجم وابنِ من جديد.", recT_stall: "ثابت 3 جلسات ← استهدف {r} تكرار أو بدّل التمرين.",
    recT_fresh: "ابدأ بوزن تقدر تسويه {r} تكرارات نظيفة.", recT_reps: "وصلت {hi} في كل المجموعات ← زد تكرارين أو نزّل أبطأ.",
    noMuscle: "اختر عضلة وحدة على الأقل عشان نبني التمرين.", restartQ: "ابدأ من جديد", sessionDone: "خلصت اليوم",

    swapSheet: "بدّل التمرين", swCurrent: "التمرين الحالي", swExplain: "هذي تشغّل نفس العضلة بنفس الحركة. اختر اللي يناسبك.",
    swFiltered: "التمارين اللي تحتاج جهاز مو عندك، أو تضغط على مكان يألمك، مستبعدة من الأساس.", use: "اختر",
    tagSame: "نفس الحركة", tagAngle: "زاوية مختلفة", tagOrig: "الأصلي", swNone: "ما فيه تمرين ثاني لهالعضلة يناسب أدواتك ومفاصلك.",

    plTitle: "ابنِ خطتي", plStep1: "الخطوة 1 من 3 · عنك", plStep2: "الخطوة 2 من 3 · تمرينك", plStep3: "الخطوة 3 من 3 · راجع أسبوعك",
    pl1Intro: "عشان الخطة تناسب جسمك. الوزن والدهون نأخذها من سجلك.", pl2Intro: "عشان الخطة تناسب وقتك وناديك وجسمك.",
    plBody: "جسمك", plNext1: "التالي", plNext2: "ابنِ الخطة", plNext3: "اعتمد الخطة",
    plFoot1: "تنحفظ في ملفك — نسألك مرة وحدة وتقدر تعدّلها.", plFoot2: "تقدر تغيّر أي إجابة بعدين.", plFoot3: "تقدر تبدّل أي تمرين بعدين من صفحة التمرين.",
    fromWeigh: "من آخر وزن · {date}", fromInbody: "من InBody · {date}", noWeighYet: "ما فيه وزن للحين", noScanYet: "ما فيه InBody للحين",
    qExp: "خبرتك في التمرين", qExpHint: "يحدد كمية التمرين في البداية وسرعة التقدم المتوقعة.", expNew: "أقل من 6 شهور", expMid: "6 شهور – سنتين", expAdv: "أكثر من سنتين",
    qDays: "أي أيام تتمرن؟", qDaysHint: "{n} أيام ← {split} — كل عضلة مرتين بالأسبوع.", qDaysMin: "اختر يومين على الأقل.",
    qMins: "مدة التمرين", qMinsHint: "نرتب المجموعات والراحة داخل هالوقت.",
    qWhere: "وين تتمرن", qWhereHint: "نستخدم بس التمارين المتوفرة عندك — وحتى البدائل.", whereGym: "نادي كامل", whereHome: "البيت · دمبل", whereBw: "وزن الجسم فقط",
    qFocus: "أسلوب التمرين", qFocusHint: "نطاق التكرار للتمارين الأساسية.", focusMuscle: "عضل · 8–12 تكرار", focusStrength: "قوة · 4–6 تكرار", focusMix: "مزيج",
    qPain: "ألم أو إصابة نحميها", qPainHint: "نشيل التمارين اللي تضغط عليها — وحتى البدائل تتجنبها.", painNone: "لا شيء", painShoulder: "الكتف", painBack: "أسفل الظهر", painKnee: "الركبة", painWrist: "الرسغ",
    qCardio: "الكارديو", qCardioHint: "اختياري — ينحسب ضمن حرقك اليومي.", cardioNone: "بدون", cardioC2: "2 × 20 دقيقة", cardioC3: "3 × 30 دقيقة",
    plSplitLabel: "تقسيمتك", plSplitWhy: "كل عضلة مرتين بالأسبوع بـ {a}–{b} مجموعة قوية — يكفي تحافظ على العضل وتبنيه وأنت تنزل دهون.",
    stDays: "أيام بالأسبوع", stMins: "دقيقة للتمرين", stSets: "مجموعة للعضلة أسبوعياً", plFood: "الأكل: {k} سعرة · {p} غ بروتين يومياً",
    plSwapHint: "التبديل يعرض لك بس تمارين لنفس العضلة ونفس الحركة.", plReviewed: "راجعت {k} من {n}",
    keep: "يناسبني", kept: "✓ يناسبني", approved: "اعتمدنا الخطة — تلقاها في صفحة التمرين.", cardioNote: "+ كارديو {c} بالأسبوع",
  },
};

export function makeT(lang) {
  const table = STR[lang] || STR.en;
  return (key, params) => {
    let s = table[key] ?? STR.en[key] ?? key;
    if (params && typeof s === "string") s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ""));
    return s;
  };
}

// Dates: Gregorian calendar and Western digits in both languages.
const LOCALE = { en: "en-GB", ar: "ar-u-nu-latn-ca-gregory" };
export function fmtDate(iso, lang = "en", style = "short") {
  if (!iso) return "—";
  const d = new Date(String(iso).slice(0, 10) + "T12:00:00");
  if (isNaN(d.getTime())) return "—";
  const opts = style === "long" ? { day: "numeric", month: "short", year: "numeric" }
    : style === "weekday" ? { weekday: "long", day: "numeric", month: "long" }
    : { day: "numeric", month: "short" };
  if (lang === "ar" && style !== "weekday") opts.month = "long";
  return new Intl.DateTimeFormat(LOCALE[lang] || LOCALE.en, opts).format(d);
}

export const fmtNum = (n, digits = 0) =>
  n == null || !isFinite(n) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const signed = (n, digits = 1) => (n == null ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtNum(Math.abs(n), digits)}`);

// Two names → "A and B"; three → "A, B and C".
export function joinList(items, t) {
  if (items.length <= 1) return items.join("");
  const comma = t("and") === " و" ? "، " : ", ";
  return items.slice(0, -1).join(comma) + t("and") + items[items.length - 1];
}
