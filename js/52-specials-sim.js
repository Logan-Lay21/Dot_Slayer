'use strict';
/* Special zombie simulation (host) */
/* ---------- host simulation ---------- */
function eachPlayer(fn) {
  if (!ghost) fn({ x: px, z: pz, py: py, self: true, id: net.myId, a: true });
  if (net.role === 'host') for (const id in net.players) { const p = net.players[id]; if (p.a && p.seen) fn({ x: p.x, z: p.z, py: p.py || 0, self: false, id: +id, p: p, a: true }); }
}
function pickChase(s) { const T = nearestTarget(s); s.tc = Math.floor(T.x / CS); s.tr = Math.floor(T.z / CS); chooseNext(s); }
function pickWander(s) {
  const opts = [];
  for (const d of DIRS) {
    if (!(s.dir[0] === 0 && s.dir[1] === 0) && d[0] === -s.dir[0] && d[1] === -s.dir[1]) continue;
    if (blockedFor(s, s.c + d[0], s.r + d[1])) continue;
    const straight = d[0] === s.dir[0] && d[1] === s.dir[1];
    for (let k = 0; k < (straight ? 3 : 1); k++) opts.push(d);
  }
  const best = opts.length ? opts[Math.floor(Math.random() * opts.length)] : [-s.dir[0], -s.dir[1]];
  s.dir = best; s.nc = s.c + best[0]; s.nr = s.r + best[1];
}
function gridMove(s, dt, speed, pick) {
  let step = speed * dt, guard = 0;
  while (step > 0 && guard++ < 4) {
    const tx = (s.nc + 0.5) * CS, tz = (s.nr + 0.5) * CS, dx = tx - s.x, dz = tz - s.z, d = Math.hypot(dx, dz);
    if (d <= step) { s.x = tx; s.z = tz; step -= d; s.c = s.nc; s.r = s.nr; pick(s); }
    else { s.x += dx / d * step; s.z += dz / d * step; step = 0; }
  }
  if (s.dir[0] || s.dir[1]) {
    let diff = Math.atan2(-s.dir[0], -s.dir[1]) - s.rot; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    s.rot += diff * Math.min(1, dt * 8);
  }
}
function setSpState(s, st) {
  const old = s.st; s.prev = old; s.st = st; s.stT = 0;
  specFx(s, old, st);
}
function chargerSees(s) {
  if (!s.dir[0] && !s.dir[1]) return null;
  let found = null;
  eachPlayer(p => {
    if (found) return;
    const dx = p.x - s.x, dz = p.z - s.z, along = dx * s.dir[0] + dz * s.dir[1], lat = Math.abs(dx * s.dir[1] - dz * s.dir[0]);
    if (along < 1.5 || along > 40 || lat > 1.7) return;
    for (let t = 1; t < along; t += 1.0) if (wallAt(s.x + s.dir[0] * t, s.z + s.dir[1] * t)) return;
    found = p;
  });
  return found;
}
function wallHit(s, r) { for (const w of specials) { if (w.kind !== 'wall') continue; const h = wallHalf(w); if (Math.abs(s.x - w.x) < h[0] + 0.8 && Math.abs(s.z - w.z) < h[1] + 0.8) return w; } return null; }
function simCharger(s, dt) {
  const mult = [1, 1.15, 1.3, 1][gameMode];
  s.stT += dt; s.anim += dt;
  switch (s.st) {
    case CH.WANDER: {
      s.bumpCd = Math.max(0, (s.bumpCd || 0) - dt);
      if (s.bumpCd <= 0 && wallHit(s, 2.6)) { /* never walk through the Wall: turn back */
        let t = s.c; s.c = s.nc; s.nc = t; t = s.r; s.r = s.nr; s.nr = t; s.dir = [-s.dir[0], -s.dir[1]]; s.bumpCd = 1.2;
      }
      gridMove(s, dt, 2.6 * mult, pickWander);
      if (chargerSees(s)) { s.cdir = [s.dir[0], s.dir[1]]; s.rot = Math.atan2(-s.cdir[0], -s.cdir[1]); setSpState(s, CH.YELL); }
      break;
    }
    case CH.YELL:
      s.rot = Math.atan2(-s.cdir[0], -s.cdir[1]);
      if (s.stT > 1.15) setSpState(s, CH.CHARGE);
      break;
    case CH.CHARGE: {
      const sp = 17 * mult;
      s.x += s.cdir[0] * sp * dt; s.z += s.cdir[1] * sp * dt;
      s.c = Math.floor(s.x / CS); s.r = Math.floor(s.z / CS);
      const bw = wallHit(s, 2.6);
      if (bw) { /* unstoppable force meets immovable object */
        if (s.cdir[0]) s.x = bw.x - s.cdir[0] * (wallHalf(bw)[0] + 0.85);
        if (s.cdir[1]) s.z = bw.z - s.cdir[1] * (wallHalf(bw)[1] + 0.85);
        s.c = Math.floor(s.x / CS); s.r = Math.floor(s.z / CS);
        bw.bumpT = 0.6; setSpState(s, CH.BOUNCE); break;
      }
      const prx = s.x + s.cdir[0] * 1.1, prz = s.z + s.cdir[1] * 1.1;
      if (wallAt(prx, prz)) {
        if (s.cdir[0]) { const edge = (s.cdir[0] > 0 ? Math.floor(prx / CS) : Math.floor(prx / CS) + 1) * CS; s.x = edge - s.cdir[0] * 1.05; }
        if (s.cdir[1]) { const edge = (s.cdir[1] > 0 ? Math.floor(prz / CS) : Math.floor(prz / CS) + 1) * CS; s.z = edge - s.cdir[1] * 1.05; }
        s.c = Math.floor(s.x / CS); s.r = Math.floor(s.z / CS);
        setSpState(s, CH.SPLAT);
      }
      break;
    }
    case CH.SPLAT:
      if (s.stT > [3.4, 3.0, 2.6, 3.4][gameMode]) setSpState(s, CH.RECOVER);
      break;
    case CH.BOUNCE: {
      const v = 11 * Math.max(0, 1 - s.stT / 0.55), bx = -s.cdir[0] * v * dt, bz = -s.cdir[1] * v * dt;
      if (!wallAt(s.x + bx - s.cdir[0] * 1.1, s.z + bz - s.cdir[1] * 1.1)) { s.x += bx; s.z += bz; }
      s.c = Math.floor(s.x / CS); s.r = Math.floor(s.z / CS);
      if (s.stT > 0.55) setSpState(s, CH.DAZED);
      break;
    }
    case CH.DAZED:
      if (s.stT > [2.8, 2.5, 2.2, 2.8][gameMode]) setSpState(s, CH.RECOVER);
      break;
    case CH.RECOVER:
      if (s.stT > 0.9) {
        s.nc = s.c; s.nr = s.r; s.dir = [-s.cdir[0], -s.cdir[1]]; setSpState(s, CH.WANDER);
      }
      break;
    default: break;
  }
}
function nearestCrumb(t, x, z) { let bi = 0, bd = 1e9; for (let i = 0; i < t.length; i++) { const d = dist2d(t[i].x, t[i].z, x, z); if (d < bd) { bd = d; bi = i; } } return bi; }
function recordTrails() {
  eachPlayer(p => {
    const t = trails[p.id] || (trails[p.id] = []), l = t[t.length - 1];
    if (l && dist2d(l.x, l.z, p.x, p.z) > 6) t.length = 0; /* teleported (respawn): start a fresh trail */
    if (!t.length || dist2d(t[t.length - 1].x, t[t.length - 1].z, p.x, p.z) > 1.2) {
      t.push({ x: p.x, z: p.z });
      if (t.length > 1500) { t.shift(); specials.forEach(s => { if (s.kind === 'stalker' && s.tid === p.id) s.idx = Math.max(0, s.idx - 1); }); }
    }
  });
}
function simStalker(s, dt) {
  s.stT += dt; s.anim += dt;
  if (s.st === SK.DORMANT) {
    s.cool -= dt; if (s.cool > 0) return;
    let best = null, bl = 19;
    eachPlayer(p => { const t = trails[p.id]; if (t && t.length > bl) { bl = t.length; best = p; } });
    if (!best) return;
    const t = trails[best.id]; let ok = true;
    eachPlayer(p => { if (dist2d(p.x, p.z, t[0].x, t[0].z) < 16) ok = false; });
    if (!ok) { s.cool = 2; return; }
    s.tid = best.id; s.idx = 0; s.x = t[0].x; s.z = t[0].z; s.y = 0;
    setSpState(s, SK.STALK);
    return;
  }
  if (s.st !== SK.STALK || s.stT < 1.2) return;
  let tgt = null;
  eachPlayer(p => { if (p.id === s.tid) tgt = p; });
  if (!tgt) {
    let bd = 1e9; eachPlayer(p => { const d = dist2d(p.x, p.z, s.x, s.z); if (d < bd) { bd = d; tgt = p; } });
    if (!tgt) return;
    s.tid = tgt.id; s.idx = nearestCrumb(trails[tgt.id] || [], s.x, s.z);
  }
  const t = trails[s.tid] || [];
  const mult = [1, 1.08, 1.18, 1][gameMode], behind = t.length - s.idx;
  let step = 8.3 * mult * (behind > 70 ? 1.3 : 1) * dt, guard = 0;
  while (step > 0 && guard++ < 6) {
    const gx = s.idx < t.length ? t[s.idx].x : tgt.x, gz = s.idx < t.length ? t[s.idx].z : tgt.z;
    const dx = gx - s.x, dz = gz - s.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { let diff = Math.atan2(-dx, -dz) - s.rot; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); s.rot += diff * Math.min(1, dt * 10); }
    if (d <= step) { s.x = gx; s.z = gz; step -= d; if (s.idx < t.length) s.idx++; else break; }
    else { s.x += dx / d * step; s.z += dz / d * step; step = 0; }
  }
  s.y = floorY(s.x, s.z);
}
function simWall(s, dt) {
  s.anim += dt; s.pause = Math.max(0, s.pause - dt);
  if (s.pause > 0) return;
  /* the Wall never walks through anybody: it stops against the first player in its way */
  let blocked = false;
  const lx = s.x + s.dir[0] * 0.6, lz = s.z + s.dir[1] * 0.6;
  eachPlayer(p => { if (Math.abs(p.x - lx) < wallHalf(s)[0] + 0.6 && Math.abs(p.z - lz) < wallHalf(s)[1] + 0.6 && p.py < floorY(s.x, s.z) + WALL_BH - 0.55) blocked = true; });
  if (blocked || s.stuck) return;
  const sp = Math.min(2.8, 1.7 + 0.05 * (level - 1)) * [1, 1.25, 1.5, 1][gameMode];
  gridMove(s, dt, sp, pickChase);
}
function leapTo(s, tx, tz, ty, dur, st) {
  s.from = { x: s.x, y: s.y, z: s.z }; s.to = { x: tx, y: ty, z: tz }; s.fT = 0; s.dur = dur;
  s.rot = Math.atan2(-(tx - s.x), -(tz - s.z));
  setSpState(s, st);
}
function simAmbusher(s, dt) {
  s.stT += dt; s.anim += dt; s.biteCd = Math.max(0, s.biteCd - dt);
  switch (s.st) {
    case AM.PERCH: {
      s.cool -= dt;
      if (s.cool > 0) break;
      let tgt = null;
      eachPlayer(p => { if (!tgt && dist2d(p.x, p.z, s.x, s.z) < 2.9 && p.py < 2.5) tgt = p; });
      if (tgt) {
        let lx = tgt.x, lz = tgt.z;
        if (wallAt(lx, lz)) { lx = Math.floor(lx / CS) * CS + CS / 2; lz = Math.floor(lz / CS) * CS + CS / 2; }
        leapTo(s, lx, lz, floorY(lx, lz), 0.5, AM.LEAP);
      }
      break;
    }
    case AM.LEAP: case AM.RETURN: {
      s.fT += dt; const u = Math.min(1, s.fT / s.dur), hgt = s.st === AM.LEAP ? 2.0 : 2.6;
      s.x = s.from.x + (s.to.x - s.from.x) * u; s.z = s.from.z + (s.to.z - s.from.z) * u;
      s.y = s.from.y + (s.to.y - s.from.y) * u + 4 * hgt * u * (1 - u);
      if (u >= 1) {
        if (s.st === AM.LEAP) { s.biteCd = 0; setSpState(s, AM.GROUND); }
        else { s.rot = s.home.rot; s.cool = 2.5; setSpState(s, AM.PERCH); }
      }
      break;
    }
    case AM.GROUND:
      if (s.stT > 1.5) {
        const d = dist2d(s.x, s.z, s.home.x, s.home.z);
        leapTo(s, s.home.x, s.home.z, s.home.y, 0.55 + d * 0.035, AM.RETURN);
      }
      break;
    default: break;
  }
}
/* NOTHING walks through the Wall: zombies and specials are shoved out of its body, and it stops if it cannot shove them */
function wallPushActors() {
  for (const w of specials) {
    if (w.kind !== 'wall') continue;
    w.stuck = false;
    const h = wallHalf(w), hx = h[0] + 0.8, hz = h[1] + 0.8;
    const shove = a => {
      const dx = a.x - w.x, dz = a.z - w.z;
      if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) return;
      let nx = a.x, nz = a.z;
      if (hx - Math.abs(dx) < hz - Math.abs(dz)) nx = w.x + (dx < 0 ? -hx : hx); else nz = w.z + (dz < 0 ? -hz : hz);
      if (blockedP(nx, nz, 0.7)) { w.stuck = true; return; }
      a.x = nx; a.z = nz;
      if (a.mesh) a.mesh.position.x = nx, a.mesh.position.z = nz;
    };
    for (const z of zombies) if (z.state !== 'dead' && z.state !== 'house') shove(z);
    for (const s of specials) {
      if (s === w || isDead(s)) continue;
      if (s.kind === 'ambusher' && s.st !== AM.GROUND) continue;
      if (s.kind === 'charger' && s.st === CH.CHARGE) continue;
      if (s.kind === 'wall') continue;
      shove(s);
    }
  }
}
function updateSpecials(dt) {
  if (specials.some(s => s.kind === 'stalker')) recordTrails();
  for (const s of specials) {
    if (s.flashT > 0) { s.flashT -= dt; if (s.flashT <= 0) flashSpecial(s, false); }
    if (freezeT <= 0 || isDead(s)) {
      if (s.kind === 'wall') simWall(s, dt); else if (s.kind === 'charger') simCharger(s, dt); else if (s.kind === 'stalker') simStalker(s, dt); else simAmbusher(s, dt);
    }
    animSpecial(s, dt);
  }
}
function isDead(s) { return (s.kind === 'charger' && s.st === CH.DEAD) || (s.kind === 'ambusher' && s.st === AM.DEAD) || (s.kind === 'stalker' && s.st === SK.DEAD); }

