'use strict';
/* Special zombie animation */
/* ---------- animation (host and clients) ---------- */
function animSpecial(s, dt) {
  if (s.kind === 'wall') animWall(s, dt); else if (s.kind === 'charger') animCharger(s, dt); else if (s.kind === 'stalker') animStalker(s, dt); else animAmbusher(s, dt);
  if (s.bar && s.bar.visible) s.bar.rotation.y = Math.atan2(px - s.x, pz - s.z) - s.rot;
}
function animWall(s, dt) {
  const m = s.mesh, t = s.anim * 1.7, fy = floorY(s.x, s.z), sw = Math.sin(t);
  m.position.set(s.x, fy + Math.abs(sw) * 0.12, s.z); m.rotation.set(0, s.rot, sw * 0.035);
  s.legs[0].rotation.x = sw * 0.45; s.legs[1].rotation.x = -sw * 0.45;
  s.arms[0].rotation.x = -sw * 0.3; s.arms[1].rotation.x = sw * 0.3;
  s.arms[0].rotation.z = 0.12; s.arms[1].rotation.z = -0.12;
  headLook(s, s.head, s.x, s.z, fy + 2.7, s.rot); s.head.rotation.z = Math.sin(t * 0.5) * 0.12;
  const step = Math.floor(t / Math.PI);
  if (step !== s.lastStep) {
    s.lastStep = step;
    if (dist2d(s.x, s.z, px, pz) < 24 && s.pause <= 0) { shakeAt(s.x, s.z, 0.12); tone(55, 0.14, 'square', volAt(s.x, s.z, 0.1), -20); }
  }
}
const clampS = k => Math.max(0, Math.min(1, k));
function animCharger(s, dt) {
  const m = s.mesh, t = s.stT, fy = floorY(s.x, s.z), L = s.legs, A = s.arms;
  m.position.set(s.x, fy, s.z); m.rotation.set(0, s.rot, 0);
  s.up.rotation.set(0, 0, 0); s.head.rotation.set(0, 0, 0); s.excl.visible = false; s.stars.visible = false; s.mouth.scale.y = 1; s.stars.position.set(0, 2.55, 0);
  L[0].rotation.set(0, 0, 0); L[1].rotation.set(0, 0, 0); A[0].rotation.set(0, 0, 0); A[1].rotation.set(0, 0, 0);
  s.bar.visible = s.hp < s.maxHp && s.st !== CH.DEAD && (stunned(s) || s.st === CH.RECOVER);
  switch (s.st) {
    case CH.WANDER: {
      const w = s.anim * 4.2;
      L[0].rotation.x = Math.sin(w) * 0.7; L[1].rotation.x = -Math.sin(w) * 0.7;
      A[0].rotation.x = -Math.sin(w) * 0.6; A[1].rotation.x = Math.sin(w) * 0.6;
      m.position.y += Math.abs(Math.sin(w)) * 0.08; s.up.rotation.x = -0.08; s.head.rotation.y = Math.sin(s.anim * 1.3) * 0.5;
      break;
    }
    case CH.YELL: {
      const k = clampS(t / 0.25);
      s.up.rotation.x = 0.3 * k; s.head.rotation.x = 0.8 * k; s.mouth.scale.y = 1 + 5 * k;
      A[0].rotation.z = -2.3 * k; A[1].rotation.z = 2.3 * k;
      m.position.x += Math.sin(t * 70) * 0.03 * k; m.position.y += Math.abs(Math.sin(t * 25)) * 0.05;
      s.excl.visible = true; s.excl.position.y = 3.0 + Math.sin(t * 14) * 0.08;
      break;
    }
    case CH.CHARGE: {
      const w = s.anim * 13;
      m.rotation.x = -0.25; s.up.rotation.x = -0.35;
      L[0].rotation.x = Math.sin(w) * 1.1; L[1].rotation.x = -Math.sin(w) * 1.1;
      A[0].rotation.x = 1.0 + Math.sin(w) * 0.7; A[1].rotation.x = 1.0 - Math.sin(w) * 0.7;
      m.position.y += Math.abs(Math.sin(w)) * 0.18;
      s.dustT -= dt;
      if (s.dustT <= 0) { s.dustT = 0.06; burst(s.x - s.cdir[0] * 0.8, fy + 0.15, s.z - s.cdir[1] * 0.8, 0xcbb892, 2, 2); }
      if (t < 0.4) s.excl.visible = true;
      break;
    }
    case CH.SPLAT: {
      m.position.y = fy + 0.55 * Math.pow(Math.max(0, 1 - t / 1.4), 2);
      m.rotation.x = -0.14 + Math.sin(t * 2) * 0.02; s.up.rotation.x = 0.05;
      A[0].rotation.set(0.5, 0, -2.25); A[1].rotation.set(0.5, 0, 2.25);
      L[0].rotation.z = -0.55; L[1].rotation.z = 0.55; L[0].rotation.x = 0.2; L[1].rotation.x = 0.2;
      s.head.rotation.x = 0.35; s.head.rotation.z = 0.3 + Math.sin(t * 3) * 0.06; s.mouth.scale.y = 3;
      s.stars.visible = true; s.stars.rotation.y = t * 5; s.stars.position.y = 2.55 + Math.sin(t * 6) * 0.06;
      if (t < 0.25) { m.position.x += Math.sin(t * 90) * 0.04; }
      if (t > 2.4) m.position.x += Math.sin(t * 60) * 0.025;
      break;
    }
    case CH.BOUNCE: {
      const k = clampS(t / 0.55);
      m.position.y = fy + Math.sin(k * Math.PI) * 1.3; m.rotation.x = 1.3 * k;
      A[0].rotation.set(0, 0, -2.5); A[1].rotation.set(0, 0, 2.5); L[0].rotation.x = -1.0; L[1].rotation.x = -0.8;
      s.head.rotation.x = 0.6; s.mouth.scale.y = 5;
      break;
    }
    case CH.DAZED: {
      m.rotation.x = 1.45; m.position.y = fy + 0.3;
      A[0].rotation.set(0, 0, -1.4 + Math.sin(t * 3) * 0.1); A[1].rotation.set(0, 0, 1.4 - Math.sin(t * 3) * 0.1);
      L[0].rotation.x = 0.2 + Math.sin(t * 4) * 0.15; L[1].rotation.x = -0.1 - Math.sin(t * 4) * 0.15; L[0].rotation.z = -0.3; L[1].rotation.z = 0.3;
      s.head.rotation.z = Math.sin(t * 3) * 0.25;
      s.stars.visible = true; s.stars.rotation.y = t * 5; s.stars.position.set(0, 1.1, -1.6);
      break;
    }
    case CH.RECOVER: {
      const k = clampS(t / 0.9);
      if (s.prev === CH.DAZED) m.rotation.x = 1.45 * (1 - k), m.position.y = fy + 0.3 * (1 - k);
      A[0].rotation.set(0.5 * (1 - k), 0, -2.25 * (1 - k)); A[1].rotation.set(0.5 * (1 - k), 0, 2.25 * (1 - k));
      L[0].rotation.z = -0.55 * (1 - k); L[1].rotation.z = 0.55 * (1 - k);
      s.up.rotation.x = 0.2 * (1 - k); s.head.rotation.y = Math.sin(t * 10) * 0.6 * (1 - k); s.head.rotation.x = 0.3 * (1 - k);
      if (s.prev !== CH.DAZED) m.rotation.x = -0.1 * (1 - k);
      break;
    }
    default: { /* dead: topples backwards off the wall */
      const k = clampS(t / 0.7), fall = k * k;
      m.rotation.x = fall * Math.PI / 2;
      m.position.x -= (-Math.sin(s.rot)) * 0.8 * fall; m.position.z -= (-Math.cos(s.rot)) * 0.8 * fall;
      m.position.y = fy + 0.3 * fall - Math.max(0, t - 1.8) * 1.4;
      A[0].rotation.set(0, 0, -2.0 + k * 1.2); A[1].rotation.set(0, 0, 2.0 - k * 1.2);
      L[0].rotation.z = -0.4; L[1].rotation.z = 0.4; s.head.visible = true;
      s.stars.visible = t < 2; s.stars.rotation.y = t * 5;
      if (t > 2.6) m.visible = false;
    }
  }
}
function animStalker(s, dt) {
  const m = s.mesh, t = s.stT, L = s.legs, A = s.arms, fy = floorY(s.x, s.z);
  m.visible = s.st === SK.STALK || (s.st === SK.DEAD && t < 1.8);
  if (!m.visible) return;
  m.rotation.set(0, s.rot, 0); s.up.rotation.set(0, 0, 0); s.head.rotation.set(0, 0, 0);
  s.bar.visible = s.hp < s.maxHp && s.st === SK.STALK && t > 1.2;
  if (s.st === SK.DEAD) {
    const k = clampS(t / 0.5);
    m.position.set(s.x, fy - Math.max(0, t - 1.2) * 1.5, s.z); m.rotation.x = -1.45 * k;
    L[0].rotation.x = 0.3; L[1].rotation.x = -0.2; A[0].rotation.x = 2.4; A[1].rotation.x = 2.0;
    return;
  }
  if (t < 1.2) {
    const k = t / 1.2, e = k * k * (3 - 2 * k);
    m.position.set(s.x, fy - 3.0 * (1 - e), s.z);
    A[0].rotation.x = 3.0 - 1.2 * e; A[1].rotation.x = 3.0 - 1.2 * e;
    s.dustT -= dt; if (s.dustT <= 0) { s.dustT = 0.12; burst(s.x + (Math.random() - 0.5), fy + 0.1, s.z + (Math.random() - 0.5), 0x6b5a3a, 3, 3); }
    return;
  }
  const w = s.anim * 10, sw = Math.sin(w);
  m.position.set(s.x, fy + Math.abs(sw) * 0.05, s.z);
  m.rotation.x = -0.28; s.up.rotation.x = -0.12;
  L[0].rotation.x = sw * 0.8; L[1].rotation.x = -sw * 0.8;
  A[0].rotation.x = -sw * 0.25 + 0.15; A[1].rotation.x = sw * 0.25 + 0.15; A[0].rotation.z = 0.08; A[1].rotation.z = -0.08;
  let nd = 1e9, nx = px, nz = pz;
  eachPlayerAny(p => { const d = dist2d(p.x, p.z, s.x, s.z); if (d < nd) { nd = d; nx = p.x; nz = p.z; } });
  const bear = Math.atan2(-(nx - s.x), -(nz - s.z)) - s.rot; s.head.rotation.y = Math.max(-1.2, Math.min(1.2, Math.atan2(Math.sin(bear), Math.cos(bear)))); s.head.rotation.x = 0.2;
  const sidx = Math.floor(w / Math.PI);
  if (sidx !== s.lastStep) {
    s.lastStep = sidx;
    const d = dist2d(s.x, s.z, px, pz);
    if (d < 34 && d > 0.5) footstep(0.012 + 0.07 * (1 - d / 34), 0.78);
  }
}
function animAmbusher(s, dt) {
  const m = s.mesh, t = s.stT, L = s.legs, A = s.arms;
  m.position.set(s.x, s.y, s.z); m.rotation.set(0, s.rot, 0); m.scale.setScalar(0.8);
  s.up.rotation.set(0, 0, 0); s.head.rotation.set(0, 0, 0);
  s.bar.visible = s.hp < s.maxHp && s.st !== AM.DEAD;
  /* perched ones hide in the dark above the wall line: you only see them when you look up */
  m.visible = s.st === AM.PERCH ? pitch > 0.18 : (s.st !== AM.DEAD || t <= 1.95);
  const blink = Math.sin(s.anim * 1.7) > 0.97 ? 0.1 : 1;
  s.eyes.forEach(e => { e.scale.y = blink; });
  switch (s.st) {
    case AM.PERCH: {
      s.up.rotation.x = -0.75 + Math.sin(s.anim * 3) * 0.03; L[0].rotation.x = 1.1; L[1].rotation.x = 1.1;
      A[0].rotation.x = 1.15 + Math.sin(s.anim * 7) * 0.05; A[1].rotation.x = 1.15 - Math.sin(s.anim * 7) * 0.05;
      m.position.y -= 0.06;
      let nd = 1e9, nx = px, nz = pz;
      eachPlayerAny(p => { const d = dist2d(p.x, p.z, s.x, s.z); if (d < nd) { nd = d; nx = p.x; nz = p.z; } });
      if (nd < 22) { const bear = Math.atan2(-(nx - s.x), -(nz - s.z)) - s.rot; s.head.rotation.y = Math.max(-1.3, Math.min(1.3, Math.atan2(Math.sin(bear), Math.cos(bear)))); s.head.rotation.x = -0.3; }
      break;
    }
    case AM.LEAP: case AM.RETURN:
      m.rotation.x = s.st === AM.LEAP ? -0.7 : 0.5; A[0].rotation.x = 2.6; A[1].rotation.x = 2.6; L[0].rotation.x = -0.7; L[1].rotation.x = -0.7;
      s.head.rotation.x = -0.3;
      break;
    case AM.GROUND: {
      s.up.rotation.x = -0.55; L[0].rotation.x = 1.0; L[1].rotation.x = 1.0;
      A[0].rotation.x = 1.4 + Math.sin(s.anim * 20) * 0.9; A[1].rotation.x = 1.4 - Math.sin(s.anim * 20) * 0.9;
      m.position.x += Math.sin(s.anim * 40) * 0.02; s.head.rotation.x = -0.2;
      break;
    }
    default: {
      const k = clampS(t / 0.4);
      m.rotation.x = -1.4 * k; m.position.y = s.y + 0.1 * (1 - k);
      m.scale.setScalar(0.8 * (1 - clampS((t - 1.3) / 0.6)));
      A[0].rotation.x = 2.2; A[1].rotation.x = 2.2;
      if (t > 1.95) m.visible = false;
    }
  }
}
function eachPlayerAny(fn) {
  fn({ x: px, z: pz });
  for (const id in net.players) { const p = net.players[id]; if (p.seen && p.a) fn({ x: p.x, z: p.z }); }
}
