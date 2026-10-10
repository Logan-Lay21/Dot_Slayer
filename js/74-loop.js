'use strict';
/* Main loop and rendering */
function resize() {
  const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  gunCam.aspect = w / h; gunCam.updateProjectionMatrix();
}
addEventListener('resize', resize);

function step(dt) {
  fireCd = Math.max(0, fireCd - dt); invuln = Math.max(0, invuln - dt);
  for (const k in pu) pu[k] = Math.max(0, pu[k] - dt);
  freezeT = Math.max(0, freezeT - dt);
  if (net.role !== 'client') {
    modeT += dt;
    if (scatter && modeT > 5) { scatter = false; modeT = 0; } else if (!scatter && modeT > 22) { scatter = true; modeT = 0; }
  }
  movePlayer(dt);
  if (mouseFire || touchFire || keys.KeyF || queued) { fire(); queued = false; }
  collectDots();
  if (net.role === 'client') {
    for (const z of zombies) puppetZombie(z, dt);
    for (const s of specials) puppetSpecial(s, dt);
  } else {
    for (const z of zombies) updateZombie(z, dt);
    updateSpecials(dt); wallPushActors(); specialsContact(dt);
    if (invuln <= 0 && !ghost && freezeT <= 0) {
      for (const z of zombies) {
        if ((z.state === 'active' || z.state === 'leaving') && z.mode !== 'fall' && Math.hypot(z.x - px, z.z - pz) < 1.5 && Math.abs(py - floorY(z.x, z.z)) < 1.0) { takeDamage(25, -1, z); break; }
      }
    }
    if (net.role === 'host') hostContact(dt);
  }
  if (net.role) { netTick(dt); updateRemotes(dt); }
  if (state === 'play' && net.role !== 'client' && aliveDots === 0) levelClear();
  if (state === 'play') {
    updateHud();
    if (net.role) { net.boardT -= dt; if (net.boardT <= 0) { net.boardT = 0.4; $('board').innerHTML = boardHtml(); } }
  }
}
function fx(dt) {
  updateParticles(dt); updateTracers(dt); updateGibs(dt);
  shakeMag = Math.max(0, shakeMag - dt * 1.6);
  kick = Math.max(0, kick - dt * 7); flashT = Math.max(0, flashT - dt);
  const t = performance.now() / 1000;
  bigs.forEach((d, i) => { if (d.mesh.visible) { d.mesh.position.y = d.fy + 1.3 + Math.sin(t * 2 + i) * 0.18; d.mesh.userData.cage.rotation.y = t * 1.5; d.mesh.userData.cage.rotation.x = t * 0.8; } });
  sprintK += ((running ? 1 : 0) - sprintK) * Math.min(1, dt * 8);
  swapT = Math.max(0, swapT - dt); landT = Math.max(0, landT - dt * 1.1);
  const swapDrop = Math.sin(Math.min(1, swapT / 0.25) * Math.PI) * 0.35;
  gunRoot.position.set(0.34 + Math.sin(bobT * 0.5) * (0.012 + sprintK * 0.03) - sprintK * 0.06, -0.32 + bobY * 0.35 - kick * 0.02 - sprintK * 0.07 - swapDrop - landT * 0.5 + (onGround ? 0 : 0.03), -0.62 + kick * 0.09);
  gunRoot.rotation.x = kick * 0.12 + sprintK * 0.28 + swapDrop * 0.8;
  gunRoot.rotation.z = -sprintK * 0.4;
  const tf = running ? 88 : 78; if (Math.abs(camera.fov - tf) > 0.1) { camera.fov += (tf - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
  muzzleFlash.visible = flashT > 0;
  muzzleFlash.scale.setScalar(0.8 + Math.random() * 0.8);
  flashLight.intensity = flashT > 0 ? 2.2 : 0;
  if (state === 'title') { yaw += dt * 0.25; }
}
function render() {
  camera.position.set(px, Math.min(CEIL_H - 0.5, EYE + py + bobY - landT * 1.2), pz);
  if (shakeMag > 0.005) camera.position.set(camera.position.x + (Math.random() - 0.5) * shakeMag, camera.position.y + (Math.random() - 0.5) * shakeMag, camera.position.z + (Math.random() - 0.5) * shakeMag);
  camera.rotation.set(pitch, yaw, 0);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(gunScene, gunCam);
  if (state !== 'title') drawMap();
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (state === 'play') step(dt);
  if (state !== 'paused') fx(dt);
  render();
}
