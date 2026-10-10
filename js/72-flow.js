'use strict';
/* Game flow: levels, damage, pause */
/* ---------- flow ---------- */
function refreshDots() {
  dotList.forEach(d => { d.alive = true; if (d.big) d.mesh.visible = true; else placeDot(d); });
  dotMesh.instanceMatrix.needsUpdate = true; aliveDots = dotList.length;
}
function resetActors() {
  placeSelf();
  zombies.forEach((z, i) => placeZombie(z, i, [2.2, 3.6, 5.4, 7.2][i]));
  resetSpecials();
  scatter = true; modeT = 0;
}
function enterPlay() {
  el.panel.hidden = true; el.hud.hidden = false;
  if (isTouch) { el.touch.hidden = false; el.fire.hidden = false; el.jump.hidden = false; }
  state = 'play'; lastT = performance.now(); tryLock(); $('ver').classList.remove('home');
}
function newGame() {
  audioInit();
  score = 0; level = 1; lives = 3; ammo = 16; tier = 0; wIdx = 0; ghost = false;
  if (!net.role) { seed = (Math.random() * 1e9) | 0; playerCount = 1; }
  if (gameMode === 3) { tier = 3; wIdx = 3; ammo = 99; }
  clearPowers(); buildLevel(1); drawMapBase();
  buildGun(wIdx); refreshChips(); updateLives(); refreshDots(); resetActors();
  enterPlay(); toast(['EAT. SHOOT. SURVIVE.', 'FAST ZOMBS. RUN.', 'INSANE. GOOD LUCK.', 'DEV MODE. YOU CANNOT DIE.'][gameMode]);
}
function nextLevel() {
  level++; ammo = Math.min(99, ammo + 10);
  if (ghost) { ghost = false; lives = 1; updateLives(); }
  const up = tier < WEAPONS.length - 1;
  if (up) { tier++; selectWeapon(tier, true); }
  clearPowers(); buildLevel(level); drawMapBase();
  refreshDots(); resetActors();
  enterPlay(); toast('LEVEL ' + level + (up ? '. ' + WEAPONS[tier].name + ' UNLOCKED' : '. THEY ARE FASTER'), up ? '#' + WEAPONS[tier].color.toString(16).padStart(6, '0') : '#ff3b4e');
}
function releaseLock() { hadLock = false; if (document.exitPointerLock) { try { document.exitPointerLock(); } catch (e) {} } }
function levelClear() {
  const bonus = 1000 * level; score += bonus;
  if (net.role === 'host') netBroadcast({ t: 'clear', bonus });
  showClear(bonus);
}
function showClear(bonus) {
  state = 'clear'; releaseLock(); mouseFire = false; touchFire = false;
  tone(523, 0.15, 'square', 0.06); setTimeout(() => tone(784, 0.3, 'square', 0.06), 150);
  const leave = net.role ? '<button id="leavebtn" class="btn alt" type="button">LEAVE ROOM</button>' : '';
  const go = net.role === 'client' ? null : (net.role === 'host' ? mpNext : nextLevel);
  panel('Level ' + level + ' cleared', 'Every dot is gone. Bonus ' + bonus + ' points.' + (net.role === 'client' ? ' Waiting for the host.' : ''),
    '<div class="stats"><div><span class="lbl">Score</span><br><b>' + score + '</b></div><div><span class="lbl">Gun</span><br><b>' + WEAPONS[tier].name + '</b></div></div>' + leave, go ? 'NEXT LEVEL' : null, go);
}
function gameOver() {
  state = 'over'; releaseLock(); mouseFire = false; touchFire = false;
  if (score > best) { best = score; try { localStorage.setItem('dotslayer-best', String(best)); } catch (e) {} }
  panel('You got eaten', 'The zombies win this round.',
    '<div class="stats"><div><span class="lbl">Score</span><br><b>' + score + '</b></div><div><span class="lbl">Best</span><br><b>' + best + '</b></div><div><span class="lbl">Level</span><br><b>' + level + '</b></div></div>', 'TRY AGAIN', newGame);
}
function loseGun() {
  if (tier <= 0) return '';
  const n = WEAPONS[tier].name; tier--; if (wIdx > tier) wIdx = tier;
  buildGun(wIdx); refreshChips(); return n;
}
function hurt(z) {
  lives--; invuln = 3; updateLives(); const lost = loseGun();
  el.hurt.classList.add('on'); setTimeout(() => el.hurt.classList.remove('on'), 120);
  tone(110, 0.4, 'sawtooth', 0.12, -60); noise(0.2, 0.1);
  if (lives <= 0) {
    if (!net.role) { gameOver(); return; }
    ghost = true; toast('YOU ARE DOWN. TEAM FIGHTS ON', '#ff3b4e');
    if (net.role === 'host') hostCheckOver(); else netSend({ t: 'st', a: myP() });
    return;
  }
  if (net.role) placeSelf(); else resetActors();
  toast('BITTEN. ' + lives + (lives === 1 ? ' LIFE LEFT' : ' LIVES LEFT') + (lost ? '. LOST THE ' + lost : ''), '#ff3b4e');
}
const leaveHtml = () => net.role ? '<button id="leavebtn" class="btn alt" type="button">LEAVE ROOM</button>' : '';
function pause() {
  if (state !== 'play' || net.role === 'client') return;
  state = 'paused'; mouseFire = false; touchFire = false; jumpHeld = false;
  panel('Paused', net.role ? 'The whole room is paused.' : 'The zombies are waiting.', controlsHtml() + leaveHtml(), 'RESUME', resume);
  if (net.role === 'host') netBroadcast({ t: 'pause', on: 1 });
}
function resume() {
  audioInit(); el.panel.hidden = true; state = 'play'; lastT = performance.now(); tryLock();
  if (net.role === 'host') netBroadcast({ t: 'pause', on: 0 });
}
/* only the host can pause a room; everyone else follows */
function clientPause(on) {
  if (on && state === 'play') {
    state = 'paused'; mouseFire = false; touchFire = false; jumpHeld = false; releaseLock();
    panel('Paused by host', 'Waiting for the host to resume.', leaveHtml(), null, null);
  } else if (!on && state === 'paused') {
    el.panel.hidden = true; state = 'play'; lastT = performance.now(); tryLock();
    if (!isTouch) toast('CLICK TO AIM', '#46e6ff');
  }
}
