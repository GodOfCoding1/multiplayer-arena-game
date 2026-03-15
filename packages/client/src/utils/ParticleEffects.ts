import * as THREE from 'three';

interface ParticleGroup {
  points: THREE.Points;
  velocities: Float32Array;
  lifetimes: Float32Array;
  maxLife: number;
  elapsed: number;
  gravity?: number;
}

export class ParticleEffects {
  private scene: THREE.Scene;
  private activeEffects: ParticleGroup[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnBurst(x: number, z: number, color: number, count = 20, speed = 5, lifetime = 0.6) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = x;
      positions[i3 + 1] = 0.5;
      positions[i3 + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.5 + Math.random() * 0.5);
      velocities[i3] = Math.cos(angle) * spd;
      velocities[i3 + 1] = Math.random() * speed * 0.5;
      velocities[i3 + 2] = Math.sin(angle) * spd;

      lifetimes[i] = lifetime * (0.5 + Math.random() * 0.5);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color,
      size: 0.2,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.activeEffects.push({
      points,
      velocities,
      lifetimes,
      maxLife: lifetime,
      elapsed: 0,
    });
  }

  spawnRing(x: number, z: number, color: number, radius = 3, lifetime = 0.5) {
    const count = 32;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const i3 = i * 3;
      positions[i3] = x;
      positions[i3 + 1] = 0.3;
      positions[i3 + 2] = z;

      const speed = radius / lifetime;
      velocities[i3] = Math.cos(angle) * speed;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = Math.sin(angle) * speed;

      lifetimes[i] = lifetime;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color,
      size: 0.3,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.activeEffects.push({
      points,
      velocities,
      lifetimes,
      maxLife: lifetime,
      elapsed: 0,
    });
  }

  /**
   * Spawns a fire AoE effect: expanding ground flames, rising embers, and a heat ring.
   */
  spawnFireAoE(x: number, z: number, radius: number, duration = 0.8) {
    // Layer 1: Ground fire ring — particles expand outward to the AoE radius
    const ringCount = 48;
    this.spawnFireLayer(x, z, ringCount, radius, duration, {
      color: 0xff4400,
      size: 0.45,
      yBase: 0.15,
      yRandom: 0.1,
      speedMultiplier: 1.0,
      riseSpeed: 1.5,
      gravity: 0,
    });

    // Layer 2: Rising flame particles — taller, more orange
    const flameCount = 36;
    this.spawnFireLayer(x, z, flameCount, radius * 0.85, duration * 1.1, {
      color: 0xff8800,
      size: 0.35,
      yBase: 0.3,
      yRandom: 0.2,
      speedMultiplier: 0.7,
      riseSpeed: 4.0,
      gravity: -1.5,
    });

    // Layer 3: Hot core embers — small bright yellow particles near center
    const emberCount = 24;
    this.spawnFireLayer(x, z, emberCount, radius * 0.5, duration * 1.3, {
      color: 0xffcc00,
      size: 0.2,
      yBase: 0.5,
      yRandom: 0.5,
      speedMultiplier: 0.4,
      riseSpeed: 6.0,
      gravity: -2.0,
    });
  }

  private spawnFireLayer(
    x: number,
    z: number,
    count: number,
    radius: number,
    lifetime: number,
    opts: {
      color: number;
      size: number;
      yBase: number;
      yRandom: number;
      speedMultiplier: number;
      riseSpeed: number;
      gravity: number;
    },
  ) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const startDist = Math.random() * radius * 0.15;

      positions[i3] = x + Math.cos(angle) * startDist;
      positions[i3 + 1] = opts.yBase + Math.random() * opts.yRandom;
      positions[i3 + 2] = z + Math.sin(angle) * startDist;

      const outwardSpeed = (radius / lifetime) * opts.speedMultiplier * (0.6 + Math.random() * 0.4);
      velocities[i3] = Math.cos(angle) * outwardSpeed;
      velocities[i3 + 1] = opts.riseSpeed * (0.5 + Math.random() * 0.5);
      velocities[i3 + 2] = Math.sin(angle) * outwardSpeed;

      lifetimes[i] = lifetime * (0.6 + Math.random() * 0.4);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: opts.color,
      size: opts.size,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.activeEffects.push({
      points,
      velocities,
      lifetimes,
      maxLife: lifetime,
      elapsed: 0,
      gravity: opts.gravity,
    });
  }

  update(dt: number) {
    const toRemove: number[] = [];

    for (let e = 0; e < this.activeEffects.length; e++) {
      const effect = this.activeEffects[e];
      effect.elapsed += dt;

      if (effect.elapsed >= effect.maxLife * 1.5) {
        this.scene.remove(effect.points);
        effect.points.geometry.dispose();
        (effect.points.material as THREE.Material).dispose();
        toRemove.push(e);
        continue;
      }

      const posAttr = effect.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const count = positions.length / 3;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] += effect.velocities[i3] * dt;
        positions[i3 + 1] += effect.velocities[i3 + 1] * dt;
        positions[i3 + 2] += effect.velocities[i3 + 2] * dt;

        const g = effect.gravity ?? -9.8;
        effect.velocities[i3 + 1] += g * dt;
        if (positions[i3 + 1] < 0) {
          positions[i3 + 1] = 0;
          effect.velocities[i3 + 1] *= -0.3;
        }
      }

      posAttr.needsUpdate = true;

      const fadeProgress = Math.min(1, effect.elapsed / effect.maxLife);
      (effect.points.material as THREE.PointsMaterial).opacity = 1 - fadeProgress;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activeEffects.splice(toRemove[i], 1);
    }
  }
}
