import { Schema, defineTypes } from '@colyseus/schema';

export class ProjectileSchema extends Schema {
  id: string = '';
  ownerId: string = '';
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  damage: number = 0;
  radius: number = 0.3;
  alienType: string = 'heatblast';

  lifetime: number = 1.5;
}

defineTypes(ProjectileSchema, {
  id: 'string',
  ownerId: 'string',
  x: 'number',
  y: 'number',
  vx: 'number',
  vy: 'number',
  damage: 'number',
  radius: 'number',
  alienType: 'string',
});
