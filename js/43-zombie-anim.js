'use strict';
/* Zombie animation: crawl, head look, limbs, death */
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
/* Falling, lying still twitching, then crawling: jerky, head always turned to stare at you. */
function animCrawl(z) {
  const m = z.mesh, t = z.anim * 3, fall = z.mode === 'fall';
  const k = fall ? Math.min(1, z.modeT / 0.4) : 1, prone = k * k * (3 - 2 * k);
  const still = fall && z.modeT > 0.4;
  const spasm = Math.sin(t * 13) * Math.sin(t * 4.1) > 0.82 ? 1 : 0;
  m.rotation.x = -1.45 * prone; m.rotation.z = 0;
  const L = 1.1 * prone;
  m.position.x += Math.sin(m.rotation.y) * L; m.position.z += Math.cos(m.rotation.y) * L; m.position.y += 0.2 * prone;
  for (let i = 0; i < 2; i++) {
    z.legs[i].visible = !z.lost[i]; z.legStumps[i].visible = z.lost[i];
    if (!z.lost[i]) z.legs[i].rotation.x = 0.25 + Math.sin(t * 0.9 + i * 2.4) * 0.18 + spasm * 0.5;
    z.arms[i].visible = !z.lost[2 + i]; z.armStumps[i].visible = z.lost[2 + i];
  }
  const bear = Math.atan2(-(px - z.x), -(pz - z.z)), turn = Math.max(-1.5, Math.min(1.5, wrapA(bear - m.rotation.y)));
  z.head.rotation.y += (turn - z.head.rotation.y) * (still ? 0.04 : 0.15);
  z.head.rotation.x = 1.3 * prone + (still ? 0.15 * Math.sin(t * 1.3) : 0) - spasm * 0.3;
  z.head.rotation.z = 0.35 * Math.sin(t * 0.7) + spasm * 0.5 * Math.sin(t * 60);
  const w = Math.sin(t * 1.5), jerk = Math.sign(w) * Math.pow(Math.abs(w), 0.35);
  if (!fall || !still) {
    const flail = fall ? 2.4 + Math.sin(t * 9) * 0.5 : Math.PI - 0.3 + 0.75 * jerk;
    const flail2 = fall ? 2.4 - Math.sin(t * 9) * 0.5 : Math.PI - 0.3 - 0.75 * jerk;
    z.arms[0].rotation.x = flail; z.arms[1].rotation.x = flail2;
  } else {
    z.arms[0].rotation.x = Math.PI - 0.1 + spasm * 0.6 * Math.sin(t * 50); z.arms[1].rotation.x = Math.PI - 0.1 - spasm * 0.6 * Math.sin(t * 47);
  }
  z.arms[0].rotation.z = -0.35; z.arms[1].rotation.z = 0.35;
  if (!still) m.position.y += Math.abs(Math.sin(t * 1.5)) * 0.07;
  else { m.position.x += Math.sin(t * 23) * 0.012 * spasm; m.position.z += Math.cos(t * 19) * 0.012 * spasm; }
}
/* heads track the nearest player they can see: turns to face you (within what a neck can do) and tilts up or down to your eyes */
function headLook(o, head, bx, bz, by, rot) {
  let best = null, bd = 30;
  eachPlayerAny(p => {
    const d = Math.hypot(p.x - bx, p.z - bz);
    if (d >= bd || d < 0.3) return;
    for (let t = 1; t < d; t += 1) if (wallAt(bx + (p.x - bx) * t / d, bz + (p.z - bz) * t / d)) return;
    bd = d; best = p;
  });
  let ty = 0, tx = 0;
  if (best) {
    let rel = Math.atan2(-(best.x - bx), -(best.z - bz)) - rot; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    if (Math.abs(rel) < 2.4) {
      ty = Math.max(-1.15, Math.min(1.15, rel));
      tx = Math.max(-0.3, Math.min(0.35, Math.atan2(py + EYE - by, bd)));
    }
  }
  o.lkY = (o.lkY || 0) + (ty - (o.lkY || 0)) * 0.14; o.lkX = (o.lkX || 0) + (tx - (o.lkX || 0)) * 0.14;
  head.rotation.order = 'YXZ';
  head.rotation.set(o.lkX, o.lkY, 0);
}
function animLimbs(z, amp) {
  if (z.mode !== 'walk') { animCrawl(z); return; }
  const t = z.anim * 3, sw = Math.sin(t) * 0.75 * amp, m = z.mesh;
  for (let i = 0; i < 2; i++) { z.legs[i].visible = !z.lost[i]; z.legStumps[i].visible = z.lost[i]; z.arms[i].visible = !z.lost[2 + i]; z.armStumps[i].visible = z.lost[2 + i]; }
  z.legs[0].rotation.x = sw; z.legs[1].rotation.x = -sw;
  const near = amp > 0.5 && z.state !== 'dead' && Math.hypot(z.x - px, z.z - pz) < 6;
  const reach = near ? 1.4 + Math.sin(t * 0.7) * 0.08 : Math.PI / 2 - 0.1;
  const flail = (near ? 0.14 : 0.1) + 0.22 * amp * (near ? 0 : 1);
  z.arms[0].rotation.x = reach + Math.sin(t + 1) * flail;
  z.arms[1].rotation.x = reach - Math.sin(t + 1) * flail;
  z.arms[0].rotation.z = 0.12 + Math.sin(t * 0.5) * 0.06 * amp; z.arms[1].rotation.z = -z.arms[0].rotation.z;
  m.rotation.x = -(amp * 0.07 + (near ? 0.14 : 0)); m.rotation.z = Math.sin(t * 0.5) * 0.06 * amp;
  if (z.state === 'dead') z.head.rotation.set(0, 0, 0); else headLook(z, z.head, z.x, z.z, floorY(z.x, z.z) + 2.0, z.rot);
  m.position.y += Math.abs(Math.sin(t)) * 0.1 * amp;
}
const clamp01 = k => Math.max(0, Math.min(1, k));
/* Each zombie dies its own way. Runs identically on the host and on every client (driven by deadT). */
function animDeath(z) {
  const m = z.mesh, t = z.deadT;
  z.bar.visible = false;
  if (z.mode !== 'walk') {
    m.rotation.x = -1.45; m.position.y = -Math.max(0, t - 0.9) * 1.2;
    if (t > 1.6) m.visible = false;
    return;
  }
  if (!m.visible) return;
  const fy = floorY(z.x, z.z), fx = -Math.sin(z.rot), fz = -Math.cos(z.rot);
  m.position.set(z.x, fy, z.z); m.rotation.set(0, z.rot, 0);
  const A = z.arms, L = z.legs;
  for (let i = 0; i < 2; i++) { L[i].visible = !z.lost[i]; z.legStumps[i].visible = z.lost[i]; A[i].visible = !z.lost[2 + i]; z.armStumps[i].visible = z.lost[2 + i]; }
  const sink = Math.max(0, t - 1.75) * 1.4;
  if (z.i === 0) { /* ROTTER: flings arms up, staggers back, topples and kicks */
    if (!z.dfx) { z.dfx = true; tone(140, 0.4, 'sawtooth', 0.06, -90); }
    const k1 = clamp01(t / 0.3), k2 = clamp01((t - 0.3) / 0.5), fall = k2 * k2;
    const bounce = Math.sin(clamp01((t - 0.8) / 0.3) * Math.PI) * 0.12;
    const back = 0.5 * k1 + 0.9 * (1 - (1 - k2) * (1 - k2));
    m.position.x -= fx * back; m.position.z -= fz * back;
    m.rotation.x = 0.35 * k1 + 1.22 * fall - bounce;
    m.position.y = fy + 0.22 * k2 - sink;
    const after = Math.max(0, 1 - (t - 0.8) / 0.9) * (t > 0.8 ? 1 : 0);
    A[0].rotation.x = 1.4 + 1.9 * k1 + Math.sin(t * 30) * 0.3 * after; A[1].rotation.x = 1.4 + 1.9 * k1 - Math.sin(t * 27) * 0.3 * after;
    L[0].rotation.x = -0.6 * k1 + Math.sin(t * 18) * 0.5 * after; L[1].rotation.x = 0.4 * k1 - Math.sin(t * 16) * 0.5 * after;
    z.head.rotation.x = -0.5 * k1; z.head.rotation.z = Math.sin(t * 9) * 0.3 * after;
  } else if (z.i === 1) { /* GNASH: head pops off, the body stumbles on a few steps then drops */
    const hp = floorY(z.x, z.z) + 2.0;
    if (!z.dfx) {
      z.dfx = true; z.head.visible = false; z.neckStump.visible = true;
      spawnChunk(z.x + fx * 0.2, hp, z.z + fz * 0.2, headGeo, gibMats[1], 6, 6);
      burst(z.x, hp, z.z, 0xb01020, 24, 7); burst(z.x, hp, z.z, 0x7a0714, 12, 4);
      noise(0.2, 0.1); tone(700, 0.12, 'square', 0.05, -500);
    }
    const sp = Math.floor(t * 14);
    if (t < 1.3 && sp !== z.lastSp) { z.lastSp = sp; burst(z.x, hp - 0.1, z.z, 0xb01020, 3, 3); }
    const walk = clamp01(t / 0.9), dist = 1.4 * (1 - (1 - walk) * (1 - walk)), col = clamp01((t - 0.9) / 0.6);
    m.position.x += fx * dist; m.position.z += fz * dist;
    m.rotation.x = t < 0.9 ? -0.05 : -(Math.PI / 2 - 0.05) * col * col;
    m.position.y = fy + 0.22 * col - sink + (t < 0.9 ? Math.abs(Math.sin(t * 14)) * 0.08 : 0);
    const fl = t < 0.9 ? 1 : Math.max(0, 1 - (t - 0.9) / 0.4);
    A[0].rotation.x = 1.4 + Math.sin(t * 22) * 0.8 * fl; A[1].rotation.x = 1.4 - Math.sin(t * 20) * 0.8 * fl;
    A[0].rotation.z = 0.4 + Math.sin(t * 17) * 0.4 * fl; A[1].rotation.z = -0.4 - Math.sin(t * 15) * 0.4 * fl;
    const lg = t < 0.9 ? 0.7 : 0.25 * (1 - col);
    L[0].rotation.x = Math.sin(t * 14) * lg; L[1].rotation.x = -Math.sin(t * 14) * lg;
    if (t > 1.5) { const tw = Math.sin(t * 40) * Math.sin(t * 5.3) > 0.85 ? 1 : 0; L[0].rotation.x += tw * 0.4; A[0].rotation.x += tw * 0.5; }
  } else if (z.i === 2) { /* MOLD: melts into a puddle */
    if (!z.dfx) { z.dfx = true; noise(0.5, 0.05); tone(150, 0.6, 'sine', 0.06, -90); }
    const k = clamp01(t / 1.3), e = k * (2 - k), wob = Math.sin(t * 20) * 0.06 * (1 - e);
    m.scale.set(1 + 0.9 * e + wob, 1 - 0.9 * e, 1 + 0.9 * e - wob);
    A[0].rotation.x = 1.4 * (1 - e); A[1].rotation.x = 1.4 * (1 - e);
    A[0].rotation.z = 0.12 + 0.9 * e; A[1].rotation.z = -0.12 - 0.9 * e;
    L[0].rotation.x = 0; L[1].rotation.x = 0;
    z.head.rotation.x = 0.5 * e; z.head.rotation.z = Math.sin(t * 7) * 0.2 * (1 - e);
    m.position.y = fy - sink * 0.3;
    const sp = Math.floor(t * 8);
    if (t < 1.8 && sp !== z.lastSp) { z.lastSp = sp; burst(z.x + (Math.random() - 0.5) * 1.2, fy + 0.3, z.z + (Math.random() - 0.5) * 1.2, z.def.color, 3, 2); }
    if (t > 1.7) { const f = clamp01((t - 1.7) / 0.6); m.scale.set(1.9 * (1 - f * 0.3), 0.1 * (1 - f), 1.9 * (1 - f * 0.3)); }
  } else { /* LIMP: shakes, flashes white, then bursts into pieces */
    if (!z.dfx) { z.dfx = true; setFlash(z, true); tone(900, 0.25, 'square', 0.05, -300); }
    if (t < 0.28) {
      m.position.x += Math.sin(t * 120) * 0.07; m.position.z += Math.cos(t * 110) * 0.07; m.position.y = fy + Math.sin(t * 90) * 0.04;
      A[0].rotation.x = A[1].rotation.x = 2.8; L[0].rotation.x = 0.3; L[1].rotation.x = -0.3;
    } else if (!z.shat) {
      z.shat = true; m.visible = false;
      const cm = gibMatFor(z.def.color), sm = gibMats[1], dm = gibMats[0];
      for (let i = 0; i < 12; i++) spawnChunk(z.x + (Math.random() - 0.5) * 0.6, fy + 0.4 + Math.random() * 1.6, z.z + (Math.random() - 0.5) * 0.6, chunkGeo, i % 3 === 0 ? sm : (i % 3 === 1 ? cm : dm), 9, 4);
      spawnChunk(z.x, fy + 1.8, z.z, headGeo, sm, 7, 6);
      burst(z.x, fy + 1.2, z.z, z.def.color, 26, 8); burst(z.x, fy + 1.2, z.z, 0xffffff, 10, 6);
      noise(0.25, 0.12); tone(1200, 0.18, 'square', 0.06, -900);
    }
  }
  if (t > 2.3) m.visible = false;
}
