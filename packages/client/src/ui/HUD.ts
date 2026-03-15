import { ALIEN_DEFINITIONS, type PlayerData, type GamePhase } from '@ben10/shared';

interface KillFeedEntry {
  killer: string;
  victim: string;
  time: number;
}

export class HUD {
  private container: HTMLDivElement;
  private hpFill!: HTMLDivElement;
  private hpText!: HTMLSpanElement;
  private primaryCd!: HTMLDivElement;
  private specialCd!: HTMLDivElement;
  private timerEl!: HTMLDivElement;
  private killFeedEl!: HTMLDivElement;
  private scoreboardEl!: HTMLDivElement;
  private killFeed: KillFeedEntry[] = [];

  constructor(overlay: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.style.display = 'none';
    this.container.innerHTML = `
      <div class="hud-top">
        <div class="round-timer" id="round-timer">3:00</div>
      </div>
      <div class="hud-bottom">
        <div class="hp-bar-container">
          <div class="hp-bar-bg">
            <div class="hp-bar-fill" id="hp-fill"></div>
          </div>
          <span class="hp-text" id="hp-text">100 / 100</span>
        </div>
        <div class="cooldowns">
          <div class="cd-slot" id="cd-primary">
            <div class="cd-label">LMB</div>
            <div class="cd-ring"><div class="cd-fill"></div></div>
          </div>
          <div class="cd-slot" id="cd-special">
            <div class="cd-label">RMB</div>
            <div class="cd-ring"><div class="cd-fill"></div></div>
          </div>
        </div>
      </div>
      <div class="kill-feed" id="kill-feed"></div>
      <div class="scoreboard" id="scoreboard"></div>
    `;
    this.applyStyles();
    overlay.appendChild(this.container);

    this.hpFill = this.container.querySelector('#hp-fill') as HTMLDivElement;
    this.hpText = this.container.querySelector('#hp-text') as HTMLSpanElement;
    this.primaryCd = this.container.querySelector('#cd-primary .cd-fill') as HTMLDivElement;
    this.specialCd = this.container.querySelector('#cd-special .cd-fill') as HTMLDivElement;
    this.timerEl = this.container.querySelector('#round-timer') as HTMLDivElement;
    this.killFeedEl = this.container.querySelector('#kill-feed') as HTMLDivElement;
    this.scoreboardEl = this.container.querySelector('#scoreboard') as HTMLDivElement;
  }

  update(localPlayer: PlayerData | null, allPlayers: Record<string, PlayerData>, roundTimer: number) {
    if (!localPlayer) return;

    // HP
    const hpPct = Math.max(0, (localPlayer.hp / localPlayer.maxHp) * 100);
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(localPlayer.hp)} / ${localPlayer.maxHp}`;

    if (hpPct > 50) this.hpFill.style.background = '#00ff44';
    else if (hpPct > 25) this.hpFill.style.background = '#ffaa00';
    else this.hpFill.style.background = '#ff2222';

    // Cooldowns
    const def = ALIEN_DEFINITIONS[localPlayer.alien];
    const pcdPct = def.primaryCooldown > 0 ? (localPlayer.primaryCooldownLeft / def.primaryCooldown) * 100 : 0;
    const scdPct = def.specialCooldown > 0 ? (localPlayer.specialCooldownLeft / def.specialCooldown) * 100 : 0;
    this.primaryCd.style.height = `${pcdPct}%`;
    this.specialCd.style.height = `${scdPct}%`;

    // Timer
    const mins = Math.floor(Math.max(0, roundTimer) / 60);
    const secs = Math.floor(Math.max(0, roundTimer) % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    if (roundTimer <= 30) this.timerEl.style.color = '#ff4444';
    else this.timerEl.style.color = '#00ff44';

    // Scoreboard
    const sorted = Object.values(allPlayers).sort((a, b) => b.kills - a.kills);
    this.scoreboardEl.innerHTML = sorted.map((p) => {
      const alienDef = ALIEN_DEFINITIONS[p.alien];
      const colorHex = '#' + alienDef.color.toString(16).padStart(6, '0');
      return `<div class="score-row ${!p.alive ? 'dead' : ''}">
        <span class="score-color" style="background: ${colorHex};"></span>
        <span class="score-name">${p.name}</span>
        <span class="score-kd">${p.kills} / ${p.deaths}</span>
      </div>`;
    }).join('');

    // Clean old kill feed entries
    const now = Date.now();
    this.killFeed = this.killFeed.filter((e) => now - e.time < 5000);
    this.killFeedEl.innerHTML = this.killFeed.map((e) =>
      `<div class="kill-entry"><span class="killer">${e.killer}</span> eliminated <span class="victim">${e.victim}</span></div>`,
    ).join('');
  }

  addKill(killerName: string, victimName: string) {
    this.killFeed.push({ killer: killerName, victim: victimName, time: Date.now() });
  }

  show() { this.container.style.display = 'block'; }
  hide() { this.container.style.display = 'none'; }

  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #hud { pointer-events: none; }
      .hud-top {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      }
      .round-timer {
        font-size: 36px;
        font-weight: 900;
        color: #00ff44;
        text-shadow: 0 0 15px rgba(0,255,68,0.4);
        letter-spacing: 4px;
      }
      .hud-bottom {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 24px;
      }
      .hp-bar-container { text-align: center; }
      .hp-bar-bg {
        width: 300px;
        height: 18px;
        background: rgba(255,255,255,0.1);
        border-radius: 9px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .hp-bar-fill {
        height: 100%;
        background: #00ff44;
        border-radius: 9px;
        transition: width 0.15s;
      }
      .hp-text {
        color: rgba(255,255,255,0.7);
        font-size: 13px;
        margin-top: 4px;
        display: block;
      }
      .cooldowns {
        display: flex;
        gap: 12px;
      }
      .cd-slot { text-align: center; }
      .cd-label {
        color: rgba(255,255,255,0.5);
        font-size: 11px;
        margin-bottom: 4px;
      }
      .cd-ring {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.2);
        position: relative;
        overflow: hidden;
        background: rgba(0,0,0,0.3);
      }
      .cd-fill {
        position: absolute;
        bottom: 0;
        width: 100%;
        background: rgba(255,60,60,0.6);
        transition: height 0.1s;
      }
      .kill-feed {
        position: absolute;
        top: 70px;
        right: 20px;
        text-align: right;
      }
      .kill-entry {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        margin-bottom: 4px;
        padding: 4px 10px;
        background: rgba(0,0,0,0.4);
        border-radius: 4px;
      }
      .killer { color: #ff4444; font-weight: 700; }
      .victim { color: #ffaa44; font-weight: 700; }
      .scoreboard {
        position: absolute;
        top: 70px;
        left: 20px;
      }
      .score-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        margin-bottom: 3px;
        background: rgba(0,0,0,0.4);
        border-radius: 4px;
        font-size: 13px;
        color: rgba(255,255,255,0.8);
      }
      .score-row.dead { opacity: 0.4; }
      .score-color {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }
      .score-name { min-width: 80px; }
      .score-kd { color: rgba(255,255,255,0.5); font-size: 12px; }
    `;
    document.head.appendChild(style);
  }
}
