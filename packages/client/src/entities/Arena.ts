import * as THREE from 'three';
import { ARENA_WIDTH, ARENA_HEIGHT, ARENA_HALF_W, ARENA_HALF_H } from '@ben10/shared';

export class Arena {
  group = new THREE.Group();

  constructor() {
    this.createFloor();
    this.createGrid();
    this.createWalls();
    this.createLighting();
  }

  private createFloor() {
    const geo = new THREE.PlaneGeometry(ARENA_WIDTH, ARENA_HEIGHT);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private createGrid() {
    const gridMat = new THREE.LineBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.15 });

    for (let i = -ARENA_HALF_W; i <= ARENA_HALF_W; i += 2) {
      const points = [
        new THREE.Vector3(i, 0.01, -ARENA_HALF_H),
        new THREE.Vector3(i, 0.01, ARENA_HALF_H),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.group.add(new THREE.Line(geo, gridMat));
    }

    for (let i = -ARENA_HALF_H; i <= ARENA_HALF_H; i += 2) {
      const points = [
        new THREE.Vector3(-ARENA_HALF_W, 0.01, i),
        new THREE.Vector3(ARENA_HALF_W, 0.01, i),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.group.add(new THREE.Line(geo, gridMat));
    }

    // Brighter border
    const borderMat = new THREE.LineBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.6 });
    const borderPoints = [
      new THREE.Vector3(-ARENA_HALF_W, 0.02, -ARENA_HALF_H),
      new THREE.Vector3(ARENA_HALF_W, 0.02, -ARENA_HALF_H),
      new THREE.Vector3(ARENA_HALF_W, 0.02, ARENA_HALF_H),
      new THREE.Vector3(-ARENA_HALF_W, 0.02, ARENA_HALF_H),
      new THREE.Vector3(-ARENA_HALF_W, 0.02, -ARENA_HALF_H),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
    this.group.add(new THREE.Line(borderGeo, borderMat));
  }

  private createWalls() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44,
      emissive: 0x00ff44,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.3,
    });
    const wallHeight = 1.5;
    const wallThickness = 0.3;

    const walls = [
      { w: ARENA_WIDTH + wallThickness * 2, h: wallHeight, d: wallThickness, x: 0, z: -ARENA_HALF_H - wallThickness / 2 },
      { w: ARENA_WIDTH + wallThickness * 2, h: wallHeight, d: wallThickness, x: 0, z: ARENA_HALF_H + wallThickness / 2 },
      { w: wallThickness, h: wallHeight, d: ARENA_HEIGHT, x: -ARENA_HALF_W - wallThickness / 2, z: 0 },
      { w: wallThickness, h: wallHeight, d: ARENA_HEIGHT, x: ARENA_HALF_W + wallThickness / 2, z: 0 },
    ];

    for (const w of walls) {
      const geo = new THREE.BoxGeometry(w.w, w.h, w.d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(w.x, w.h / 2, w.z);
      this.group.add(mesh);
    }
  }

  private createLighting() {
    const ambient = new THREE.AmbientLight(0x334466, 0.6);
    this.group.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.group.add(dirLight);

    // Green point lights at corners for atmosphere
    const corners = [
      [-ARENA_HALF_W, -ARENA_HALF_H],
      [ARENA_HALF_W, -ARENA_HALF_H],
      [-ARENA_HALF_W, ARENA_HALF_H],
      [ARENA_HALF_W, ARENA_HALF_H],
    ];
    for (const [cx, cz] of corners) {
      const light = new THREE.PointLight(0x00ff44, 0.5, 15);
      light.position.set(cx, 3, cz);
      this.group.add(light);
    }
  }
}
