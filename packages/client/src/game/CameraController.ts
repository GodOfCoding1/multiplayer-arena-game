import * as THREE from 'three';

export class CameraController {
  camera: THREE.PerspectiveCamera;
  private targetX = 0;
  private targetZ = 0;
  private height = 30;
  private lookAhead = 2;
  private smoothing = 0.12;
  private initialized = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.camera.position.set(0, this.height, 15);
    this.camera.lookAt(0, 0, 0);
  }

  follow(x: number, z: number, aimX: number, aimZ: number) {
    const aimDx = aimX - x;
    const aimDz = aimZ - z;
    const len = Math.sqrt(aimDx * aimDx + aimDz * aimDz) || 1;

    this.targetX = x + (aimDx / len) * this.lookAhead;
    this.targetZ = z + (aimDz / len) * this.lookAhead;

    if (!this.initialized) {
      // Snap to player position on first call
      this.camera.position.x = this.targetX;
      this.camera.position.z = this.targetZ + 15;
      this.initialized = true;
    } else {
      this.camera.position.x += (this.targetX - this.camera.position.x) * this.smoothing;
      this.camera.position.z += (this.targetZ + 15 - this.camera.position.z) * this.smoothing;
    }

    this.camera.position.y = this.height;
    this.camera.lookAt(this.camera.position.x, 0, this.camera.position.z - 15);
  }

  snapTo(x: number, z: number) {
    this.camera.position.x = x;
    this.camera.position.z = z + 15;
    this.camera.position.y = this.height;
    this.camera.lookAt(x, 0, z);
    this.initialized = true;
  }

  resize(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
