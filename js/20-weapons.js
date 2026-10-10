'use strict';
/* Weapon table and first-person gun models */
/* ---------- weapons ---------- */
const WEAPONS = [
  { name: 'PISTOL', short: 'PISTOL', dmg: 1, cd: 0.4, cost: 1, pellets: 1, spread: 0, pierce: false, color: 0xdfe6ff, stun: 0.35, pvp: 14 },
  { name: 'SMG', short: 'SMG', dmg: 1, cd: 0.1, cost: 1, pellets: 1, spread: 0.018, pierce: false, color: 0xffd84a, stun: 0.2, pvp: 8 },
  { name: 'SHOTGUN', short: 'SHOTGUN', dmg: 1, cd: 0.72, cost: 2, pellets: 8, spread: 0.07, pierce: false, color: 0xff9a2e, stun: 0.5, pvp: 7 },
  { name: 'RAIL CANNON', short: 'RAIL', dmg: 6, cd: 0.6, cost: 3, pellets: 1, spread: 0, pierce: true, color: 0x46e6ff, stun: 0.9, pvp: 40 }
];

/* gun viewmodel lives in its own scene so it never clips into walls */
const gunScene = new THREE.Scene();
const gunCam = new THREE.PerspectiveCamera(60, 1, 0.05, 10);
gunScene.add(new THREE.AmbientLight(0xaab4ff, 0.9));
const gunSun = new THREE.DirectionalLight(0xffffff, 0.9);
gunSun.position.set(1, 2, 2); gunScene.add(gunSun);
const gunRoot = new THREE.Group();
gunRoot.position.set(0.34, -0.32, -0.62);
gunScene.add(gunRoot);
const gunMats = {
  body: new THREE.MeshStandardMaterial({ color: 0x252a52, roughness: 0.5, metalness: 0.4 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd9a37c, roughness: 0.8 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x3a1f6b, roughness: 0.9 })
};
const muzzleFlash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.02), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
muzzleFlash.visible = false;
function gbox(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); gunRoot.add(m); return m;
}
function buildGun(i) {
  while (gunRoot.children.length) gunRoot.remove(gunRoot.children[0]);
  const w = WEAPONS[i], B = gunMats.body, A = gunMats.accent;
  A.color.setHex(w.color); A.emissive.setHex(w.color);
  gbox(0.14, 0.14, 0.55, gunMats.sleeve, 0.02, -0.2, 0.34);
  gbox(0.1, 0.1, 0.14, gunMats.skin, 0, -0.1, 0.04);
  let mz = -0.3;
  if (i === 0) {
    gbox(0.08, 0.1, 0.36, B, 0, 0, -0.1); gbox(0.085, 0.02, 0.2, A, 0, 0.06, -0.15); gbox(0.07, 0.16, 0.09, B, 0, -0.12, 0.02);
  } else if (i === 1) {
    gbox(0.09, 0.13, 0.5, B, 0, 0, -0.12); gbox(0.04, 0.04, 0.25, B, 0, 0.02, -0.4); gbox(0.06, 0.22, 0.08, B, 0, -0.17, 0.0); gbox(0.095, 0.02, 0.3, A, 0, 0.075, -0.15); mz = -0.53;
  } else if (i === 2) {
    gbox(0.11, 0.1, 0.5, B, 0, 0, -0.05); gbox(0.05, 0.05, 0.7, B, -0.03, 0.05, -0.35); gbox(0.05, 0.05, 0.7, B, 0.03, 0.05, -0.35);
    gbox(0.13, 0.08, 0.2, A, 0, -0.06, -0.25); mz = -0.72;
  } else {
    gbox(0.12, 0.14, 0.7, B, 0, 0, -0.2);
    gbox(0.2, 0.2, 0.04, A, 0, 0, -0.1); gbox(0.2, 0.2, 0.04, A, 0, 0, -0.3); gbox(0.2, 0.2, 0.04, A, 0, 0, -0.5);
    gbox(0.05, 0.05, 0.3, B, 0, 0, -0.65); mz = -0.82;
  }
  muzzleFlash.position.set(0, 0.02, mz - 0.05);
  gunRoot.add(muzzleFlash);
}
