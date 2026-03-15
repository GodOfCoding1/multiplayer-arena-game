import * as THREE from 'three';
import type { AlienMeshResult } from './AlienFactory.js';

export function createDiamondheadMesh(color: number, glow: number): AlienMeshResult {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    emissive: glow,
    emissiveIntensity: 0.3,
    flatShading: true,
    roughness: 0.2,
    metalness: 0.6,
  });

  // Crystal body - octahedron
  const bodyGeo = new THREE.OctahedronGeometry(0.7, 0);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  // Crystal shoulder spikes
  for (const side of [-1, 1]) {
    const spikeGeo = new THREE.OctahedronGeometry(0.25, 0);
    const spike = new THREE.Mesh(spikeGeo, bodyMat.clone());
    spike.position.set(side * 0.8, 1.2, 0);
    spike.rotation.z = side * 0.5;
    group.add(spike);
  }

  // Crystal head spike
  const headGeo = new THREE.OctahedronGeometry(0.2, 0);
  const headSpike = new THREE.Mesh(headGeo, bodyMat.clone());
  headSpike.position.y = 1.85;
  group.add(headSpike);

  // Crystal base
  const baseGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.3, 6);
  const base = new THREE.Mesh(baseGeo, bodyMat.clone());
  base.position.y = 0.15;
  group.add(base);

  let attackFlash = 0;
  let shieldMesh: THREE.Mesh | null = null;
  let shieldTimer = 0;

  return {
    mesh: group,
    playAttack: () => {
      attackFlash = 0.2;
      bodyMat.emissiveIntensity = 1.0;
    },
    playSpecial: () => {
      // Crystal shield
      if (shieldMesh) group.remove(shieldMesh);
      const shieldGeo = new THREE.IcosahedronGeometry(1.2, 1);
      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x44ff99,
        transparent: true,
        opacity: 0.35,
        wireframe: true,
      });
      shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
      shieldMesh.position.y = 1.0;
      group.add(shieldMesh);
      shieldTimer = 2.0;
    },
    update: (dt: number) => {
      // Crystal shimmer rotation
      body.rotation.y += dt * 0.5;
      headSpike.rotation.y -= dt * 0.8;

      // Attack flash
      if (attackFlash > 0) {
        attackFlash -= dt;
        bodyMat.emissiveIntensity = 0.3 + attackFlash * 3.5;
      }

      // Shield animation
      if (shieldTimer > 0 && shieldMesh) {
        shieldTimer -= dt;
        shieldMesh.rotation.y += dt * 2;
        shieldMesh.rotation.x += dt * 1.5;
        (shieldMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.35, shieldTimer * 0.2);
        if (shieldTimer <= 0) {
          group.remove(shieldMesh);
          shieldMesh = null;
        }
      }
    },
  };
}
