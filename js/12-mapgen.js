'use strict';
/* Seeded maze generator (pure, deterministic) */
/* ---------- random maps ----------
   The zombie pen and its two side corridors (rows 6 to 12) are fixed. Everything above and below is re-rolled from
   the room seed and the level number, mirrored left to right, then cleaned up so there are no dead ends and every
   cell can be reached. Everyone in a room runs the same code with the same seed, so everyone gets the same map. */
function mkRnd(a0) {
  let a = a0 >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function genGrid(sd, lv) {
  const e = Math.min(MAXE, Math.floor((lv - 1) / 3) + (playerCount - 1)), R = 21 + 2 * e, C = 19 + 2 * e, mid = (C - 1) / 2;
  const rnd = mkRnd((Math.imul(sd | 0, 2654435761) ^ Math.imul(lv, 40503) ^ 0x9e3779b9) >>> 0);
  const g = []; for (let r = 0; r < R; r++) g.push(new Array(C).fill('#'));
  const cr0 = 6 + e, cc0 = 4 + e;
  const inCore = () => false;
  const free = (c, r) => c >= 1 && c <= C - 2 && r >= 1 && r <= R - 2 && !inCore(c, r);
  const forced = new Set(), F = (c, r) => forced.add(r * C + c);
  for (let r = 1; r <= R - 2; r++) for (let c = 1; c <= mid; c++) {
    if (!free(c, r)) continue;
    const even = r % 2 === 0;
    let wall = rnd() < (even ? 0.5 : (r === 3 || r === R - 4 ? 0.06 : 0.2));
    if (even && free(c - 1, r) && g[r][c - 1] === '.') wall = true;
    g[r][c] = wall ? '#' : '.';
  }
  for (let r = 1; r <= R - 2; r++) for (let c = 1; c < mid; c++) if (free(c, r)) g[r][C - 1 - c] = g[r][c];
  /* the doors in the fixed core (top and bottom rows) must have open cells outside them */
  const pr = 15 + e;
  for (let c = 5 + e; c <= 13 + e; c++) { g[pr][c] = '.'; F(c, pr); }
  g[pr][mid] = 'P';
  const flood = () => {
    const seen = new Set([pr * C + mid]), q = [[mid, pr]];
    while (q.length) {
      const [c, r] = q.pop();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R || g[nr][nc] === '#' || seen.has(nr * C + nc)) continue;
        seen.add(nr * C + nc); q.push([nc, nr]);
      }
    }
    return seen;
  };
  const wipeUnreached = () => {
    const seen = flood();
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (g[r][c] !== '#' && !seen.has(r * C + c)) g[r][c] = '#';
  };
  const open = (c, r) => c >= 0 && r >= 0 && c < C && r < R && g[r][c] !== '#';
  const setM = (c, r, ch) => { g[r][c] = ch; g[r][C - 1 - c] = ch; };
  /* make sure the pen and the side corridors can be reached: carve the cheapest tunnel through the random part */
  for (let guard = 0; guard < 60; guard++) {
    const seen = flood(), tg = [];
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (g[r][c] !== '#' && !seen.has(r * C + c)) tg.push([c, r]);
    if (!tg.length || (tg.length < 5 && !tg.some(([c, r]) => inCore(c, r)))) break;
    const dist = new Array(R * C).fill(1e9), prev = new Array(R * C).fill(-1), dq = [];
    seen.forEach(k => { dist[k] = 0; dq.push(k); });
    while (dq.length) {
      const k = dq.shift(), c = k % C, r = (k - c) / C;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R) continue;
        const isOpen = g[nr][nc] !== '#';
        if (!isOpen && !free(nc, nr)) continue;
        const w = isOpen ? 0 : 1, nk = nr * C + nc;
        if (dist[k] + w < dist[nk]) { dist[nk] = dist[k] + w; prev[nk] = k; if (w) dq.push(nk); else dq.unshift(nk); }
      }
    }
    let best = null; tg.forEach(([c, r]) => { const k = r * C + c; if (!best || dist[k] < dist[best]) best = k; });
    if (best === null || dist[best] >= 1e9) break;
    for (let k = best; k >= 0; k = prev[k]) { const c = k % C, r = (k - c) / C; if (g[r][c] === '#') setM(c, r, '.'); }
  }
  wipeUnreached();
  for (let pass = 0; pass < 18; pass++) {
    let changed = false;
    for (let r = 1; r <= R - 2; r++) for (let c = 1; c <= mid; c++) {
      if (!free(c, r) || g[r][c] === '#') continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      if (nb.filter(([dc, dr]) => open(c + dc, r + dr)).length > 1) continue;
      changed = true;
      let done = false;
      const dirs = nb.sort(() => rnd() - 0.5);
      for (const straight of [true, false]) {
        for (const [dc, dr] of dirs) {
          const c1 = c + dc, r1b = r + dr;
          if (!free(c1, r1b) || open(c1, r1b)) continue;
          const onward = nb.filter(([ec, er]) => (ec !== -dc || er !== -dr) && open(c1 + ec, r1b + er)).length;
          if (straight ? !open(c + 2 * dc, r + 2 * dr) : onward < 1) continue;
          setM(c1, r1b, '.'); done = true; break;
        }
        if (done) break;
      }
      if (!done && !forced.has(r * C + c)) setM(c, r, '#');
    }
    wipeUnreached();
    if (!changed) break;
  }
  /* trim open plazas: wall one cell of any 2x2 open block as long as nothing gets cut off or turns into a dead end */
  const degOk = (c, r) => g[r][c] === '#' || [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => open(c + dc, r + dr)).length >= 2;
  for (let r = 1; r < R - 2; r++) for (let c = 1; c <= mid; c++) {
    if (!(open(c, r) && open(c + 1, r) && open(c, r + 1) && open(c + 1, r + 1))) continue;
    const cells = [[c, r], [c + 1, r], [c, r + 1], [c + 1, r + 1]].filter(([cc, rr]) => free(cc, rr) && !forced.has(rr * C + cc) && g[rr][cc] === '.');
    if (!cells.length) continue;
    const [cc, rr] = cells[Math.floor(rnd() * cells.length)];
    const before = flood().size, mc = C - 1 - cc, save = [g[rr][cc], g[rr][mc]];
    g[rr][cc] = '#'; g[rr][mc] = '#';
    let ok = flood().size === before - (cc === mc ? 1 : 2);
    if (ok) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (!degOk(cc + dc, rr + dr) || !degOk(mc + dc, rr + dr)) ok = false; }
    if (!ok) { g[rr][cc] = save[0]; g[rr][mc] = save[1]; }
  }
  /* big dots: one mirrored pair in the top half, one in the bottom half */
  const pick = (r0, r1) => {
    const cs = [];
    for (let r = r0; r <= r1; r++) for (let c = 1; c < mid; c++) if (free(c, r) && g[r][c] === '.' && !forced.has(r * C + c) && Math.abs(c - mid) + Math.abs(r - pr) > 6) cs.push([c, r]);
    if (cs.length) { const [c, r] = cs[Math.floor(rnd() * cs.length)]; setM(c, r, 'o'); }
  };
  const half = Math.floor(R / 2);
  pick(1, half - 1); pick(half + 1, R - 2);
  /* zombie start cells: two mirrored pairs in the middle band of the maze */
  for (let n = 0; n < 2; n++) {
    let cs = [];
    for (let wide = 0; wide < 3 && !cs.length; wide++)
      for (let r = half - 3 - wide; r <= half + 3 + wide; r++) for (let c = 2; c < mid; c++) if (g[r][c] === '.' && !forced.has(r * C + c)) cs.push([c, r]);
    if (cs.length) { const [c, r] = cs[Math.floor(rnd() * cs.length)]; setM(c, r, 'G'); }
  }
  /* ramps: a straight tunnel-like run of 3 to 4 cells rises, runs flat, then comes back down */
  const cand = [];
  for (let L = 3; L <= 4; L++) {
    for (let r = 1; r <= R - 2; r++) for (let c = 1; c + L - 1 <= C - 2; c++) {
      let ok = true;
      for (let i = 0; i < L && ok; i++) ok = free(c + i, r) && g[r][c + i] === '.' && g[r - 1][c + i] === '#' && g[r + 1][c + i] === '#';
      if (ok) cand.push({ ax: 'x', c, r, L });
    }
    for (let c = 1; c <= C - 2; c++) for (let r = 1; r + L - 1 <= R - 2; r++) {
      let ok = true;
      for (let i = 0; i < L && ok; i++) ok = free(c, r + i) && g[r + i][c] === '.' && g[r + i][c - 1] === '#' && g[r + i][c + 1] === '#';
      if (ok) cand.push({ ax: 'z', c, r, L });
    }
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
  const runs = [], used = new Set(), want = 2 + (lv >= 3 ? 1 : 0) + Math.floor(e / 2);
  for (const k of cand) {
    if (runs.length >= want) break;
    const cells = []; for (let i = 0; i < k.L; i++) cells.push(k.ax === 'x' ? [k.c + i, k.r] : [k.c, k.r + i]);
    if (cells.some(([c, r]) => used.has(r * C + c))) continue;
    cells.forEach(([c, r]) => { for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) used.add((r + dr) * C + c + dc); });
    runs.push(k);
  }
  return { g, runs, e, R, C };
}
