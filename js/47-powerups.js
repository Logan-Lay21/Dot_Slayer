'use strict';
/* Power-ups */
/* ---------- power-ups (the big dots) ---------- */
function powerUp() {
  const k = ['HASTE', 'SHIELD', 'FRENZY', 'FREEZE', 'MEDKIT', 'AMMO CRATE'][Math.floor(Math.random() * 6)];
  if (k === 'HASTE') { pu.haste = 10; toast('HASTE. RUN FASTER, JUMP HIGHER', '#46e6ff'); }
  else if (k === 'SHIELD') { pu.shield = 8; invuln = Math.max(invuln, 8); toast('SHIELD. NOTHING CAN HURT YOU', '#7aa2ff'); }
  else if (k === 'FRENZY') { pu.frenzy = 8; toast('FRENZY. FREE AMMO, FAST FIRE', '#ff9a2e'); }
  else if (k === 'FREEZE') {
    pu.freeze = 6; toast('FREEZE. ZOMBIES STOP DEAD', '#9fe8ff');
    if (net.role === 'client') netSend({ t: 'frz' }); else freezeT = 6;
  }
  else if (k === 'MEDKIT') {
    hp = 100; if (lives < 3) { lives++; updateLives(); toast('MEDKIT. FULL HEALTH, +1 LIFE', '#5ef28a'); } else toast('MEDKIT. FULL HEALTH', '#5ef28a');
  }
  else { ammo = 99; toast('AMMO CRATE. FULL MAG', '#ffd84a'); }
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.05), i * 70));
}
function clearPowers() { for (const k in pu) pu[k] = 0; freezeT = 0; }
