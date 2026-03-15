import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ALIEN_DEFINITIONS, type ProjectileData } from '@ben10/shared';

export class ProjectileEntity {
  mesh: THREE.Mesh;
  private trail: THREE.Points;
  private projectileVisual: THREE.Object3D | null = null;

  private static loader = new GLTFLoader();
  private static fireModelPromise: Promise<THREE.Object3D> | null = null;
  private static readonly fireSfxPath = '/assets/fireball_sfx.mp3';

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

    if (data.alienType === 'heatblast') {
      this.applyFireballModel(data.radius);
      this.playFireballSfx();
    }
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

  private static loadFireModel(): Promise<THREE.Object3D> {
    if (!this.fireModelPromise) {
      this.fireModelPromise = new Promise((resolve, reject) => {
        this.loader.load(
          '/assets/Fire.glb',
          (gltf) => resolve(gltf.scene),
          undefined,
          reject,
        );
      });
    }
    return this.fireModelPromise;
  }

  private applyFireballModel(radius: number) {
    void ProjectileEntity.loadFireModel()
      .then((template) => {
        const model = template.clone(true);
        const bbox = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const targetSize = Math.max(radius * 2.5, 0.35);
        const scale = targetSize / maxDim;
        model.scale.setScalar(scale);

        bbox.setFromObject(model);
        model.position.y = -bbox.min.y;
        model.rotation.y = Math.random() * Math.PI * 2;

        if (this.projectileVisual) this.mesh.remove(this.projectileVisual);
        this.projectileVisual = model;
        this.mesh.add(model);
        const baseMat = this.mesh.material as THREE.MeshBasicMaterial;
        baseMat.transparent = true;
        baseMat.opacity = 0;
      })
      .catch((err) => {
        console.warn('Failed to load Fire.glb:', err);
      });
  }

  private playFireballSfx() {
    try {
      const audio = new Audio(ProjectileEntity.fireSfxPath);
      audio.volume = 0.35;
      audio.onerror = () => console.warn('[Fireball SFX] Failed to load:', ProjectileEntity.fireSfxPath);
      void audio.play().catch((err) => {
        console.warn('[Fireball SFX] Playback blocked:', err.message);
      });
    } catch (err) {
      console.warn('[Fireball SFX] Error creating audio:', err);
    }
  }
}
