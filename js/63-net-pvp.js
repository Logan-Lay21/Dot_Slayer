'use strict';
/* Player damage and death */
/* ---------- shooting each other: the victim owns their own health ---------- */
function hitPlayer(p, w, head) {
  el.cross.classList.add('hit'); setTimeout(() => el.cross.classList.remove('hit'), 90);
  const n = Math.round(w.pvp * (head ? 1.8 : 1));
  if (head) { el.cross.classList.add('head'); setTimeout(() => el.cross.classList.remove('head'), 160); tone(900, 0.07, 'square', 0.05); }
  p.hp = Math.max(0, p.hp - n);
  burst(p.x, 1.4, p.z, PCOLORS[p.id], 3, 3); tone(220, 0.05, 'square', 0.04);
  if (net.role === 'host') netToPeer(p.id, { t: 'dmg', n, by: 0 });
  else netSend({ t: 'pvp', to: p.id, n });
}
function takeDamage(n, by, z) {
  if (ghost || invuln > 0 || state !== 'play' || gameMode === 3) return;
  hp = Math.max(0, hp - n);
  el.hurt.classList.add('on'); setTimeout(() => el.hurt.classList.remove('on'), 120);
  tone(140, 0.12, 'sawtooth', 0.07, -60);
  if (by === -1) invuln = 1.2;
  if (hp <= 0) { if (net.role) die(by); else hurt(z); }
}
function die(by) {
  lives--; updateLives(); const lost = loseGun(); noise(0.25, 0.1); tone(110, 0.4, 'sawtooth', 0.12, -60);
  if (by >= 0) {
    const msg = 'YOU GOT P' + (net.myId + 1);
    if (net.role === 'host') netToPeer(by, { t: 'pts', n: 300, msg });
    else netSend({ t: 'killed', by });
  }
  if (lives <= 0) {
    ghost = true; hp = 0; toast('YOU ARE DOWN. TEAM FIGHTS ON', '#ff3b4e');
    if (net.role === 'host') hostCheckOver(); else netSend({ t: 'st', a: myP() });
    return;
  }
  placeSelf();
  toast((by >= 0 ? 'P' + (by + 1) + ' GOT YOU. ' : 'OUCH. ') + lives + (lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT') + (lost ? '. LOST THE ' + lost : ''), '#ff3b4e');
}
