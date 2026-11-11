// EVOLVE — the rest timer's beep. Browsers only allow sound after a tap, so the
// ✓ tap "primes" audio; the beep is then scheduled for the exact end time.
let ctx = null;
let nodes = [];

export function primeSound() {
  try {
    // Play even with the ring switch on silent (Safari 16.4+).
    if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback";
  } catch { /* not supported */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume();
  } catch { ctx = null; }
}

export function cancelBeep() {
  nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
  nodes = [];
}

// Three short beeps (the last one higher) at a wall-clock time.
export function scheduleBeep(atMs) {
  cancelBeep();
  if (!ctx) return;
  const start = ctx.currentTime + Math.max(0, (atMs - Date.now()) / 1000);
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
}

export function buzz() { try { navigator.vibrate?.([120, 80, 120]); } catch { /* iPhone: no vibration from web apps */ } }
