'use strict';
/* Zombie targeting, routing around The Wall, movement */
const crawlMul = z => 0.4 + 3 * Math.max(0, Math.sin(z.anim * 3 * 1.5));
function facingDir(ay) {
  const fx = -Math.sin(ay), fz = -Math.cos(ay);
  return Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
}
/* Each zombie picks a target cell; at every junction it takes the open direction that ends up closest to it. */
function scatterTo(z) { const s = z.def.scatter; z.tc = s[0] < 0 ? COLS - 2 : 1; z.tr = s[1] < 0 ? ROWS - 2 : 1; }
function setTarget(z) {
  const T = nearestTarget(z), pc = Math.floor(T.x / CS), pr = Math.floor(T.z / CS);
  if (z.state === 'leaving') { z.tc = 9 + OFF; z.tr = 7 + OFF; return; }
  if (scatter) { scatterTo(z); return; }
  const f = facingDir(T.yaw);
  if (z.i === 0) { z.tc = pc; z.tr = pr; }
  else if (z.i === 1) { z.tc = pc + f[0] * 4; z.tr = pr + f[1] * 4; }
  else if (z.i === 2) { z.tc = 2 * (pc + f[0] * 2) - zombies[0].c; z.tr = 2 * (pr + f[1] * 2) - zombies[0].r; }
  else {
    if (Math.hypot(pc - z.c, pr - z.r) > 8) { z.tc = pc; z.tr = pr; }
    else { scatterTo(z); }
  }
}
function blockedFor(z, c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS || walls[r][c]) return true;
  return z.state === 'active' && isPen(c, r);
}
const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];
/* the Wall fills its hall cell and the one it is walking into: zombies treat those as solid and route around */
function wallCell(c, r) {
  for (const w of specials) {
    if (w.kind !== 'wall') continue;
    if ((c === w.c && r === w.r) || (c === w.nc && r === w.nr) || (c === Math.floor(w.x / CS) && r === Math.floor(w.z / CS))) return true;
  }
  return false;
}
function wallNear(z) {
  for (const w of specials) if (w.kind === 'wall' && Math.abs(w.c - z.c) + Math.abs(w.r - z.r) <= 12) return true;
  return false;
}
/* flood outward from the zombie around the Wall, then head for the reachable cell closest to its target */
function wallRoute(z) {
  const first = new Map(), dist = new Map(), key = (c, r) => r * COLS + c, q = [];
  const k0 = key(z.c, z.r); first.set(k0, null); dist.set(k0, 0); q.push([z.c, z.r]);
  let best = null, bd = 1e9, bl = 1e9;
  for (let h = 0; h < q.length; h++) {
    const [c, r] = q[h], f = first.get(key(c, r)), dl = dist.get(key(c, r));
    if (f) {
      const dd = (c - z.tc) * (c - z.tc) + (r - z.tr) * (r - z.tr);
      if (dd < bd || (dd === bd && dl < bl)) { bd = dd; bl = dl; best = f; }
    }
    for (const d of DIRS) {
      const nc = c + d[0], nr = r + d[1], k = key(nc, nr);
      if (first.has(k) || blockedFor(z, nc, nr) || wallCell(nc, nr)) continue;
      first.set(k, f || d); dist.set(k, dl + 1); q.push([nc, nr]);
    }
  }
  return best;
}
/* the Wall never turns around in a hall: it picks any open way except straight back, and waits if that is all there is */
function wallNext(z) {
  const ld = (z.dir[0] || z.dir[1]) ? z.dir : (z.lastDir || [0, 0]);
  let best = null, bd = 1e9;
  for (const d of DIRS) {
    if (d[0] === -ld[0] && d[1] === -ld[1] && (ld[0] || ld[1])) continue;
    const nc = z.c + d[0], nr = z.r + d[1];
    if (blockedFor(z, nc, nr)) continue;
    const dd = (nc - z.tc) * (nc - z.tc) + (nr - z.tr) * (nr - z.tr);
    if (dd < bd) { bd = dd; best = d; }
  }
  /* a true dead end is the only time he may turn around */
  if (!best && (ld[0] || ld[1]) && !blockedFor(z, z.c - ld[0], z.r - ld[1])) best = [-ld[0], -ld[1]];
  z.lastDir = ld;
  if (!best) { z.dir = [0, 0]; z.nc = z.c; z.nr = z.r; return; }
  z.lastDir = best; z.dir = best; z.nc = z.c + best[0]; z.nr = z.r + best[1];
}
function chooseNext(z) {
  if (z.kind === 'wall') { wallNext(z); return; }
  if (z.state === 'active' && wallNear(z)) {
    const b = wallRoute(z);
    if (b) { z.dir = b; z.nc = z.c + b[0]; z.nr = z.r + b[1]; return; }
    z.dir = [0, 0]; z.nc = z.c; z.nr = z.r; return; /* boxed in by the Wall: wait */
  }
  let best = null, bd = 1e9;
  const still = z.dir[0] === 0 && z.dir[1] === 0;
  for (const d of DIRS) {
    if (!still && d[0] === -z.dir[0] && d[1] === -z.dir[1]) continue;
    const nc = z.c + d[0], nr = z.r + d[1];
    if (blockedFor(z, nc, nr)) continue;
    const dd = (nc - z.tc) * (nc - z.tc) + (nr - z.tr) * (nr - z.tr);
    if (dd < bd) { bd = dd; best = d; }
  }
  if (!best) best = [-z.dir[0], -z.dir[1]];
  z.dir = best; z.nc = z.c + best[0]; z.nr = z.r + best[1];
}
function updateZombie(z, dt) {
  const m = z.mesh;
  if (z.flashT > 0) { z.flashT -= dt; if (z.flashT <= 0) setFlash(z, false); }
  if (z.state === 'dead') {
    z.deadT += dt; animDeath(z);
    z.respawn -= dt;
    if (z.respawn <= 0) placeZombie(z, z.i, RISE + 1.2, true);
    return;
  }
  if (freezeT > 0 && z.state !== 'house') return;
  if (z.mode === 'fall') {
    z.modeT += dt; z.anim += dt * 1.5;
    m.rotation.y = z.rot; m.position.set(z.x, floorY(z.x, z.z), z.z); animLimbs(z, 1);
    z.bar.visible = z.hp < z.maxHp;
    if (z.bar.visible) z.bar.rotation.y = Math.atan2(px - z.x, pz - z.z) - z.rot;
    if (z.modeT > 1.5) { z.mode = 'crawl'; z.modeT = 0; }
    return;
  }
  if (z.mode === 'crawl') z.modeT += dt;
  if (z.state === 'house') {
    z.timer -= dt; z.anim += dt * 2;
    riseAnim(z);
    if (z.timer <= 0) { z.state = 'active'; z.dir = [0, 0]; setTarget(z); chooseNext(z); }
    return;
  }
  const sp = zSpeed() * (z.slow > 0 ? 0.4 : 1) * (z.mode === 'crawl' ? crawlMul(z) : 1);
  z.slow = Math.max(0, z.slow - dt);
  if ((z.nc !== z.c || z.nr !== z.r) && wallCell(z.nc, z.nr) && !wallCell(z.c, z.r)) { z.dir = [-z.dir[0], -z.dir[1]]; z.nc = z.c; z.nr = z.r; }
  let step = sp * dt, guard = 0;
  while (step > 0 && guard++ < 4) {
    const tx = (z.nc + 0.5) * CS, tz = (z.nr + 0.5) * CS, dx = tx - z.x, dz = tz - z.z, d = Math.hypot(dx, dz);
    if (d <= step) {
      z.x = tx; z.z = tz; step -= d; z.c = z.nc; z.r = z.nr;
      if (z.state === 'leaving' && z.r <= 7 + OFF) z.state = 'active';
      setTarget(z); chooseNext(z);
    } else { z.x += dx / d * step; z.z += dz / d * step; step = 0; }
  }
  const want = Math.atan2(-z.dir[0], -z.dir[1]);
  let diff = want - z.rot; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  z.rot += diff * Math.min(1, dt * 10);
  m.rotation.y = z.rot; m.position.set(z.x, floorY(z.x, z.z), z.z);
  z.anim += z.mode === 'crawl' ? dt * 1.5 : dt * sp * 1.6; animLimbs(z, 1);
  z.bar.visible = z.hp < z.maxHp;
  if (z.bar.visible) z.bar.rotation.y = Math.atan2(px - z.x, pz - z.z) - z.rot;
}
