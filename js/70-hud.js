'use strict';
/* HUD and minimap */
/* ---------- HUD ---------- */
const el = {
  score: $('score'), level: $('level'), left: $('left'), ammo: $('ammo'), lives: $('lives'), fill: $('barfill'),
  guns: $('guns'), hurt: $('hurt'), cross: $('cross'), hud: $('hud'), panel: $('panel'), touch: $('touch'),
  fire: $('fire'), stick: $('stick'), knob: $('knob'), snd: $('snd'), toast: $('toast'),
  hpwrap: $('hpwrap'), hpfill: $('hpfill'), hptext: $('hptext'), pu: $('pu'), jump: $('jump'), spwrap: $('spwrap'), spfill: $('spfill')
};
const hudCache = {};
function setText(k, v) { if (hudCache[k] !== v) { hudCache[k] = v; el[k].textContent = v; } }
function updateHud() {
  setText('score', String(score).padStart(6, '0'));
  setText('level', String(level));
  setText('left', aliveDots + ' DOTS LEFT');
  setText('ammo', String(ammo));
  el.ammo.classList.toggle('low', ammo <= 5);
  el.fill.style.width = ((1 - aliveDots / dotList.length) * 100).toFixed(1) + '%';
  setText('pu', Object.keys(pu).filter(k => pu[k] > 0).map(k => k.toUpperCase() + ' ' + Math.ceil(pu[k])).join('   '));
  el.spfill.style.width = stam.toFixed(0) + '%'; el.spwrap.classList.toggle('lock', stamLock);
  el.hpwrap.hidden = false;
  {
    const f = Math.max(0, hp) / 100;
    el.hpfill.style.width = (f * 100).toFixed(0) + '%';
    el.hpfill.style.backgroundColor = 'hsl(' + Math.round(f * 120) + ',75%,50%)';
    setText('hptext', ghost ? 'DOWN' : String(Math.max(0, Math.ceil(hp))));
  }
}
function updateLives() {
  el.lives.innerHTML = '';
  for (let i = 0; i < 3; i++) { const p = document.createElement('i'); p.className = 'pip' + (i < lives ? '' : ' off'); el.lives.appendChild(p); }
}
function buildChips() {
  el.guns.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gun'; b.innerHTML = '<b>' + (i + 1) + '</b>' + w.short;
    b.addEventListener('click', () => selectWeapon(i));
    el.guns.appendChild(b);
  });
}
function refreshChips() {
  [...el.guns.children].forEach((b, i) => { b.classList.toggle('on', i === wIdx); b.classList.toggle('locked', i > tier); });
}
function selectWeapon(i, silent) {
  if (i > tier || i < 0) return;
  wIdx = i; buildGun(i); refreshChips(); fireCd = Math.max(fireCd, 0.15); swapT = 0.25;
  if (!silent) tone(300, 0.05, 'square', 0.03);
}
function toast(t, color) {
  el.toast.textContent = t; el.toast.style.color = color || '#ffd84a';
  el.toast.classList.remove('show'); void el.toast.offsetWidth; el.toast.classList.add('show');
}

/* minimap */
const mapC = $('map'), mg = mapC.getContext('2d'), MAPW = 152;
let MS = MAPW / COLS, MK = MS / 6;
const mapBase = document.createElement('canvas');
function drawMapBase() {
  MS = MAPW / COLS; MK = MS / 6;
  mapC.width = mapBase.width = MAPW; mapC.height = mapBase.height = Math.round(ROWS * MS);
  const g = mapBase.getContext('2d');
  g.fillStyle = '#080b24'; g.fillRect(0, 0, mapBase.width, mapBase.height);
  g.fillStyle = curPal.line;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (walls[r][c]) g.fillRect(Math.floor(c * MS), Math.floor(r * MS), Math.ceil(MS), Math.ceil(MS));
  g.fillStyle = '#46e6ff';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (hgt[r][c]) g.fillRect(c * MS, r * MS + MK, MS, MS - 2 * MK);
}
function drawMap() {
  mg.drawImage(mapBase, 0, 0);
  mg.fillStyle = '#ff3b4e';
  for (const p of pits) mg.fillRect(p.c * MS + MK, p.r * MS + MK, MS - 2 * MK, MS - 2 * MK);
  mg.fillStyle = '#ffd84a';
  for (const d of dotList) if (d.alive) { if (d.big) mg.fillRect(d.c * MS + MK, d.r * MS + MK, 4 * MK, 4 * MK); else mg.fillRect(d.c * MS + 2 * MK, d.r * MS + 2 * MK, Math.max(1, 2 * MK), Math.max(1, 2 * MK)); }
  for (const z of zombies) {
    if (z.state === 'dead') continue;
    mg.fillStyle = z.def.css; mg.beginPath(); mg.arc(z.x / CS * MS, z.z / CS * MS, 2.6 * MK + 0.4, 0, 6.283); mg.fill();
  }
  for (const s of specials) {
    if (s.kind === 'ambusher' || isDead(s)) continue;
    if (s.kind === 'wall') { mg.fillStyle = '#9aa0b8'; mg.fillRect(s.x / CS * MS - MS * 0.45, s.z / CS * MS - MS * 0.45, MS * 0.9, MS * 0.9); }
    else { mg.fillStyle = '#2f6bff'; mg.beginPath(); mg.arc(s.x / CS * MS, s.z / CS * MS, 3.4 * MK + 0.4, 0, 6.283); mg.fill(); mg.strokeStyle = '#fff'; mg.lineWidth = 1; mg.stroke(); }
  }
  for (const id in net.players) {
    const p = net.players[id]; if (!p.seen || !p.a) continue;
    mg.save(); mg.translate(p.x / CS * MS, p.z / CS * MS); mg.rotate(-(p.yaw || 0)); const q2 = 0.8 + 0.8 * MK;
    mg.fillStyle = PCSS[p.id]; mg.beginPath(); mg.moveTo(0, -4.5 * q2); mg.lineTo(3.4 * q2, 3.4 * q2); mg.lineTo(-3.4 * q2, 3.4 * q2); mg.closePath(); mg.fill();
    mg.strokeStyle = '#05060f'; mg.lineWidth = 1; mg.stroke(); mg.restore();
  }
  mg.save(); mg.translate(px / CS * MS, pz / CS * MS); mg.rotate(-yaw);
  mg.fillStyle = net.role ? PCSS[net.myId] : '#ffffff'; mg.strokeStyle = '#ffffff'; mg.lineWidth = 1.5; mg.beginPath(); const q = 0.8 + 0.2 * MK * 4; mg.moveTo(0, -4.5 * q); mg.lineTo(3.4 * q, 3.4 * q); mg.lineTo(-3.4 * q, 3.4 * q); mg.closePath(); mg.fill(); mg.stroke();
  mg.restore();
}
