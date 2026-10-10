'use strict';
/* Shared game state */
/* ---------- game state ---------- */
let state = 'title', score = 0, level = 1, lives = 3, ammo = 16, tier = 0, wIdx = 0, best = 0;
let px = 0, pz = 0, yaw = Math.PI / 2, pitch = 0, invuln = 0, fireCd = 0, kick = 0, flashT = 0, bobT = 0, bobY = 0, py = 0, vy = 0, pitCd = 0, freezeT = 0, seed = 1, jumpHeld = false, pits = [];
let onGround = true, stam = 100, stamLock = false, stamDelay = 0, running = false, sprintK = 0, landT = 0, swapT = 0, gameMode = 0;
const pu = { haste: 0, frenzy: 0, shield: 0, freeze: 0 };
let aliveDots = dotList.length, scatter = true, modeT = 0, lastT = performance.now();
const keys = {}, stick = { x: 0, y: 0 };
let mouseFire = false, touchFire = false, queued = false, locked = false, hadLock = false, ghost = false, hp = 100;
const net = { role: null, phase: 'lobby', code: '', peer: null, hostConn: null, conns: {}, players: {}, lobby: [], myId: 0, t: 0, boardT: 0, pvp: true };
const START_COLS = [9, 7, 11, 5];
const r2 = v => Math.round(v * 100) / 100;
function placeSelf() { px = (START_COLS[net.myId] + OFF + 0.5) * CS; pz = (playerStart.r + 0.5) * CS; yaw = Math.PI / 2; pitch = 0; invuln = 3; hp = 100; py = floorY(px, pz); vy = 0; pitCd = 0; onGround = true; }
function netPlayers() {
  const out = [{ id: net.myId, x: px, z: pz, yaw: yaw, a: !ghost }];
  if (net.role === 'host') for (const id in net.players) out.push(net.players[id]);
  return out;
}
function nearestTarget(z) {
  let best = null, bd = 1e9;
  for (const p of netPlayers()) {
    if (!p.a) continue;
    const d = (p.x - z.x) * (p.x - z.x) + (p.z - z.z) * (p.z - z.z);
    if (d < bd) { bd = d; best = p; }
  }
  return best || { x: px, z: pz, yaw: yaw, a: true };
}
const zSpeed = () => Math.min(6.4, 4.2 + 0.4 * (level - 1)) * [1, 1.5, 1.65, 1][gameMode];
