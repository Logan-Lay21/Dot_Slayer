'use strict';
/* Floor height, ramps, building the level from the generated grid */
function floorY(x, z) {
  const c = Math.floor(x / CS), r = Math.floor(z / CS);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
  const h = hgt[r][c];
  if (!h) return 0;
  const t = h.ax === 'x' ? x / CS - c : z / CS - r;
  return h.a + (h.b - h.a) * t;
}
const rampGroup = new THREE.Group(); scene.add(rampGroup);
const rampMat = new THREE.MeshStandardMaterial({ color: 0x2a3bd8, emissive: 0x1423a0, emissiveIntensity: 0.7, roughness: 0.6 });
const rampEdge = new THREE.LineBasicMaterial({ color: 0x46e6ff });
let mapLevel = 1;
function genMap(sd, lv) {
  mapLevel = lv;
  const { g, runs, e, R, C } = genGrid(sd, lv);
  OFF = e; ROWS = R; COLS = C;
  walls.length = 0; dotAt.length = 0; hgt.length = 0; grid.length = 0;
  for (let r = 0; r < R; r++) { walls.push(new Array(C).fill(true)); dotAt.push(new Array(C).fill(null)); hgt.push(new Array(C).fill(null)); grid.push(g[r].slice()); }
  SPAWNS.length = 0; dotList.length = 0; smalls.length = 0; bigs.length = 0; rampRuns.length = 0;
  for (const k of runs) {
    rampRuns.push(k);
    for (let i = 0; i < k.L; i++) {
      const c = k.ax === 'x' ? k.c + i : k.c, r = k.ax === 'x' ? k.r : k.r + i;
      hgt[r][c] = { ax: k.ax, a: i === 0 ? 0 : RAMP_H, b: i === k.L - 1 ? 0 : RAMP_H, run: k };
    }
  }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = g[r][c];
    walls[r][c] = ch === '#';
    if (ch === '.' || ch === 'o') {
      const h = hgt[r][c];
      const d = { c, r, n: dotList.length, big: ch === 'o', alive: true, idx: -1, mesh: null, fy: h ? (h.a + h.b) / 2 : 0 };
      dotAt[r][c] = d; dotList.push(d);
    }
    if (ch === 'G') SPAWNS.push({ c, r });
    if (ch === 'P') playerStart = { c, r };
  }
  dotList.forEach(d => { if (d.big) { d.mesh = bigMeshes[bigs.length]; bigs.push(d); } else { d.idx = smalls.length; smalls.push(d); } });
}
function applyMap() {
  setPalette(mapLevel);
  floor.scale.set(COLS * CS, ROWS * CS, 1); floor.position.set(COLS * CS / 2, 0, ROWS * CS / 2); floorTex.repeat.set(COLS, ROWS);
  ceil.scale.set(COLS * CS, ROWS * CS, 1); ceil.position.set(COLS * CS / 2, CEIL_H, ROWS * CS / 2);
  gateBars.forEach(b => { b.visible = false; });
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (walls[r][c]) { m4.makeTranslation((c + 0.5) * CS, WALL_H / 2, (r + 0.5) * CS); wallMesh.setMatrixAt(n++, m4); }
  wallMesh.count = n; wallMesh.instanceMatrix.needsUpdate = true;
  smalls.forEach(d => placeDot(d)); dotMesh.count = smalls.length; dotMesh.instanceMatrix.needsUpdate = true;
  bigMeshes.forEach(m => { m.visible = false; });
  bigs.forEach(d => { d.mesh.visible = true; d.mesh.position.set((d.c + 0.5) * CS, d.fy + 1.3, (d.r + 0.5) * CS); });
  while (rampGroup.children.length) { const o = rampGroup.children.pop(); if (o.geometry) o.geometry.dispose(); }
  const th = 0.26, len = Math.hypot(CS, RAMP_H), ang = Math.atan2(RAMP_H, CS);
  const piece = (geo, x, y, z, rx, rz) => {
    const m = new THREE.Mesh(geo, rampMat); m.position.set(x, y, z); m.rotation.x = rx || 0; m.rotation.z = rz || 0;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), rampEdge); m.add(e); rampGroup.add(m);
  };
  for (const k of rampRuns) for (let i = 0; i < k.L; i++) {
    const c = k.ax === 'x' ? k.c + i : k.c, r = k.ax === 'x' ? k.r : k.r + i, cx = (c + 0.5) * CS, cz = (r + 0.5) * CS;
    const up = i === 0, down = i === k.L - 1;
    if (!up && !down) piece(new THREE.BoxGeometry(CS, th, CS), cx, RAMP_H - th / 2, cz);
    else if (k.ax === 'x') piece(new THREE.BoxGeometry(len, th, CS), cx, RAMP_H / 2 - th * 0.5, cz, 0, up ? ang : -ang);
    else piece(new THREE.BoxGeometry(CS, th, len), cx, RAMP_H / 2 - th * 0.5, cz, up ? -ang : ang, 0);
  }
}
genMap(1, 1); applyMap();
