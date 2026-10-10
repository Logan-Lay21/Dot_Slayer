'use strict';
/* Dot and power-dot meshes */
/* ---------- dots ---------- */
const smalls = [], bigs = [];
const dotMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd84a }), MAXR * MAXC);
dotMesh.frustumCulled = false;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function placeDot(d) { m4.makeTranslation((d.c + 0.5) * CS, d.fy + 1.0, (d.r + 0.5) * CS); dotMesh.setMatrixAt(d.idx, m4); }
scene.add(dotMesh);
const bigMeshes = [0, 1, 2, 3].map(() => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })));
  const cage = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), new THREE.MeshBasicMaterial({ color: 0xffd84a, wireframe: true }));
  g.add(cage); g.userData.cage = cage;
  g.visible = false; scene.add(g); return g;
});
