import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  ALIEN_DEFINITIONS,
  type AlienType,
  type PlayerData,
} from "@ben10/shared";

export class PlayerEntity {
  group = new THREE.Group();
  private body!: THREE.Mesh;
  private bodyVisual: THREE.Object3D | null = null;
  private aimIndicator!: THREE.Mesh;
  private nameSprite!: THREE.Sprite;
  private hpBarBg!: THREE.Mesh;
  private hpBarFill!: THREE.Mesh;
  private shieldMesh!: THREE.Mesh;
  private currentAlien: AlienType = "heatblast";
  isLocal = false;
  private meshBuildVersion = 0;

  private static loader = new GLTFLoader();
  private static modelPromises = new Map<AlienType, Promise<THREE.Object3D>>();
  private static cachedScales = new Map<AlienType, number>();

  private static readonly MODEL_PATHS: Record<AlienType, string> = {
    heatblast: '/assets/heatblast.glb',
    fourarms: '/assets/fourarms_v2.glb',
    xlr8: '/assets/ben_10_xlr8.glb',
    diamondhead: '/assets/diamondhead_-_ben_10.glb',
  };

  private static readonly TARGET_HEIGHT_MULTIPLIER: Record<AlienType, number> = {
    heatblast: 6,
    fourarms: 5,
    xlr8: 4,
    diamondhead: 5,
  };

  constructor(
    public playerId: string,
    isLocal: boolean,
  ) {
    this.isLocal = isLocal;
    this.buildMesh("heatblast");
    this.buildUI("Player");
  }

