import * as THREE from 'three';
import type { PlayerInput } from '@ben10/shared';

export class InputManager {
  private keys = new Set<string>();
  private mouseDown = false;
  private rightMouseDown = false;
  private mouseNdc = new THREE.Vector2();
  private worldMouse = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private seq = 0;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getWorldMouse(camera: THREE.Camera): THREE.Vector3 {
    this.raycaster.setFromCamera(this.mouseNdc, camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, target);
    return target || new THREE.Vector3();
  }

  getInput(camera: THREE.Camera): PlayerInput {
    const wm = this.getWorldMouse(camera);
    this.worldMouse.copy(wm);

    let dx = 0;
    let dy = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy = 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy = -1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx = -1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx = 1;

    return {
      seq: this.seq++,
      dx,
      dy,
      aimX: wm.x,
      aimY: -wm.z,
      primaryFire: this.mouseDown,
      specialFire: this.rightMouseDown,
    };
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }
}
