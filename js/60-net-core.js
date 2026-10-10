'use strict';
/* Multiplayer core: remote players, sending, tick */
/* ---------- multiplayer: peer to peer, the host runs the zombies ---------- */
const PCOLORS = [0xffd84a, 0x5ef28a, 0xb98aff, 0xffffff];
const PCSS = ['#ffd84a', '#5ef28a', '#b98aff', '#ffffff'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeGuy(id) {
  const g = new THREE.Group();
  const col = new THREE.MeshStandardMaterial({ color: PCOLORS[id], roughness: 0.7, flatShading: true, emissive: PCOLORS[id], emissiveIntensity: 0.25 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a37c, roughness: 0.8, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x20243f, roughness: 0.8, flatShading: true });
  const part = (w, h, d, m, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); (parent || g).add(b); return b; };
  const piv = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); (parent || g).add(p); return p; };
  const legs = [-0.17, 0.17].map(x => { const p = piv(x, 0.9, 0); part(0.28, 0.9, 0.3, dark, 0, -0.45, 0, p); return p; });
  const torso = piv(0, 0.9, 0);
  part(0.8, 0.95, 0.42, col, 0, 0.48, 0, torso);
  part(0.5, 0.5, 0.5, skin, 0, 1.22, 0, torso);
  part(0.52, 0.14, 0.54, col, 0, 1.5, 0, torso);
  const armL = piv(-0.52, 0.8, 0, torso); part(0.22, 0.8, 0.22, skin, 0, -0.4, 0, armL);
  const armR = piv(0.52, 0.8, 0, torso); part(0.22, 0.8, 0.22, skin, 0, -0.4, 0, armR);
  part(0.14, 0.2, 0.55, dark, 0, -0.85, -0.12, armR);
  armR.rotation.x = 1.35;
  g.userData.legs = legs; g.userData.torso = torso; g.userData.armL = armL; g.userData.armR = armR;
  const c = document.createElement('canvas'); c.width = 128; c.height = 48;
  const x = c.getContext('2d'); x.font = '700 30px sans-serif'; x.textAlign = 'center'; x.fillStyle = PCSS[id]; x.fillText('P' + (id + 1), 64, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  sp.scale.set(1.6, 0.6, 1); sp.position.y = 3.0; g.add(sp);
  const bar = new THREE.Group(); bar.position.y = 3.5; g.add(bar);
  bar.add(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.16), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })));
  const fg = new THREE.PlaneGeometry(1.2, 0.16); fg.translate(0.6, 0, 0);
  const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x5ef28a, side: THREE.DoubleSide }));
  fill.position.set(-0.6, 0, 0.01); bar.add(fill);
  g.userData.bar = bar; g.userData.fill = fill;
  g.visible = false; scene.add(g);
  return g;
}
function newRemote(id) {
  return { id, name: 'P' + (id + 1), x: 0, z: 0, yaw: 0, tx: 0, tz: 0, tyaw: 0, pitch: 0, w: 0, l: 3, s: 0, a: true, hp: 100, inv: 0, py: 0, v: 0, ph: 0, kickT: 0, last: performance.now(), seen: false, mesh: makeGuy(id) };
}
function setRemote(p, a) {
  p.tx = a[1]; p.tz = a[2]; p.tyaw = a[3]; p.pitch = a[4]; p.w = a[5]; p.l = a[6]; p.s = a[7]; p.a = !!a[8]; p.hp = a.length > 9 ? a[9] : 100; p.py = a.length > 10 ? a[10] : 0;
  if (!p.seen) { p.x = p.tx; p.z = p.tz; p.yaw = p.tyaw; p.seen = true; }
}
function removeRemote(id) {
  const p = net.players[id]; if (!p) return;
  scene.remove(p.mesh); delete net.players[id];
}
function updateRemotes(dt) {
  const k = Math.min(1, dt * 12);
  for (const id in net.players) {
    const p = net.players[id];
    if (!p.seen) { p.mesh.visible = false; continue; }
    p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k;
    let dy = p.tyaw - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.yaw += dy * k;
    const spd = Math.min(14, Math.hypot(p.tx - p.x, p.tz - p.z) * 12);
    p.v += (spd - p.v) * Math.min(1, dt * 10); p.ph += p.v * dt * 1.3; p.kickT = Math.max(0, p.kickT - dt);
    const amp = Math.min(1, p.v / 5), air = (p.py || 0) > floorY(p.x, p.z) + 0.2, u = p.mesh.userData, ph = p.ph;
    p.mesh.visible = p.a; p.mesh.position.set(p.x, (p.py || 0) + (air ? 0 : Math.abs(Math.sin(ph)) * 0.07 * amp), p.z); p.mesh.rotation.y = p.yaw;
    u.legs[0].rotation.x = air ? 0.6 : Math.sin(ph) * 0.9 * amp; u.legs[1].rotation.x = air ? -0.4 : -Math.sin(ph) * 0.9 * amp;
    u.armL.rotation.x = air ? 2.5 : -Math.sin(ph) * 0.8 * amp;
    u.armR.rotation.x = 1.35 + Math.sin(ph * 2) * 0.05 * amp - p.kickT * 2.4 + (air ? -0.2 : 0);
    u.torso.rotation.x = -Math.min(1, p.v / 9) * 0.2; u.torso.rotation.z = Math.sin(ph) * 0.05 * amp;
    u.torso.scale.y = 1 + Math.sin(performance.now() / 420 + p.id) * 0.012;
    const f = Math.max(0.001, p.hp / 100), ud = p.mesh.userData;
    ud.fill.scale.x = f; ud.fill.material.color.setHSL(f * 0.33, 0.85, 0.5);
    ud.bar.rotation.y = Math.atan2(px - p.x, pz - p.z) - p.yaw;
  }
}

