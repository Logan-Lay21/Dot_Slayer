'use strict';
/* Player movement, jumping, dot pickup */
/* ---------- player ---------- */
function blockedP(x, z, r) { return solidAt(x - r, z - r) || solidAt(x + r, z - r) || solidAt(x - r, z + r) || solidAt(x + r, z + r); }
let lastMv = [0, 0];
function movePlayer(dt) {
  let fwd = 0, str = 0;
  if (keys.KeyW || keys.ArrowUp) fwd += 1;
  if (keys.KeyS || keys.ArrowDown) fwd -= 1;
  if (keys.KeyD) str += 1;
  if (keys.KeyA) str -= 1;
  if (keys.ArrowLeft || keys.KeyQ) yaw += 2.2 * dt;
  if (keys.ArrowRight || keys.KeyE) yaw -= 2.2 * dt;
  fwd -= stick.y; str += stick.x;
  const len = Math.hypot(fwd, str);
  if (len > 1) { fwd /= len; str /= len; }
  const moving = len > 0.05;
  /* sprint bar: running drains it, it refills slowly after a short pause, and an empty bar locks sprint until it is 30% full */
  const wantRun = moving && (keys.ShiftLeft || keys.ShiftRight || stick.run);
  running = false;
  if (wantRun && !stamLock && stam > 0) {
    running = true; stamDelay = 0.9;
    if (pu.haste <= 0) stam = Math.max(0, stam - 30 * dt);
    if (stam <= 0) stamLock = true;
  } else {
    stamDelay = Math.max(0, stamDelay - dt);
    if (stamDelay <= 0) stam = Math.min(100, stam + 14 * dt);
    if (stamLock && stam >= 30) stamLock = false;
  }
  const sx = Math.sin(yaw), cx = Math.cos(yaw), R = 0.95;
  const sp = 6.6 * (running ? 1.6 : 1) * (pu.haste > 0 ? 1.3 : 1) * dt;
  const vx = (-sx * fwd + cx * str) * sp, vz = (-cx * fwd - sx * str) * sp;
  /* walls block you, and so does a ledge taller than a step. Ramps are gentle enough to walk up. */
  if (!blockedP(px + vx, pz, R) && floorY(px + vx, pz) <= py + 0.6) px += vx;
  if (!blockedP(px, pz + vz, R) && floorY(px, pz + vz) <= py + 0.6) pz += vz;
  for (const s of specials) {
    if (s.kind !== 'wall') continue;
    const wh = wallHalf(s), hhx = wh[0] + 0.25, hhz = wh[1] + 0.25, ddx = px - s.x, ddz = pz - s.z;
    if (Math.abs(ddx) < hhx && Math.abs(ddz) < hhz && py < floorY(s.x, s.z) + WALL_BH - 0.55) {
      let nx = px, nz = pz;
      if (hhx - Math.abs(ddx) < hhz - Math.abs(ddz)) nx = s.x + (ddx < 0 ? -hhx : hhx); else nz = s.z + (ddz < 0 ? -hhz : hhz);
      if (!blockedP(nx, nz, R)) { px = nx; pz = nz; }
    }
  }
  if (vx || vz) lastMv = [vx, vz];
  const gy = Math.max(floorY(px, pz), wallTopAt(px, pz, py));
  /* landed on top of the Wall: don't stand on his head, slide off the way you were heading */
  if (onGround && !vx && !vz && gy > floorY(px, pz) + 1) {
    const ws = specials.find(s => s.kind === 'wall' && Math.abs(px - s.x) < wallHalf(s)[0] + 0.1 && Math.abs(pz - s.z) < wallHalf(s)[1] + 0.1);
    if (ws) {
      const alongX = wallHalf(ws)[0] < wallHalf(ws)[1]; /* the hall runs along the Wall's shallow side */
      const sg = alongX ? (Math.abs(lastMv[0]) > 1e-6 ? Math.sign(lastMv[0]) : Math.sign(px - ws.x) || 1) : (Math.abs(lastMv[1]) > 1e-6 ? Math.sign(lastMv[1]) : Math.sign(pz - ws.z) || 1);
      const sl = 7 * dt * sg;
      if (alongX && !blockedP(px + sl, pz, R)) px += sl; else if (!alongX && !blockedP(px, pz + sl, R)) pz += sl;
    }
  }
  if ((keys.Space || jumpHeld) && onGround) { vy = 8.6 * (pu.haste > 0 ? 1.1 : 1) + (gy > 0.5 ? 1.5 : 0); onGround = false; tone(380, 0.09, 'square', 0.03, 260); }
  if (onGround) {
    if (py - gy > 0.35) onGround = false; else { py = gy; vy = 0; }
  }
  if (!onGround) {
    vy -= 24 * dt; py += vy * dt;
    if (py <= gy) {
      if (vy <= 0) { if (vy < -5) { tone(90, 0.07, 'sine', 0.05); landT = Math.min(0.2, -vy * 0.012); } py = gy; vy = 0; onGround = true; }
      else py = gy;
    }
  }
  bobT += dt * (moving && onGround ? (running ? 13 : 9) : 0);
  if (moving && onGround) { const sn = Math.floor(bobT / Math.PI); if (sn !== stepN) { stepN = sn; footstep(running ? 0.06 : 0.04, 1); } }
  bobY = moving && onGround ? Math.sin(bobT) * (running ? 0.08 : 0.05) : bobY * 0.8;
  pitCd = Math.max(0, pitCd - dt);
  if (onGround && gy < 0.05 && pitCd <= 0 && invuln <= 0 && !ghost) {
    for (const pit of pits) if (Math.abs(px - pit.x) < PIT_HALF && Math.abs(pz - pit.z) < PIT_HALF) { pitHit(pit); break; }
  }
}
function collectDots() {
  if (ghost) return;
  const pc = Math.floor(px / CS), pr = Math.floor(pz / CS);
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const c = pc + dc, r = pr + dr;
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
    const d = dotAt[r][c];
    if (!d || !d.alive || Math.abs(py - d.fy) > 1.5) continue;
    const dx = px - (c + 0.5) * CS, dz = pz - (r + 0.5) * CS;
    if (dx * dx + dz * dz > 3.4) continue;
    d.alive = false; aliveDots--; netDot(d.n);
    if (d.big) {
      d.mesh.visible = false; score += 50; powerUp();
    } else {
      dotMesh.setMatrixAt(d.idx, ZERO); dotMesh.instanceMatrix.needsUpdate = true;
      score += 10; ammo = Math.min(99, ammo + 2);
      wakaFlip = !wakaFlip; tone(wakaFlip ? 440 : 560, 0.06, 'square', 0.035);
    }
  }
}
