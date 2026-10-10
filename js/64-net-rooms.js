'use strict';
/* Rooms, lobby and panels */
/* ---------- rooms and panels ---------- */
function hostList() {
  const l = [{ id: 0, name: 'P1' }];
  for (const id in net.players) l.push({ id: +id, name: net.players[id].name });
  return l.sort((a, b) => a.id - b.id);
}
function lobbyBody() {
  const list = net.role === 'host' ? hostList() : net.lobby;
  return '<div class="code">' + net.code + '</div><ul class="roster">' +
    list.map(p => '<li><i class="sw" style="background:' + PCSS[p.id] + '"></i><div><b>' + p.name + (p.id === net.myId ? ' (you)' : '') + '</b><span>' + (p.id === 0 ? 'host' : 'joined') + '</span></div></li>').join('') +
    '</ul>' + (net.role === 'host'
      ? '<button id="pvpbtn" class="btn alt" type="button">SHOOT EACH OTHER: ' + (net.pvp ? 'ON' : 'OFF') + '</button>'
      : '<p class="keys">Shooting each other: ' + (net.pvp ? 'on' : 'off') + '</p>') +
    (net.role === 'host' ? '<button id="fastbtn" class="btn alt" type="button">' + modeLabel() + '</button>' : '<p class="keys">' + modeLabel() + '</p>') +
    '<button id="leavebtn" class="btn alt" type="button">LEAVE ROOM</button>';
}
function renderLobby() { if (net.phase !== 'lobby' || !net.role) return; $('pbody').innerHTML = lobbyBody(); bindPanel(); }
function broadcastLobby() { netBroadcast({ t: 'lobby', list: hostList(), pvp: net.pvp, fast: gameMode }); renderLobby(); }
function showMpOver(res) {
  state = 'over'; releaseLock(); mouseFire = false; touchFire = false;
  const rows = res.slice().sort((a, b) => b.s - a.s).map(r => '<li><i class="sw" style="background:' + PCSS[r.id] + '"></i><div><b>P' + (r.id + 1) + (r.id === net.myId ? ' (you)' : '') + '</b><span>' + r.s + ' pts</span></div></li>').join('');
  const host = net.role === 'host';
  panel('Team down', 'Everyone is out. Final scores:', '<ul class="roster">' + rows + '</ul><button id="leavebtn" class="btn alt" type="button">LEAVE ROOM</button>', host ? 'PLAY AGAIN' : null, host ? hostStart : null);
}
function showNote(title, msg) { panel(title, msg, '', 'BACK', showTitle); }
function netReset() {
  try { for (const id in net.conns) net.conns[id].close(); } catch (e) {}
  try { if (net.hostConn) net.hostConn.close(); } catch (e) {}
  try { if (net.peer) net.peer.destroy(); } catch (e) {}
  for (const id in net.players) removeRemote(id);
  Object.assign(net, { role: null, phase: 'lobby', code: '', peer: null, hostConn: null, conns: {}, players: {}, lobby: [], myId: 0, t: 0, boardT: 0, pvp: true });
  ghost = false;
  const b = $('board'); if (b) b.innerHTML = '';
}
function leaveRoom() { netReset(); resetActors(); showTitle(); }
function hostGone() { leaveRoom(); showNote('The room closed', 'The host left the game.'); }
function randCode() { let s = ''; for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
/* Extra STUN plus a public TURN relay so players on different networks or phone data can still connect. */
const PEER_OPTS = { config: { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }
] } };
/* Keepalive: clients ping the host, the host frees slots held by dead connections (a failed join used to hold a slot until the browser timed out). */
setInterval(() => {
  if (net.role === 'client' && net.hostConn && net.hostConn.open) netSend({ t: 'ping' });
  if (net.role === 'host') {
    const now = performance.now();
    for (const id in net.conns) {
      const p = net.players[id];
      if (p && now - p.last > 7000) { try { net.conns[id].close(); } catch (e) {} dropPlayer(+id); }
    }
  }
  if (net.peer && net.peer.disconnected && !net.peer.destroyed && net.peer.reconnect) { try { net.peer.reconnect(); } catch (e) {} }
}, 1000);
function hostRoom(tries) {
  if (!window.Peer) { showNote('Multiplayer unavailable', 'The connection library did not load. Check your internet and reload.'); return; }
  netReset();
  const code = randCode(), peer = new Peer('dotslayer-' + code, PEER_OPTS);
  net.role = 'host'; net.code = code; net.peer = peer; net.phase = 'lobby'; net.myId = 0;
  panel('Opening room', 'One moment.', '', null, null);
  peer.on('open', () => {
    if (net.peer !== peer) return;
    panel('Your room', 'Share the code. 4 players max.', lobbyBody(), 'START GAME', hostStart);
  });
  peer.on('connection', conn => { if (net.peer === peer) onHostConn(conn); });
  peer.on('error', err => {
    if (net.peer !== peer) return;
    if (err.type === 'unavailable-id' && (tries || 0) < 4) { hostRoom((tries || 0) + 1); return; }
    leaveRoom(); showNote('Could not open a room', 'Error: ' + err.type + '. Try again.');
  });
}
function joinRoom(raw) {
  const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { showNote('Check the code', 'Room codes are 4 letters or numbers.'); return; }
  if (!window.Peer) { showNote('Multiplayer unavailable', 'The connection library did not load. Check your internet and reload.'); return; }
  netReset();
  const peer = new Peer(undefined, PEER_OPTS);
  net.role = 'client'; net.code = code; net.peer = peer; net.phase = 'lobby';
  panel('Joining ' + code, 'Connecting.', '', null, null);
  const fail = msg => { if (net.peer !== peer) return; leaveRoom(); showNote('Could not join', msg); };
  peer.on('open', () => {
    if (net.peer !== peer) return;
    const c = peer.connect('dotslayer-' + code, { serialization: 'json' });
    net.hostConn = c;
    c.on('open', () => { if (net.peer === peer) panel('Room joined', 'Waiting for the host to start.', lobbyBody(), null, null); });
    c.on('data', onClientData);
    c.on('close', () => { if (net.peer === peer && net.role === 'client') hostGone(); });
    setTimeout(() => { if (net.peer === peer && !c.open) fail('Could not reach that room. Check the code, or try another network.'); }, 20000);
  });
  peer.on('error', err => fail(err.type === 'peer-unavailable' ? 'No room with that code.' : 'Error: ' + err.type));
}
function boardHtml() {
  if (!net.role) return '';
  const rows = [{ id: net.myId, s: score, l: lives, a: !ghost, h: hp }];
  for (const id in net.players) { const p = net.players[id]; rows.push({ id: p.id, s: p.s, l: p.l, a: p.a, h: p.hp }); }
  rows.sort((a, b) => a.id - b.id);
  return rows.map(r => '<div class="pl"><i class="sw" style="background:' + PCSS[r.id] + '"></i>P' + (r.id + 1) + ' <span class="hpb"><i style="width:' + Math.max(0, Math.min(100, r.h)) + '%"></i></span> ' + r.s + (r.a ? ' ' + '●'.repeat(Math.max(0, r.l)) : ' down') + '</div>').join('');
}
function mpHtml() {
  return '<div class="mp"><span class="lbl">Co-op, 2 to 4 players</span><div class="mprow"><button id="hostbtn" class="btn alt" type="button">HOST ROOM</button><input id="code" maxlength="4" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Room code"><button id="joinbtn" class="btn alt" type="button">JOIN</button></div></div>';
}
function bindPanel() {
  const l = $('leavebtn'); if (l) l.onclick = leaveRoom;
  const gb = $('guidebtn'); if (gb) gb.onclick = () => showGuide(0);
  const fb = $('fastbtn'); if (fb) fb.onclick = () => { gameMode = nextMode(); fb.textContent = modeLabel(); if (net.role === 'host') broadcastLobby(); };
  const pv = $('pvpbtn'); if (pv) pv.onclick = () => { net.pvp = !net.pvp; broadcastLobby(); };
  const h = $('hostbtn'); if (h) h.onclick = () => { audioInit(); hostRoom(0); };
  const j = $('joinbtn'), c = $('code');
  if (j && c) {
    j.onclick = () => { audioInit(); joinRoom(c.value); };
    c.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') j.click(); };
  }
}
