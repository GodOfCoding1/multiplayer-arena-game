export type AlienType = 'heatblast' | 'fourarms' | 'xlr8' | 'diamondhead';

export type GamePhase = 'waiting' | 'selecting' | 'playing' | 'finished';

export interface Vec2 {
  x: number;
  y: number;
}

export interface AlienDefinition {
  type: AlienType;
  name: string;
  role: string;
  maxHp: number;
  speed: number;
  primaryDamage: number;
  primaryCooldown: number;
  primaryRange: number;
  specialDamage: number;
  specialCooldown: number;
  specialRange: number;
  specialDuration: number;
  bodyRadius: number;
  color: number;
  glowColor: number;
  description: string;
}

export interface PlayerInput {
  seq: number;
  dx: number;
  dy: number;
  aimX: number;
  aimY: number;
  primaryFire: boolean;
  specialFire: boolean;
}

export interface ProjectileData {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  alienType: AlienType;
  lifetime: number;
}

export interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alien: AlienType;
  aimAngle: number;
  kills: number;
  deaths: number;
  alive: boolean;
  shielded: boolean;
  stunned: boolean;
  primaryCooldownLeft: number;
  specialCooldownLeft: number;
  lastInputSeq: number;
}

export interface GameStateData {
  phase: GamePhase;
  roundTimer: number;
  selectTimer: number;
  players: Record<string, PlayerData>;
  projectiles: Record<string, ProjectileData>;
  winnerId: string;
}

export interface SessionMetadata {
  roomId: string;
  sessionName: string;
  phase: GamePhase;
  clients: number;
  maxClients: number;
  targetPlayers: number;
  hostSessionId: string;
  joinable: boolean;
}

export interface CreateSessionOptions {
  name: string;
  sessionName: string;
  targetPlayers: number;
}

export enum MessageType {
  PLAYER_INPUT = 'input',
  SELECT_ALIEN = 'selectAlien',
  PLAYER_READY = 'ready',
  START_GAME = 'startGame',
  KILL_FEED = 'killFeed',
  ABILITY_EFFECT = 'abilityEffect',
  ACTION_ERROR = 'actionError',
}
