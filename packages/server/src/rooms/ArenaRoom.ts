import { Room, Client } from 'colyseus';
import {
  TICK_INTERVAL_MS,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  ROUND_DURATION,
  ALIEN_TYPES,
  MessageType,
  type AlienType,
  type PlayerInput,
} from '@ben10/shared';
import { GameState } from '../schemas/GameState';
import { PlayerSchema } from '../schemas/PlayerSchema';
import { processInput, tickGameState, checkWinCondition, initializePlayer } from '../game/GameLogic';

const SYNC_MSG = 'sync';

export class ArenaRoom extends Room<GameState> {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private selectedAliens = new Map<string, AlienType>();
  private readyPlayers = new Set<string>();
  private sessionName = 'Public Session';
  private targetPlayers = MIN_PLAYERS_TO_START;
  private hostSessionId = '';

  onCreate(options?: { sessionName?: string; targetPlayers?: number }) {
    this.setState(new GameState());
    this.maxClients = MAX_PLAYERS;

    this.sessionName = (options?.sessionName || '').trim() || `Session ${this.roomId.slice(0, 4)}`;
    this.targetPlayers = this.normalizeTargetPlayers(options?.targetPlayers);
    this.updateRoomMetadata();

    this.onMessage(MessageType.PLAYER_INPUT, (client, input: PlayerInput) => {
      const effect = processInput(this.state, client.sessionId, input);
      if (effect) {
        this.broadcast(MessageType.ABILITY_EFFECT, effect);
      }
    });

    this.onMessage(MessageType.SELECT_ALIEN, (client, data: { alien: AlienType }) => {
      if (this.state.phase !== 'selecting') return;
      if (ALIEN_TYPES.includes(data.alien)) {
        this.selectedAliens.set(client.sessionId, data.alien);
        const player = this.state.players.get(client.sessionId);
        if (player) player.alien = data.alien;
        this.broadcastState();
      }
    });

    this.onMessage(MessageType.PLAYER_READY, (client) => {
      if (this.state.phase !== 'selecting') return;
      this.readyPlayers.add(client.sessionId);
      console.log(`${client.sessionId} is ready (${this.readyPlayers.size}/${this.state.players.size})`);
      this.broadcastState();
      this.tryStartGame();
    });

    this.onMessage(MessageType.START_GAME, (client) => {
      this.handleForceStart(client);
    });
  }

  onJoin(client: Client, options: { name?: string }) {
    if (!this.isJoinablePhase(this.state.phase)) {
      throw new Error('This session is already in progress. Join another session or wait for next round.');
    }
    const validName = this.validatePlayerName(options.name);
    if (!validName) {
      throw new Error('Invalid player name. Use 2-16 characters: letters, numbers, spaces, _ or -.');
    }

    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = validName;
    player.alien = 'heatblast';

    if (!this.hostSessionId) {
      this.hostSessionId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);
    this.selectedAliens.set(client.sessionId, 'heatblast');

    console.log(`${player.name} joined (${client.sessionId}) [${this.state.players.size} players, phase=${this.state.phase}]`);

    this.broadcastState();
    this.checkEnoughPlayers();
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    console.log(`${player?.name || client.sessionId} left`);

    this.state.players.delete(client.sessionId);
    this.selectedAliens.delete(client.sessionId);
    this.readyPlayers.delete(client.sessionId);
    if (this.hostSessionId === client.sessionId) {
      this.hostSessionId = this.state.players.keys().next().value || '';
    }

    this.broadcastState();

    if (this.state.phase === 'playing' && this.state.players.size < MIN_PLAYERS_TO_START) {
      this.endRound();
    }

    if (this.state.phase === 'selecting' && this.state.players.size < MIN_PLAYERS_TO_START) {
      this.state.phase = 'waiting';
      this.readyPlayers.clear();
      this.broadcastState();
    }
  }

