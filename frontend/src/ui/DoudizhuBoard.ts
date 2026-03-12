// ============================================================
// DoudizhuBoard.ts — Doudizhu game state renderer.
// ============================================================

import { Trans } from "../core/Trans";

export class DoudizhuBoard {
  private container: HTMLElement;
  private playerNames: string[] = [];
  private landlordIdx: number = 0;
  private landlordWon: boolean | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  setPlayerInfo(names: string[], landlordIdx: number): void {
    this.playerNames = names;
    this.landlordIdx = landlordIdx;
  }

  setWinnerInfo(landlordWon: boolean | null): void {
    this.landlordWon = landlordWon;
  }

  render(stateJson: string, moveUci?: string, moveRobotId?: number, robotIds?: number[], showWinner = false): void {
    try {
      const state = JSON.parse(stateJson);
      this.container.innerHTML = this.buildHtml(state, moveUci, moveRobotId, robotIds, showWinner);
    } catch (e) {
      this.container.innerHTML = `<div class="doudizhu-error">${Trans.t("game.waiting", "等待对局开始...")}</div>`;
    }
  }

  private buildHtml(state: any, lastMove?: string, lastMoveRobotId?: number, robotIds?: number[], showWinner = false): string {
    const hands = state.hands || [[], [], []];
    const lastPlay = state.lastPlay;
    const currentPlayerIdx = state.currentPlayerIdx ?? 0;
    const landlordIdx = state.landlordIdx ?? 0;
    const moveHistory = state.moveHistory || [];

    // Determine which player made the last move (current step)
    const lastMovePlayerIdx = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].player : null;
    const lastMoveAction = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].action : null;

    let html = '<div class="doudizhu-board">';

    // Player cards - Landlord at top
    html += '<div class="doudizhu-players">';

    // Landlord (top)
    const landlordRole = `🤴 ${Trans.t("game.landlord", "地主")}`;
    const landlordActive = currentPlayerIdx === landlordIdx;
    const landlordThinking = landlordActive && (!lastMove || lastMove === 'thinking');
    const landlordIsWinner = showWinner && this.landlordWon === true;

    html += `<div class="doudizhu-player doudizhu-landlord ${landlordActive ? 'player-active' : ''}">`;
    html += `<div class="player-header">`;
    html += `<span class="player-role">${landlordRole}</span>`;
    html += `<span class="player-name">${this.playerNames[landlordIdx] || `${Trans.t("game.player", "玩家")}${landlordIdx + 1}`}</span>`;
    if (landlordIsWinner) html += `<span class="board-winner-trophy">🏆</span>`;
    html += `<span class="player-cards-count">${hands[landlordIdx].length} ${Trans.t("game.cards_count", "张")}</span>`;
    if (landlordThinking) {
      html += `<span class="thinking-indicator">${Trans.t("game.thinking", "思考中...")}</span>`;
    }
    html += '</div>';
    html += '<div class="dz-card-row">';
    hands[landlordIdx].forEach((card: string) => {
      html += `<span class="dz-card">${this.formatCard(card)}</span>`;
    });
    html += '</div>';

    // Show current step play ONLY if this player made the last move
    if (lastMovePlayerIdx === landlordIdx && lastMoveAction) {
      html += '<div class="current-round-play">';
      html += `<div class="round-play-label">${Trans.t("game.current_play", "本轮出牌")}:</div>`;
      if (lastMoveAction === 'pass') {
        html += `<span class="round-play-badge round-play-pass">${Trans.t("game.pass_move", "不出")}</span>`;
      } else {
        const cards = lastMoveAction.split(',').filter((c: string) => c.length > 0);
        html += '<span class="round-play-badge">';
        cards.forEach((card: string) => {
          html += `<span class="dz-card dz-card-small">${this.formatCard(card)}</span>`;
        });
        html += '</span>';
      }
      html += '</div>';
    }
    html += '</div>';

    // Farmers (bottom two)
    for (let i = 0; i < 3; i++) {
      if (i === landlordIdx) continue;

      const farmerRole = `👨‍🌾 ${Trans.t("game.farmer", "农民")}`;
      const farmerActive = currentPlayerIdx === i;
      const farmerThinking = farmerActive && (!lastMove || lastMove === 'thinking');
      const farmerIsWinner = showWinner && this.landlordWon === false;

      html += `<div class="doudizhu-player doudizhu-farmer ${farmerActive ? 'player-active' : ''}">`;
      html += `<div class="player-header">`;
      html += `<span class="player-role">${farmerRole}</span>`;
      html += `<span class="player-name">${this.playerNames[i] || `${Trans.t("game.player", "玩家")}${i + 1}`}</span>`;
      if (farmerIsWinner) html += `<span class="board-winner-trophy">🏆</span>`;
      html += `<span class="player-cards-count">${hands[i].length} ${Trans.t("game.cards_count", "张")}</span>`;
      if (farmerThinking) {
        html += `<span class="thinking-indicator">${Trans.t("game.thinking", "思考中...")}</span>`;
      }
      html += '</div>';
      html += '<div class="dz-card-row">';
      hands[i].forEach((card: string) => {
        html += `<span class="dz-card">${this.formatCard(card)}</span>`;
      });
      html += '</div>';

      // Show current step play ONLY if this player made the last move
      if (lastMovePlayerIdx === i && lastMoveAction) {
        html += '<div class="current-round-play">';
        html += `<div class="round-play-label">${Trans.t("game.current_play", "本轮出牌")}:</div>`;
        if (lastMoveAction === 'pass') {
          html += `<span class="round-play-badge round-play-pass">${Trans.t("game.pass_move", "不出")}</span>`;
        } else {
          const cards = lastMoveAction.split(',').filter((c: string) => c.length > 0);
          html += '<span class="round-play-badge">';
          cards.forEach((card: string) => {
            html += `<span class="dz-card dz-card-small">${this.formatCard(card)}</span>`;
          });
          html += '</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  private formatCard(card: string): string {
    const suitMap: Record<string, string> = {
      'X': '🃏', // Small Joker
      'D': '🃟', // Big Joker
    };

    if (suitMap[card]) return suitMap[card];

    const valueMap: Record<string, string> = {
      'T': '10',
      'J': 'J',
      'Q': 'Q',
      'K': 'K',
      'A': 'A',
    };

    return valueMap[card] || card;
  }
}
