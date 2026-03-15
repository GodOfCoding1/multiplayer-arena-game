import * as THREE from 'three';
import type { AlienMeshResult } from './AlienFactory.js';

export function createXLR8Mesh(color: number, glow: number): AlienMeshResult {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    emissive: glow,
    emissiveIntensity: 0.3,
    flatShading: true,
    roughness: 0.3,
    metalness: 0.4,
  });

  // Sleek body
  const bodyGeo = new THREE.ConeGeometry(0.4, 1.4, 5);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.9;
  body.castShadow = true;
  group.add(body);

  // Head visor
  const visorGeo = new THREE.SphereGeometry(0.28, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const visorMat = new THREE.MeshBasicMaterial({ color: 0x44bbff });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.y = 1.65;
  visor.rotation.x = Math.PI;
  group.add(visor);

  // Tail
  const tailGeo = new THREE.ConeGeometry(0.12, 0.6, 3);
  const tail = new THREE.Mesh(tailGeo, bodyMat.clone());
  tail.position.set(0, 0.5, -0.35);
  tail.rotation.x = 0.5;
  group.add(tail);

  // Speed lines (shown during dash)
  const speedLines: THREE.Line[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: glow, transparent: true, opacity: 0 });
  for (let i = 0; i < 6; i++) {
    const pts = [
      new THREE.Vector3(-0.3, 0.3 + i * 0.2, -0.8),
      new THREE.Vector3(-0.3, 0.3 + i * 0.2, -2),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lineGeo, lineMat.clone());
    group.add(line);
    speedLines.push(line);
  }

  let slashTimer = 0;
  let dashTimer = 0;

  return {
    mesh: group,
    playAttack: () => {
      slashTimer = 0.2;
    },
    playSpecial: () => {
      dashTimer = 0.4;
    },
    update: (dt: number) => {
      // Idle bob
      body.position.y = 0.9 + Math.sin(Date.now() * 0.006) * 0.05;

      // Slash animation - lean forward
      if (slashTimer > 0) {
        slashTimer -= dt;
        body.rotation.x = Math.sin(slashTimer * Math.PI / 0.2) * 0.4;
      } else {
        body.rotation.x = 0;
      }

      // Dash speed lines
      if (dashTimer > 0) {
        dashTimer -= dt;
        for (const line of speedLines) {
          (line.material as THREE.LineBasicMaterial).opacity = dashTimer * 2.5;
        }
      } else {
        for (const line of speedLines) {
          (line.material as THREE.LineBasicMaterial).opacity = 0;
        }
      }
    },
  };
}
