// Shadow Vault — the game itself: state machine, fixed-step loop, input,
// level setup, the thrown coin, and the hooks screenshots and self-tests use.
import { FIELD, TILE, STEP, GUARD, COIN, MAX_ALARMS, BEST_KEY } from './config.js';
import { LEVELS, tileAt } from './levels.js';
import { buildBlockers } from './vision.js';
import { createGuard, updateGuard, hearNoise, STATE_CHASE } from './guardAI.js';
import { createPlayer, updatePlayer, inShadow, collectRelics } from './player.js';
import { SoundEngine } from './audio.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_CLEAR, SCREEN_VICTORY, SCREEN_GAME_OVER,
  drawWorld, drawHUD, drawTitle, drawLevelClear, drawVictory, drawGameOver, drawPaused,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const sound = new SoundEngine();

/** Deterministic RNG for staged scenes (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Game {
  constructor() {
    this.screen = SCREEN_TITLE;
    this.levelIndex = 0;
    this.score = 0;
    this.alarms = 0;
    this.elapsed = 0;
    this.levelTime = 0;
    this.coins = COIN.start;
    this.coin = null;
    this.banner = null;
    this.bannerTimer = 0;
    this.playerHidden = false;
    this.maxDetection = 0;
    this.paused = false;
    this.caughtFlash = 0;
    this.best = null;
    try { this.best = localStorage.getItem(BEST_KEY); } catch { this.best = null; }
    this.keys = { up: false, down: false, left: false, right: false, sneak: false };
    this.stepSounds = { guard: 0, player: 0 };
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.blockers = buildBlockers(this.level);
    this.player = createPlayer(this.level);
    this.guards = this.level.guards.map((def) => createGuard(def, this.level));
    this.relics = [];
    this.exit = { x: 0, y: 0 };
    for (let row = 0; row < this.level.map.length; row += 1) {
      for (let col = 0; col < this.level.map[row].length; col += 1) {
        const ch = this.level.map[row][col];
        const cx = (col + 0.5) * TILE;
        const cy = (row + 0.5) * TILE;
        if (ch === 'R') this.relics.push({ x: cx, y: cy, taken: false });
        if (ch === 'E') this.exit = { x: cx, y: cy };
      }
    }
    // Wall lamps: pools of light that mark safe-looking ground.
    this.lamps = [
      { x: 6.5 * TILE, y: 6.5 * TILE },
      { x: 25.5 * TILE, y: 6.5 * TILE },
      { x: 16.5 * TILE, y: 12.5 * TILE },
    ];
    this.relicsTaken = 0;
    this.levelTime = 0;
    this.maxDetection = 0;
    this.coin = null;
    this.banner = { title: this.level.name, sub: this.level.subtitle };
    this.bannerTimer = 4;
    this.alarmsAtLevelStart = this.alarms;
  }

  get exitOpen() {
    return this.relicsTaken >= this.relics.length;
  }

  start() {
    sound.unlock();
    this.screen = SCREEN_PLAY;
    this.setStatus('Playing. Collect every relic, then reach the green exit unseen.');
  }

  nextLevel() {
    const timeBonus = Math.max(0, (this.level.parSeconds - this.levelTime)) * 10;
    this.score += Math.round(timeBonus);
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.finishRun(true);
      return;
    }
    this.coins = COIN.start;
    this.loadLevel(this.levelIndex + 1);
    this.screen = SCREEN_PLAY;
    sound.levelClear();
  }

  finishRun(won) {
    if (won) {
      if (this.alarms === 0) this.score += 500;
      this.screen = SCREEN_VICTORY;
      sound.victory();
      const record = `Score ${this.score} · ${formatClock(this.elapsed)} · ${this.alarms} alarms`;
      try { localStorage.setItem(BEST_KEY, record); } catch { /* private mode */ }
      this.best = record;
    } else {
      this.screen = SCREEN_GAME_OVER;
      sound.caught();
    }
    this.setStatus(won ? 'Victory.' : 'Caught. The night ends.');
  }

  onCaught() {
    if (this.screen !== SCREEN_PLAY) return;
    this.alarms += 1;
    this.caughtFlash = 0.5;
    sound.caught();
    if (this.alarms >= MAX_ALARMS) {
      this.finishRun(false);
      return;
    }
    // Caught: the level restarts, the alarms stay on the record.
    this.coins = COIN.start;
    this.loadLevel(this.levelIndex);
    this.setStatus(`Caught! Alarm ${this.alarms} of ${MAX_ALARMS}. The level restarts.`);
  }

  throwCoin(worldX, worldY) {
    if (this.screen !== SCREEN_PLAY || this.paused || this.coins <= 0 || this.coin) return;
    const dx = worldX - this.player.x;
    const dy = worldY - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > COIN.throwRange) return;
    this.coins -= 1;
    this.coin = { x: worldX, y: worldY, born: Date.now() };
    sound.coinThrow();
    setTimeout(() => {
      if (!this.coin) return;
      sound.coinLand();
      hearNoise(this.guards, this.coin.x, this.coin.y, COIN.noiseRadius);
      this.coin = null;
    }, 320);
  }

  setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  update(dt) {
    if (this.screen !== SCREEN_PLAY || this.paused) return;
    this.elapsed += dt;
    this.levelTime += dt;
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner = null;
    }
    if (this.caughtFlash > 0) this.caughtFlash -= dt;

    // The thief.
    const noise = updatePlayer(this.player, this.level, this.keys, dt);
    if (noise > 0) {
      hearNoise(this.guards, this.player.x, this.player.y, noise * 0.45);
      if (this.player.stepTimer <= 0) {
        this.player.stepTimer = 0.42;
        sound.footstep(0.05);
      }
    }
    this.playerHidden = inShadow(this.player, this.level);

    // The guards.
    let maxDetection = 0;
    let anyChase = false;
    for (const guard of this.guards) {
      const prevState = guard.state;
      updateGuard(guard, this.player, this.playerHidden, this.blockers, dt, () => this.onCaught());
      if (guard.state === STATE_CHASE && prevState !== STATE_CHASE) sound.alarm();
      else if (guard.detection >= 40 && prevState === 'patrol') sound.suspicious();
      maxDetection = Math.max(maxDetection, guard.detection);
      if (guard.state === STATE_CHASE) anyChase = true;
      // Footsteps that tell you where a guard is: louder the closer they are.
      const dist = Math.hypot(guard.x - this.player.x, guard.y - this.player.y);
      if (dist < 320) {
        this.stepSounds.guard -= dt;
        if (this.stepSounds.guard <= 0) {
          this.stepSounds.guard = guard.state === STATE_CHASE ? 0.3 : 0.55;
          sound.footstep(Math.max(0.02, 0.22 * (1 - dist / 320)), true);
        }
      }
    }
    this.maxDetection = maxDetection;

    // Relics pocket themselves on touch; the exit opens when all are taken.
    const got = collectRelics(this.player, this.relics);
    if (got > 0) {
      this.relicsTaken += got;
      this.score += 100 * got;
      sound.pickup();
      if (this.exitOpen) {
        sound.doorOpen();
        this.banner = { title: 'EXIT OPEN', sub: 'All relics pocketed — reach the green door.' };
        this.bannerTimer = 3;
      }
    }
    if (this.exitOpen && Math.hypot(this.player.x - this.exit.x, this.player.y - this.exit.y) < 30) {
      this.screen = SCREEN_LEVEL_CLEAR;
      sound.levelClear();
    }
    if (anyChase) this.setStatus('Spotted! Break line of sight — run for shadow or cover.');
    else if (maxDetection > 25) this.setStatus('A guard is suspicious. Freeze, sneak, or slip away.');
  }

  render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    if (this.screen === SCREEN_TITLE) {
      drawTitle(ctx, this.best);
      return;
    }
    drawWorld(ctx, this);
    drawHUD(ctx, this);
    if (this.caughtFlash > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${this.caughtFlash * 0.5})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (this.screen === SCREEN_LEVEL_CLEAR) drawLevelClear(ctx, this);
    else if (this.screen === SCREEN_VICTORY) drawVictory(ctx, this);
    else if (this.screen === SCREEN_GAME_OVER) drawGameOver(ctx, this);
    else if (this.paused) drawPaused(ctx);
  }
}

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}

