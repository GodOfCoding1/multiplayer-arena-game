import { Schema, defineTypes } from '@colyseus/schema';
import type { AlienType } from '@ben10/shared';

export class PlayerSchema extends Schema {
  id: string = '';
  name: string = '';
  x: number = 0;
  y: number = 0;
  hp: number = 100;
  maxHp: number = 100;
  alien: string = 'heatblast';
  aimAngle: number = 0;
  kills: number = 0;
  deaths: number = 0;
  alive: boolean = true;
  shielded: boolean = false;
  stunned: boolean = false;
  primaryCooldownLeft: number = 0;
  specialCooldownLeft: number = 0;
  lastInputSeq: number = 0;

  // Server-only state (not synced)
  respawnTimer: number = 0;
  stunTimer: number = 0;
  shieldTimer: number = 0;
  dashTimer: number = 0;
  dashDx: number = 0;
  dashDy: number = 0;
  invulnerable: boolean = false;

  getAlien(): AlienType {
    return this.alien as AlienType;
  }
}

defineTypes(PlayerSchema, {
  id: 'string',
  name: 'string',
  x: 'number',
  y: 'number',
  hp: 'number',
  maxHp: 'number',
  alien: 'string',
  aimAngle: 'number',
  kills: 'number',
  deaths: 'number',
  alive: 'boolean',
  shielded: 'boolean',
  stunned: 'boolean',
  primaryCooldownLeft: 'number',
  specialCooldownLeft: 'number',
  lastInputSeq: 'number',
});
