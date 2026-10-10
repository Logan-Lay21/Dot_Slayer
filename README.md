# Dot Slayer

First-person 3D Pac-Man-style maze shooter. Phone friendly, 1 to 4 player co-op over PeerJS.
No build step: GitHub Pages serves these files as they are.

## Layout

    index.html        page markup, CDN libraries (three.js r128, PeerJS 1.5.4), then the game scripts in order
    css/style.css     all styling
    js/               the game, split by job. Files load in number order.

| Files | What lives there |
| --- | --- |
| `00-core` | constants, shared grid arrays, wall lookups, `VERSION` |
| `10`-`13` scene, dots, mapgen, world | renderer and palettes, seeded maze generator, ramps, building a level |
| `20`-`22` weapons, particles, audio | gun table and models, particles and tracers, sound |
| `30-state` | shared game state |
| `40`-`49` zombies, combat, player, power-ups, pits, level | the regular zombies, shooting, movement, spike pits, mode labels and `buildLevel` |
| `50`-`55` specials | Wall, Charger, Ambusher, Stalker: planning, models, host sim, hits, animation, client puppets |
| `60`-`64` net | PeerJS rooms, host, client, damage, lobby |
| `70`-`75` UI | HUD and minimap, panels and guide, game flow, input, main loop, boot |

## How it fits together

These are plain scripts, not ES modules, so they share one global scope. Order matters: a file can use anything
from an earlier file at load time, and anything from any file once the game is running (functions are only called
after `75-boot` starts the loop). Do not add code that runs at load time and calls into a later file.

## Changing things

- New file: add it to `js/` and add a `<script>` line to `index.html` in the right spot.
- New version: change `VERSION` in `js/00-core.js` and the `?v=` on every `css/` and `js/` line in `index.html`.
  The `?v=` is what makes phones fetch the new files instead of an old cached copy.
- Everyone in a co-op room needs the same version, or the welcome check flags a mismatch.
