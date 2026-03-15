import { GameEngine } from './game/GameEngine.js';
import { NetworkManager, type GameSnapshot } from './network/NetworkManager.js';
import { LobbyUI } from './ui/Lobby.js';
import { AlienSelectUI } from './ui/AlienSelect.js';
import { HUD } from './ui/HUD.js';
import { ResultsUI } from './ui/Results.js';
import { ParticleEffects } from './utils/ParticleEffects.js';
import { ALIEN_DEFINITIONS, type GamePhase } from '@ben10/shared';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const overlay = document.getElementById('ui-overlay') as HTMLDivElement;

const engine = new GameEngine(canvas);
const particles = new ParticleEffects(engine.scene);

const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const serverUrl = `${wsProtocol}//${location.hostname}:2567`;
const network = new NetworkManager(serverUrl);

const lobbyUI = new LobbyUI(overlay);
const selectUI = new AlienSelectUI(overlay);
const hud = new HUD(overlay);
const resultsUI = new ResultsUI(overlay);

let currentPhase: GamePhase = 'waiting';
let localSessionId = '';
let latestSnapshot: GameSnapshot | null = null;

lobbyUI.onCreateSession = async ({ name, sessionName, targetPlayers }) => {
  try {
    lobbyUI.setStatus('Creating session...');
    localSessionId = await network.createSession({ name, sessionName, targetPlayers });
    onConnectedToSession();
  } catch (err) {
    console.error('Failed to create session:', err);
    lobbyUI.setStatus(getErrorMessage(err), true);
  }
};

lobbyUI.onJoinSession = async ({ name, roomId }) => {
  try {
    lobbyUI.setStatus('Joining session...');
    localSessionId = await network.joinSessionById(roomId, { name });
    onConnectedToSession();
  } catch (err) {
    console.error('Failed to join session:', err);
    lobbyUI.setStatus(getErrorMessage(err), true);
  }
};

lobbyUI.onRefreshSessions = () => {
  void refreshSessions();
};

selectUI.onSelect = (alien) => {
  network.selectAlien(alien);
};

selectUI.onReady = () => {
  network.sendReady();
};

network.on('stateChange', (snapshot: GameSnapshot) => {
  latestSnapshot = snapshot;
  // Phase transitions
  if (snapshot.phase !== currentPhase) {
    showPhaseUI(snapshot.phase);
    currentPhase = snapshot.phase;
  }

  // Update game visuals
  engine.updatePlayers(snapshot.players);
  engine.updateProjectiles(snapshot.projectiles);

  // Update HUD
  if (snapshot.phase === 'playing') {
    const localPlayer = snapshot.players[localSessionId] || null;
    hud.update(localPlayer, snapshot.players, snapshot.roundTimer);
  }

  // Update select screen ready count
  if (snapshot.phase === 'selecting') {
    selectUI.updateReadyCount(snapshot.readyCount, snapshot.totalPlayers);
  }

  // Show results
  if (snapshot.phase === 'finished') {
    resultsUI.showResults(snapshot.players, snapshot.winnerId);
  }

  updateForceStartControl(snapshot);
});

network.on('killFeed', (data: { killerId: string; victimId: string }) => {
  const snapshot = network.currentSnapshot;
  const killer = snapshot.players[data.killerId];
  const victim = snapshot.players[data.victimId];

  if (victim) {
    const killerName = killer?.name || 'Unknown';
    const victimName = victim.name;
    hud.addKill(killerName, victimName);

    // Spawn death particles at victim location
    const def = ALIEN_DEFINITIONS[victim.alien];
    particles.spawnBurst(victim.x, -victim.y, def.color, 30, 6, 0.8);
  }
});

// Input sending
engine.onInput = (input) => {
  if (currentPhase === 'playing') {
    network.sendInput(input);
  }
};

// Integrate particles into engine's render loop
engine.onTick = (dt: number) => {
  particles.update(dt);
};

