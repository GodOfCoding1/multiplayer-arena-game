import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { PlayerSchema } from './PlayerSchema';
import { ProjectileSchema } from './ProjectileSchema';

export class GameState extends Schema {
  phase: string = 'waiting';
  roundTimer: number = 0;
  selectTimer: number = 0;
  players = new MapSchema<PlayerSchema>();
  projectiles = new MapSchema<ProjectileSchema>();
  winnerId: string = '';
}

defineTypes(GameState, {
  phase: 'string',
  roundTimer: 'number',
  selectTimer: 'number',
  players: { map: PlayerSchema },
  projectiles: { map: ProjectileSchema },
  winnerId: 'string',
});
