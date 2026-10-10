'use strict';
/* Renderer, camera, lights, level palettes and textures, wall mesh */
/* ---------- renderer, scene, lights ---------- */
const canvas = $('view'), app = $('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.autoClear = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060f);
scene.fog = new THREE.Fog(0x05060f, 8, 44);
const camera = new THREE.PerspectiveCamera(78, 1, 0.1, 100);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.AmbientLight(0x7080d0, 0.75));
const lamp = new THREE.PointLight(0xdfe6ff, 1.0, 28, 1.4);
camera.add(lamp);
const flashLight = new THREE.PointLight(0xffa040, 0, 14, 1.5);
flashLight.position.set(0.3, -0.2, -1.2);
camera.add(flashLight);

function canvasTex(w, h, draw, rx, ry) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
  t.anisotropy = 4;
  return t;
}
/* each level gets its own wall color */
const PALS = [
  { bg: '#070b33', line: '#4057ff', soft: 'rgba(110,130,255,.35)', flo: '#171d4d' },
  { bg: '#04210f', line: '#2fdc6a', soft: 'rgba(110,255,160,.35)', flo: '#0e3a1e' },
  { bg: '#2a0a2c', line: '#ff4ad8', soft: 'rgba(255,130,235,.35)', flo: '#4a1450' },
  { bg: '#2e1404', line: '#ff8a1f', soft: 'rgba(255,180,100,.35)', flo: '#4d2508' },
  { bg: '#04252e', line: '#27e0ff', soft: 'rgba(120,235,255,.35)', flo: '#0b3b48' },
  { bg: '#2e0609', line: '#ff3b4e', soft: 'rgba(255,120,130,.35)', flo: '#4d1017' },
  { bg: '#1b0a38', line: '#9d6bff', soft: 'rgba(190,150,255,.35)', flo: '#2e1560' },
  { bg: '#2b2604', line: '#ffd84a', soft: 'rgba(255,235,130,.35)', flo: '#483f0a' }
];
let curPal = PALS[0];
const wallTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = curPal.bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = curPal.line; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8);
  g.strokeStyle = curPal.soft; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h - 40);
});
const floorTex = canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = '#090b1c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = curPal.flo; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
}, COLS, ROWS);
function setPalette(lv) {
  curPal = PALS[(lv - 1) % PALS.length];
  let g = wallTex.image.getContext('2d'), w = 128, h = 128;
  g.fillStyle = curPal.bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = curPal.line; g.lineWidth = 7; g.strokeRect(4, 4, w - 8, h - 8);
  g.strokeStyle = curPal.soft; g.lineWidth = 2; g.strokeRect(20, 20, w - 40, h - 40);
  wallTex.needsUpdate = true;
  g = floorTex.image.getContext('2d'); w = 64; h = 64;
  g.fillStyle = '#090b1c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = curPal.flo; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
  floorTex.needsUpdate = true;
  rampMat.color.set(curPal.line).multiplyScalar(0.55); rampMat.emissive.set(curPal.line).multiplyScalar(0.35); rampEdge.color.set(curPal.line).lerp(new THREE.Color(0xffffff), 0.45);
}

const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x04050d }));
ceil.rotation.x = Math.PI / 2; ceil.position.y = CEIL_H; scene.add(ceil);

const wallMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(CS, WALL_H, CS),
  new THREE.MeshStandardMaterial({ map: wallTex, emissiveMap: wallTex, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.7 }),
  MAXR * MAXC
);
const m4 = new THREE.Matrix4();
wallMesh.frustumCulled = false;
scene.add(wallMesh);

/* pen door bars */
const gateMat = new THREE.MeshBasicMaterial({ color: 0xff7ac8 });
const gateBars = [0.9, 1.7, 2.5].map(y => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(CS * 0.9, 0.12, 0.12), gateMat);
  b.position.set(9.5 * CS, y, 8.5 * CS); scene.add(b); return b;
});
