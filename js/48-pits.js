'use strict';
/* Spike pits */
/* ---------- spike pits: new random layout every level, same for everyone in a room ---------- */
const PIT_MAX = 12, PIT_HALF = 1.7;
const pitBase = new THREE.InstancedMesh(new THREE.BoxGeometry(PIT_HALF * 2 + 0.5, 0.04, PIT_HALF * 2 + 0.5), new THREE.MeshBasicMaterial({ color: 0x2b3050 }), PIT_MAX);
const pitHole = new THREE.InstancedMesh(new THREE.BoxGeometry(PIT_HALF * 2, 0.05, PIT_HALF * 2), new THREE.MeshBasicMaterial({ color: 0x07000c }), PIT_MAX);
const pitSpike = new THREE.InstancedMesh(new THREE.ConeGeometry(0.2, 1.0, 6), new THREE.MeshBasicMaterial({ color: 0xdfe6ff }), PIT_MAX * 16);
[pitBase, pitHole, pitSpike].forEach(m => { m.frustumCulled = false; m.count = 0; scene.add(m); });
function genPits(lv) {
  pits = [];
  let a = (seed + lv * 7919) >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (grid[r][c] === '#' || grid[r][c] === 'o' || grid[r][c] === 'G' || hgt[r][c]) continue;
    if (r >= 5 + OFF && r <= 12 + OFF && c >= 5 + OFF && c <= 13 + OFF) continue;
    if (START_COLS.some(sc => Math.abs(c - sc - OFF) + Math.abs(r - playerStart.r) < 3)) continue;
    cand.push({ c, r });
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
  const want = Math.min(PIT_MAX - 2, 3 + lv);
  for (const k of cand) {
    if (pits.length >= want) break;
    if (pits.some(p => Math.max(Math.abs(p.c - k.c), Math.abs(p.r - k.r)) < 2)) continue;
    pits.push({ c: k.c, r: k.r, x: (k.c + 0.5) * CS, z: (k.r + 0.5) * CS });
  }
  let si = 0;
  pits.forEach((p, i) => {
    m4.makeTranslation(p.x, 0.02, p.z); pitBase.setMatrixAt(i, m4);
    m4.makeTranslation(p.x, 0.05, p.z); pitHole.setMatrixAt(i, m4);
    for (let gx = 0; gx < 4; gx++) for (let gz = 0; gz < 4; gz++) {
      m4.makeTranslation(p.x - 1.2 + gx * 0.8, 0.5, p.z - 1.2 + gz * 0.8); pitSpike.setMatrixAt(si++, m4);
    }
  });
  pitBase.count = pitHole.count = pits.length; pitSpike.count = si;
  [pitBase, pitHole, pitSpike].forEach(m => { m.instanceMatrix.needsUpdate = true; });
}
function pitHit(pit) {
  pitCd = 1; vy = 7; onGround = false; noise(0.15, 0.1); tone(160, 0.2, 'sawtooth', 0.08, -90);
  const dx = px - pit.x, dz = pz - pit.z, sx = Math.sign(dx) || 1, sz = Math.sign(dz) || 1;
  const dirs = Math.abs(dx) > Math.abs(dz) ? [[sx, 0], [0, sz], [-sx, 0], [0, -sz]] : [[0, sz], [sx, 0], [0, -sz], [-sx, 0]];
  for (const [ax, az] of dirs) {
    const nx = ax ? pit.x + ax * (PIT_HALF + 0.6) : px, nz = az ? pit.z + az * (PIT_HALF + 0.6) : pz;
    if (!blockedP(nx, nz, 0.95)) { px = nx; pz = nz; break; }
  }
  takeDamage(20, -1);
  if (hp > 0) toast('SPIKES. JUMP THE PITS', '#ff3b4e');
}