window.addEventListener('resize', resize);
resize();

const game = new Game();

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  const mapped = KEYMAP[event.code];
  if (mapped) game.keys[mapped] = true;
  if (event.code === 'KeyM') {
    sound.unlock();
    const muted = sound.toggleMute();
    game.setStatus(muted ? 'Sound off.' : 'Sound on.');
  }
  if (event.code === 'KeyP' || event.code === 'Escape') {
    if (game.screen === SCREEN_PLAY) game.paused = !game.paused;
  }
  if (event.code === 'KeyR' && game.screen === SCREEN_PLAY) {
    game.loadLevel(game.levelIndex);
  }
  if (event.code === 'Enter' || event.code === 'Space') {
    sound.unlock();
    if (game.screen === SCREEN_TITLE) game.start();
    else if (game.screen === SCREEN_LEVEL_CLEAR) game.nextLevel();
    else if (game.screen === SCREEN_VICTORY || game.screen === SCREEN_GAME_OVER) {
      const fresh = new Game();
      Object.assign(game, fresh);
      game.screen = SCREEN_TITLE;
    }
  }
});

window.addEventListener('keyup', (event) => {
  const mapped = KEYMAP[event.code];
  if (mapped) game.keys[mapped] = false;
});

canvas.addEventListener('pointerdown', (event) => {
  sound.unlock();
  if (game.screen === SCREEN_TITLE) { game.start(); return; }
  if (game.screen === SCREEN_LEVEL_CLEAR) { game.nextLevel(); return; }
  if (game.screen === SCREEN_VICTORY || game.screen === SCREEN_GAME_OVER) {
    const fresh = new Game();
    Object.assign(game, fresh);
    game.screen = SCREEN_TITLE;
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
  const ox = (rect.width - FIELD.width * scale) / 2;
  const oy = (rect.height - FIELD.height * scale) / 2;
  const wx = (event.clientX - rect.left - ox) / scale;
  const wy = (event.clientY - rect.top - oy) / scale;
  game.throwCoin(wx, wy);
});

// Fixed-step loop: the rules run at 60 Hz whatever the display does.
let last = performance.now();
let accumulator = 0;
function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    game.update(STEP);
    accumulator -= STEP;
  }
  game.render();
  requestAnimationFrame(frame);
}

// Screenshot scenes (?shot=start|play|alert|win) and the headless self-test
// (?selftest=1) run the real rules forward from a fresh game, deterministically.
const params = new URLSearchParams(window.location.search);
if (params.has('shot')) {
  const staged = stageShot(params.get('shot'), game);
  game.screen = staged.screen;
  game.best = staged.best;
  game.render();
  window.__shotReady = true;
} else if (params.get('selftest') === '1') {
  try {
    const result = stageShot('win', game);
    document.title = `SELFTEST screen=${result.screen} level=${game.levelIndex} score=${game.score} relics=${game.relicsTaken}/${game.relics.length} alarms=${game.alarms}`;
  } catch (err) {
    document.title = `SELFTEST ERROR ${err.message}`;
  }
  game.render();
} else {
  requestAnimationFrame(frame);
}
