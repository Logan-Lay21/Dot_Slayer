'use strict';
/* Game mode labels, map hash, buildLevel */
/* a fresh map plus fresh pits for a level */
let devOn = false;
try { devOn = localStorage.getItem('dsDev') === '1'; } catch (e) { devOn = false; }
const nextMode = () => { const n = (gameMode + 1) % 4; return n === 3 && !devOn ? 0 : n; };
const modeLabel = () => 'MODE: ' + ['NORMAL', 'FAST ZOMBS', 'INSANE', 'DEV MODE'][gameMode];
let mapHash = 0;
function computeMapHash() {
  const str = grid.map(r => r.join('')).join('|') + specials.map(s => s.kind + Math.round(s.home.x) + ':' + Math.round(s.home.z)).join(',') + pits.map(p => p.c + ':' + p.r).join(',');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
function buildLevel(lv) { genMap(seed, lv); applyMap(); genPits(lv); buildSpecials(lv); mapHash = computeMapHash(); }
