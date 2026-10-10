'use strict';
/* Multiplayer client side and map sync */
/* ---------- client side ---------- */
function puppetZombie(z, dt) {
  const m = z.mesh;
  if (z.flashT > 0) { z.flashT -= dt; if (z.flashT <= 0) setFlash(z, false); }
  if (z.state === 'dead') {
    z.deadT += dt; animDeath(z);
    return;
  }
  if (z.state === 'house') { z.timer -= dt; z.anim += dt * 2; riseAnim(z); return; }
  const k = Math.min(1, dt * 12), pen = false;
  z.x += (z.tx - z.x) * k; z.z += (z.tz - z.z) * k;
  let d = z.trot - z.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); z.rot += d * k;
  m.rotation.y = z.rot; m.position.set(z.x, pen ? Math.sin(z.anim * 2) * 0.05 : floorY(z.x, z.z), z.z);
  z.modeT += dt; z.anim += z.mode !== 'walk' ? dt * 1.5 : dt * (pen ? 2 : zSpeed() * 1.6); animLimbs(z, pen ? 0.4 : 1);
  z.bar.visible = z.hp < z.maxHp && !pen;
  if (z.bar.visible) z.bar.rotation.y = Math.atan2(px - z.x, pz - z.z) - z.rot;
}
/* the host's map is the truth: if this client built something different, rebuild from the host's seed and level */
function checkSync(m) {
  if (m.lv == null || state === 'title') return;
  net.rsT = Math.max(0, (net.rsT || 0) - 1 / 15);
  const off = (m.gm | 0) !== gameMode || m.lv !== level || m.sd !== seed;
  if (off || (m.mh !== mapHash && net.rsT <= 0)) {
    gameMode = m.gm | 0; seed = m.sd | 0; level = m.lv;
    buildLevel(level); drawMapBase(); refreshDots(); resetActors();
    net.rsT = 4;
    if (m.mh !== mapHash) toast('MAP DOES NOT MATCH THE HOST. HARD REFRESH THE PAGE', '#ff3b4e'); else toast('RESYNCED TO THE HOST MAP', '#46e6ff');
  }
}
function applySnap(m) {
  checkSync(m);
  applySpecialSnap(m.sp);
  m.z.forEach((a, i) => {
    const z = zombies[i], prev = z.state, ns = a[3];
    z.tx = a[0]; z.tz = a[1]; z.trot = a[2];
    if (a[4] < z.hp && ns !== 'dead') { z.flashT = 0.1; setFlash(z, true); burst(z.x, 1.4, z.z, z.def.color, 3, 3); }
    z.hp = a[4]; z.maxHp = a[5]; z.fill.scale.x = Math.max(0.001, z.hp / z.maxHp);
    if (ns === 'dead' && prev !== 'dead') {
      z.deadT = 0; burst(z.x, 1.3, z.z, z.def.color, 10, 6); burst(z.x, 1.3, z.z, 0x8fae86, 8, 5);
      tone(260, 0.3, 'sawtooth', 0.05, -200);
    }
    if (ns !== 'dead' && prev === 'dead') { resetLimbs(z); z.mesh.visible = true; z.mesh.rotation.x = 0; z.mesh.position.y = 0; z.x = z.tx; z.z = z.tz; }
    if (!z.nseen) { z.x = z.tx; z.z = z.tz; z.rot = z.trot; z.nseen = true; }
    if (ns === 'house') { z.timer = a[8] || 0; if (prev !== 'house') { z.x = z.tx; z.z = z.tz; z.rot = z.trot; z.dirtK = -1; resetLimbs(z); } }
    z.state = ns;
    const nm = a[6] === 1 ? 'fall' : a[6] === 2 ? 'crawl' : 'walk', mask = a[7] | 0;
    if (mask === 0 && z.lost.some(Boolean)) resetLimbs(z);
    for (let b = 0; b < 4; b++) if ((mask & (1 << b)) && !z.lost[b]) severFx(z, b);
    if (nm !== z.mode) { z.mode = nm; z.modeT = 0; }
  });
  const seen = {};
  m.p.forEach(a => {
    const id = a[0]; if (id === net.myId) return;
    seen[id] = 1;
    let p = net.players[id]; if (!p) p = net.players[id] = newRemote(id);
    setRemote(p, a);
  });
  for (const id in net.players) if (!seen[id]) removeRemote(id);
}
function onClientData(m) {
  if (!m) return;
  switch (m.t) {
    case 'welcome': if (m.v !== VERSION) { leaveRoom(); showNote('Version mismatch', 'You have v' + VERSION + ', the host has v' + (m.v || '?') + '. Hard refresh the page (clear cache) and join again.'); break; } net.myId = m.id; break;
    case 'lobby': net.lobby = m.list; net.pvp = !!m.pvp; gameMode = m.fast | 0; renderLobby(); break;
    case 'reject': leaveRoom(); showNote('Could not join', m.reason); break;
    case 'begin': net.phase = 'play'; net.pvp = !!m.pvp; gameMode = m.fast | 0; seed = m.seed | 0; playerCount = m.np | 0 || 1; newGame(); if (!isTouch) toast('CLICK TO AIM', '#46e6ff'); break;
    case 'snap': applySnap(m); break;
    case 'dot': remoteDot(m.n); break;
    case 'fx': spawnFx(m); break;
    case 'pts': score += m.n; if (m.msg) toast(m.msg, '#46e6ff'); break;
    case 'hurt': takeDamage(25, -1); break;
    case 'dmg': takeDamage(m.n, m.by); break;
    case 'pause': clientPause(!!m.on); break;
    case 'clear': score += m.bonus; showClear(m.bonus); break;
    case 'next': if (m.sd != null) seed = m.sd | 0; if (m.lv != null) level = (m.lv | 0) - 1; nextLevel(); break;
    case 'over': net.phase = 'over'; showMpOver(m.res); break;
  }
}
