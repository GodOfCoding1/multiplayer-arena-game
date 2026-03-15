import { MAX_PLAYERS, MIN_PLAYERS_TO_START, type SessionMetadata } from '@ben10/shared';

export class LobbyUI {
  private container: HTMLDivElement;
  private nameInput!: HTMLInputElement;
  private sessionNameInput!: HTMLInputElement;
  private targetPlayersSelect!: HTMLSelectElement;
  private sessionsContainer!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  onCreateSession: ((options: { name: string; sessionName: string; targetPlayers: number }) => void) | null = null;
  onJoinSession: ((options: { name: string; roomId: string }) => void) | null = null;
  onRefreshSessions: (() => void) | null = null;

  constructor(overlay: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'lobby-screen';
    this.container.innerHTML = `
      <div class="lobby-box">
        <div class="lobby-title">
          <span class="title-ben">BEN 10</span>
          <span class="title-arena">ARENA</span>
        </div>
        <div class="lobby-subtitle">PUBLIC SESSIONS</div>
        <div class="lobby-controls">
          <input type="text" id="player-name" placeholder="Enter your name..." maxlength="16" />
          <button id="refresh-btn">REFRESH</button>
        </div>
        <div class="create-row">
          <input type="text" id="session-name" placeholder="New session name..." maxlength="24" />
          <select id="target-players"></select>
          <button id="create-btn">CREATE SESSION</button>
        </div>
        <div id="lobby-status"></div>
        <div id="session-list"></div>
        <div class="lobby-info">
          <p>Joinable only in Waiting/Selecting. Mid-game joins are blocked.</p>
        </div>
      </div>
    `;
    this.applyStyles();
    overlay.appendChild(this.container);

    this.nameInput = this.container.querySelector('#player-name') as HTMLInputElement;
    this.sessionNameInput = this.container.querySelector('#session-name') as HTMLInputElement;
    this.targetPlayersSelect = this.container.querySelector('#target-players') as HTMLSelectElement;
    this.targetPlayersSelect.innerHTML = this.buildTargetOptions();

    this.sessionsContainer = this.container.querySelector('#session-list') as HTMLDivElement;
    this.statusEl = this.container.querySelector('#lobby-status') as HTMLDivElement;

    const refreshBtn = this.container.querySelector('#refresh-btn') as HTMLButtonElement;
    const createBtn = this.container.querySelector('#create-btn') as HTMLButtonElement;

    refreshBtn.addEventListener('click', () => this.onRefreshSessions?.());
    createBtn.addEventListener('click', () => this.handleCreateSession());
    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleCreateSession();
    });

    this.nameInput.focus();
  }

  setSessions(sessions: SessionMetadata[]) {
    if (sessions.length === 0) {
      this.sessionsContainer.innerHTML = `<div class="session-empty">No active sessions. Create one!</div>`;
      return;
    }

    this.sessionsContainer.innerHTML = sessions.map((session) => {
      const canJoin = session.joinable && session.clients < session.maxClients;
      const joinState = canJoin ? 'JOIN' : 'LOCKED';
      const phaseClass = `phase-${session.phase}`;
      return `
        <div class="session-row">
          <div class="session-meta">
            <div class="session-name">${session.sessionName}</div>
            <div class="session-sub">${session.clients}/${session.maxClients} players | target ${session.targetPlayers}</div>
          </div>
          <div class="session-phase ${phaseClass}">${session.phase.toUpperCase()}</div>
          <button class="session-join-btn" data-room-id="${session.roomId}" ${canJoin ? '' : 'disabled'}>${joinState}</button>
        </div>
      `;
    }).join('');

    this.sessionsContainer.querySelectorAll('.session-join-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const roomId = (btn as HTMLButtonElement).getAttribute('data-room-id') || '';
        this.handleJoinSession(roomId);
      });
    });
  }

  setStatus(message: string, isError = false) {
    this.statusEl.textContent = message;
    this.statusEl.classList.toggle('error', isError);
  }

  show() { this.container.style.display = 'flex'; }
  hide() { this.container.style.display = 'none'; }

  private handleCreateSession() {
    const name = this.getValidatedPlayerName();
    if (!name) return;
    const sessionName = this.sessionNameInput.value.trim() || `${name}'s session`;
    const targetPlayers = Number(this.targetPlayersSelect.value) || 2;
    this.onCreateSession?.({ name, sessionName, targetPlayers });
  }

  private handleJoinSession(roomId: string) {
    if (!roomId) return;
    const name = this.getValidatedPlayerName();
    if (!name) return;
    this.onJoinSession?.({ name, roomId });
  }

  private getValidatedPlayerName(): string | null {
    const name = this.nameInput.value.trim();
    const validNameRegex = /^[A-Za-z0-9 _-]{2,16}$/;
    if (!validNameRegex.test(name)) {
      this.setStatus('Enter a valid player name (2-16 chars: letters, numbers, space, _ or -).', true);
      return null;
    }
    this.setStatus('');
    return name;
  }

  private buildTargetOptions(): string {
    const options: string[] = [];
    for (let players = MIN_PLAYERS_TO_START; players <= MAX_PLAYERS; players++) {
      options.push(`<option value="${players}">${players} players</option>`);
    }
    return options.join('');
  }

  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #lobby-screen {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, rgba(0,40,20,0.85) 0%, rgba(0,0,0,0.95) 100%);
      }
      .lobby-box {
        text-align: center;
        padding: 36px 40px;
        border: 2px solid #00ff44;
        border-radius: 16px;
        background: rgba(0,20,10,0.9);
        box-shadow: 0 0 40px rgba(0,255,68,0.15), inset 0 0 30px rgba(0,255,68,0.05);
        width: min(920px, 90vw);
      }
      .lobby-title {
        font-size: 44px;
        font-weight: 900;
        letter-spacing: 4px;
        margin-bottom: 4px;
      }
      .title-ben { color: #00ff44; text-shadow: 0 0 20px rgba(0,255,68,0.6); }
      .title-arena { color: #fff; margin-left: 12px; }
      .lobby-subtitle {
        color: #44ffaa;
        font-size: 14px;
        letter-spacing: 6px;
        margin-bottom: 24px;
        opacity: 0.8;
      }
      .lobby-controls, .create-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        margin-bottom: 12px;
      }
      .create-row {
        grid-template-columns: 1fr auto auto;
      }
      #player-name, #session-name, #target-players {
        padding: 11px 14px;
        font-size: 15px;
        border: 2px solid #00ff44;
        border-radius: 8px;
        background: rgba(0,40,20,0.6);
        color: #fff;
        outline: none;
        font-family: inherit;
      }
      #player-name::placeholder, #session-name::placeholder { color: rgba(255,255,255,0.3); }
      #refresh-btn, #create-btn, .session-join-btn {
        padding: 11px 18px;
        font-size: 14px;
        font-weight: 700;
        border: 2px solid #00ff44;
        border-radius: 8px;
        background: #00ff44;
        color: #000;
        cursor: pointer;
        letter-spacing: 1px;
        transition: all 0.2s;
        font-family: inherit;
      }
      #refresh-btn:hover, #create-btn:hover, .session-join-btn:hover:not(:disabled) {
        background: #44ff88;
        box-shadow: 0 0 16px rgba(0,255,68,0.45);
      }
      .session-join-btn:disabled {
        border-color: rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.6);
        cursor: not-allowed;
      }
      #lobby-status {
        min-height: 22px;
        color: rgba(255,255,255,0.85);
        font-size: 14px;
        margin: 10px 0 8px;
      }
      #lobby-status.error {
        color: #ff6b6b;
      }
      #session-list {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      .session-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 10px;
        border: 1px solid rgba(0,255,68,0.35);
        border-radius: 10px;
        padding: 10px 12px;
        background: rgba(0,40,20,0.45);
      }
      .session-meta {
        text-align: left;
      }
      .session-name {
        color: #fff;
        font-weight: 700;
      }
      .session-sub {
        color: rgba(255,255,255,0.55);
        font-size: 12px;
      }
      .session-phase {
        width: 110px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        border-radius: 999px;
        padding: 6px 10px;
      }
      .phase-waiting { background: rgba(80,160,255,0.2); color: #8bc4ff; }
      .phase-selecting { background: rgba(255,212,102,0.2); color: #ffd166; }
      .phase-playing { background: rgba(255,107,107,0.2); color: #ff8f8f; }
      .phase-finished { background: rgba(180,180,180,0.2); color: #d6d6d6; }
      .session-empty {
        border: 1px dashed rgba(255,255,255,0.25);
        border-radius: 10px;
        padding: 16px;
        color: rgba(255,255,255,0.6);
      }
      .lobby-info {
        color: rgba(255,255,255,0.4);
        font-size: 12px;
        margin-top: 14px;
      }
    `;
    document.head.appendChild(style);
  }
}
