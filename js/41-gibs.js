'use strict';
/* Gibs and dismemberment */
/* ---------- dismemberment ---------- */
function resetLimbs(z) {
  z.lost = [false, false, false, false]; z.limbHp = [2, 2, 2, 2]; z.mode = 'walk'; z.modeT = 0;
  z.legs.forEach(l => { l.visible = true; l.rotation.x = 0; }); z.arms.forEach(l => { l.visible = true; });
  z.legStumps.forEach(m => { m.visible = false; }); z.armStumps.forEach(m => { m.visible = false; });
  z.mesh.rotation.x = 0; z.mesh.rotation.z = 0; z.head.rotation.set(0, 0, 0); z.up.rotation.set(0, 0, 0);
  z.mesh.scale.set(1, 1, 1); z.head.visible = true; z.neckStump.visible = false; z.dfx = false; z.shat = false; z.lastSp = -1; setFlash(z, false);
}
const gibs = [], gibGeo = new THREE.BoxGeometry(0.26, 0.8, 0.26);
const gibMats = [new THREE.MeshStandardMaterial({ color: 0x16182e, roughness: 0.9, flatShading: true }), new THREE.MeshStandardMaterial({ color: 0x8fae86, roughness: 0.9, flatShading: true })];
function spawnGib(x, y, zz, isArm) {
  const m = new THREE.Mesh(gibGeo, gibMats[isArm ? 1 : 0]); m.position.set(x, y, zz); scene.add(m);
  gibs.push({ m, vx: (Math.random() - 0.5) * 7, vy: 4 + Math.random() * 4, vz: (Math.random() - 0.5) * 7, sx: (Math.random() - 0.5) * 12, sz: (Math.random() - 0.5) * 12, life: 4 });
}
const chunkGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3), headGeo = new THREE.BoxGeometry(0.56, 0.56, 0.56), gibMatCache = {};
const gibMatFor = c => gibMatCache[c] || (gibMatCache[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true, emissive: c, emissiveIntensity: 0.3 }));
function spawnChunk(x, y, zz, geo, mat, spd, up) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, zz); scene.add(m);
  gibs.push({ m, vx: (Math.random() - 0.5) * spd, vy: (up || 3) + Math.random() * spd * 0.6, vz: (Math.random() - 0.5) * spd, sx: (Math.random() - 0.5) * 14, sz: (Math.random() - 0.5) * 14, life: 4 });
}
function updateGibs(dt) {
  for (let i = gibs.length - 1; i >= 0; i--) {
    const g = gibs[i], m = g.m; g.life -= dt;
    g.vy -= 20 * dt; m.position.x += g.vx * dt; m.position.y += g.vy * dt; m.position.z += g.vz * dt;
    m.rotation.x += g.sx * dt; m.rotation.z += g.sz * dt;
    const fy = floorY(m.position.x, m.position.z) + 0.15;
    if (m.position.y < fy) { m.position.y = fy; g.vy = Math.abs(g.vy) > 3 ? -g.vy * 0.3 : 0; g.vx *= 0.6; g.vz *= 0.6; g.sx *= 0.5; g.sz *= 0.5; }
    if (wallAt(m.position.x, m.position.z)) { g.vx *= -0.3; g.vz *= -0.3; }
    if (g.life <= 0) { scene.remove(m); gibs.splice(i, 1); }
  }
}
/* both the host and the clients run this when a limb comes off, so everyone sees the same gore */
function severFx(z, idx) {
  z.lost[idx] = true; z.limbHp[idx] = 0;
  const leg = idx < 2, side = idx & 1 ? 1 : -1, fy = floorY(z.x, z.z);
  (leg ? z.legStumps : z.armStumps)[idx & 1].visible = true;
  (leg ? z.legs : z.arms)[idx & 1].visible = false;
  const wx = z.x + side * Math.cos(z.rot) * 0.4, wz = z.z - side * Math.sin(z.rot) * 0.4, wy = fy + (leg ? 0.6 : 1.5);
  burst(wx, wy, wz, 0xb01020, 12, 5); burst(wx, wy, wz, 0x7a0714, 6, 3);
  spawnGib(wx, wy, wz, !leg);
  noise(0.16, 0.1); tone(95, 0.2, 'sawtooth', 0.06, -50);
}
function sever(z, idx) {
  severFx(z, idx);
  if (idx < 2 && z.mode === 'walk') { z.mode = 'fall'; z.modeT = 0; z.slow = 0; }
}
