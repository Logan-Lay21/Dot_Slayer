'use strict';
/* Special zombie hit detection and damage */
/* ---------- hits ---------- */
const _bo = new THREE.Vector3();
function rayBoxT(minx, miny, minz, maxx, maxy, maxz, reach) {
  let t0 = 0, t1 = reach;
  const o = [_o.x, _o.y, _o.z], d = [_d.x, _d.y, _d.z], lo = [minx, miny, minz], hi = [maxx, maxy, maxz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) { if (o[i] < lo[i] || o[i] > hi[i]) return null; continue; }
    let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i]; if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a; if (b < t1) t1 = b; if (t0 > t1) return null;
  }
  return t0;
}
/* returns {t, zone} if the shot in _o/_d hits this special */
function specialRay(s, reach, radius) {
  if (isDead(s)) return null;
  if (s.kind === 'wall') {
    const fy = floorY(s.x, s.z), t = rayBoxT(s.x - 1.8, fy, s.z - 1.8, s.x + 1.8, fy + WALL_BH, s.z + 1.8, reach);
    return t == null ? null : { t, zone: 'body' };
  }
  if (s.kind === 'charger') {
    if (s.st === CH.DAZED) { const hd = rayCyl(s.x, s.z, floorY(s.x, s.z), 1.2, 1.5, reach); return hd ? { t: hd.t, zone: hd.rel > 0.9 ? 'head' : 'body' } : null; }
    const h = rayCyl(s.x, s.z, floorY(s.x, s.z), 3.2, radius + 0.25, reach); if (!h) return null;
    return { t: h.t, zone: h.rel > 2.3 ? 'head' : 'body' };
  }
  if (s.kind === 'stalker') {
    if (s.st !== SK.STALK || s.stT < 1.2) return null;
    const h = rayCyl(s.x, s.z, floorY(s.x, s.z), 2.6, radius, reach); if (!h) return null;
    return { t: h.t, zone: h.rel > 1.9 ? 'head' : 'body' };
  }
  const h = rayCyl(s.x, s.z, s.y, 1.5, 0.8, reach); if (!h) return null;
  return { t: h.t, zone: h.rel > 0.95 ? 'head' : 'body' };
}
function hitSpecial(s, w, zone, tHit) {
  el.cross.classList.add('hit'); setTimeout(() => el.cross.classList.remove('hit'), 90);
  const px2 = _o.x + _d.x * tHit, py2 = _o.y + _d.y * tHit, pz2 = _o.z + _d.z * tHit;
  const vulnerable = s.kind === 'ambusher' || s.kind === 'stalker' || (s.kind === 'charger' && stunned(s));
  if (!vulnerable) { burst(px2, py2, pz2, 0xdfe6ff, 4, 4); tone(s.kind === 'wall' ? 110 : 1500, 0.05, s.kind === 'wall' ? 'square' : 'triangle', 0.04); return; }
  if (zone === 'head') { el.cross.classList.add('head'); setTimeout(() => el.cross.classList.remove('head'), 160); tone(900, 0.07, 'square', 0.05); }
  if (net.role === 'client') {
    netSend({ t: 'shs', si: s.id, dmg: w.dmg, zone });
    s.flashT = 0.1; flashSpecial(s, true); burst(px2, py2, pz2, 0xb01020, 4, 4); tone(180, 0.06, 'square', 0.04);
    return;
  }
  applySpecialHit(s, w.dmg, net.myId, zone);
}
function applySpecialHit(s, dmg, by, zone) {
  if (isDead(s)) return;
  if (s.kind === 'wall') return;
  if (s.kind === 'charger' && !stunned(s)) return;
  if (s.kind === 'stalker' && (s.st !== SK.STALK || s.stT < 1.2)) return;
  const d = zone === 'head' ? dmg * 2.5 : dmg;
  s.hp -= d; s.flashT = 0.1; flashSpecial(s, true);
  s.fill.scale.x = Math.max(0.001, s.hp / s.maxHp);
  burst(s.x, (s.kind === 'ambusher' ? s.y : floorY(s.x, s.z)) + 1.2, s.z, 0xb01020, 4, 3);
  if (s.hp <= 0) killSpecial(s, by); else if (by === net.myId) tone(180, 0.06, 'square', 0.04);
}
function killSpecial(s, by) {
  setSpState(s, s.kind === 'charger' ? CH.DEAD : s.kind === 'stalker' ? SK.DEAD : AM.DEAD);
  if (s.bar) s.bar.visible = false;
  const pts = (s.kind === 'charger' ? 600 : s.kind === 'stalker' ? 500 : 250) * level;
  if (by === net.myId) { score += pts; toast('+' + pts + ' ' + SP_NAMES[s.kind], '#ffd84a'); } else if (by >= 0) netToPeer(by, { t: 'pts', n: pts });
}

