// Shadow Vault — tuning numbers and palette in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walkSpeed: 178,
  sneakSpeed: 88,
  /** Noise radius while walking (running); sneaking is silent. */
  noiseRadius: 140,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  suspiciousSpeed: 118,
  chaseSpeed: 168,
  /** How long a guard waits at each patrol waypoint, looking around. */
  pauseAtWaypoint: 1.1,
  /** Vision range in pixels and half-angle of the cone, in radians. */
  viewRange: 235,
  viewHalfAngle: 0.62,
  /** Detection fills 0..100; at 100 the guard gives chase. */
  detectBaseRate: 95,
  detectDecay: 26,
  /** Seconds a chasing guard keeps hunting after losing sight. */
  loseSightGrace: 2.6,
  /** Seconds a guard searches the last seen spot before giving up. */
  searchTime: 3.2,
  /** Hearing radius for a thrown coin. */
  hearRadius: 300,
};

/** Alarms (times caught) allowed in one run before the night ends. */
export const MAX_ALARMS = 3;

export const COIN = { start: 3, throwRange: 420, noiseRadius: 280 };

export const PALETTE = {
  backdrop: '#070a14',
  floorA: '#232a3d',
  floorB: '#1d2334',
  floorLine: '#2e3752',
  shadowFloor: '#121829',
  shadowEdge: '#3a4a7a',
  wall: '#3d4a6e',
  wallTop: '#5a6b9c',
  wallTrim: '#c9a86a',
  caseGlass: '#4d6f8e',
  caseTrim: '#c9a86a',
  plant: '#2f6b4a',
  plantPot: '#8a5a3b',
  player: '#37e0c8',
  playerCloak: '#0f766e',
  guard: '#e5534b',
  guardUniform: '#7f1d1d',
  guardCone: 'rgba(250, 204, 21, 0.20)',
  guardConeEdge: 'rgba(250, 204, 21, 0.55)',
  suspiciousCone: 'rgba(249, 115, 22, 0.28)',
  chaseCone: 'rgba(239, 68, 68, 0.30)',
  relic: '#f2c94c',
  relicGlow: 'rgba(242, 201, 76, 0.35)',
  exitLocked: '#5b6478',
  exitOpen: '#22c55e',
  exitGlow: 'rgba(34, 197, 94, 0.35)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  gold: '#c9a86a',
  danger: '#ef4444',
  panel: 'rgba(10, 14, 26, 0.88)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best run is kept between visits (this browser only). */
export const BEST_KEY = 'shadow-vault.best';
