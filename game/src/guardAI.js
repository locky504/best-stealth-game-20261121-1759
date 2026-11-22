// Shadow Vault — guard brains.
// States: patrol (walk the rounds, pause and look) -> suspicious (something
// caught the eye or ear: walk over and look) -> chase (the thief is seen:
// run them down) -> search (lost them: sweep the last seen spot) -> patrol.
import { TILE, GUARD, STEP } from './config.js';
import { tileAt, isSolidTile } from './levels.js';
import { canSee, detectionRate, hasLineOfSight } from './vision.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_CHASE = 'chase';
export const STATE_SEARCH = 'search';

export function createGuard(def, level) {
  const [c0, r0] = def.waypoints[0];
  return {
    level,
    x: (c0 + 0.5) * TILE,
    y: (r0 + 0.5) * TILE,
    facing: def.facing,
    waypoints: def.waypoints.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE })),
    waypointIndex: 1 % def.waypoints.length,
    waypointDir: 1,
    state: STATE_PATROL,
    pauseTimer: 0,
    detection: 0,
    lastSeen: null,
    loseSightTimer: 0,
    searchTimer: 0,
    investigate: null,
    scanAngle: 0,
    speed: GUARD.patrolSpeed,
  };
}

/** Move toward a point without walking through walls; returns distance left. */
function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return 0;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  if (!hitsWall(guard, nx, guard.y)) guard.x = nx;
  if (!hitsWall(guard, guard.x, ny)) guard.y = ny;
  return dist - step;
}

function hitsWall(guard, x, y) {
  const r = GUARD.radius - 2;
  for (const [cx, cy] of [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]) {
    const col = Math.floor(cx / TILE);
    const row = Math.floor(cy / TILE);
    if (isSolidTile(tileAt(guard.level, col, row))) return true;
  }
  return false;
}

/** A noise at (x, y): the nearest guards come to look. */
export function hearNoise(guards, x, y, radius) {
  for (const g of guards) {
    if (g.state === STATE_CHASE) continue;
    const d = Math.hypot(g.x - x, g.y - y);
    if (d <= radius) {
      g.state = STATE_SUSPICIOUS;
      g.investigate = { x, y };
      g.detection = Math.max(g.detection, 45);
    }
  }
}

export function updateGuard(guard, player, inShadow, blockers, dt, onCaught) {
  const sees = canSee(guard, player.x, player.y, blockers);
  if (sees) {
    guard.detection = Math.min(100, guard.detection + detectionRate(guard, player, inShadow) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseSightTimer = 0;
  } else {
    guard.detection = Math.max(0, guard.detection - GUARD.detectDecay * dt);
  }

  if (guard.detection >= 100 && guard.state !== STATE_CHASE) {
    guard.state = STATE_CHASE;
    guard.investigate = null;
  }

  switch (guard.state) {
    case STATE_PATROL: {
      if (guard.detection >= 40) {
        guard.state = STATE_SUSPICIOUS;
        guard.investigate = guard.lastSeen ? { ...guard.lastSeen } : null;
        break;
      }
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.facing += Math.sin(guard.scanAngle) * 0.9 * dt;
        guard.scanAngle += dt * 2.2;
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      const left = moveToward(guard, target.x, target.y, GUARD.patrolSpeed, dt);
      if (left < 4) {
        guard.waypointIndex += guard.waypointDir;
        if (guard.waypointIndex >= guard.waypoints.length || guard.waypointIndex < 0) {
          guard.waypointDir *= -1;
          guard.waypointIndex += guard.waypointDir * 2;
        }
        guard.pauseTimer = GUARD.pauseAtWaypoint;
        guard.scanAngle = 0;
      }
      break;
    }
    case STATE_SUSPICIOUS: {
      const target = guard.investigate ?? guard.lastSeen;
      if (!target) { guard.state = STATE_PATROL; break; }
      const left = moveToward(guard, target.x, target.y, GUARD.suspiciousSpeed, dt);
      if (left < 6) {
        guard.searchTimer = GUARD.searchTime;
        guard.state = STATE_SEARCH;
        guard.scanAngle = 0;
      }
      if (guard.detection <= 0 && !sees) { guard.state = STATE_PATROL; guard.investigate = null; }
      break;
    }
    case STATE_CHASE: {
      if (sees) {
        moveToward(guard, player.x, player.y, GUARD.chaseSpeed, dt);
        guard.loseSightTimer = 0;
      } else {
        guard.loseSightTimer += dt;
        if (guard.lastSeen) moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD.chaseSpeed, dt);
        if (guard.loseSightTimer > GUARD.loseSightGrace) {
          guard.state = STATE_SEARCH;
          guard.searchTimer = GUARD.searchTime;
          guard.investigate = guard.lastSeen ? { ...guard.lastSeen } : null;
        }
      }
      const d = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (d < GUARD.radius + 13) onCaught();
      break;
    }
    case STATE_SEARCH: {
      guard.searchTimer -= dt;
      guard.facing += 1.8 * dt;
      if (guard.searchTimer <= 0) {
        guard.state = STATE_PATROL;
        guard.investigate = null;
        guard.detection = 0;
      }
      break;
    }
    default:
      break;
  }
  // Footstep cadence for the sound engine: how far the guard moved this tick.
  guard.moved = true;
  return guard.state;
}

export { STEP };
