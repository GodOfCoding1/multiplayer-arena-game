import { ALIEN_DEFINITIONS, ALIEN_TYPES, type AlienType } from '@ben10/shared';

export class AlienSelectUI {
  private container: HTMLDivElement;
  private selectedAlien: AlienType = 'heatblast';
  private timerEl!: HTMLSpanElement;
  onSelect: ((alien: AlienType) => void) | null = null;
  onReady: (() => void) | null = null;

  constructor(overlay: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'select-screen';
    this.container.style.display = 'none';
    this.buildHTML();
    this.applyStyles();
    overlay.appendChild(this.container);

    this.container.querySelectorAll('.alien-card').forEach((card) => {
      card.addEventListener('click', () => {
        const alien = card.getAttribute('data-alien') as AlienType;
        this.selectAlien(alien);
      });
    });

    this.container.querySelector('#ready-btn')!.addEventListener('click', () => {
      this.onReady?.();
    });
  }

  private buildHTML() {
    const cardsHTML = ALIEN_TYPES.map((type) => {
      const def = ALIEN_DEFINITIONS[type];
      const colorHex = '#' + def.color.toString(16).padStart(6, '0');
      return `
        <div class="alien-card ${type === 'heatblast' ? 'selected' : ''}" data-alien="${type}">
          <div class="alien-icon" style="background: ${colorHex}; box-shadow: 0 0 20px ${colorHex}55;"></div>
          <div class="alien-name">${def.name}</div>
          <div class="alien-role">${def.role}</div>
          <div class="alien-stats">
            <div class="stat"><span class="stat-label">HP</span> <span class="stat-bar"><span style="width: ${(def.maxHp / 140) * 100}%; background: ${colorHex};"></span></span></div>
            <div class="stat"><span class="stat-label">SPD</span> <span class="stat-bar"><span style="width: ${(def.speed / 8) * 100}%; background: ${colorHex};"></span></span></div>
            <div class="stat"><span class="stat-label">DMG</span> <span class="stat-bar"><span style="width: ${(def.primaryDamage / 28) * 100}%; background: ${colorHex};"></span></span></div>
          </div>
          <div class="alien-desc">${def.description}</div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="select-header">
        <h2>CHOOSE YOUR ALIEN</h2>
        <span class="select-status" id="select-status">Pick an alien and click READY</span>
      </div>
      <div class="alien-grid">${cardsHTML}</div>
      <button id="ready-btn">READY</button>
    `;

    this.timerEl = this.container.querySelector('#select-status') as HTMLSpanElement;
  }

  selectAlien(alien: AlienType) {
    this.selectedAlien = alien;
    this.container.querySelectorAll('.alien-card').forEach((card) => {
      card.classList.toggle('selected', card.getAttribute('data-alien') === alien);
    });
    this.onSelect?.(alien);
  }

  updateReadyCount(ready: number, total: number) {
    this.timerEl.textContent = `${ready} / ${total} players ready`;
    this.timerEl.style.color = ready >= total ? '#00ff44' : '#ffffff';
  }

  updateTimer(seconds: number) {
    // kept for compatibility
  }

  show() { this.container.style.display = 'flex'; }
  hide() { this.container.style.display = 'none'; }

  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #select-screen {
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        gap: 24px;
      }
      .select-header {
        text-align: center;
      }
      .select-header h2 {
        color: #00ff44;
        font-size: 28px;
        letter-spacing: 6px;
        margin: 0;
        text-shadow: 0 0 20px rgba(0,255,68,0.4);
      }
      .select-status {
        display: inline-block;
        margin-top: 8px;
        font-size: 40px;
        font-weight: 900;
        color: #00ff44;
      }
      .alien-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        max-width: 900px;
      }
      .alien-card {
        padding: 20px;
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        background: rgba(20,20,30,0.9);
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .alien-card:hover {
        border-color: rgba(255,255,255,0.4);
        transform: translateY(-4px);
      }
      .alien-card.selected {
        border-color: #00ff44;
        box-shadow: 0 0 25px rgba(0,255,68,0.2);
        background: rgba(0,40,20,0.9);
      }
      .alien-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        margin: 0 auto 12px;
      }
      .alien-name {
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .alien-role {
        color: rgba(255,255,255,0.5);
        font-size: 12px;
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-bottom: 12px;
      }
      .alien-stats { margin-bottom: 10px; }
      .stat {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 4px 0;
      }
      .stat-label {
        color: rgba(255,255,255,0.5);
        font-size: 10px;
        width: 28px;
        text-align: right;
      }
      .stat-bar {
        flex: 1;
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      }
      .stat-bar span {
        display: block;
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s;
      }
      .alien-desc {
        color: rgba(255,255,255,0.4);
        font-size: 11px;
        line-height: 1.4;
      }
      #ready-btn {
        padding: 14px 48px;
        font-size: 18px;
        font-weight: 700;
        border: 2px solid #00ff44;
        border-radius: 8px;
        background: #00ff44;
        color: #000;
        cursor: pointer;
        letter-spacing: 3px;
        transition: all 0.2s;
        font-family: inherit;
      }
      #ready-btn:hover {
        background: #44ff88;
        box-shadow: 0 0 20px rgba(0,255,68,0.5);
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
  }
}