/* contact damage for the local player and (as host) for every remote player */
function touchDamage(s, x, z, pyy) {
  if (isDead(s)) return 0;
  if (s.kind === 'wall') return Math.abs(x - s.x) < wallHalf(s)[0] + 0.5 && Math.abs(z - s.z) < wallHalf(s)[1] + 0.5 && pyy < floorY(s.x, s.z) + WALL_BH - 0.55 ? 35 : 0;
  if (s.kind === 'charger') {
    if (s.st > CH.CHARGE) return 0;
    return dist2d(x, z, s.x, s.z) < 1.7 && Math.abs(pyy - floorY(s.x, s.z)) < 1.3 ? (s.st === CH.CHARGE ? 40 : 15) : 0;
  }
  if (s.kind === 'stalker') return s.st === SK.STALK && s.stT > 1.2 && dist2d(x, z, s.x, s.z) < 1.5 && Math.abs(pyy - floorY(s.x, s.z)) < 1.3 ? 999 : 0;
  if (s.st === AM.GROUND && s.biteCd <= 0) return dist2d(x, z, s.x, s.z) < 1.6 && Math.abs(pyy - s.y) < 1.5 ? 20 : 0;
  return 0;
}
function specialsContact(dt) {
  if (freezeT > 0 || state !== 'play') return;
  for (const s of specials) {
    eachPlayer(p => {
      const n = touchDamage(s, p.x, p.z, p.py);
      if (!n) return;
      if (p.self) { if (invuln > 0) return; if (n >= 900) { noise(0.25, 0.2); tone(160, 0.12, 'square', 0.2, -120); toast('NECK SNAPPED', '#ff3b4e'); } takeDamage(n, -1); }
      else { if (p.p.inv > 0) return; netToPeer(p.id, { t: 'dmg', n, by: -1 }); p.p.inv = 1.2; }
      if (s.kind === 'wall') s.pause = 1.2;
      if (s.kind === 'ambusher') s.biteCd = 9;
    });
  }
}
