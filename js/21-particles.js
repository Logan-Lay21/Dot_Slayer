'use strict';
/* Particles and tracers */
/* ---------- particles and tracers ---------- */
const PART = [], pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
for (let i = 0; i < 56; i++) {
  const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  m.visible = false; scene.add(m); PART.push({ m, vx: 0, vy: 0, vz: 0, life: 0 });
}
let partI = 0;
function burst(x, y, z, color, n, spd) {
  for (let k = 0; k < n; k++) {
    const p = PART[partI++ % PART.length];
    p.m.material.color.setHex(color); p.m.position.set(x, y, z);
    p.vx = (Math.random() - 0.5) * spd; p.vy = Math.random() * spd * 0.8 + 1; p.vz = (Math.random() - 0.5) * spd;
    p.life = 0.6 + Math.random() * 0.4; p.m.visible = true;
  }
}
function updateParticles(dt) {
  for (const p of PART) {
    if (p.life <= 0) continue;
    p.life -= dt; p.vy -= 14 * dt;
    p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    if (p.m.position.y < 0.07) { p.m.position.y = 0.07; p.vy = 0; p.vx *= 0.7; p.vz *= 0.7; }
    if (p.life <= 0) p.m.visible = false;
  }
}
const TR = [], trGeo = new THREE.BoxGeometry(1, 1, 1);
for (let i = 0; i < 20; i++) {
  const m = new THREE.Mesh(trGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, fog: false }));
  m.visible = false; scene.add(m); TR.push({ m, life: 0, max: 0.1 });
}
let trI = 0;
function tracer(a, b, color, width) {
  const t = TR[trI++ % TR.length];
  t.m.position.copy(a).add(b).multiplyScalar(0.5);
  t.m.scale.set(width, width, Math.max(0.01, a.distanceTo(b)));
  t.m.lookAt(b);
  t.m.material.color.setHex(color); t.m.material.opacity = 1;
  t.life = t.max = 0.09; t.m.visible = true;
}
function updateTracers(dt) {
  for (const t of TR) {
    if (t.life <= 0) continue;
    t.life -= dt; t.m.material.opacity = Math.max(0, t.life / t.max);
    if (t.life <= 0) t.m.visible = false;
  }
}
