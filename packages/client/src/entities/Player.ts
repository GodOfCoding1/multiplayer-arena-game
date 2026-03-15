import * as THREE from 'three';
import { ALIEN_DEFINITIONS, type AlienType, type PlayerData } from '@ben10/shared';

export class PlayerEntity {
  group = new THREE.Group();
  private body!: THREE.Mesh;
  private aimIndicator!: THREE.Mesh;
  private nameSprite!: THREE.Sprite;
  private hpBarBg!: THREE.Mesh;
  private hpBarFill!: THREE.Mesh;
  private shieldMesh!: THREE.Mesh;
  private currentAlien: AlienType = 'heatblast';
  isLocal = false;

  constructor(public playerId: string, isLocal: boolean) {
    this.isLocal = isLocal;
    this.buildMesh('heatblast');
    this.buildUI('Player');
  }

  buildMesh(alien: AlienType) {
    // Clear existing body meshes (keep UI elements)
    const toRemove: THREE.Object3D[] = [];
    this.group.children.forEach((child) => {
      if (child !== this.nameSprite && child !== this.hpBarBg && child !== this.hpBarFill) {
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

  private getBodyGeometry(alien: AlienType, radius: number): THREE.BufferGeometry {
    switch (alien) {
      case 'heatblast': {
        // Flame-like sphere
        const geo = new THREE.SphereGeometry(radius, 6, 5);
        return geo;
      }
      case 'fourarms': {
        // Beefy box shape
        const geo = new THREE.BoxGeometry(radius * 1.8, radius * 2, radius * 1.4);
        return geo;
      }
      case 'xlr8': {
        // Sleek cone/capsule
        const geo = new THREE.ConeGeometry(radius * 0.8, radius * 2.4, 5);
        return geo;
      }
      case 'diamondhead': {
        // Diamond / octahedron
        const geo = new THREE.OctahedronGeometry(radius, 0);
        return geo;
      }
    }
  }

  buildUI(name: string) {
    // Name label
    if (this.nameSprite) this.group.remove(this.nameSprite);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'transparent';
    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.isLocal ? '#00ff88' : '#ffffff';
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
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    this.hpBarBg = new THREE.Mesh(bgGeo, bgMat);
    this.hpBarBg.position.y = 2.3;
    this.hpBarBg.rotation.x = -Math.PI / 6;
    this.group.add(this.hpBarBg);

    const fillGeo = new THREE.PlaneGeometry(barWidth, barHeight);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0x00ff44, side: THREE.DoubleSide });
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
    this.aimIndicator.position.z = Math.sin(data.aimAngle) * aimDist;
    this.aimIndicator.rotation.y = -data.aimAngle + Math.PI / 2;

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
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
