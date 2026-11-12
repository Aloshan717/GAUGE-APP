// EVOLVE — the rest timer's beep. Browsers only allow sound after a tap, so the
// ✓ tap "primes" audio; the beep is then scheduled for the exact end time.
//
// The beep mixes with whatever you are listening to (an "ambient" audio
// session): it never pauses your music, podcast or video. A "playback" session
// would stop them, every time the app came back to the front. Between rests
// the app's audio is switched off again, so opening it never touches your sound.
let ctx = null;
let nodes = [];
let idle = null;

function mixWithOthers() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== "ambient") navigator.audioSession.type = "ambient";
  } catch { /* not supported (Safari before 16.4, other browsers) */ }
}

export function primeSound() {
  mixWithOthers();
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume();
  } catch { ctx = null; }
}

function stopNodes() {
  nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
  nodes = [];
}

// Switch the app's audio off while no beep is waiting.
function release() {
  clearTimeout(idle);
  idle = null;
  try { if (ctx && ctx.state === "running") ctx.suspend(); } catch { /* ignore */ }
}

export function cancelBeep() {
  stopNodes();
  release();
}

// Three short beeps (the last one higher) at a wall-clock time.
export function scheduleBeep(atMs) {
  stopNodes();
  clearTimeout(idle);
  if (!ctx) return;
  mixWithOthers();
  try { if (ctx.state === "suspended") ctx.resume(); } catch { /* needs a tap — primeSound gets one */ }
  const wait = Math.max(0, (atMs - Date.now()) / 1000);
  const start = ctx.currentTime + wait;
  [0, 0.28, 0.56].forEach((d, i) => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, start + d);
      g.gain.exponentialRampToValueAtTime(0.4, start + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + d + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(start + d);
      o.stop(start + d + 0.22);
      nodes.push(o);
    } catch { /* audio unavailable */ }
  });
  // Let go of the audio just after the beep.
  idle = setTimeout(release, wait * 1000 + 1500);
}

export function buzz() { try { navigator.vibrate?.([120, 80, 120]); } catch { /* iPhone: no vibration from web apps */ } }