/* ---------- sending ---------- */
function netSend(m) { try { if (net.hostConn && net.hostConn.open) net.hostConn.send(m); } catch (e) {} }
function netToPeer(id, m) { const c = net.conns[id]; try { if (c && c.open) c.send(m); } catch (e) {} }
function netBroadcast(m, except) { for (const id in net.conns) if (+id !== except) netToPeer(+id, m); }
function netDot(n) {
  if (net.role === 'host') netBroadcast({ t: 'dot', n });
  else if (net.role === 'client') netSend({ t: 'dot', n });
}
function netFx(a, b, c, w) {
  if (!net.role) return;
  const m = { t: 'fx', ox: r2(a.x), oy: r2(a.y), oz: r2(a.z), ex: r2(b.x), ey: r2(b.y), ez: r2(b.z), c, w, by: net.myId };
  if (net.role === 'host') netBroadcast(m); else netSend(m);
}
function spawnFx(m) { const q = net.players[m.by]; if (q) q.kickT = 0.15; tracer(new THREE.Vector3(m.ox, m.oy, m.oz), new THREE.Vector3(m.ex, m.ey, m.ez), m.c, m.w); }
function remoteDot(n) {
  const d = dotList[n];
  if (!d || !d.alive) return false;
  d.alive = false; aliveDots--;
  if (d.big) d.mesh.visible = false; else { dotMesh.setMatrixAt(d.idx, ZERO); dotMesh.instanceMatrix.needsUpdate = true; }
  return true;
}
function myP() { return [net.myId, r2(px), r2(pz), r2(yaw), r2(pitch), wIdx, lives, score, ghost ? 0 : 1, Math.ceil(hp), r2(py)]; }
function allP() {
  const out = [myP()];
  for (const id in net.players) { const p = net.players[id]; out.push([p.id, p.tx, p.tz, p.tyaw, p.pitch, p.w, p.l, p.s, p.a ? 1 : 0, p.hp]); }
  return out;
}
function netTick(dt) {
  net.t += dt;
  if (net.role === 'host' && net.t >= 1 / 15) {
    net.t = 0;
    netBroadcast({ t: 'snap', z: zombies.map(z => [r2(z.x), r2(z.z), r2(z.rot), z.state, r2(z.hp), z.maxHp, z.mode === 'walk' ? 0 : z.mode === 'fall' ? 1 : 2, (z.lost[0] ? 1 : 0) | (z.lost[1] ? 2 : 0) | (z.lost[2] ? 4 : 0) | (z.lost[3] ? 8 : 0), z.state === 'house' ? r2(z.timer) : 0]), p: allP(), sp: specSnap(), lv: level, sd: seed, gm: gameMode, mh: mapHash });
  } else if (net.role === 'client' && net.t >= 1 / 20) {
    net.t = 0; netSend({ t: 'st', a: myP() });
  }
}
