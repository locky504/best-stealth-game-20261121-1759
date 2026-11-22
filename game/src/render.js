// Shadow Vault — everything the eye sees: the museum floor, the dark,
// the guards' vision cones, the thief, and every screen around the game.
import { FIELD, TILE, COLS, ROWS, PALETTE, FONT, GUARD, MAX_ALARMS } from './config.js';
import { tileAt, isSolidTile } from './levels.js';
import { conePolygon } from './vision.js';
import { STATE_CHASE, STATE_SUSPICIOUS } from './guardAI.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_GAME_OVER = 'game-over';

const darkCanvas = document.createElement('canvas');
darkCanvas.width = FIELD.width;
darkCanvas.height = FIELD.height;
const darkCtx = darkCanvas.getContext('2d');

function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

export function drawWorld(ctx, game) {
  const { level, relics, exit, guards, player, coin } = game;
  drawFloor(ctx, level);
  drawExit(ctx, exit, game.relicsTaken >= relics.length);
  drawRelics(ctx, relics);
  drawCover(ctx, level);
  drawDarkness(ctx, game);
  drawCones(ctx, guards, game.blockers);
  drawCoin(ctx, coin);
  drawGuards(ctx, guards);
  drawPlayer(ctx, player, game.playerHidden);
}

function drawFloor(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (ch === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 6);
        ctx.strokeStyle = PALETTE.wallTrim;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        continue;
      }
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = PALETTE.floorLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      if (ch === 'S') {
        ctx.fillStyle = PALETTE.shadowFloor;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = PALETTE.shadowEdge;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
        ctx.setLineDash([]);
      }
    }
  }
}

function drawCover(ctx, level) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const ch = tileAt(level, col, row);
      const x = col * TILE;
      const y = row * TILE;
      if (ch === 'C') {
        ctx.fillStyle = '#1c2733';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = PALETTE.caseGlass;
        ctx.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
        ctx.strokeStyle = PALETTE.caseTrim;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4.5, y + 4.5, TILE - 9, TILE - 9);
        ctx.fillStyle = 'rgba(201, 168, 106, 0.5)';
        ctx.fillRect(x + 16, y + 16, 8, 8);
      } else if (ch === 'P') {
        ctx.fillStyle = PALETTE.plantPot;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2 + 8, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.plant;
        ctx.beginPath();
        ctx.arc(x + TILE / 2 - 6, y + TILE / 2 - 6, 11, 0, Math.PI * 2);
        ctx.arc(x + TILE / 2 + 7, y + TILE / 2 - 8, 10, 0, Math.PI * 2);
        ctx.arc(x + TILE / 2, y + TILE / 2 - 13, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawRelics(ctx, relics) {
  for (const relic of relics) {
    if (relic.taken) continue;
    const pulse = 1 + 0.12 * Math.sin(Date.now() / 280 + relic.x);
    ctx.save();
    ctx.globalAlpha = 0.9;
    const glow = ctx.createRadialGradient(relic.x, relic.y, 2, relic.x, relic.y, 34 * pulse);
    glow.addColorStop(0, PALETTE.relicGlow);
    glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(relic.x, relic.y, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Pedestal
    ctx.fillStyle = '#39415a';
    ctx.fillRect(relic.x - 11, relic.y + 4, 22, 12);
    // The relic: a gold diamond
    ctx.fillStyle = PALETTE.relic;
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 12);
    ctx.lineTo(relic.x + 8, relic.y - 1);
    ctx.lineTo(relic.x, relic.y + 8);
    ctx.lineTo(relic.x - 8, relic.y - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.moveTo(relic.x, relic.y - 12);
    ctx.lineTo(relic.x + 8, relic.y - 1);
    ctx.lineTo(relic.x, relic.y - 1);
    ctx.closePath();
    ctx.fill();
  }
}

function drawExit(ctx, exit, open) {
  const { x, y } = exit;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, open ? 60 : 30);
  glow.addColorStop(0, open ? PALETTE.exitGlow : 'rgba(91, 100, 120, 0.25)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, open ? 60 : 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = open ? PALETTE.exitOpen : PALETTE.exitLocked;
  ctx.fillRect(x - 14, y - 18, 28, 36);
  ctx.fillStyle = '#0b1020';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', x, y + 1);
  if (open) {
    ctx.strokeStyle = PALETTE.exitOpen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 24);
    ctx.lineTo(x, y - 32);
    ctx.lineTo(x + 18, y - 24);
    ctx.stroke();
  }
}

function drawDarkness(ctx, game) {
  const d = darkCtx;
  d.clearRect(0, 0, FIELD.width, FIELD.height);
  d.globalCompositeOperation = 'source-over';
  d.fillStyle = 'rgba(3, 5, 12, 0.62)';
  d.fillRect(0, 0, FIELD.width, FIELD.height);
  d.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => {
    const g = d.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.beginPath();
    d.arc(x, y, r, 0, Math.PI * 2);
    d.fill();
  };
  hole(game.player.x, game.player.y, 150);
  for (const relic of game.relics) if (!relic.taken) hole(relic.x, relic.y, 70);
  hole(game.exit.x, game.exit.y, 80);
  for (const lamp of game.lamps) hole(lamp.x, lamp.y, 90);
  ctx.drawImage(darkCanvas, 0, 0);
}

function drawCones(ctx, guards, blockers) {
  for (const guard of guards) {
    const poly = conePolygon(guard, blockers);
    const fill = guard.state === STATE_CHASE
      ? PALETTE.chaseCone
      : guard.state === STATE_SUSPICIOUS ? PALETTE.suspiciousCone : PALETTE.guardCone;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = guard.state === STATE_CHASE ? 'rgba(239,68,68,0.7)' : PALETTE.guardConeEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawCoin(ctx, coin) {
  if (!coin) return;
  const age = (Date.now() - coin.born) / 1000;
  ctx.strokeStyle = 'rgba(242, 201, 76, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 8 + age * 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.relic;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    // Body: red uniform with a dark outline, facing tick for the gaze.
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardUniform;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.guard;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
    ctx.stroke();
    // Detection meter above the head: fills as suspicion grows.
    if (guard.detection > 2) {
      const w = 34;
      const frac = guard.detection / 100;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(guard.x - w / 2, guard.y - GUARD.radius - 12, w, 6);
      ctx.fillStyle = guard.state === STATE_CHASE ? PALETTE.danger : '#f59e0b';
      ctx.fillRect(guard.x - w / 2, guard.y - GUARD.radius - 12, w * frac, 6);
      if (guard.state === STATE_CHASE) {
        ctx.fillStyle = PALETTE.danger;
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - GUARD.radius - 16);
      } else if (guard.detection > 40) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - GUARD.radius - 16);
      }
    }
  }
}

