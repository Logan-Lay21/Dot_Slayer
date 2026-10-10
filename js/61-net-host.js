'use strict';
/* Multiplayer host side */
/* ---------- host side ---------- */
function hostContact(dt) {
  for (const id in net.players) {
    const p = net.players[id]; p.inv = Math.max(0, p.inv - dt);
    if (!p.a || p.inv > 0 || !p.seen || freezeT > 0) continue;
    for (const z of zombies) {
      if ((z.state === 'active' || z.state === 'leaving') && z.mode !== 'fall' && Math.hypot(z.x - p.x, z.z - p.z) < 1.5 && Math.abs((p.py || 0) - floorY(z.x, z.z)) < 1.0) {
        netToPeer(+id, { t: 'hurt' }); p.inv = 1.4; break;
      }
    }
  }
}
function hostCheckOver() {
  if (net.role !== 'host' || !ghost || state !== 'play') return;
  for (const id in net.players) if (net.players[id].a) return;
  const res = allP().map(a => ({ id: a[0], s: a[7] }));
  net.phase = 'over'; netBroadcast({ t: 'over', res }); showMpOver(res);
}
function hostStart() {
  net.phase = 'play';
  for (const id in net.players) { net.players[id].inv = 3; net.players[id].a = true; }
  seed = (Math.random() * 1e9) | 0;
  playerCount = 1 + Object.keys(net.players).length;
  netBroadcast({ t: 'begin', pvp: net.pvp, seed, fast: gameMode, np: playerCount });
  newGame();
}
function mpNext() {
  for (const id in net.players) { net.players[id].inv = 3; net.players[id].a = true; }
  netBroadcast({ t: 'next', lv: level + 1, sd: seed });
  nextLevel();
}
function onHostData(id, m) {
  const p = net.players[id]; if (!p || !m) return;
  p.last = performance.now();
  switch (m.t) {
    case 'frz': freezeT = Math.max(freezeT, 6); break;
    case 'st': setRemote(p, m.a); if (!p.a) hostCheckOver(); break;
    case 'hit': {
      const z = zombies[m.zi];
      const zone = ['head', 'body', 'leg', 'arm'].includes(m.zone) ? m.zone : 'body';
      if (z && state === 'play') applyHit(z, Math.min(6, +m.dmg || 1), Math.min(1, +m.stun || 0), id, zone, m.side ? 1 : 0);
      break;
    }
    case 'shs': {
      const s = specials[m.si];
      const zone = m.zone === 'head' ? 'head' : 'body';
      if (s && state === 'play') applySpecialHit(s, Math.min(6, +m.dmg || 1), id, zone);
      break;
    }
    case 'pvp': {
      const n = Math.min(60, +m.n || 0);
      if (!net.pvp || !n || state !== 'play') break;
      if (m.to === 0) takeDamage(n, id); else if (net.conns[m.to]) netToPeer(m.to, { t: 'dmg', n, by: id });
      break;
    }
    case 'killed': {
      const msg = 'YOU GOT P' + (id + 1);
      if (m.by === 0) { score += 300; toast(msg, '#46e6ff'); } else netToPeer(m.by, { t: 'pts', n: 300, msg });
      break;
    }
    case 'dot': if (remoteDot(m.n)) netBroadcast({ t: 'dot', n: m.n }, id); break;
    case 'fx': spawnFx(m); netBroadcast(m, id); break;
  }
}
function dropPlayer(id) {
  if (!net.conns[id]) return;
  delete net.conns[id]; removeRemote(id);
  if (net.phase === 'lobby') broadcastLobby(); else hostCheckOver();
}
function onHostConn(conn) {
  conn.on('open', () => {
    const free = [1, 2, 3].filter(i => !net.conns[i]);
    if (net.phase !== 'lobby' || !free.length) {
      try { conn.send({ t: 'reject', reason: net.phase !== 'lobby' ? 'That game already started.' : 'That room is full. 4 players max.' }); } catch (e) {}
      setTimeout(() => { try { conn.close(); } catch (e) {} }, 400);
      return;
    }
    const id = free[0]; net.conns[id] = conn; net.players[id] = newRemote(id);
    conn.send({ t: 'welcome', id, v: VERSION });
    broadcastLobby();
    conn.on('data', m => onHostData(id, m));
    conn.on('close', () => dropPlayer(id));
    conn.on('error', () => dropPlayer(id));
  });
}
