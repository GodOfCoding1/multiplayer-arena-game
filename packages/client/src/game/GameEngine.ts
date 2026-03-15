import * as THREE from 'three';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';
import { Arena } from '../entities/Arena.js';
import { PlayerEntity } from '../entities/Player.js';
import { ProjectileEntity } from '../entities/Projectile.js';
import type { PlayerData, ProjectileData } from '@ben10/shared';

export class GameEngine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  cameraController: CameraController;
  inputManager: InputManager;
  arena: Arena;

  private players = new Map<string, PlayerEntity>();
  private projectiles = new Map<string, ProjectileEntity>();
  private clock = new THREE.Clock();
  private localPlayerId: string | null = null;
  private animationId: number = 0;
  private inputAccumulator: number = 0;
  private readonly INPUT_INTERVAL = 1 / 20; // Send input at 20Hz

  onInput: ((input: ReturnType<InputManager['getInput']>) => void) | null = null;
  onTick: ((dt: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080810);
    this.scene.fog = new THREE.FogExp2(0x080810, 0.015);

    this.cameraController = new CameraController(window.innerWidth / window.innerHeight);
    this.inputManager = new InputManager(canvas);
    this.arena = new Arena();
    this.scene.add(this.arena.group);

    window.addEventListener('resize', () => this.handleResize());
  }

  setLocalPlayer(id: string) {
    this.localPlayerId = id;
  }

  start() {
    this.clock.start();
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.animationId);
  }

  private loop = () => {
    this.animationId = requestAnimationFrame(this.loop);
    const dt = this.clock.getDelta();

    // Send input at throttled rate
    this.inputAccumulator += dt;
    if (this.localPlayerId && this.onInput && this.inputAccumulator >= this.INPUT_INTERVAL) {
      this.inputAccumulator = 0;
      const input = this.inputManager.getInput(this.cameraController.camera);
      this.onInput(input);
    }

    // Update camera to follow local player
    const localEntity = this.localPlayerId ? this.players.get(this.localPlayerId) : null;
    if (localEntity) {
      const wm = this.inputManager.getWorldMouse(this.cameraController.camera);
      this.cameraController.follow(
        localEntity.group.position.x,
        localEntity.group.position.z,
        wm.x,
        wm.z,
      );
    }

    this.onTick?.(dt);

    this.renderer.render(this.scene, this.cameraController.camera);
  };

  updatePlayers(playersData: Record<string, PlayerData>) {
    const dt = 1 / 60;
    const seenIds = new Set<string>();

    for (const [id, data] of Object.entries(playersData)) {
      seenIds.add(id);
      let entity = this.players.get(id);

      if (!entity) {
        entity = new PlayerEntity(id, id === this.localPlayerId);
        entity.buildUI(data.name);
        this.players.set(id, entity);
        this.scene.add(entity.group);
      }

      entity.update(data, dt);
    }

    // Remove departed players
    for (const [id, entity] of this.players) {
      if (!seenIds.has(id)) {
        this.scene.remove(entity.group);
        entity.dispose();
        this.players.delete(id);
      }
    }
  }

  updateProjectiles(projectilesData: Record<string, ProjectileData>) {
    const seenIds = new Set<string>();

    for (const [id, data] of Object.entries(projectilesData)) {
      seenIds.add(id);
      let entity = this.projectiles.get(id);

      if (!entity) {
        entity = new ProjectileEntity(data);
        this.projectiles.set(id, entity);
        this.scene.add(entity.mesh);
      }

      entity.update(data);
    }

    for (const [id, entity] of this.projectiles) {
      if (!seenIds.has(id)) {
        this.scene.remove(entity.mesh);
        entity.dispose();
        this.projectiles.delete(id);
      }
    }
  }

  private handleResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraController.resize(window.innerWidth / window.innerHeight);
  }
}