network.on('actionError', (message: string) => {
  lobbyUI.setStatus(message, true);
});

function showPhaseUI(phase: GamePhase) {

  lobbyUI.hide();
  selectUI.hide();
  hud.hide();
  resultsUI.hide();
  hideWaitingOverlay();

  switch (phase) {
    case 'waiting':
      showWaitingOverlay();
      break;
    case 'selecting':
      selectUI.show();
      break;
    case 'playing':
      hud.show();
      break;
    case 'finished':
      hud.show();
      break;
  }
}

let waitingOverlay: HTMLDivElement | null = null;
let forceStartBtn: HTMLButtonElement | null = null;

function showWaitingOverlay() {
  const targetPlayers = latestSnapshot?.targetPlayers || 2;
  const waitingSubText = `Auto-select starts at ${targetPlayers} players`;

  if (!waitingOverlay) {
    waitingOverlay = document.createElement('div');
    waitingOverlay.id = 'waiting-overlay';
    waitingOverlay.innerHTML = `
      <div class="waiting-box">
        <div class="waiting-text">WAITING FOR PLAYERS...</div>
        <div class="waiting-sub"></div>
        <div class="waiting-pulse"></div>
      </div>
    `;
    overlay.appendChild(waitingOverlay);
  }

  const waitingSub = waitingOverlay.querySelector('.waiting-sub') as HTMLDivElement;
  waitingSub.textContent = waitingSubText;

  if (document.getElementById('waiting-style')) return;
  const style = document.createElement('style');
  style.id = 'waiting-style';
  style.textContent = `
    #waiting-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
    }
    .waiting-box { text-align: center; }
    .waiting-text {
      color: #00ff44;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 4px;
      margin-bottom: 10px;
      animation: waitPulse 2s ease-in-out infinite;
    }
    .waiting-sub {
      color: rgba(255,255,255,0.4);
      font-size: 14px;
    }
    @keyframes waitPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;
  document.head.appendChild(style);
}

function hideWaitingOverlay() {
  if (waitingOverlay) {
    waitingOverlay.remove();
    waitingOverlay = null;
    document.getElementById('waiting-style')?.remove();
  }
}

function updateForceStartControl(snapshot: GameSnapshot) {
  const isHost = snapshot.hostSessionId === localSessionId;
  const canShow = isHost && (snapshot.phase === 'waiting' || snapshot.phase === 'selecting');

  if (!canShow) {
    forceStartBtn?.remove();
    forceStartBtn = null;
    return;
  }

  if (!forceStartBtn) {
    forceStartBtn = document.createElement('button');
    forceStartBtn.id = 'force-start-btn';
    forceStartBtn.textContent = 'FORCE START';
    forceStartBtn.addEventListener('click', () => network.requestStartGame());
    overlay.appendChild(forceStartBtn);

    const style = document.createElement('style');
    style.id = 'force-start-style';
    style.textContent = `
      #force-start-btn {
        position: absolute;
        right: 18px;
        top: 18px;
        z-index: 20;
        padding: 10px 16px;
        border: 2px solid #00ff44;
        border-radius: 8px;
        background: rgba(0, 255, 68, 0.9);
        color: #001100;
        font-weight: 700;
        letter-spacing: 1px;
        cursor: pointer;
      }
      #force-start-btn:hover {
        box-shadow: 0 0 20px rgba(0,255,68,0.4);
      }
    `;
    document.head.appendChild(style);
  }
}

function onConnectedToSession() {
  engine.setLocalPlayer(localSessionId);
  engine.start();
  lobbyUI.hide();
  showPhaseUI('waiting');
}

async function refreshSessions() {
  const sessions = await network.listSessions();
  lobbyUI.setSessions(sessions);
  lobbyUI.setStatus(`Found ${sessions.length} session${sessions.length === 1 ? '' : 's'}`);
}

function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') return maybeMessage;
  }
  return 'Could not connect to server. Make sure the server is running on port 2567.';
}

void refreshSessions();