function drawPlayer(ctx, player, hidden) {
  ctx.save();
  if (hidden) ctx.globalAlpha = 0.55;
  // Cloak: a teal triangle pointing where Wren faces, hood circle on top.
  ctx.fillStyle = '#042f2e';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.playerCloak;
  ctx.beginPath();
  ctx.moveTo(player.x + Math.cos(player.facing) * 17, player.y + Math.sin(player.facing) * 17);
  ctx.lineTo(player.x + Math.cos(player.facing + 2.4) * 12, player.y + Math.sin(player.facing + 2.4) * 12);
  ctx.lineTo(player.x + Math.cos(player.facing - 2.4) * 12, player.y + Math.sin(player.facing - 2.4) * 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 3, player.y + Math.sin(player.facing) * 3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHUD(ctx, game) {
  const { levelIndex, relicsTaken, relics, coins, alarms, elapsed, maxDetection } = game;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 40);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 40.5);
  ctx.lineTo(FIELD.width, 40.5);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SHADOW VAULT · ${game.level.short}`, 14, 21);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = PALETTE.relic;
  ctx.fillText(`◆ Relics ${relicsTaken}/${relics.length}`, 300, 21);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`◉ Coins ${coins}`, 440, 21);
  ctx.fillStyle = alarms > 0 ? PALETTE.danger : PALETTE.muted;
  ctx.fillText(`Alarms ${alarms}/${MAX_ALARMS}`, 550, 21);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(formatTime(elapsed), 670, 21);
  // The eye: how close the nearest guard is to spotting Wren.
  const eyeX = 800;
  ctx.fillStyle = maxDetection > 60 ? PALETTE.danger : maxDetection > 25 ? '#f59e0b' : PALETTE.muted;
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(maxDetection > 60 ? '◉ SPOTTED!' : maxDetection > 25 ? '◉ Suspicious…' : '◉ Unseen', eyeX, 21);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(990, 14, 150, 12);
  ctx.fillStyle = maxDetection > 60 ? PALETTE.danger : '#f59e0b';
  ctx.fillRect(990, 14, 150 * (maxDetection / 100), 12);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('M mute · P pause', FIELD.width - 14, 21);
  ctx.textAlign = 'left';
  if (game.playerHidden) {
    ctx.fillStyle = PALETTE.player;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('IN SHADOW — hard to see', 14, 58);
  }
  if (game.banner) {
    ctx.fillStyle = PALETTE.panel;
    const w = 560;
    ctx.fillRect((FIELD.width - w) / 2, 84, w, 52);
    ctx.strokeStyle = PALETTE.gold;
    ctx.strokeRect((FIELD.width - w) / 2 + 0.5, 84.5, w - 1, 51);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(game.banner.title, FIELD.width / 2, 104);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(game.banner.sub, FIELD.width / 2, 124);
    ctx.textAlign = 'left';
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function panel(ctx, title, lines, accent = PALETTE.gold) {
  const w = 640;
  const h = 120 + lines.length * 30;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  ctx.fillStyle = 'rgba(3, 5, 12, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = accent;
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, FIELD.width / 2, y + 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `16px ${FONT}`;
  lines.forEach((line, i) => {
    ctx.fillText(line, FIELD.width / 2, y + 88 + i * 30);
  });
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  ctx.fillText('Press Enter to continue', FIELD.width / 2, y + h - 26);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, best) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // A moonlit gallery behind the title: floor, a cone, a thief silhouette.
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, 420, FIELD.width, 300);
  // Wren waiting in the dark beside a pedestal with one last relic on it.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(340, 560, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#39415a';
  ctx.fillRect(1010, 560, 44, 48);
  ctx.fillStyle = PALETTE.relic;
  ctx.beginPath();
  ctx.moveTo(1032, 520);
  ctx.lineTo(1048, 540);
  ctx.lineTo(1032, 556);
  ctx.lineTo(1016, 540);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 64px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SHADOW VAULT', FIELD.width / 2, 170);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `20px ${FONT}`;
  ctx.fillText('A midnight gallery heist — steal the relics, never be seen', FIELD.width / 2, 214);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `16px ${FONT}`;
  const lines = [
    'WASD / arrows — move      Shift — sneak (slow, silent, harder to spot)',
    'Click — throw a coin to lure a guard away      E — (relics pocket themselves)',
    'Dark floor is shadow: stand in it and guards barely see you',
    'Running is loud. A guard who sees you gives chase — break line of sight!',
    'Take every relic, then reach the green EXIT door. Three alarms ends the night.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 300 + i * 30));
  ctx.fillStyle = PALETTE.relic;
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText('Press Enter or click to begin the heist', FIELD.width / 2, 500);
  if (best) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(`Best run: ${best}`, FIELD.width / 2, 540);
  }
  ctx.textAlign = 'left';
}

export function drawLevelClear(ctx, game) {
  panel(ctx, 'CLEAN GETAWAY', [
    `${game.level.name} — all relics pocketed.`,
    `Time ${formatTime(game.levelTime)}  ·  Score ${game.score}`,
    game.alarms === 0 ? 'Not once spotted. The guards never knew you were there.' : `${game.alarms} alarm${game.alarms === 1 ? '' : 's'} so far — stay quiet.`,
  ], PALETTE.exitOpen);
}

export function drawVictory(ctx, game) {
  const ghost = game.alarms === 0;
  panel(ctx, ghost ? 'GHOST — NEVER SEEN' : 'THE VAULT IS YOURS', [
    `All three floors emptied in ${formatTime(game.elapsed)}.`,
    `Final score ${game.score}  ·  Alarms ${game.alarms}`,
    ghost ? 'No guard ever raised the alarm. A perfect night.' : 'The gallery will count its losses in the morning.',
  ], PALETTE.relic);
}

export function drawGameOver(ctx, game) {
  panel(ctx, 'CAUGHT — THE NIGHT ENDS', [
    `Three alarms. The museum locks down and Wren slips away empty-handed.`,
    `Relics stolen ${game.relicsTaken}  ·  Score ${game.score}`,
    'Study the patrols, use the shadows, and try again.',
  ], PALETTE.danger);
}

export function drawPaused(ctx) {
  panel(ctx, 'PAUSED', ['The guards wait. The night waits.', 'Press P or Esc to keep moving.']);
}
