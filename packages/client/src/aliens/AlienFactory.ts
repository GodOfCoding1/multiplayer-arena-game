import * as THREE from 'three';
import { ALIEN_DEFINITIONS, type AlienType } from '@ben10/shared';
import { createHeatblastMesh } from './Heatblast.js';
import { createFourArmsMesh } from './FourArms.js';
import { createXLR8Mesh } from './XLR8.js';
import { createDiamondheadMesh } from './Diamondhead.js';

export interface AlienMeshResult {
  mesh: THREE.Group;
  playAttack: () => void;
  playSpecial: () => void;
  update: (dt: number) => void;
}

const meshCreators: Record<AlienType, (color: number, glow: number) => AlienMeshResult> = {
  heatblast: createHeatblastMesh,
  fourarms: createFourArmsMesh,
  xlr8: createXLR8Mesh,
  diamondhead: createDiamondheadMesh,
};

export function createAlienMesh(alien: AlienType): AlienMeshResult {
  const def = ALIEN_DEFINITIONS[alien];
  return meshCreators[alien](def.color, def.glowColor);
}
