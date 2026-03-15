import { Client, Room } from 'colyseus.js';
import {
  MessageType,
  type CreateSessionOptions,
  type AlienType,
  type SessionMetadata,
  type PlayerInput,
  type PlayerData,
  type ProjectileData,
  type GamePhase,
} from '@ben10/shared';

export interface GameSnapshot {
  phase: GamePhase;
  roundTimer: number;
  selectTimer: number;
  players: Record<string, PlayerData>;
  projectiles: Record<string, ProjectileData>;
  winnerId: string;
  readyCount: number;
  totalPlayers: number;
  sessionName: string;
  targetPlayers: number;
  hostSessionId: string;
}

type EventCallback = (...args: any[]) => void;

export class NetworkManager {
  private client: Client;
  private room: Room | null = null;
  private snapshot: GameSnapshot = {
    phase: 'waiting',
    roundTimer: 0,
    selectTimer: 0,
    players: {},
    projectiles: {},
    winnerId: '',
    readyCount: 0,
    totalPlayers: 0,
    sessionName: '',
    targetPlayers: 2,
    hostSessionId: '',
  };
  private events = new Map<string, EventCallback[]>();

  constructor(serverUrl: string) {
    this.client = new Client(serverUrl);
  }

  get sessionId(): string {
    return this.room?.sessionId || '';
  }

  get currentSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event)!.push(callback);
  }

  private emit(event: string, ...args: any[]) {
    const cbs = this.events.get(event);
    if (cbs) cbs.forEach((cb) => cb(...args));
  }

  async joinOrCreate(roomName: string, options: { name: string }): Promise<string> {
    try {
      this.room = await this.client.joinOrCreate(roomName, options);
      this.setupListeners();
      return this.room.sessionId;
    } catch (err) {
      console.error('Failed to join room:', err);
      throw err;
    }
  }

  async listSessions(): Promise<SessionMetadata[]> {
    try {
      const rooms = await this.client.getAvailableRooms('arena');
      return rooms.map((r) => ({
        roomId: r.roomId,
        clients: r.clients,
        maxClients: r.maxClients,
        sessionName: String(r.metadata?.sessionName || `Session ${r.roomId.slice(0, 4)}`),
        phase: (r.metadata?.phase || 'waiting') as GamePhase,
        targetPlayers: Number(r.metadata?.targetPlayers || 2),
        hostSessionId: String(r.metadata?.hostSessionId || ''),
        joinable: Boolean(r.metadata?.joinable ?? true),
      })) as SessionMetadata[];
    } catch {
      return [];
    }
  }

  async createSession(options: CreateSessionOptions): Promise<string> {
    try {
      this.room = await this.client.create('arena', options);
      this.setupListeners();
      return this.room.sessionId;
    } catch (err) {
      console.error('Failed to create session:', err);
      throw err;
    }
  }

  async joinSessionById(roomId: string, options: { name: string }): Promise<string> {
    try {
      this.room = await this.client.joinById(roomId, options);
      this.setupListeners();
      return this.room.sessionId;
    } catch (err) {
      console.error('Failed to join session:', err);
      throw err;
    }
  }

  private setupListeners() {
    if (!this.room) return;

    // Use plain JSON messages for state sync (bypasses schema v2 decoding issues)
    this.room.onMessage('sync', (data: any) => {
      this.snapshot.phase = (data.phase || 'waiting') as GamePhase;
      this.snapshot.roundTimer = data.roundTimer ?? 0;
      this.snapshot.selectTimer = data.selectTimer ?? 0;
      this.snapshot.winnerId = data.winnerId ?? '';
      this.snapshot.players = data.players ?? {};
      this.snapshot.projectiles = data.projectiles ?? {};
      this.snapshot.readyCount = data.readyCount ?? 0;
      this.snapshot.totalPlayers = data.totalPlayers ?? 0;
      this.snapshot.sessionName = data.sessionName ?? '';
      this.snapshot.targetPlayers = data.targetPlayers ?? 2;
      this.snapshot.hostSessionId = data.hostSessionId ?? '';

      this.emit('stateChange', this.snapshot);
    });

    this.room.onMessage(MessageType.KILL_FEED, (data) => {
      this.emit('killFeed', data);
    });

    this.room.onMessage(MessageType.ABILITY_EFFECT, (data) => {
      this.emit('abilityEffect', data);
    });

    this.room.onMessage(MessageType.ACTION_ERROR, (data: { message?: string }) => {
      this.emit('actionError', data?.message || 'Action failed');
    });

    this.room.onLeave((code) => {
      console.log('Left room with code:', code);
      this.emit('leave', code);
    });

    this.room.onError((code, message) => {
      console.error('Room error:', code, message);
      this.emit('error', code, message);
    });
  }

  sendInput(input: PlayerInput) {
    this.room?.send(MessageType.PLAYER_INPUT, input);
  }

  selectAlien(alien: AlienType) {
    this.room?.send(MessageType.SELECT_ALIEN, { alien });
  }

  sendReady() {
    this.room?.send(MessageType.PLAYER_READY, {});
  }

  requestStartGame() {
    this.room?.send(MessageType.START_GAME, {});
  }

  leave() {
    this.room?.leave();
    this.room = null;
  }
}
