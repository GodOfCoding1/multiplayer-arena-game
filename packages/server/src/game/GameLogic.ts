import {
  ALIEN_DEFINITIONS,
  TICK_INTERVAL_MS,
  SPAWN_POINTS,
  RESPAWN_TIME,
  type AlienType,
  type PlayerInput,
} from '@ben10/shared';
import { GameState } from '../schemas/GameState';
import { PlayerSchema } from '../schemas/PlayerSchema';
import { clampToArena, isInArena } from './CollisionSystem';
import {
  handlePrimaryAttack,
  processMeleeAttack,
  handleSpecialAbility,
  checkProjectileHits,
} from './CombatSystem';

const dt = TICK_INTERVAL_MS / 1000;

export interface AbilityEffect {
  playerId: string;
  alien: AlienType;
  x: number;
  y: number;
  range: number;
}

export function processInput(state: GameState, playerId: string, input: PlayerInput): AbilityEffect | null {
  const player = state.players.get(playerId);
  if (!player || !player.alive || player.stunned || state.phase !== 'playing') return null;

  player.lastInputSeq = input.seq;

  // Movement
  const def = ALIEN_DEFINITIONS[player.alien as AlienType];
  let speed = def.speed;

  if (player.dashTimer > 0) {
    player.x += player.dashDx * dt;
    player.y += player.dashDy * dt;
  } else {
    const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
    if (len > 0) {
      const nx = input.dx / len;
      const ny = input.dy / len;
      player.x += nx * speed * dt;
      player.y += ny * speed * dt;
    }
  }

  const clamped = clampToArena(player.x, player.y, def.bodyRadius);
  player.x = clamped.x;
  player.y = clamped.y;

  // Aim angle
  player.aimAngle = Math.atan2(input.aimY - player.y, input.aimX - player.x);

  const allPlayers = Array.from(state.players.values());

  // Primary attack
  if (input.primaryFire) {
    const proj = handlePrimaryAttack(player, input);
    if (proj) {
      state.projectiles.set(proj.id, proj);
    }
    processMeleeAttack(player, allPlayers, input);
  }

  // Special ability
  if (input.specialFire) {
    const prevCd = player.specialCooldownLeft;
    const result = handleSpecialAbility(player, allPlayers, input);
    if (result.projectile) {
      state.projectiles.set(result.projectile.id, result.projectile);
    }
    if (prevCd <= 0 && player.specialCooldownLeft > 0) {
      return {
        playerId: player.id,
        alien: player.alien as AlienType,
        x: player.x,
        y: player.y,
        range: def.specialRange,
      };
    }
  }

  return null;
}

export function tickGameState(state: GameState): Array<{ killerId: string; victimId: string }> {
  if (state.phase !== 'playing') return [];

  const kills: Array<{ killerId: string; victimId: string }> = [];

  // Update timers
  state.roundTimer -= dt;

  // Update player timers
  state.players.forEach((player) => {
    if (player.primaryCooldownLeft > 0) player.primaryCooldownLeft = Math.max(0, player.primaryCooldownLeft - dt);
    if (player.specialCooldownLeft > 0) player.specialCooldownLeft = Math.max(0, player.specialCooldownLeft - dt);

    if (player.stunTimer > 0) {
      player.stunTimer -= dt;
      if (player.stunTimer <= 0) {
        player.stunned = false;
        player.stunTimer = 0;
      }
    }

    if (player.shieldTimer > 0) {
      player.shieldTimer -= dt;
      if (player.shieldTimer <= 0) {
        player.shielded = false;
        player.shieldTimer = 0;
      }
    }

    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      if (player.dashTimer <= 0) {
        player.dashTimer = 0;
        player.invulnerable = false;
      }
    }

    // Respawn
    if (!player.alive) {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        respawnPlayer(player, state);
      }
    }
  });

  // Update projectiles
  const toRemove: string[] = [];
  state.projectiles.forEach((proj, id) => {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.lifetime -= dt;

    if (proj.lifetime <= 0 || !isInArena(proj.x, proj.y)) {
      toRemove.push(id);
    }
  });

  // Check projectile-player hits
  const playerMap = new Map<string, PlayerSchema>();
  state.players.forEach((p, id) => playerMap.set(id, p));

  const projMap = new Map(
    Array.from(state.projectiles.entries()).filter(([id]) => !toRemove.includes(id)),
  );
  const hits = checkProjectileHits(projMap, playerMap);

  for (const hit of hits) {
    toRemove.push(hit.projectileId);
  }

  for (const id of toRemove) {
    state.projectiles.delete(id);
  }

  // Check deaths
  state.players.forEach((player) => {
    if (player.alive && player.hp <= 0) {
      player.alive = false;
      player.hp = 0;
      player.deaths += 1;
      player.respawnTimer = RESPAWN_TIME;

      // Find who killed this player (last attacker from hits)
      const killerHit = hits.find((h) => h.targetId === player.id);
      if (killerHit) {
        const killer = state.players.get(killerHit.attackerId);
        if (killer) {
          killer.kills += 1;
          kills.push({ killerId: killer.id, victimId: player.id });
        }
      } else {
        kills.push({ killerId: '', victimId: player.id });
      }
    }
  });

  return kills;
}

export function respawnPlayer(player: PlayerSchema, state: GameState): void {
  const spawnIdx = Math.floor(Math.random() * SPAWN_POINTS.length);
  const spawn = SPAWN_POINTS[spawnIdx];
  const def = ALIEN_DEFINITIONS[player.alien as AlienType];

  player.x = spawn.x;
  player.y = spawn.y;
  player.hp = def.maxHp;
  player.maxHp = def.maxHp;
  player.alive = true;
  player.stunned = false;
  player.shielded = false;
  player.invulnerable = false;
  player.stunTimer = 0;
  player.shieldTimer = 0;
  player.dashTimer = 0;
  player.primaryCooldownLeft = 0;
  player.specialCooldownLeft = 0;
}

export function checkWinCondition(state: GameState): string | null {
  if (state.roundTimer <= 0) {
    // Time's up - most kills wins
    let bestId = '';
    let bestKills = -1;
    state.players.forEach((player, id) => {
      if (player.kills > bestKills) {
        bestKills = player.kills;
        bestId = id;
      }
    });
    return bestId;
  }

  return null;
}

export function initializePlayer(player: PlayerSchema, alienType: AlienType, spawnIndex: number): void {
  const def = ALIEN_DEFINITIONS[alienType];
  const spawn = SPAWN_POINTS[spawnIndex % SPAWN_POINTS.length];

  player.alien = alienType;
  player.hp = def.maxHp;
  player.maxHp = def.maxHp;
  player.x = spawn.x;
  player.y = spawn.y;
  player.alive = true;
  player.kills = 0;
  player.deaths = 0;
}
