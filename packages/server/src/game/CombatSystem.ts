import {
  ALIEN_DEFINITIONS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  STUN_DURATION,
  SHIELD_DURATION,
  DASH_DURATION,
  DASH_SPEED_MULTIPLIER,
  type AlienType,
  type PlayerInput,
} from '@ben10/shared';
import { PlayerSchema } from '../schemas/PlayerSchema';
import { ProjectileSchema } from '../schemas/ProjectileSchema';
import { circlesOverlap, distanceSq } from './CollisionSystem';

let nextProjectileId = 0;

export function handlePrimaryAttack(
  player: PlayerSchema,
  input: PlayerInput,
): ProjectileSchema | null {
  if (player.primaryCooldownLeft > 0 || !player.alive || player.stunned) return null;

  const alien = player.alien as AlienType;
  const def = ALIEN_DEFINITIONS[alien];
  player.primaryCooldownLeft = def.primaryCooldown;

  const angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
  player.aimAngle = angle;

  if (alien === 'fourarms' || alien === 'xlr8') {
    // Melee attacks are handled as instant hits in processMeleeAttacks
    return null;
  }

  // Ranged: create projectile
  const proj = new ProjectileSchema();
  proj.id = `p_${nextProjectileId++}`;
  proj.ownerId = player.id;
  proj.x = player.x + Math.cos(angle) * (def.bodyRadius + 0.4);
  proj.y = player.y + Math.sin(angle) * (def.bodyRadius + 0.4);
  proj.vx = Math.cos(angle) * PROJECTILE_SPEED;
  proj.vy = Math.sin(angle) * PROJECTILE_SPEED;
  proj.damage = def.primaryDamage;
  proj.radius = PROJECTILE_RADIUS;
  proj.alienType = alien;
  proj.lifetime = PROJECTILE_LIFETIME;

  return proj;
}

export function processMeleeAttack(
  attacker: PlayerSchema,
  targets: PlayerSchema[],
  input: PlayerInput,
): PlayerSchema[] {
  if (attacker.primaryCooldownLeft > 0 || !attacker.alive || attacker.stunned) return [];
  const aAlien = attacker.alien as AlienType;
  if (aAlien !== 'fourarms' && aAlien !== 'xlr8') return [];

  const def = ALIEN_DEFINITIONS[aAlien];
  attacker.primaryCooldownLeft = def.primaryCooldown;

  const angle = Math.atan2(input.aimY - attacker.y, input.aimX - attacker.x);
  attacker.aimAngle = angle;

  const rangeSq = def.primaryRange * def.primaryRange;
  const hit: PlayerSchema[] = [];

  for (const target of targets) {
    if (target.id === attacker.id || !target.alive || target.shielded || target.invulnerable) continue;
    if (distanceSq(attacker.x, attacker.y, target.x, target.y) <= rangeSq) {
      // Check cone (120 degrees)
      const toTarget = Math.atan2(target.y - attacker.y, target.x - attacker.x);
      let angleDiff = Math.abs(toTarget - angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff <= Math.PI / 3) {
        target.hp -= def.primaryDamage;
        hit.push(target);
      }
    }
  }

  return hit;
}

export function handleSpecialAbility(
  player: PlayerSchema,
  targets: PlayerSchema[],
  input: PlayerInput,
): { hit: PlayerSchema[]; projectile: ProjectileSchema | null } {
  if (player.specialCooldownLeft > 0 || !player.alive || player.stunned) {
    return { hit: [], projectile: null };
  }

  const sAlien = player.alien as AlienType;
  const def = ALIEN_DEFINITIONS[sAlien];
  player.specialCooldownLeft = def.specialCooldown;

  const angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
  const hit: PlayerSchema[] = [];

  switch (sAlien) {
    case 'heatblast': {
      // Fire ring AoE around self
      const rangeSq = def.specialRange * def.specialRange;
      for (const target of targets) {
        if (target.id === player.id || !target.alive || target.shielded || target.invulnerable) continue;
        if (distanceSq(player.x, player.y, target.x, target.y) <= rangeSq) {
          target.hp -= def.specialDamage;
          hit.push(target);
        }
      }
      return { hit, projectile: null };
    }

    case 'fourarms': {
      // Ground slam AoE stun
      const rangeSq = def.specialRange * def.specialRange;
      for (const target of targets) {
        if (target.id === player.id || !target.alive || target.invulnerable) continue;
        if (distanceSq(player.x, player.y, target.x, target.y) <= rangeSq) {
          if (!target.shielded) {
            target.hp -= def.specialDamage;
            target.stunned = true;
            target.stunTimer = STUN_DURATION;
          }
          hit.push(target);
        }
      }
      return { hit, projectile: null };
    }

    case 'xlr8': {
      // Speed dash with invulnerability
      player.dashTimer = DASH_DURATION;
      player.dashDx = Math.cos(angle) * def.speed * DASH_SPEED_MULTIPLIER;
      player.dashDy = Math.sin(angle) * def.speed * DASH_SPEED_MULTIPLIER;
      player.invulnerable = true;
      return { hit: [], projectile: null };
    }

    case 'diamondhead': {
      // Crystal shield
      player.shielded = true;
      player.shieldTimer = SHIELD_DURATION;
      return { hit: [], projectile: null };
    }
  }

  return { hit: [], projectile: null };
}

export function checkProjectileHits(
  projectiles: Map<string, ProjectileSchema>,
  players: Map<string, PlayerSchema>,
): Array<{ projectileId: string; targetId: string; attackerId: string }> {
  const hits: Array<{ projectileId: string; targetId: string; attackerId: string }> = [];

  for (const [pId, proj] of projectiles) {
    for (const [plId, player] of players) {
      if (proj.ownerId === plId || !player.alive || player.shielded || player.invulnerable) continue;

      const pDef = ALIEN_DEFINITIONS[player.alien as AlienType];
      if (circlesOverlap(proj.x, proj.y, proj.radius, player.x, player.y, pDef.bodyRadius)) {
        player.hp -= proj.damage;
        hits.push({ projectileId: pId, targetId: plId, attackerId: proj.ownerId });
        break;
      }
    }
  }

  return hits;
}
