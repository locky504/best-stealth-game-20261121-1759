// Shadow Vault — sight lines and vision cones.
// A guard sees the thief only when the thief is inside the cone, within range,
// and no wall or display case stands between them.
import { TILE, COLS, ROWS, GUARD } from './config.js';
import { tileAt, isSolidTile } from './levels.js';

/** The wall/case rectangles of a level, in pixels, for sight tests. */
export function buildBlockers(level) {
  const rects = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (isSolidTile(tileAt(level, col, row))) {
        rects.push({ x: col * TILE, y: row * TILE, w: TILE, h: TILE });
      }
    }
  }
  return rects;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: does the segment enter the rectangle?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  for (const [p, q] of [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) { if (t > tmax) return false; if (t > tmin) tmin = t; }
      else { if (t < tmin) return false; if (t < tmax) tmax = t; }
    }
  }
  return true;
}

/** True when nothing solid stands between the two points. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** True when the target point is inside the guard's vision cone and visible. */
export function canSee(guard, tx, ty, blockers) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.viewRange) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, guard.facing)) > GUARD.viewHalfAngle) return false;
  return hasLineOfSight(guard.x, guard.y, tx, ty, blockers);
}

/**
 * How fast this sighting fills the guard's detection meter (0..100 per second).
 * Close, lit and running prey is spotted fast; far, shadowed and sneaking prey
 * barely registers — that is the whole game.
 */
export function detectionRate(guard, player, inShadow) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const closeness = 1 - dist / GUARD.viewRange;
  let rate = GUARD.detectBaseRate * (0.35 + 0.65 * closeness);
  if (inShadow) rate *= 0.45;
  if (player.sneaking) rate *= 0.5;
  if (player.movingFast) rate *= 1.35;
  return rate;
}

/** The cone's outline points, for drawing (fan of rays clipped by walls). */
export function conePolygon(guard, blockers) {
  const points = [{ x: guard.x, y: guard.y }];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const a = guard.facing - GUARD.viewHalfAngle + (2 * GUARD.viewHalfAngle * i) / steps;
    let end = GUARD.viewRange;
    // March the ray out in small steps; stop at the first solid tile.
    for (let d = 8; d <= GUARD.viewRange; d += 8) {
      const px = guard.x + Math.cos(a) * d;
      const py = guard.y + Math.sin(a) * d;
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) { end = d; break; }
      if (isSolidTile(tileAt(guard.level, col, row))) { end = d; break; }
    }
    points.push({ x: guard.x + Math.cos(a) * end, y: guard.y + Math.sin(a) * end });
  }
  return points;
}
