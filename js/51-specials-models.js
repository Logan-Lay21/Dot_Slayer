'use strict';
/* Special zombie models and setup */
/* ---------- models ---------- */
const spMat = (c, e, ei) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, emissive: e == null ? 0 : e, emissiveIntensity: ei || 0 }); m.userData = { e: e == null ? 0 : e, i: ei || 0 }; return m; };
function spBuilder() {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const mats = [];
  const part = (w, h, d, mat, x, y, z, parent) => { if (mats.indexOf(mat) < 0 && mat.userData && mat.userData.i !== undefined) mats.push(mat); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || g).add(m); return m; };
  const piv = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); (parent || g).add(p); return p; };
  return { g, part, piv, mats };
}
function spBar(g, y, color) {
  const bar = new THREE.Group(); bar.position.y = y; g.add(bar);
  bar.add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })));
  const fg = new THREE.PlaneGeometry(1.2, 0.14); fg.translate(0.6, 0, 0);
  const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide }));
  fill.position.set(-0.6, 0, 0.01); bar.add(fill); bar.visible = false;
  return { bar, fill };
}
function buildWallMesh() {
  const b = spBuilder(), { part, piv } = b;
  const skin = spMat(0xa9b58a), shirt = spMat(0x6b5a7a), dark = spMat(0x1a1c30), belly = spMat(0xb8c49a), eye = new THREE.MeshBasicMaterial({ color: 0xff3b4e });
  const legs = [-1, 1].map(s => { const p = piv(s * 0.95, 1.2, 0); part(1.3, 1.2, 1.4, dark, 0, -0.6, 0, p); return p; });
  part(3.4, 2.5, 3.2, shirt, 0, 2.45, 0);
  part(2.9, 1.3, 0.6, belly, 0, 2.0, -1.75);
  part(3.5, 0.3, 3.3, dark, 0, 1.55, 0);
  const head = piv(0, 3.7, -0.2);
  part(1.4, 1.2, 1.4, skin, 0, 0.45, 0, head);
  part(0.3, 0.22, 0.1, eye, -0.35, 0.65, -0.72, head); part(0.3, 0.22, 0.1, eye, 0.35, 0.65, -0.72, head);
  part(0.9, 0.16, 0.1, dark, 0, 0.2, -0.72, head);
  const arms = [-1, 1].map(s => { const p = piv(s * 1.75, 3.5, 0); part(0.6, 2.0, 0.8, skin, 0, -1.0, 0, p); return p; });
  return { g: b.g, mats: b.mats, legs, arms, head };
}
function buildChargerMesh() {
  const b = spBuilder(), { part, piv } = b;
  const jersey = spMat(0xf2f2f2), pad = spMat(0x2f6bff, 0x2f6bff, 0.3), pants = spMat(0xdedede), helm = spMat(0xffc21a, 0xffc21a, 0.25), skin = spMat(0x8fae86), dark = spMat(0x16182e);
  const red = new THREE.MeshBasicMaterial({ color: 0xff3b4e }), yel = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  const legs = [-1, 1].map(s => { const p = piv(s * 0.24, 0.95, 0); part(0.4, 0.95, 0.4, pants, 0, -0.475, 0, p); return p; });
  const up = piv(0, 0.95, 0);
  part(0.95, 1.0, 0.58, jersey, 0, 0.5, 0, up);
  part(1.6, 0.36, 0.75, pad, 0, 0.98, 0, up);
  part(0.42, 0.42, 0.04, pad, 0, 0.55, -0.31, up); part(0.42, 0.42, 0.04, pad, 0, 0.55, 0.31, up);
  const head = piv(0, 1.1, 0, up);
  part(0.6, 0.6, 0.62, skin, 0, 0.3, 0, head);
  part(0.7, 0.4, 0.72, helm, 0, 0.46, 0, head);
  part(0.5, 0.06, 0.04, dark, 0, 0.26, -0.36, head); part(0.5, 0.06, 0.04, dark, 0, 0.12, -0.36, head);
  part(0.1, 0.08, 0.04, red, -0.14, 0.34, -0.33, head); part(0.1, 0.08, 0.04, red, 0.14, 0.34, -0.33, head);
  const mouth = part(0.26, 0.05, 0.04, dark, 0, 0.14, -0.37, head);
  const arms = [-1, 1].map(s => { const p = piv(s * 0.88, 0.88, 0, up); part(0.3, 0.9, 0.3, skin, 0, -0.45, 0, p); return p; });
  const excl = piv(0, 3.0, 0); part(0.16, 0.5, 0.1, red, 0, 0.35, 0, excl); part(0.16, 0.16, 0.1, red, 0, -0.05, 0, excl); excl.visible = false;
  const stars = piv(0, 2.55, 0); for (let i = 0; i < 3; i++) { const a = i * 2.094; part(0.14, 0.14, 0.14, yel, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, stars); } stars.visible = false;
  b.g.scale.setScalar(1.3);
  return { g: b.g, mats: b.mats, legs, arms, up, head, mouth, excl, stars };
}
function buildAmbusherMesh() {
  const b = spBuilder(), { part, piv } = b;
  const skin = spMat(0x3a2a4a, 0x2a1040, 0.25), dark = spMat(0x120d1c), tooth = spMat(0xe8e0c8);
  const eye = new THREE.MeshBasicMaterial({ color: 0xffe14a });
  const legs = [-1, 1].map(s => { const p = piv(s * 0.22, 0.5, 0); part(0.22, 0.55, 0.26, dark, 0, -0.27, 0, p); return p; });
  const up = piv(0, 0.5, 0);
  part(0.62, 0.55, 0.46, skin, 0, 0.28, 0, up);
  const head = piv(0, 0.6, -0.12, up);
  part(0.46, 0.4, 0.42, skin, 0, 0.2, 0, head);
  const eyes = [-1, 1].map(s => part(0.15, 0.13, 0.04, eye, s * 0.12, 0.24, -0.22, head));
  part(0.28, 0.06, 0.04, tooth, 0, 0.07, -0.22, head);
  const arms = [-1, 1].map(s => { const p = piv(s * 0.42, 0.6, 0, up); part(0.15, 0.75, 0.15, skin, 0, -0.37, 0, p); part(0.2, 0.12, 0.2, dark, 0, -0.78, 0, p); return p; });
  b.g.scale.setScalar(0.8);
  return { g: b.g, mats: b.mats, legs, arms, up, head, eyes };
}
function buildStalkerMesh() {
  const b = spBuilder(), { part, piv } = b;
  const dark = spMat(0x14101c), skin = spMat(0xcfd6c8, 0x9aa89a, 0.2);
  const eye = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const legs = [-1, 1].map(s => { const p = piv(s * 0.16, 0.95, 0); part(0.2, 0.95, 0.22, dark, 0, -0.475, 0, p); return p; });
  const up = piv(0, 0.95, 0);
  part(0.55, 1.05, 0.3, dark, 0, 0.52, 0, up);
  const head = piv(0, 1.12, -0.05, up);
  part(0.38, 0.46, 0.38, skin, 0, 0.23, 0, head);
  part(0.09, 0.07, 0.04, eye, -0.1, 0.28, -0.2, head); part(0.09, 0.07, 0.04, eye, 0.1, 0.28, -0.2, head);
  part(0.2, 0.04, 0.04, dark, 0, 0.1, -0.2, head);
  const arms = [-1, 1].map(s => { const p = piv(s * 0.36, 1.35, 0, up); part(0.12, 1.3, 0.12, skin, 0, -0.65, 0, p); return p; });
  return { g: b.g, mats: b.mats, legs, arms, up, head };
}
function makeSpecial(p, id) {
  const lv = level, kind = p.kind;
  const M = kind === 'wall' ? buildWallMesh() : kind === 'charger' ? buildChargerMesh() : kind === 'stalker' ? buildStalkerMesh() : buildAmbusherMesh();
  const s = Object.assign({ id, kind, mesh: M.g, mats: M.mats, legs: M.legs, arms: M.arms, up: M.up, head: M.head, mouth: M.mouth, excl: M.excl, stars: M.stars, eyes: M.eyes }, {
    st: 0, stT: 0, anim: Math.random() * 6, flashT: 0, state: 'active', hp: 1, maxHp: 1, rot: 0, trot: 0, dir: [0, 0], cdir: [0, 0], tc: 0, tr: 0, pause: 0, cool: 0, biteCd: 0, fT: 0, dur: 0, lastStep: 0, dustT: 0, nseen: false
  });
  s.hp = s.maxHp = kind === 'charger' ? 10 + 3 * lv : kind === 'ambusher' ? 2 + Math.floor(lv / 2) : kind === 'stalker' ? 4 + lv : 1;
  if (kind === 'ambusher') {
    const cx = (p.c + 0.5) * CS, cz = (p.r + 0.5) * CS;
    s.home = { x: cx + p.d[0] * 1.7, z: cz + p.d[1] * 1.7, y: WALL_H, rot: Math.atan2(-p.d[0], -p.d[1]) };
  } else if (kind === 'stalker') {
    s.home = { x: 0, z: 0, y: 0, rot: 0 }; s.c = s.nc = 0; s.r = s.nr = 0;
  } else {
    s.home = { x: (p.c + 0.5) * CS, z: (p.r + 0.5) * CS, y: 0, rot: 0 };
    s.c = s.nc = p.c; s.r = s.nr = p.r;
  }
  const bh = kind === 'charger' ? 3.0 : kind === 'ambusher' ? 1.9 : kind === 'stalker' ? 2.7 : 0;
  if (bh) { const b = spBar(s.mesh, bh, kind === 'charger' ? 0x2f6bff : kind === 'stalker' ? 0xdfe6ff : 0xffe14a); s.bar = b.bar; s.fill = b.fill; }
  scene.add(s.mesh);
  resetSpecial(s);
  return s;
}
function resetSpecial(s) {
  const h = s.home;
  s.x = s.tx = h.x; s.z = s.tz = h.z; s.y = s.ty = h.y; s.rot = s.trot = h.rot;
  s.lastDir = null; s.st = 0; s.stT = 0; s.pause = 0; s.cool = 1.5; s.state = 'active'; s.flashT = 0; s.nseen = false;
  s.mesh.visible = s.kind !== 'stalker'; s.mesh.scale.set(1, 1, 1); s.mesh.scale.setScalar(s.kind === 'charger' ? 1.3 : s.kind === 'ambusher' ? 0.8 : s.kind === 'stalker' ? 1.1 : 1);
  if (s.kind === 'wall') s.mesh.scale.y = WALL_BH / 4.45;
  if (s.kind === 'stalker') { s.cool = 14; s.tid = -1; s.idx = 0; s.nseen = false; }
  if (s.kind !== 'ambusher' && s.kind !== 'stalker') { s.c = s.nc = Math.floor(s.x / CS); s.r = s.nr = Math.floor(s.z / CS); s.dir = [0, 0]; }
  if (s.kind === 'wall') pickChase(s);
  else if (s.kind === 'charger') pickWander(s);
  if (s.fill) { s.fill.scale.x = 1; s.bar.visible = false; }
  flashSpecial(s, false);
}
function resetSpecials() { for (const k in trails) delete trails[k]; specials.forEach(s => { if (s.kind === 'charger' && s.st === CH.DEAD) return; if (s.kind === 'ambusher' && s.st === AM.DEAD) return; const hp = s.hp; resetSpecial(s); s.hp = hp; if (s.fill) s.fill.scale.x = Math.max(0.001, s.hp / s.maxHp); }); }
function clearSpecials() {
  specials.forEach(s => { scene.remove(s.mesh); s.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); }); });
  specials.length = 0;
}
function buildSpecials(lv) {
  clearSpecials(); for (const k in trails) delete trails[k];
  planSpecials(lv).forEach((p, i) => specials.push(makeSpecial(p, i)));
  const names = []; specials.forEach(s => { if (s.kind === 'stalker') return; const n = SP_NAMES[s.kind]; if (names.indexOf(n) < 0) names.push(n); });
  if (names.length) setTimeout(() => { if (state === 'play') toast('WATCH OUT: ' + names.join(', '), '#ff9a2e'); }, 2400);
}
function flashSpecial(s, on) {
  s.mats.forEach(m => { m.emissive.setHex(on ? 0xffffff : m.userData.e); m.emissiveIntensity = on ? 0.9 : m.userData.i; });
}
