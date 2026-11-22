// Shadow Vault — the three museum floors, drawn as tile maps.
// Legend: '#' wall · '.' marble floor · 'S' shadowed floor (dark, hard to be seen in)
// 'C' display case (cover: blocks sight and movement) · 'P' potted plant (cover)
// 'R' relic to steal · 'E' exit door · 'T' where Wren the thief starts.
// Guard patrols are waypoint lists in tile coordinates, walked back and forth.
import { COLS, ROWS } from './config.js';

export const LEVELS = [
  {
    name: 'Level 1 — The Marble Hall',
    short: 'L1 · Marble Hall',
    subtitle: 'Two guards on rounds. Take 3 relics, then slip out the east door.',
    parSeconds: 90,
    map: [
      '################################',
      '#T.....#........#......R.......#',
      '#......#........#..............#',
      '#..C...#...S....#..C....C......#',
      '#......#........#..............#',
      '#......####.#####.....####.....#',
      '#..............................#',
      '#.S.......C........C.....S.....#',
      '#..............................#',
      '#..C......####.####......C.....#',
      '#..............................#',
      '#......#........#.....#........#',
      '#..R...#...S....#..C..#..R.....#',
      '#......#........#.....#........#',
      '#......####.#####.....####.....#',
      '#..............................#',
      '#....C........C........C....E..#',
      '################################',
    ],
    guards: [
      { waypoints: [[4, 6], [15, 6], [27, 6]], facing: 0 },
      { waypoints: [[27, 10], [15, 10], [4, 10]], facing: Math.PI },
    ],
  },
  {
    name: 'Level 2 — The Gilded Wing',
    short: 'L2 · Gilded Wing',
    subtitle: 'Three guards, tighter rounds. Take 4 relics. The plants are your friends.',
    parSeconds: 120,
    map: [
      '################################',
      '#T....#......S......#.....R....#',
      '#.....#............#...........#',
      '#.P...#..C....C....#..P...C....#',
      '#.....#............#...........#',
      '#.....#####.########...####....#',
      '#..............................#',
      '#..C......S.......C......S.....#',
      '#..............................#',
      '#..R.....####.####......C..R...#',
      '#..............................#',
      '#.S.......C........C.....S.....#',
      '#..............................#',
      '#.....#####.########...####....#',
      '#.....#............#...........#',
      '#.P...#..C....R....#..P....C...#',
      '#.....#............#.........E.#',
      '################################',
    ],
    guards: [
      { waypoints: [[3, 6], [15, 6], [28, 6]], facing: 0 },
      { waypoints: [[28, 10], [15, 10], [3, 10]], facing: Math.PI },
      { waypoints: [[15, 1], [15, 8], [15, 16]], facing: Math.PI / 2 },
    ],
  },
  {
    name: 'Level 3 — The Vault Below',
    short: 'L3 · Vault Below',
    subtitle: 'Four guards and no patience. Take 5 relics and vanish.',
    parSeconds: 150,
    map: [
      '################################',
      '#T...#.....S.....#......R......#',
      '#....#...........#.............#',
      '#.C..#..P....P...#..C.....P....#',
      '#....#...........#.............#',
      '#....####.#######....#####.....#',
      '#..............................#',
      '#.S.....C......S.......C..S....#',
      '#..............................#',
      '#.R....####.#####.....R....C...#',
      '#..............................#',
      '#....C.......S........C........#',
      '#..............................#',
      '#....####.#######....#####.....#',
      '#....#...........#.............#',
      '#.C..#..P...R....#..P....R.....#',
      '#....#...........#...........E.#',
      '################################',
    ],
    guards: [
      { waypoints: [[3, 6], [15, 6], [28, 6]], facing: 0 },
      { waypoints: [[28, 8], [15, 8], [3, 8]], facing: Math.PI },
      { waypoints: [[15, 1], [15, 6], [15, 12], [15, 16]], facing: Math.PI / 2 },
      { waypoints: [[10, 10], [10, 15], [22, 15], [22, 10]], facing: -Math.PI / 2 },
    ],
  },
];

/** Tile at (col, row); anything outside the map is a wall. */
export function tileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return level.map[row][col];
}

/** True when the tile blocks movement and sight. */
export function isSolidTile(ch) {
  return ch === '#' || ch === 'C' || ch === 'P';
}

/** True when the tile is a shadowed floor tile. */
export function isShadowTile(ch) {
  return ch === 'S';
}
