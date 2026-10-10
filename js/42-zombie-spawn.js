'use strict';
/* Rising out of the ground, spawn picking */
const RISE = 1.4;
/* a fresh spawn: somewhere in the middle of the maze, as far from every living player as it can be */
function pickSpawn() {
  const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2), cand = [];
  for (let r = cy - 5; r <= cy + 5; r++) for (let c = cx - 6; c <= cx + 6; c++) {
    if (c < 1 || r < 1 || c >= COLS - 1 || r >= ROWS - 1 || walls[r][c] || hgt[r][c]) continue;
    const x = (c + 0.5) * CS, zz = (r + 0.5) * CS;
    let md = 1e9;
    for (const p of netPlayers()) if (p.a) md = Math.min(md, Math.hypot(p.x - x, p.z - zz));
    for (const o of zombies) if (o.state === 'house') md = Math.min(md, Math.hypot(o.x - x, o.z - zz) + 6);
    cand.push({ c, r, md });
  }
  const far = cand.filter(o => o.md >= 18);
  if (far.length) return far[Math.floor(Math.random() * far.length)];
  cand.sort((a, b) => b.md - a.md);
  return cand[0] || SPAWNS[0];
}
/* shared by the host and the clients: stay underground, then claw up out of the floor */
function riseAnim(z) {
  const m = z.mesh, fy = floorY(z.x, z.z);
  z.bar.visible = false;
  if (z.timer > RISE) { m.position.set(z.x, fy - 3.2, z.z); m.visible = true; z.dirtK = -1; return; }
  const k = 1 - Math.max(0, z.timer) / RISE, e = k * k * (3 - 2 * k);
  m.visible = true; m.rotation.set(0, z.rot, 0);
  m.position.set(z.x, fy - 2.7 * (1 - e) + Math.sin(z.anim * 9) * 0.03 * (1 - e), z.z);
  animLimbs(z, 0.3);
  for (let i = 0; i < 2; i++) if (!z.lost[2 + i]) z.arms[i].rotation.x = 3.0 - 1.4 * e + Math.sin(z.anim * 7 + i) * 0.25;
  z.head.rotation.x = -0.35 * (1 - e);
  const dk = Math.floor(z.timer * 8);
  if (dk !== z.dirtK) {
    if (z.dirtK === -1) tone(70, 0.7, 'sawtooth', 0.07 * Math.max(0.15, 1 - Math.hypot(z.x - px, z.z - pz) / 45), -25);
    z.dirtK = dk; burst(z.x + (Math.random() - 0.5) * 1.2, fy + 0.1, z.z + (Math.random() - 0.5) * 1.2, 0x6b5a3a, 3, 3);
  }
}
function placeZombie(z, idx, delay, fresh) {
  const s = fresh ? pickSpawn() : SPAWNS[idx];
  z.rot = Math.random() * 6.28; z.dirtK = -1;
  z.c = z.nc = s.c; z.r = z.nr = s.r; z.x = (s.c + 0.5) * CS; z.z = (s.r + 0.5) * CS;
  z.dir = [0, 0]; z.state = 'house'; z.timer = delay; z.slow = 0; z.deadT = 0; resetLimbs(z);
  z.hp = z.maxHp = 3 + (level - 1) + (playerCount - 1);
  z.mesh.visible = true; z.mesh.rotation.x = 0; z.mesh.position.set(z.x, floorY(z.x, z.z), z.z);
  z.fill.scale.x = 1; z.flashT = 0; z.bar.visible = false; setFlash(z, false);
}
