// Shadow Vault — the screenshot scenes behind ?shot=start|play|alert|win.
// Each one plays the real rules forward from a fresh game, steered by an
// autopilot that pathfinds (breadth-first over the floor tiles) to the nearest
// relic and then the exit, and waits out a guard's cone rather than walking
// into it — so every frame is what a real game looks like and the same scene
// always gives the same frame.
import { TILE, STEP, PLAYER, GUARD } from './config.js';
import { tileAt, isSolidTile } from './levels.js';
import { canSee } from './vision.js';
import { STATE_CHASE, STATE_SUSPICIOUS } from './guardAI.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_GAME_OVER } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 12;
const ALERT_LIMIT_SECONDS = 150;
const WIN_LIMIT_SECONDS = 600;

/** Breadth-first path over passable tiles, as pixel waypoints. */
function bfsPath(game, tx, ty) {
  const startC = Math.floor(game.player.x / TILE);
  const startR = Math.floor(game.player.y / TILE);
  const goalC = Math.floor(tx / TILE);
  const goalR = Math.floor(ty / TILE);
  const key = (c, r) => `${c},${r}`;
  const prev = new Map();
  const queue = [[startC, startR]];
  prev.set(key(startC, startR), null);
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === goalC && r === goalR) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= 32 || nr >= 18) continue;
      if (prev.has(key(nc, nr))) continue;
      if (isSolidTile(tileAt(game.level, nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(goalC, goalR))) return [];
  const path = [];
  let cur = [goalC, goalR];
  while (cur) {
    path.unshift({ x: (cur[0] + 0.5) * TILE, y: (cur[1] + 0.5) * TILE });
    cur = prev.get(key(cur[0], cur[1]));
  }
  return path.slice(1);
}

/** Danger of standing at (x, y): 0 when no guard can see the spot. */
function dangerAt(game, x, y) {
  let danger = 0;
  for (const guard of game.guards) {
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (canSee(guard, x, y, game.blockers)) danger += 1000 + (GUARD.viewRange - dist);
    else if (dist < GUARD.viewRange * 0.75) danger += 120;
    else if (dist < 110) danger += 60;
    if (guard.state === STATE_CHASE) danger += 400;
  }
  return danger;
}

function targetOf(game) {
  const open = game.relics.filter((r) => !r.taken);
  if (open.length > 0) {
    let best = open[0];
    let bestDist = Infinity;
    for (const relic of open) {
      const d = Math.hypot(relic.x - game.player.x, relic.y - game.player.y);
      if (d < bestDist) { bestDist = d; best = relic; }
    }
    return best;
  }
  return game.exit;
}

function makePilot(game) {
  return {
    path: [],
    pathTarget: null,
    waitTimer: 0,
    step(game) {
      const target = targetOf(game);
      const targetKey = `${target.x},${target.y}`;
      if (this.pathTarget !== targetKey || this.path.length === 0) {
        this.path = bfsPath(game, target.x, target.y);
        this.pathTarget = targetKey;
      }
      let next = this.path[0];
      while (next && Math.hypot(next.x - game.player.x, next.y - game.player.y) < 10) {
        this.path.shift();
        next = this.path[0];
      }
      if (!next) {
        game.keys = { up: false, down: false, left: false, right: false, sneak: false };
        return;
      }
      // Wait out a cone sweeping the next step — but never wait forever.
      const nextDanger = dangerAt(game, next.x, next.y);
      const hereDanger = dangerAt(game, game.player.x, game.player.y);
      if (nextDanger > 200 && hereDanger < 100 && this.waitTimer < 3) {
        this.waitTimer += STEP;
        game.keys = { up: false, down: false, left: false, right: false, sneak: true };
        return;
      }
      this.waitTimer = 0;
      const dx = next.x - game.player.x;
      const dy = next.y - game.player.y;
      game.keys = {
        up: dy < -6,
        down: dy > 6,
        left: dx < -6,
        right: dx > 6,
        sneak: nextDanger > 0,
      };
    },
  };
}

function resetRun(game) {
  game.alarms = 0;
  game.score = 0;
  game.elapsed = 0;
  game.coins = 3;
  game.loadLevel(0);
  game.screen = SCREEN_PLAY;
}

/**
 * Set `game` to the named scene and return the screen to draw over it
 * and the best run to show on the title screen.
 */
export function stageShot(name, game) {
  resetRun(game);
  if (name !== 'play' && name !== 'alert' && name !== 'win') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) game.update(STEP);
    game.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE, best: null };
  }
  if (name === 'alert') {
    // Hunt the nearest guard: walk right up to one until it grows suspicious.
    for (let i = 0; i < ALERT_LIMIT_SECONDS / STEP; i += 1) {
      let guard = game.guards[0];
      let bestDist = Infinity;
      for (const g of game.guards) {
        const d = Math.hypot(g.x - game.player.x, g.y - game.player.y);
        if (d < bestDist) { bestDist = d; guard = g; }
      }
      const path = bfsPath(game, guard.x, guard.y);
      const next = path[0];
      if (next) {
        const dx = next.x - game.player.x;
        const dy = next.y - game.player.y;
        game.keys = { up: dy < -6, down: dy > 6, left: dx < -6, right: dx > 6, sneak: false };
      }
      game.update(STEP);
      if (game.screen === SCREEN_GAME_OVER) resetRun(game);
      if (game.guards.some((g) => g.state === STATE_SUSPICIOUS || g.state === STATE_CHASE || g.detection >= 45)) break;
      if (game.screen === SCREEN_LEVEL_CLEAR) break;
    }
    return { screen: SCREEN_PLAY, best: null };
  }
  const pilot = makePilot(game);
  const limit = name === 'win' ? WIN_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / STEP; i += 1) {
    pilot.step(game);
    game.update(STEP);
    if (game.screen === SCREEN_GAME_OVER) resetRun(game);
    if (game.screen === SCREEN_LEVEL_CLEAR) break;
  }
  return { screen: game.screen === SCREEN_LEVEL_CLEAR ? SCREEN_LEVEL_CLEAR : SCREEN_PLAY, best: null };
}
