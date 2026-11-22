// Shadow Vault — Wren the thief: movement, noise, hiding, stealing.
import { TILE, COLS, ROWS, PLAYER } from './config.js';
import { tileAt, isSolidTile, isShadowTile } from './levels.js';

export function createPlayer(level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (tileAt(level, col, row) === 'T') {
        return {
          x: (col + 0.5) * TILE,
          y: (row + 0.5) * TILE,
          facing: 0,
          sneaking: false,
          movingFast: false,
          moving: false,
          stepTimer: 0,
        };
      }
    }
  }
  return { x: TILE * 1.5, y: TILE * 1.5, facing: 0, sneaking: false, movingFast: false, moving: false, stepTimer: 0 };
}

function hitsWall(level, x, y) {
  const r = PLAYER.radius - 2;
  for (const [cx, cy] of [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]) {
    const col = Math.floor(cx / TILE);
    const row = Math.floor(cy / TILE);
    if (isSolidTile(tileAt(level, col, row))) return true;
  }
  return false;
}

/**
 * Move the thief with the held keys. Returns the noise made this tick
 * (0 while sneaking or still, the noise radius while walking).
 */
export function updatePlayer(player, level, keys, dt) {
  let dx = 0;
  let dy = 0;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  player.sneaking = !!keys.sneak;
  player.moving = dx !== 0 || dy !== 0;
  if (!player.moving) {
    player.movingFast = false;
    return 0;
  }
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  player.movingFast = !player.sneaking;
  player.facing = Math.atan2(dy, dx);
  const nx = player.x + dx * speed * dt;
  const ny = player.y + dy * speed * dt;
  if (!hitsWall(level, nx, player.y)) player.x = nx;
  if (!hitsWall(level, player.x, ny)) player.y = ny;
  player.stepTimer -= dt;
  return player.sneaking ? 0 : PLAYER.noiseRadius;
}

/** True when the thief stands on a shadowed floor tile. */
export function inShadow(player, level) {
  const col = Math.floor(player.x / TILE);
  const row = Math.floor(player.y / TILE);
  return isShadowTile(tileAt(level, col, row));
}

/** Relics within reach of the thief (auto-pocketed on touch). */
export function collectRelics(player, relics) {
  let got = 0;
  for (const relic of relics) {
    if (!relic.taken && Math.hypot(relic.x - player.x, relic.y - player.y) < 30) {
      relic.taken = true;
      got += 1;
    }
  }
  return got;
}
