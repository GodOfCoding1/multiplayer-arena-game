import * as THREE from 'three';
import type { AlienMeshResult } from './AlienFactory.js';

export function createHeatblastMesh(color: number, glow: number): AlienMeshResult {
  const group = new THREE.Group();

  // Main body - lava sphere
  const bodyGeo = new THREE.SphereGeometry(0.6, 8, 6);
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    emissive: glow,
    emissiveIntensity: 0.5,
    flatShading: true,
    roughness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Head flame
  const flameGeo = new THREE.ConeGeometry(0.3, 0.6, 5);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 1.6;
  group.add(flame);

  // Shoulder flames (left/right)
  for (const side of [-1, 1]) {
    const sGeo = new THREE.ConeGeometry(0.15, 0.35, 4);
    const sMesh = new THREE.Mesh(sGeo, flameMat.clone());
    sMesh.position.set(side * 0.55, 1.1, 0);
    group.add(sMesh);
  }

  // Inner glow point light
  const light = new THREE.PointLight(glow, 0.8, 4);
  light.position.y = 0.8;
  group.add(light);

  let attackFlash = 0;
  let specialRing: THREE.Mesh | null = null;
  let specialTimer = 0;

  return {
    mesh: group,
    playAttack: () => {
      attackFlash = 0.2;
      bodyMat.emissiveIntensity = 1.5;
    },
    playSpecial: () => {
      // Fire ring AoE
      if (specialRing) group.remove(specialRing);
      const ringGeo = new THREE.TorusGeometry(3, 0.3, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.8,
      });
      specialRing = new THREE.Mesh(ringGeo, ringMat);
      specialRing.rotation.x = -Math.PI / 2;
      specialRing.position.y = 0.2;
      group.add(specialRing);
      specialTimer = 0.5;
    },
    update: (dt: number) => {
      // Flame animation
      flame.position.y = 1.6 + Math.sin(Date.now() * 0.008) * 0.1;
      flame.rotation.y += dt * 3;

      // Attack flash decay
      if (attackFlash > 0) {
        attackFlash -= dt;
        bodyMat.emissiveIntensity = 0.5 + attackFlash * 5;
      }

      // Special ring decay
      if (specialTimer > 0 && specialRing) {
        specialTimer -= dt;
        const scale = 1 + (0.5 - specialTimer) * 4;
        specialRing.scale.set(scale, scale, 1);
        (specialRing.material as THREE.MeshBasicMaterial).opacity = specialTimer * 1.6;
        if (specialTimer <= 0) {
          group.remove(specialRing);
          specialRing = null;
        }
      }
    },
  };
}
