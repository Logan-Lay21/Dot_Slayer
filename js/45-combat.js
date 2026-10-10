'use strict';
/* Aiming, hit detection, firing */
/* ---------- shooting ---------- */
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _m = new THREE.Vector3();
function aimDir(out, sx, sy) {
  const y = yaw + sx, p = pitch + sy, cp = Math.cos(p);
  return out.set(-Math.sin(y) * cp, Math.sin(p), -Math.cos(y) * cp);
}
function wallDist(o, d, max) {
  for (let t = 0.4; t < max; t += 0.4) {
    const y = o.y + d.y * t;
    if (y < 0 || y > CEIL_H) return t;
    if (y < WALL_H && wallAt(o.x + d.x * t, o.z + d.z * t)) return t;
  }
  return max;
}
function hitZombie(z, w, zone, side) {
  el.cross.classList.add('hit'); setTimeout(() => el.cross.classList.remove('hit'), 90);
  if (zone === 'head') { el.cross.classList.add('head'); setTimeout(() => el.cross.classList.remove('head'), 160); tone(900, 0.07, 'square', 0.05); }
  if (net.role === 'client') {
    netSend({ t: 'hit', zi: z.i, dmg: w.dmg, stun: w.stun, zone, side });
    z.flashT = 0.1; setFlash(z, true); burst(z.x, 1.4, z.z, z.def.color, 3, 3); tone(180, 0.06, 'square', 0.04);
    return;
  }
  applyHit(z, w.dmg, w.stun, net.myId, zone, side);
}
/* head shots hit 2.5x. Legs and arms have 2 hit points of their own; when one is gone the limb comes off. */
function applyHit(z, dmg, stun, by, zone, side) {
  if (z.state !== 'active' && z.state !== 'leaving') return;
  let d = dmg;
  if (zone === 'head') d = dmg * 2.5;
  else if (zone === 'leg' || zone === 'arm') {
    d = dmg * 0.5;
    const idx = (zone === 'leg' ? 0 : 2) + (side ? 1 : 0);
    if (!z.lost[idx]) { z.limbHp[idx] -= dmg; if (z.limbHp[idx] <= 0) sever(z, idx); }
  }
  z.hp -= d; z.flashT = 0.1; setFlash(z, true);
  z.slow = Math.max(z.slow, stun);
  z.fill.scale.x = Math.max(0.001, z.hp / z.maxHp);
  burst(z.x, 1.4, z.z, z.def.color, 3, 3);
  if (z.hp <= 0) killZombie(z, by); else if (by === net.myId) tone(180, 0.06, 'square', 0.04);
}
function killZombie(z, by) {
  z.state = 'dead'; z.deadT = 0; z.respawn = 6; z.bar.visible = false;
  const pts = 200 * level;
  if (by === net.myId) score += pts; else netToPeer(by, { t: 'pts', n: pts });
  burst(z.x, 1.3, z.z, z.def.color, 10, 6); burst(z.x, 1.3, z.z, 0x8fae86, 8, 5);
  tone(260, 0.3, 'sawtooth', 0.07, -200); noise(0.18, 0.08);
}
/* the ray from _o along _d against an upright cylinder; returns where it passes and how high up the body */
function rayCyl(cx, cz, base, height, hr, reach) {
  const hd = _d.x * _d.x + _d.z * _d.z; if (hd < 1e-8) return null;
  const t = ((cx - _o.x) * _d.x + (cz - _o.z) * _d.z) / hd;
  if (t < 0 || t > reach) return null;
  const hx = _o.x + _d.x * t, hz = _o.z + _d.z * t, rel = _o.y + _d.y * t - base;
  if (Math.hypot(hx - cx, hz - cz) > hr || rel < -0.1 || rel > height) return null;
  return { t, rel, hx, hz };
}
function zombieHit(z, reach, radius) {
  const fy = floorY(z.x, z.z);
  if (z.mode === 'walk') {
    const h = rayCyl(z.x, z.z, fy, 2.6, radius - 0.1, reach); if (!h) return null;
    const lat = (h.hx - z.x) * Math.cos(z.rot) - (h.hz - z.z) * Math.sin(z.rot), side = lat > 0 ? 1 : 0;
    if (h.rel > 1.85) return { t: h.t, zone: 'head', side: 0 };
    if (h.rel < 1.15) return { t: h.t, zone: 'leg', side };
    if (Math.abs(lat) > 0.5) return { t: h.t, zone: 'arm', side };
    return { t: h.t, zone: 'body', side: 0 };
  }
  /* lying down: a low sphere, the head end is the front */
  _e.set(z.x - _o.x, fy + 0.55 - _o.y, z.z - _o.z);
  const t = _e.dot(_d); if (t < 0 || t > reach) return null;
  const ex = _e.x - _d.x * t, ey = _e.y - _d.y * t, ez = _e.z - _d.z * t;
  if (Math.sqrt(ex * ex + ey * ey + ez * ez) > radius + 0.15) return null;
  const hx = _o.x + _d.x * t - z.x, hz = _o.z + _d.z * t - z.z;
  const fo = hx * -Math.sin(z.rot) + hz * -Math.cos(z.rot), lat = hx * Math.cos(z.rot) - hz * Math.sin(z.rot);
  if (fo > 0.6) return { t, zone: 'head', side: 0 };
  if (Math.abs(lat) > 0.55) return { t, zone: 'arm', side: lat > 0 ? 1 : 0 };
  return { t, zone: 'body', side: 0 };
}
function fire() {
  const w = WEAPONS[wIdx];
  if (fireCd > 0 || state !== 'play' || ghost) return;
  const free = pu.frenzy > 0 || gameMode === 3;
  if (!free && ammo < w.cost) {
    fireCd = 0.3; tone(120, 0.08, 'square', 0.05);
    if (ammo <= 0) toast('OUT OF AMMO. EAT DOTS!', '#ff3b4e');
    return;
  }
  if (!free) ammo -= w.cost;
  fireCd = free ? w.cd * 0.45 : w.cd; kick = 1; flashT = 0.06;
  _o.set(px, EYE + py, pz);
  _m.set(px + Math.cos(yaw) * 0.3 - Math.sin(yaw) * 0.8, EYE + py - 0.25, pz - Math.sin(yaw) * 0.3 - Math.cos(yaw) * 0.8);
  const radius = 0.9 + (isTouch ? 0.35 : 0.15);
  for (let k = 0; k < w.pellets; k++) {
    aimDir(_d, (Math.random() - 0.5) * 2 * w.spread, (Math.random() - 0.5) * 2 * w.spread);
    let reach = wallDist(_o, _d, 60); const hits = [];
    for (const s of specials) {
      const h = specialRay(s, reach, radius);
      if (h) { hits.push({ s, t: h.t, zone: h.zone }); if (s.kind === 'wall') reach = Math.min(reach, h.t); }
    }
    for (const z of zombies) {
      if (z.state !== 'active' && z.state !== 'leaving') continue;
      const h = zombieHit(z, reach, radius);
      if (h) hits.push({ z, t: h.t, zone: h.zone, side: h.side });
    }
    if (net.role && net.pvp) {
      for (const id in net.players) {
        const p = net.players[id];
        if (!p.seen || !p.a) continue;
        const h = rayCyl(p.x, p.z, p.py || 0, 2.5, radius - 0.1, reach);
        if (h) hits.push({ p, t: h.t, head: h.rel > 1.85 });
      }
    }
    hits.sort((a, b) => a.t - b.t);
    const list = w.pierce ? hits : hits.slice(0, 1);
    let end = reach;
    if (!w.pierce && list.length) end = list[0].t;
    list.forEach(h => (h.p ? hitPlayer(h.p, w, h.head) : h.s ? hitSpecial(h.s, w, h.zone, h.t) : hitZombie(h.z, w, h.zone, h.side)));
    _e.copy(_o).addScaledVector(_d, end);
    tracer(_m, _e, w.color, w.pierce ? 0.12 : 0.035);
    netFx(_m, _e, w.color, w.pierce ? 0.12 : 0.035);
  }
  if (wIdx === 3) { tone(900, 0.25, 'sawtooth', 0.06, -700); noise(0.12, 0.08); }
  else if (wIdx === 2) { noise(0.2, 0.16); tone(140, 0.15, 'square', 0.07, -60); }
  else { noise(0.07, 0.09); tone(520 - wIdx * 80, 0.07, 'square', 0.04, -300); }
}