  buildMesh(alien: AlienType) {
    this.meshBuildVersion += 1;
    const buildVersion = this.meshBuildVersion;

    // Clear existing body meshes (keep UI elements)
    const toRemove: THREE.Object3D[] = [];
    this.group.children.forEach((child) => {
      if (
        child !== this.nameSprite &&
        child !== this.hpBarBg &&
        child !== this.hpBarFill
      ) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((c) => this.group.remove(c));

    this.currentAlien = alien;
    const def = ALIEN_DEFINITIONS[alien];
    const color = def.color;
    const glow = def.glowColor;

    // Body
    const bodyGeo = this.getBodyGeometry(alien, def.bodyRadius);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      emissive: glow,
      emissiveIntensity: 0.3,
      flatShading: true,
      roughness: 0.6,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.castShadow = true;
    this.body.position.y = def.bodyRadius;
    this.group.add(this.body);
    this.bodyVisual = this.body;

    this.applyGLBModel(alien, buildVersion, def.bodyRadius);

    // Aim direction indicator
    const aimGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
    aimGeo.rotateX(Math.PI / 2);
    const aimMat = new THREE.MeshBasicMaterial({ color: glow });
    this.aimIndicator = new THREE.Mesh(aimGeo, aimMat);
    this.aimIndicator.position.y = def.bodyRadius;
    this.group.add(this.aimIndicator);

    // Shield sphere (hidden by default)
    const shieldGeo = new THREE.SphereGeometry(def.bodyRadius + 0.5, 16, 16);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x44ffff,
      transparent: true,
      opacity: 0,
      wireframe: true,
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = def.bodyRadius;
    this.group.add(this.shieldMesh);
  }

  private static loadModel(alien: AlienType): Promise<THREE.Object3D> {
    let promise = this.modelPromises.get(alien);
    if (!promise) {
      const path = this.MODEL_PATHS[alien];
      promise = new Promise((resolve, reject) => {
        this.loader.load(path, (gltf) => resolve(gltf.scene), undefined, reject);
      });
      this.modelPromises.set(alien, promise);
    }
    return promise;
  }

  private static measureVertexExtents(root: THREE.Object3D): THREE.Vector3 {
    root.updateMatrixWorld(true);
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const v = new THREE.Vector3();
    let found = false;

    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const posAttr = mesh.geometry?.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr) return;
      found = true;
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
        min.min(v);
        max.max(v);
      }
    });

    if (!found) return new THREE.Vector3(0, 0, 0);
    return max.sub(min);
  }

  private static findYMin(root: THREE.Object3D): number {
    let yMin = Infinity;
    const v = new THREE.Vector3();
    root.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const posAttr = mesh.geometry?.getAttribute('position') as THREE.BufferAttribute | undefined;
      if (!posAttr) return;
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
        if (v.y < yMin) yMin = v.y;
      }
    });
    return yMin;
  }

  private applyGLBModel(alien: AlienType, buildVersion: number, radius: number) {
    void PlayerEntity.loadModel(alien)
      .then((template) => {
        if (buildVersion !== this.meshBuildVersion || this.currentAlien !== alien) return;

        if (!PlayerEntity.cachedScales.has(alien)) {
          const extents = PlayerEntity.measureVertexExtents(template);
          const maxDim = Math.max(extents.x, extents.y, extents.z);
          const multiplier = PlayerEntity.TARGET_HEIGHT_MULTIPLIER[alien];
          const targetHeight = radius * multiplier;
          const scale = maxDim > 0.01 ? targetHeight / maxDim : 0.005;
          PlayerEntity.cachedScales.set(alien, scale);
          console.log(`[${alien}] extents: ${extents.x.toFixed(2)} ${extents.y.toFixed(2)} ${extents.z.toFixed(2)} | scale: ${scale.toFixed(6)}`);
        }

        const model = cloneSkeleton(template);
        model.scale.setScalar(PlayerEntity.cachedScales.get(alien)!);
        model.updateMatrixWorld(true);

        const yMin = PlayerEntity.findYMin(model);
        if (isFinite(yMin)) model.position.y = -yMin;

        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.castShadow = true;
        });

        if (this.bodyVisual) this.group.remove(this.bodyVisual);
        this.body.geometry.dispose();
        if (Array.isArray(this.body.material)) {
          this.body.material.forEach((m) => m.dispose());
        } else {
          this.body.material.dispose();
        }
        this.bodyVisual = model;
        this.group.add(model);
      })
      .catch((err) => {
        console.warn(`Failed to load ${alien} model:`, err);
      });
  }

  private getBodyGeometry(
    alien: AlienType,
    radius: number,
  ): THREE.BufferGeometry {
    switch (alien) {
      case "heatblast": {
        // Flame-like sphere
        const geo = new THREE.SphereGeometry(radius, 6, 5);
        return geo;
      }
      case "fourarms": {
        // Beefy box shape
        const geo = new THREE.BoxGeometry(
          radius * 1.8,
          radius * 2,
          radius * 1.4,
        );
        return geo;
      }
      case "xlr8": {
        // Sleek cone/capsule
        const geo = new THREE.ConeGeometry(radius * 0.8, radius * 2.4, 5);
        return geo;
      }
      case "diamondhead": {
        // Diamond / octahedron
        const geo = new THREE.OctahedronGeometry(radius, 0);
        return geo;
      }
    }
  }

  buildUI(name: string) {
    // Name label
    if (this.nameSprite) this.group.remove(this.nameSprite);

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "transparent";
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = this.isLocal ? "#00ff88" : "#ffffff";
    ctx.fillText(name, 128, 36);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.scale.set(3, 0.75, 1);
    this.nameSprite.position.y = 3;
    this.group.add(this.nameSprite);

    // HP bar background
    if (this.hpBarBg) this.group.remove(this.hpBarBg);
    if (this.hpBarFill) this.group.remove(this.hpBarFill);

    const barWidth = 1.6;
    const barHeight = 0.15;
    const bgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide,
    });
    this.hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarBg.position.y = 2.3;
    this.hpBarBg.rotation.x = -Math.PI / 6;
    this.group.add(this.hpBarBg);

    const fillGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      side: THREE.DoubleSide,
    });
    this.hpBarFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpBarFill.position.y = 2.3;
    this.hpBarFill.position.z = -0.001;
    this.hpBarFill.rotation.x = -Math.PI / 6;
    this.group.add(this.hpBarFill);
  }

  update(data: PlayerData, dt: number) {
    if (data.alien !== this.currentAlien) {
      this.buildMesh(data.alien);
    }

    // Map game coords to Three.js: x stays the same, game Y -> negative Z (forward is up on screen)
    const targetZ = -data.y;
    if (!this.isLocal) {
      this.group.position.x += (data.x - this.group.position.x) * 0.2;
      this.group.position.z += (targetZ - this.group.position.z) * 0.2;
    } else {
      this.group.position.x = data.x;
      this.group.position.z = targetZ;
    }

    // Aim indicator
    const aimDist = ALIEN_DEFINITIONS[data.alien].bodyRadius + 0.6;
    this.aimIndicator.position.x = Math.cos(data.aimAngle) * aimDist;
    this.aimIndicator.position.z = -Math.sin(data.aimAngle) * aimDist;
    this.aimIndicator.rotation.y = data.aimAngle + Math.PI / 2;

    // HP bar
    const hpFraction = Math.max(0, data.hp / data.maxHp);
    this.hpBarFill.scale.x = hpFraction;
    this.hpBarFill.position.x = -(1 - hpFraction) * 0.8;

    const fillMat = this.hpBarFill.material as THREE.MeshBasicMaterial;
    if (hpFraction > 0.5) fillMat.color.setHex(0x00ff44);
    else if (hpFraction > 0.25) fillMat.color.setHex(0xffaa00);
    else fillMat.color.setHex(0xff2222);

    // Shield visibility
    const shieldMat = this.shieldMesh.material as THREE.MeshBasicMaterial;
    shieldMat.opacity = data.shielded ? 0.4 : 0;

    // Visibility when dead
    this.group.visible = data.alive;
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material))
          obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
