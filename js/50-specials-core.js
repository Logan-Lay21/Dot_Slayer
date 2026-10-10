'use strict';
/* Special zombie constants, hitboxes, spawn planning */
/* ---------- special zombies: THE WALL, THE CHARGER, THE AMBUSHER ----------
   Every peer builds the same specials from the room seed and the level, the host runs them, clients animate puppets. */
const specials = [];
let stepN = 0;
const WALL_BH = 3.2; /* tall: only a jump launched from the top of a ramp clears it */
const trails = {};
/* ground height under (x,z) counting the top of the Wall: you can land on it and walk across */
function wallTopAt(x, z, feet) {
  let top = -1;
  for (const s of specials) {
    if (s.kind !== 'wall') continue;
    const h = wallHalf(s);
    if (Math.abs(x - s.x) < h[0] + 0.1 && Math.abs(z - s.z) < h[1] + 0.1) { const t = floorY(s.x, s.z) + WALL_BH; if (feet >= t - 0.55) top = Math.max(top, t); }
  }
  return top;
}
/* the Wall spans the hall but is not deep, so a good jump clears it: half sizes along x and z */
function wallHalf(s) { return Math.abs(Math.sin(s.rot)) > 0.7 ? [1.3, 1.85] : [1.85, 1.3]; }
function footstep(v, pitch) { noise(0.045, v); tone(75 * pitch, 0.05, 'sine', v * 1.2, -20); }
const SP_NAMES = { wall: 'THE WALL', charger: 'THE CHARGER', ambusher: 'THE AMBUSHER', stalker: 'THE STALKER' };
const SK = { DORMANT: 0, STALK: 1, DEAD: 2, GONE: 3 }; /* GONE: he got his kill (or his target respawned) and vanished for the rest of the level */
const CH = { WANDER: 0, YELL: 1, CHARGE: 2, SPLAT: 3, RECOVER: 4, DEAD: 5, BOUNCE: 6, DAZED: 7 };
const stunned = s => s.st === CH.SPLAT || s.st === CH.DAZED;
const AM = { PERCH: 0, LEAP: 1, GROUND: 2, RETURN: 3, DEAD: 4 };
let shakeMag = 0;
const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function shakeAt(x, z, mag) {
  const k = Math.max(0, 1 - dist2d(x, z, px, pz) / 32);
  shakeMag = Math.max(shakeMag, mag * k);
}
function volAt(x, z, v) { return v * Math.max(0.15, 1 - dist2d(x, z, px, pz) / 45); }

/* chance per round that each kind shows up; it climbs every level, and INSANE starts high */
function specialChances(lv) {
  if (gameMode === 3) return { wall: 1, charger: 1, ambusher: 1, stalker: 1 };
  const ins = gameMode === 2, k = lv - 1, cap = ins ? 0.97 : 0.9, pb = 0.12 * (playerCount - 1);
  return {
    wall: Math.min(cap, (ins ? 0.5 : 0.08) + (ins ? 0.07 : 0.06) * k + pb),
    charger: Math.min(cap, (ins ? 0.6 : 0.15) + (ins ? 0.08 : 0.07) * k + pb),
    ambusher: Math.min(cap, (ins ? 0.7 : 0.2) + (ins ? 0.08 : 0.07) * k + pb),
    stalker: Math.min(ins ? 0.97 : 0.75, (ins ? 0.4 : 0.06) + (ins ? 0.07 : 0.05) * k + pb)
  };
}
function planSpecials(lv) {
  const rnd = mkRnd(((seed ^ 0x5bd1e995) + Math.imul(lv, 104729)) >>> 0), ch = specialChances(lv), ins = gameMode === 2;
  const open = [], tops = [];
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    const g = grid[r][c];
    if (r >= 5 + OFF && r <= 12 + OFF && c >= 5 + OFF && c <= 13 + OFF) continue;
    if (Math.hypot(c - playerStart.c, r - playerStart.r) < 7) continue;
    if (!walls[r][c]) { if (g !== 'G' && g !== 'P' && !isPen(c, r) && !hgt[r][c]) open.push({ c, r }); continue; }
    for (const d of DIRS) {
      const nc = c + d[0], nr = r + d[1];
      if (nc < 1 || nr < 1 || nc >= COLS - 1 || nr >= ROWS - 1 || walls[nr][nc] || isPen(nc, nr) || hgt[nr][nc]) continue;
      tops.push({ c, r, d }); break;
    }
  }
  const far = (list, minD) => list.filter(o => Math.hypot(o.c - playerStart.c, o.r - playerStart.r) >= minD);
  const pickFrom = (list, used) => {
    for (let t = 0; t < 30 && list.length; t++) {
      const o = list[Math.floor(rnd() * list.length)];
      if (used.every(u => Math.hypot(u.c - o.c, u.r - o.r) >= 4)) { used.push(o); return o; }
    }
    return null;
  };
  const plan = [], used = [], farOpen = far(open, 12).length ? far(open, 12) : open;
  /* roll in a fixed order so every peer ends up with the same list */
  const rW = rnd(), rC = rnd(), rA = rnd(), rC2 = rnd(), rN = rnd(), rS = rnd();
  if (rW < ch.wall) { const o = pickFrom(farOpen, used); if (o) plan.push({ kind: 'wall', c: o.c, r: o.r }); }
  if (rC < ch.charger) {
    const n = ((ins && lv >= 6) || playerCount >= 3) && rC2 < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) { const o = pickFrom(farOpen, used); if (o) plan.push({ kind: 'charger', c: o.c, r: o.r }); }
  }
  if (rA < ch.ambusher) {
    const n = gameMode === 3 ? 3 : Math.min(ins ? 8 : 6, (ins ? 2 : 1) + (playerCount - 1) + Math.floor(rN * ((ins ? 2 : 1) + lv / (ins ? 3 : 4))));
    for (let i = 0; i < n; i++) {
      const o = pickFrom(tops, used); if (!o) break;
      plan.push({ kind: 'ambusher', c: o.c, r: o.r, d: o.d });
    }
  }
  if (rS < ch.stalker) plan.push({ kind: 'stalker' });
  return plan;
}
