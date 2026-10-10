'use strict';
/* Startup and the secret dev unlock */
/* ---------- boot ---------- */
try { best = +localStorage.getItem('dotslayer-best') || 0; } catch (e) {}
window.addEventListener('touchstart', () => {}, { passive: true });
function devToggle() {
  devOn = !devOn;
  try { localStorage.setItem('dsDev', devOn ? '1' : '0'); } catch (e) { /* private mode */ }
  if (!devOn && gameMode === 3) { gameMode = 0; const fb = $('fastbtn'); if (fb) fb.textContent = modeLabel(); if (net.role === 'host') broadcastLobby(); }
  const n = $('note'); n.textContent = devOn ? 'DEV MODE UNLOCKED' : 'DEV MODE HIDDEN'; n.style.color = devOn ? '#46e6ff' : '#9aa0b8';
  n.classList.add('show'); clearTimeout(devToggle.t); devToggle.t = setTimeout(() => n.classList.remove('show'), 1800);
}
/* secret: click the D, then the T, then the O of the title */
let devSeq = 0, devSeqT = 0;
$('ptitle').addEventListener('click', e => {
  const ch = e.target && e.target.dataset ? e.target.dataset.ch : null;
  if (!ch) return;
  const now = performance.now();
  if (now - devSeqT > 5000) devSeq = 0;
  devSeqT = now;
  const want = 'DTO'[devSeq];
  if (ch === want) devSeq++; else devSeq = ch === 'D' ? 1 : 0;
  if (devSeq === 3) { devSeq = 0; devToggle(); }
});
$('ver').textContent = 'v' + VERSION; buildChips(); updateLives(); buildGun(0); refreshChips(); drawMapBase(); resetActors(); resize(); showTitle();
requestAnimationFrame(frame);
