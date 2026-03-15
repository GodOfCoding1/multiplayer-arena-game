export const TICK_RATE = 20;
export const TICK_INTERVAL_MS = 1000 / TICK_RATE;

export const ARENA_WIDTH = 40;
export const ARENA_HEIGHT = 40;
export const ARENA_HALF_W = ARENA_WIDTH / 2;
export const ARENA_HALF_H = ARENA_HEIGHT / 2;

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS_TO_START = 2;

export const SELECT_PHASE_DURATION = 30;
export const ROUND_DURATION = 180;
export const RESPAWN_TIME = 3;

export const PROJECTILE_SPEED = 18;
export const PROJECTILE_LIFETIME = 1.5;
export const PROJECTILE_RADIUS = 0.3;

export const STUN_DURATION = 1.0;
export const SHIELD_DURATION = 2.0;
export const DASH_DURATION = 0.3;
export const DASH_SPEED_MULTIPLIER = 4;

export const SPAWN_POINTS = [
  { x: -12, y: -12 },
  { x: 12, y: -12 },
  { x: -12, y: 12 },
  { x: 12, y: 12 },
  { x: 0, y: -14 },
  { x: -14, y: 0 },
  { x: 14, y: 0 },
  { x: 0, y: 14 },
  { x: -6, y: 0 },
  { x: 6, y: 0 },
];
