'use strict';
/* Zombie types and meshes */
/* ---------- zombies ---------- */
const ZDEF = [
  { name: 'ROTTER', role: 'chases you', color: 0xff3b4e, css: '#ff3b4e', scatter: [-1, 0] },
  { name: 'GNASH', role: 'cuts you off', color: 0xff7ac8, css: '#ff7ac8', scatter: [0, 0] },
  { name: 'MOLD', role: 'flanks you', color: 0x46e6ff, css: '#46e6ff', scatter: [-1, -1] },
  { name: 'LIMP', role: 'shy up close', color: 0xff9a2e, css: '#ff9a2e', scatter: [0, -1] }
];
function makeZombie(def, i) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const skin = new THREE.MeshStandardMaterial({ color: 0x8fae86, roughness: 0.9, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0 });
  const cloth = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8, flatShading: true, emissive: def.color, emissiveIntensity: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x16182e, roughness: 0.9, flatShading: true });
  const eye = new THREE.MeshBasicMaterial({ color: def.color });
  const gore = new THREE.MeshStandardMaterial({ color: 0x7a0714, roughness: 0.6, flatShading: true, emissive: 0x4a0008, emissiveIntensity: 0.6 });
  const part = (w, h, d, mat, x, y, z, parent) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); (parent || g).add(m); return m;
  };
  const piv = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); (parent || g).add(p); return p; };
  const legs = [-1, 1].map(s => { const p = piv(s * 0.2, 0.95, 0); part(0.32, 0.95, 0.32, dark, 0, -0.475, 0, p); return p; });
  const legStumps = [-1, 1].map(s => { const m = part(0.3, 0.3, 0.3, gore, s * 0.2, 0.85, 0); m.visible = false; return m; });
  const up = piv(0, 0.95, 0);
  part(0.85, 0.95, 0.45, cloth, 0, 0.5, 0, up);
  const head = piv(0, 0.98, 0, up);
  part(0.56, 0.56, 0.56, skin, 0, 0.28, 0, head);
  part(0.13, 0.1, 0.05, eye, -0.14, 0.34, -0.29, head); part(0.13, 0.1, 0.05, eye, 0.14, 0.34, -0.29, head);
  part(0.3, 0.07, 0.05, dark, 0, 0.16, -0.29, head);
  const arms = [-1, 1].map(s => { const p = piv(s * 0.58, 0.9, 0, up); p.rotation.x = Math.PI / 2; part(0.24, 0.85, 0.24, skin, 0, -0.42, 0, p); return p; });
  const armStumps = [-1, 1].map(s => { const m = part(0.26, 0.26, 0.26, gore, s * 0.58, 0.85, 0, up); m.visible = false; return m; });
  const neckStump = part(0.28, 0.3, 0.28, gore, 0, 0.98, 0, up); neckStump.visible = false;
  const bar = new THREE.Group(); bar.position.y = 3.0; g.add(bar);
  bar.add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })));
  const fg = new THREE.PlaneGeometry(1.2, 0.14); fg.translate(0.6, 0, 0);
  const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide }));
  fill.position.set(-0.6, 0, 0.01); bar.add(fill);
  scene.add(g);
  return { i, def, mesh: g, legs, arms, up, head, neckStump, legStumps, armStumps, skin, cloth, bar, fill, hp: 3, maxHp: 3, state: 'house', mode: 'walk', modeT: 0, lost: [false, false, false, false], limbHp: [2, 2, 2, 2], x: 0, z: 0, c: 0, r: 0, nc: 0, nr: 0, dir: [0, 0], tc: 0, tr: 0, timer: 0, slow: 0, flashT: 0, anim: Math.random() * 6, deadT: 0, respawn: 0, rot: 0 };
}
const zombies = ZDEF.map(makeZombie);

function setFlash(z, on) {
  z.cloth.emissive.setHex(on ? 0xffffff : z.def.color);
  z.cloth.emissiveIntensity = on ? 1 : 0.35;
  z.skin.emissiveIntensity = on ? 0.9 : 0;
}