/* sounds, shakes and bursts that every peer plays when a special changes state */
function specFx(s, old, st) {
  const fy = floorY(s.x, s.z);
  if (s.kind === 'charger') {
    if (st === CH.YELL) {
      tone(80, 1.1, 'sawtooth', volAt(s.x, s.z, 0.14), 140); noise(0.7, volAt(s.x, s.z, 0.1)); shakeAt(s.x, s.z, 0.06);
      if (dist2d(s.x, s.z, px, pz) < 36) toast('THE CHARGER SAW SOMEONE. RUN!', '#ff3b4e');
    } else if (st === CH.CHARGE) tone(55, 1.4, 'sawtooth', volAt(s.x, s.z, 0.12), 30);
    else if (st === CH.SPLAT) {
      shakeAt(s.x, s.z, 0.5); noise(0.4, volAt(s.x, s.z, 0.2)); tone(70, 0.35, 'square', volAt(s.x, s.z, 0.16), -40);
      burst(s.x + s.cdir[0], fy + 1.6, s.z + s.cdir[1], 0xdfe6ff, 16, 6);
      if (dist2d(s.x, s.z, px, pz) < 40) toast('HE IS STUNNED. SHOOT HIM!', '#46e6ff');
    } else if (st === CH.BOUNCE) {
      shakeAt(s.x, s.z, 0.55); noise(0.45, volAt(s.x, s.z, 0.22)); tone(60, 0.4, 'square', volAt(s.x, s.z, 0.18), -30);
      burst(s.x + s.cdir[0] * 1.6, fy + 1.2, s.z + s.cdir[1] * 1.6, 0xdfe6ff, 22, 7);
      if (dist2d(s.x, s.z, px, pz) < 40) toast('THE CHARGER BOUNCED OFF THE WALL. SHOOT HIM!', '#46e6ff');
    } else if (st === CH.DEAD) {
      noise(0.4, volAt(s.x, s.z, 0.14)); burst(s.x, fy + 1.5, s.z, 0x2f6bff, 20, 7); burst(s.x, fy + 1.5, s.z, 0x8fae86, 10, 5);
      spawnChunk(s.x, fy + 3.0, s.z, headGeo, gibMatFor(0xffc21a), 7, 6);
    }
  } else if (s.kind === 'stalker') {
    if (st === SK.STALK) { tone(60, 0.9, 'sawtooth', volAt(s.x, s.z, 0.06), -20); burst(s.x, fy + 0.2, s.z, 0x6b5a3a, 10, 4); }
    else if (st === SK.DEAD) { burst(s.x, fy + 1.2, s.z, 0x7a0714, 14, 5); noise(0.2, volAt(s.x, s.z, 0.1)); }
  } else if (s.kind === 'ambusher') {
    if (st === AM.LEAP) { tone(1400, 0.3, 'sawtooth', volAt(s.x, s.z, 0.09), -950); noise(0.15, volAt(s.x, s.z, 0.08)); }
    else if (st === AM.GROUND) { shakeAt(s.x, s.z, 0.14); burst(s.x, s.y + 0.2, s.z, 0x3a2a4a, 8, 4); tone(120, 0.12, 'square', volAt(s.x, s.z, 0.1), -50); }
    else if (st === AM.DEAD) { burst(s.x, s.y + 0.6, s.z, 0x7a0714, 14, 5); burst(s.x, s.y + 0.6, s.z, 0x3a2a4a, 8, 4); noise(0.2, volAt(s.x, s.z, 0.1)); tone(300, 0.2, 'sawtooth', volAt(s.x, s.z, 0.07), -220); }
  }
}