  onDispose() {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  /** When enough players are in the room, move from waiting -> selecting */
  private checkEnoughPlayers() {
    if (this.state.phase !== 'waiting') return;
    if (this.state.players.size >= this.targetPlayers) {
      this.state.phase = 'selecting';
      this.readyPlayers.clear();
      console.log('>>> Phase: selecting (pick your aliens!)');
      this.broadcastState();
    }
  }

  /** When all players in selecting phase click READY, start the game */
  private tryStartGame() {
    if (this.state.phase !== 'selecting') return;
    if (this.readyPlayers.size >= this.state.players.size && this.state.players.size >= MIN_PLAYERS_TO_START) {
      this.startGame();
    }
  }

  private handleForceStart(client: Client) {
    if (this.state.phase !== 'waiting' && this.state.phase !== 'selecting') {
      return;
    }
    if (client.sessionId !== this.hostSessionId) {
      this.send(client, MessageType.ACTION_ERROR, { message: 'Only the session host can force start.' });
      return;
    }
    if (this.state.players.size < MIN_PLAYERS_TO_START) {
      this.send(client, MessageType.ACTION_ERROR, { message: 'At least 2 players are required to start.' });
      return;
    }
    this.startGame();
  }

  private startGame() {
    console.log('>>> Phase: playing');
    this.state.phase = 'playing';
    this.state.roundTimer = ROUND_DURATION;

    let idx = 0;
    this.state.players.forEach((player, sessionId) => {
      const alien = this.selectedAliens.get(sessionId) || 'heatblast';
      initializePlayer(player, alien, idx);
      idx++;
    });

    this.broadcastState();
    this.tickInterval = setInterval(() => this.gameTick(), TICK_INTERVAL_MS);
  }

  private gameTick() {
    const kills = tickGameState(this.state);

    for (const kill of kills) {
      this.broadcast(MessageType.KILL_FEED, kill);
    }

    const winner = checkWinCondition(this.state);
    if (winner !== null) {
      this.endRound(winner);
    }

    this.broadcastState();
  }

  private endRound(winnerId?: string) {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    console.log('>>> Phase: finished, winner:', winnerId || 'none');
    this.state.phase = 'finished';
    this.state.winnerId = winnerId || '';
    this.broadcastState();

    setTimeout(() => {
      this.state.phase = 'waiting';
      this.state.winnerId = '';
      this.readyPlayers.clear();
      this.state.projectiles.clear();
      this.broadcastState();
      this.checkEnoughPlayers();
    }, 10000);
  }

  private normalizeTargetPlayers(targetPlayers?: number): number {
    if (typeof targetPlayers !== 'number' || Number.isNaN(targetPlayers)) {
      return MIN_PLAYERS_TO_START;
    }
    return Math.max(MIN_PLAYERS_TO_START, Math.min(MAX_PLAYERS, Math.floor(targetPlayers)));
  }

  private validatePlayerName(name?: string): string | null {
    if (!name) return null;
    const trimmed = name.trim();
    if (!/^[A-Za-z0-9 _-]{2,16}$/.test(trimmed)) {
      return null;
    }
    return trimmed;
  }

  private isJoinablePhase(phase: string): boolean {
    return phase === 'waiting' || phase === 'selecting';
  }

  private updateRoomMetadata() {
    this.setMetadata({
      sessionName: this.sessionName,
      phase: this.state.phase,
      clients: this.state.players.size,
      targetPlayers: this.targetPlayers,
      hostSessionId: this.hostSessionId,
      joinable: this.isJoinablePhase(this.state.phase),
    });
  }

  private broadcastState() {
    const players: Record<string, any> = {};
    this.state.players.forEach((p, key) => {
      players[key] = {
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        hp: p.hp,
        maxHp: p.maxHp,
        alien: p.alien,
        aimAngle: p.aimAngle,
        kills: p.kills,
        deaths: p.deaths,
        alive: p.alive,
        shielded: p.shielded,
        stunned: p.stunned,
        primaryCooldownLeft: p.primaryCooldownLeft,
        specialCooldownLeft: p.specialCooldownLeft,
        lastInputSeq: p.lastInputSeq,
      };
    });

    const projectiles: Record<string, any> = {};
    this.state.projectiles.forEach((pr, key) => {
      projectiles[key] = {
        id: pr.id,
        ownerId: pr.ownerId,
        x: pr.x,
        y: pr.y,
        vx: pr.vx,
        vy: pr.vy,
        damage: pr.damage,
        radius: pr.radius,
        alienType: pr.alienType,
        lifetime: pr.lifetime,
      };
    });

    this.broadcast(SYNC_MSG, {
      phase: this.state.phase,
      roundTimer: this.state.roundTimer,
      selectTimer: this.state.selectTimer,
      winnerId: this.state.winnerId,
      readyCount: this.readyPlayers.size,
      totalPlayers: this.state.players.size,
      sessionName: this.sessionName,
      targetPlayers: this.targetPlayers,
      hostSessionId: this.hostSessionId,
      players,
      projectiles,
    });
    this.updateRoomMetadata();
  }
}
