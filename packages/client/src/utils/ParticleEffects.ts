import * as THREE from 'three';

interface ParticleGroup {
  points: THREE.Points;
  velocities: Float32Array;
  lifetimes: Float32Array;
  maxLife: number;
  elapsed: number;
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

        // Gravity
        effect.velocities[i3 + 1] -= 9.8 * dt;
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
