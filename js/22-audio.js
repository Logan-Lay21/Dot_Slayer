'use strict';
/* Procedural sound */
/* ---------- audio ---------- */
let actx = null, muted = false, wakaFlip = false;
function audioInit() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') { try { actx.resume(); } catch (e) {} }
}
function tone(f, d, type, v, slide) {
  if (muted || !actx) return;
  try {
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(v || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
function noise(d, v) {
  if (muted || !actx) return;
  try {
    const n = Math.floor(actx.sampleRate * d), b = actx.createBuffer(1, n, actx.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = actx.createBufferSource(), g = actx.createGain();
    s.buffer = b; g.gain.value = v || 0.1; s.connect(g); g.connect(actx.destination); s.start();
  } catch (e) {}
}
