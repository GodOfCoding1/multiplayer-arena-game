import { ALIEN_DEFINITIONS, type PlayerData } from '@ben10/shared';

export class ResultsUI {
  private container: HTMLDivElement;

  constructor(overlay: HTMLElement) {
    this.container = document.createElement('div');
    this.container.id = 'results-screen';
    this.container.style.display = 'none';
    this.applyStyles();
    overlay.appendChild(this.container);
  }

  showResults(players: Record<string, PlayerData>, winnerId: string) {
    const sorted = Object.values(players).sort((a, b) => b.kills - a.kills);
    const winner = players[winnerId];

    const rowsHTML = sorted.map((p, idx) => {
      const def = ALIEN_DEFINITIONS[p.alien];
      const colorHex = '#' + def.color.toString(16).padStart(6, '0');
      const isWinner = p.id === winnerId;
      return `
        <div class="result-row ${isWinner ? 'winner' : ''}">
          <span class="result-rank">#${idx + 1}</span>
          <span class="result-color" style="background: ${colorHex};"></span>
          <span class="result-name">${p.name}</span>
          <span class="result-alien">${def.name}</span>
          <span class="result-kills">${p.kills} kills</span>
          <span class="result-deaths">${p.deaths} deaths</span>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="results-box">
        <div class="results-title">ROUND OVER</div>
        <div class="results-winner">${winner ? `${winner.name} WINS!` : 'DRAW!'}</div>
        <div class="results-table">${rowsHTML}</div>
        <div class="results-note">Next round starting soon...</div>
      </div>
    `;
    this.container.style.display = 'flex';
  }

  hide() { this.container.style.display = 'none'; }

  private applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #results-screen {
        display: none;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
      }
      .results-box {
        text-align: center;
        padding: 40px 60px;
        border: 2px solid #00ff44;
        border-radius: 16px;
        background: rgba(0,20,10,0.95);
        min-width: 500px;
      }
      .results-title {
        font-size: 36px;
        font-weight: 900;
        color: #fff;
        letter-spacing: 6px;
        margin-bottom: 8px;
      }
      .results-winner {
        font-size: 24px;
        font-weight: 700;
        color: #00ff44;
        margin-bottom: 24px;
        text-shadow: 0 0 20px rgba(0,255,68,0.5);
      }
      .results-table { margin-bottom: 24px; }
      .result-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        margin-bottom: 4px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
        color: rgba(255,255,255,0.7);
        font-size: 14px;
      }
      .result-row.winner {
        background: rgba(0,255,68,0.1);
        border: 1px solid rgba(0,255,68,0.3);
        color: #fff;
      }
      .result-rank { width: 30px; font-weight: 700; }
      .result-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      .result-name { flex: 1; text-align: left; font-weight: 600; }
      .result-alien { color: rgba(255,255,255,0.4); font-size: 12px; width: 80px; }
      .result-kills { width: 60px; color: #ff4444; }
      .result-deaths { width: 60px; color: rgba(255,255,255,0.4); }
      .results-note {
        color: rgba(255,255,255,0.3);
        font-size: 13px;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
}
