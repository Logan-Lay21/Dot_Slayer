'use strict';
/* Constants, shared grid arrays, wall lookups */
const $ = id => document.getElementById(id);
const hasFinePointer = !!(window.matchMedia && matchMedia('(any-pointer: fine)').matches);
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && !hasFinePointer);

/* Maze legend: # wall, . dot (ammo), o big dot (gun upgrade), G zombie start, P player start.
   The zombie pen is the 3-cell room on row 9 plus its door on row 8. */
const TEMPLATE = [
  '###################',
  '#........#........#',
  '#o##.###.#.###.##o#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '####.#   G   #.####',
  '####.# ## ## #.####',
  '####...#GGG#...####',
  '####.# ##### #.####',
  '####.#       #.####',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#.....P.....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################'
];
const VERSION = '0.9.8';
let playerCount = 1;
const MAXE = 8, MAXR = 21 + 2 * MAXE, MAXC = 19 + 2 * MAXE;
let ROWS = TEMPLATE.length, COLS = TEMPLATE[0].length, OFF = 0;
const CS = 4, WALL_H = 4.2, CEIL_H = 11, EYE = 2.05, RAMP_H = 2.4;
const walls = [], dotAt = [], SPAWNS = [], dotList = [], grid = [], hgt = [], rampRuns = [];
let playerStart = { c: 9, r: 15 };
const isPen = () => false; /* no pen any more: zombies rise out of the ground around the middle of the map */
function wallAt(x, z) {
  const c = Math.floor(x / CS), r = Math.floor(z / CS);
  return c < 0 || r < 0 || c >= COLS || r >= ROWS || walls[r][c];
}
function solidAt(x, z) {
  const c = Math.floor(x / CS), r = Math.floor(z / CS);
  return c < 0 || r < 0 || c >= COLS || r >= ROWS || walls[r][c] || isPen(c, r);
}
