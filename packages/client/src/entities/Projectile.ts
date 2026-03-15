import * as THREE from 'three';
import { ALIEN_DEFINITIONS, type AlienType, type ProjectileData } from '@ben10/shared';

export class ProjectileEntity {
  mesh: THREE.Mesh;
  private trail: THREE.Points;

  constructor(data: ProjectileData) {
    const def = ALIEN_DEFINITIONS[data.alienType];
    const geo = new THREE.SphereGeometry(data.radius, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: def.glowColor,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(data.x, 0.5, -data.y);

    // Small trailing particles
    const trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(15); // 5 points
    trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: def.glowColor,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
    });
    this.trail = new THREE.Points(trailGeo, trailMat);
    this.mesh.add(this.trail);
  }

  update(data: ProjectileData) {
    this.mesh.position.x += (data.x - this.mesh.position.x) * 0.4;
    this.mesh.position.z += (-data.y - this.mesh.position.z) * 0.4;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.trail.geometry.dispose();
    (this.trail.material as THREE.Material).dispose();
  }
}
