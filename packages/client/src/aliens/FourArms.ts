import * as THREE from 'three';
import type { AlienMeshResult } from './AlienFactory.js';

export function createFourArmsMesh(color: number, glow: number): AlienMeshResult {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: glow,
    emissiveIntensity: 0.2,
    flatShading: true,
    roughness: 0.7,
  });

  // Wide torso
  const torsoGeo = new THREE.BoxGeometry(1.2, 1.0, 0.8);
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 0.8;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 1.6;
  head.castShadow = true;
  group.add(head);

  // Four arms
  const armMat = mat.clone();
  const armPositions = [
    { x: -0.75, y: 1.0, z: 0.2 },
    { x: 0.75, y: 1.0, z: 0.2 },
    { x: -0.6, y: 0.6, z: -0.2 },
    { x: 0.6, y: 0.6, z: -0.2 },
  ];

  const arms: THREE.Mesh[] = [];
  for (const pos of armPositions) {
    const armGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(pos.x, pos.y, pos.z);
    arm.castShadow = true;
    group.add(arm);
    arms.push(arm);

    // Fist
    const fistGeo = new THREE.SphereGeometry(0.18, 5, 5);
    const fist = new THREE.Mesh(fistGeo, armMat);
    fist.position.y = -0.35;
    arm.add(fist);
  }

  let punchTimer = 0;
  let slamTimer = 0;
  let slamRing: THREE.Mesh | null = null;

  return {
    mesh: group,
    playAttack: () => {
      punchTimer = 0.3;
    },
    playSpecial: () => {
      slamTimer = 0.6;
      if (slamRing) group.remove(slamRing);
      const ringGeo = new THREE.RingGeometry(0.5, 4, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff2222,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      slamRing = new THREE.Mesh(ringGeo, ringMat);
      slamRing.rotation.x = -Math.PI / 2;
      slamRing.position.y = 0.05;
      group.add(slamRing);
    },
    update: (dt: number) => {
      // Punch animation
      if (punchTimer > 0) {
        punchTimer -= dt;
        const punchExtend = Math.sin(punchTimer * Math.PI / 0.3) * 0.4;
        arms[0].position.z = 0.2 + punchExtend;
        arms[1].position.z = 0.2 + punchExtend;
      } else {
        arms[0].position.z = 0.2;
        arms[1].position.z = 0.2;
      }

      // Slam ring animation
      if (slamTimer > 0 && slamRing) {
        slamTimer -= dt;
        const scale = 1 + (0.6 - slamTimer) * 3;
        slamRing.scale.set(scale, scale, 1);
        (slamRing.material as THREE.MeshBasicMaterial).opacity = slamTimer * 1.2;
        if (slamTimer <= 0) {
          group.remove(slamRing);
          slamRing = null;
        }
      }

      // Idle arm sway
      const t = Date.now() * 0.003;
      arms[0].rotation.z = Math.sin(t) * 0.1;
      arms[1].rotation.z = -Math.sin(t) * 0.1;
      arms[2].rotation.z = Math.sin(t + 1) * 0.08;
      arms[3].rotation.z = -Math.sin(t + 1) * 0.08;
    },
  };
}
