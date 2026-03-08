// ============================================================
// GamePage.ts — Live match view with polling + board replay.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";
import { ChessBoard } from "../ui/ChessBoard";
import { DoudizhuBoard } from "../ui/DoudizhuBoard";

export class GamePage {
  private container!: HTMLElement;
  private chessBoard?: ChessBoard;
  private doudizhuBoard?: DoudizhuBoard;
  private gameType: string = "";
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private matchId = 0;
  private moves: Array<Record<string, unknown>> = [];
  private currentMoveIdx = -1;
  private isAtLastMove = true;
  private matchFinished = false;
  private robotNames: Map<number, string> = new Map(); // robot_id -> name

  mount(container: HTMLElement, params: Record<string, string>): void {
    this.container = container;
    this.matchId = Number(params.id);
    this.container.innerHTML = this.renderSkeleton();
    this.bindControls();
    AppLogic.loadMatch(this.matchId);
    AppLogic.loadMatchMoves(this.matchId);
    EventTool.on("match_loaded", (d) => this.renderMatchInfo(d as Record<string, unknown>));
    EventTool.on("match_moves_loaded", (d) => this.renderMoves(d as Array<Record<string, unknown>>));
    this.startPolling();
  }

  unmount(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    EventTool.clear("match_loaded");
    EventTool.clear("match_moves_loaded");
  }

  private renderSkeleton(): string {
    return `
<div class="page">
  <div class="match-layout">
    <div class="match-left">
      <div id="match-info" class="card mb-1"><div class="loading-pulse"></div></div>
      <div id="match-forfeit"></div>
      <div id="board-top-label" class="board-label"></div>
      <div id="game-board" class="board-container"></div>
      <div id="board-bottom-label" class="board-label"></div>
      <div class="board-controls mt-1">
        <button class="btn btn-sm" id="btn-first">⏮</button>
        <button class="btn btn-sm" id="btn-prev">◀</button>
        <button class="btn btn-sm" id="btn-next">▶</button>
        <button class="btn btn-sm" id="btn-last">⏭</button>
        <span id="move-counter" class="ml-1">—</span>
        <span id="live-indicator" class="live-indicator" style="display:none">● ${Trans.t("game.live_updating", "实时获取对局信息中...")}</span>
      </div>
    </div>
    <div class="match-right">
      <div class="match-right-header">
        <h3>${Trans.t("game.move_history", "Move History")}</h3>
        <button class="btn btn-sm btn-outline" id="btn-rules">
          <span>📖</span> ${Trans.t("game.rules", "规则")}
        </button>
      </div>
      <div id="move-list" class="move-list"><div class="loading-pulse"></div></div>
    </div>
  </div>
</div>

<!-- Rules Modal -->
<div class="modal-overlay hidden" id="rules-modal">
  <div class="modal-box modal-box-large">
    <div class="modal-header">
      <h3>${Trans.t("game.game_rules", "游戏规则")}</h3>
      <button class="modal-close" id="close-rules-modal">✕</button>
    </div>
    <div class="rules-content" id="rules-content">
      <div class="loading-pulse"></div>
    </div>
  </div>
</div>`;
  }

  private bindControls(): void {
    this.container.querySelector("#btn-first")?.addEventListener("click", () => this.goToMove(0));
    this.container.querySelector("#btn-prev")?.addEventListener("click", () => this.goToMove(this.currentMoveIdx - 1));
    this.container.querySelector("#btn-next")?.addEventListener("click", () => this.goToMove(this.currentMoveIdx + 1));
    this.container.querySelector("#btn-last")?.addEventListener("click", () => this.goToMove(this.moves.length - 1));

    // Rules button
    document.getElementById("btn-rules")?.addEventListener("click", () => {
      this.showRulesModal();
    });

    // Close rules modal
    document.getElementById("close-rules-modal")?.addEventListener("click", () => {
      const modal = document.getElementById("rules-modal");
      if (modal) modal.classList.add("hidden");
    });

    // Close on overlay click
    document.getElementById("rules-modal")?.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
        const modal = document.getElementById("rules-modal");
        if (modal) modal.classList.add("hidden");
      }
    });
  }

  private showRulesModal(): void {
    const modal = document.getElementById("rules-modal");
    const content = document.getElementById("rules-content");
    if (!modal || !content) return;

    modal.classList.remove("hidden");

    // Load rules based on game type
    if (this.gameType === "doudizhu") {
      content.innerHTML = this.getDoudizhuRules();
    } else {
      content.innerHTML = this.getChessRules();
    }
  }

  private getDoudizhuRules(): string {
    return `
      <div class="rules-section">
        <h4>${Trans.t("rules.doudizhu.title", "斗地主规则")}</h4>
        <p>${Trans.t("rules.doudizhu.intro", "斗地主是一种流行的中国扑克牌游戏，由3名玩家进行，一名地主对抗两名农民。")}</p>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.doudizhu.objective", "游戏目标")}</h4>
        <ul>
          <li>${Trans.t("rules.doudizhu.obj1", "地主：先出完所有手牌即获胜")}</li>
          <li>${Trans.t("rules.doudizhu.obj2", "农民：任意一名农民先出完手牌，农民方获胜")}</li>
        </ul>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.doudizhu.card_types", "牌型")}</h4>
        <ul>
          <li><strong>${Trans.t("rules.doudizhu.single", "单牌")}</strong>: ${Trans.t("rules.doudizhu.single_desc", "任意一张牌")}</li>
          <li><strong>${Trans.t("rules.doudizhu.pair", "对子")}</strong>: ${Trans.t("rules.doudizhu.pair_desc", "两张相同点数的牌")}</li>
          <li><strong>${Trans.t("rules.doudizhu.triple", "三张")}</strong>: ${Trans.t("rules.doudizhu.triple_desc", "三张相同点数的牌")}</li>
          <li><strong>${Trans.t("rules.doudizhu.straight", "顺子")}</strong>: ${Trans.t("rules.doudizhu.straight_desc", "五张或更多连续的牌（3-A）")}</li>
          <li><strong>${Trans.t("rules.doudizhu.bomb", "炸弹")}</strong>: ${Trans.t("rules.doudizhu.bomb_desc", "四张相同点数的牌，可以压任何牌型")}</li>
          <li><strong>${Trans.t("rules.doudizhu.rocket", "火箭")}</strong>: ${Trans.t("rules.doudizhu.rocket_desc", "大王+小王，最大的牌型")}</li>
        </ul>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.doudizhu.card_rank", "牌的大小")}</h4>
        <p>${Trans.t("rules.doudizhu.rank_order", "3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < 小王 < 大王")}</p>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.doudizhu.gameplay", "游戏流程")}</h4>
        <ol>
          <li>${Trans.t("rules.doudizhu.step1", "地主首先出牌")}</li>
          <li>${Trans.t("rules.doudizhu.step2", "其他玩家按顺时针顺序出牌")}</li>
          <li>${Trans.t("rules.doudizhu.step3", "后出的牌必须比前一家大，或选择不出（pass）")}</li>
          <li>${Trans.t("rules.doudizhu.step4", "连续两家不出后，最后出牌的玩家获得出牌权，可以出任意牌型")}</li>
          <li>${Trans.t("rules.doudizhu.step5", "重复直到有玩家出完所有手牌")}</li>
        </ol>
      </div>
    `;
  }

  private getChessRules(): string {
    return `
      <div class="rules-section">
        <h4>${Trans.t("rules.chess.title", "国际象棋规则")}</h4>
        <p>${Trans.t("rules.chess.intro", "国际象棋是一种两人对弈的策略棋盘游戏，在8×8的棋盘上进行。")}</p>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.chess.objective", "游戏目标")}</h4>
        <p>${Trans.t("rules.chess.obj", "将死对方的国王（King），使其无法逃脱被吃的命运。")}</p>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.chess.pieces", "棋子移动")}</h4>
        <ul>
          <li><strong>${Trans.t("rules.chess.king", "王（King）")}</strong>: ${Trans.t("rules.chess.king_desc", "可向任意方向移动一格")}</li>
          <li><strong>${Trans.t("rules.chess.queen", "后（Queen）")}</strong>: ${Trans.t("rules.chess.queen_desc", "可沿直线或斜线移动任意格数")}</li>
          <li><strong>${Trans.t("rules.chess.rook", "车（Rook）")}</strong>: ${Trans.t("rules.chess.rook_desc", "可沿直线移动任意格数")}</li>
          <li><strong>${Trans.t("rules.chess.bishop", "象（Bishop）")}</strong>: ${Trans.t("rules.chess.bishop_desc", "可沿斜线移动任意格数")}</li>
          <li><strong>${Trans.t("rules.chess.knight", "马（Knight）")}</strong>: ${Trans.t("rules.chess.knight_desc", "走日字，可跳过其他棋子")}</li>
          <li><strong>${Trans.t("rules.chess.pawn", "兵（Pawn）")}</strong>: ${Trans.t("rules.chess.pawn_desc", "向前移动一格，首次可移动两格，斜向吃子")}</li>
        </ul>
      </div>
      <div class="rules-section">
        <h4>${Trans.t("rules.chess.special", "特殊规则")}</h4>
        <ul>
          <li><strong>${Trans.t("rules.chess.castling", "王车易位")}</strong>: ${Trans.t("rules.chess.castling_desc", "王和车同时移动的特殊走法")}</li>
          <li><strong>${Trans.t("rules.chess.enpassant", "吃过路兵")}</strong>: ${Trans.t("rules.chess.enpassant_desc", "兵的特殊吃子方式")}</li>
          <li><strong>${Trans.t("rules.chess.promotion", "升变")}</strong>: ${Trans.t("rules.chess.promotion_desc", "兵到达底线可升变为后、车、象或马")}</li>
        </ul>
      </div>
    `;
  }

  private renderMatchInfo(match: Record<string, unknown>): void {
    const el = this.container.querySelector("#match-info");
    if (!el) return;

    const currentUserId = AppLogic.getUserId();
    const gameType = match.game_type as string;
    this.gameType = gameType;

    // Store robot names for move history
    this.robotNames.set(match.robot_white_id as number, match.white_name as string);
    this.robotNames.set(match.robot_black_id as number, match.black_name as string);
    if (match.robot_third_id) {
      this.robotNames.set(match.robot_third_id as number, match.third_name as string);
    }

    // Initialize board based on game type
    if (!this.chessBoard && !this.doudizhuBoard) {
      const boardContainer = this.container.querySelector("#game-board") as HTMLElement;
      if (gameType === 'doudizhu') {
        this.doudizhuBoard = new DoudizhuBoard(boardContainer);
      } else {
        this.chessBoard = new ChessBoard(boardContainer);
      }
    }

    if (gameType === 'doudizhu') {
      // 斗地主：3人对战
      const whiteIsMe = currentUserId && match.white_user_id === currentUserId;
      const blackIsMe = currentUserId && match.black_user_id === currentUserId;
      const thirdIsMe = currentUserId && match.third_user_id === currentUserId;

      const landlordId = match.robot_landlord_id;
      const landlordName = landlordId === match.robot_white_id ? match.white_name :
        landlordId === match.robot_black_id ? match.black_name :
          match.third_name;
      const landlordIdx = landlordId === match.robot_white_id ? 0 :
        landlordId === match.robot_black_id ? 1 : 2;

      // Determine winner display
      const winnerId = match.winner_id;
      const whiteWon = winnerId === match.robot_white_id;
      const blackWon = winnerId === match.robot_black_id;
      const thirdWon = winnerId === match.robot_third_id;

      // Set player info for board
      if (this.doudizhuBoard) {
        this.doudizhuBoard.setPlayerInfo(
          [match.white_name as string, match.black_name as string, match.third_name as string],
          landlordIdx
        );
      }

      let forfeitInfoHtml = '';
      if (match.status === 'forfeited' && match.forfeit_reason) {
        forfeitInfoHtml = `<div class="card mb-1" style="background: #fef2f2; border: 1px solid #fca5a5; padding: 1rem;">
          <div style="color: #b91c1c; font-weight: bold; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>❌</span> ${Trans.t("game.forfeit_reason", "认负原因")}
          </div>
          <div style="color: #991b1b; font-size: 0.9rem; padding-left: 1.5rem; word-break: break-word; white-space: pre-wrap;">${match.forfeit_reason}</div>
        </div>`;
      }

      el.innerHTML = `
        <div class="doudizhu-match-header">
          <div class="match-title">${Trans.t("game.doudizhu_match", "斗地主对局")}</div>
          <div class="players-grid">
            <div class="player-card ${whiteIsMe ? 'my-robot' : ''}">
              <span class="player-icon">🃏</span>
              <span class="player-name">${match.white_name}</span>
              ${whiteWon ? '<span class="trophy">🏆</span>' : ''}
            </div>
            <div class="player-card ${blackIsMe ? 'my-robot' : ''}">
              <span class="player-icon">🃏</span>
              <span class="player-name">${match.black_name}</span>
              ${blackWon ? '<span class="trophy">🏆</span>' : ''}
            </div>
            <div class="player-card ${thirdIsMe ? 'my-robot' : ''}">
              <span class="player-icon">🃏</span>
              <span class="player-name">${match.third_name}</span>
              ${thirdWon ? '<span class="trophy">🏆</span>' : ''}
            </div>
          </div>
          <div class="match-info-row">
            <div class="info-item">
              <span class="info-label">${Trans.t("game.landlord", "地主")}</span>
              <span class="info-value">${landlordName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">${Trans.t("game.status", "状态")}</span>
              <span class="badge badge-${match.status}">${Trans.t(`game.status.${match.status}`)}</span>
            </div>
            ${match.winner_id ? `
            <div class="info-item">
              <span class="info-label">${Trans.t("game.winner", "胜者")}</span>
              <span class="info-value winner">${match.winner_id === landlordId ? landlordName + ' (' + Trans.t("game.landlord", "地主") + ')' : Trans.t("game.farmers_alliance", "农民联盟")}</span>
            </div>` : ''}
          </div>
        </div>`;

      const forfeitContainer = this.container.querySelector("#match-forfeit");
      if (forfeitContainer) forfeitContainer.innerHTML = forfeitInfoHtml;

      // 斗地主不需要棋盘标签
      const topLabel = this.container.querySelector("#board-top-label");
      const bottomLabel = this.container.querySelector("#board-bottom-label");
      if (topLabel) topLabel.innerHTML = '';
      if (bottomLabel) bottomLabel.innerHTML = '';
    } else {
      // 国际象棋：2人对战
      const whiteIsMe = currentUserId && match.white_user_id === currentUserId;
      const blackIsMe = currentUserId && match.black_user_id === currentUserId;

      const whiteWon = match.winner_id === match.robot_white_id;
      const blackWon = match.winner_id === match.robot_black_id;

      let forfeitInfoHtml = '';
      if (match.status === 'forfeited' && match.forfeit_reason) {
        forfeitInfoHtml = `<div class="card mb-1" style="background: #fef2f2; border: 1px solid #fca5a5; padding: 1rem;">
          <div style="color: #b91c1c; font-weight: bold; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>❌</span> ${Trans.t("game.forfeit_reason", "认负原因")}
          </div>
          <div style="color: #991b1b; font-size: 0.9rem; padding-left: 1.5rem; word-break: break-word; white-space: pre-wrap;">${match.forfeit_reason}</div>
        </div>`;
      }

      el.innerHTML = `
        <div class="doudizhu-match-header chess-match-header">
          <div class="match-title">${Trans.t("game.chess_match", "国际象棋对局")}</div>
          <div class="players-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="player-card ${whiteIsMe ? 'my-robot' : ''}">
              <span class="player-icon">♔</span>
              <span class="player-name">${match.white_name} (${Trans.t("game.white", "白")})</span>
              ${whiteWon ? '<span class="trophy">🏆</span>' : ''}
            </div>
            <div class="player-card ${blackIsMe ? 'my-robot' : ''}">
              <span class="player-icon">♚</span>
              <span class="player-name">${match.black_name} (${Trans.t("game.black", "黑")})</span>
              ${blackWon ? '<span class="trophy">🏆</span>' : ''}
            </div>
          </div>
          <div class="match-info-row">
            <div class="info-item">
              <span class="info-label">${Trans.t("game.status", "状态")}</span>
              <span class="badge badge-${match.status}">${Trans.t(`game.status.${match.status}`)}</span>
            </div>
            ${match.winner_id ? `
            <div class="info-item">
              <span class="info-label">${Trans.t("game.winner", "胜者")}</span>
              <span class="info-value winner">${whiteWon ? match.white_name : match.black_name}</span>
            </div>` : match.status === 'finished' && !match.winner_id ? `
            <div class="info-item">
              <span class="info-label">${Trans.t("game.result", "结果")}</span>
              <span class="info-value text-muted">${Trans.t("game.draw", "平局")}</span>
            </div>` : ''}
          </div>
        </div>`;

      const forfeitContainer = this.container.querySelector("#match-forfeit");
      if (forfeitContainer) forfeitContainer.innerHTML = forfeitInfoHtml;

      // Update board labels
      const topLabel = this.container.querySelector("#board-top-label");
      const bottomLabel = this.container.querySelector("#board-bottom-label");
      if (topLabel) {
        topLabel.innerHTML = `<span class="${blackIsMe ? 'my-robot' : ''}" id="board-black-name">♚ ${match.black_name}</span>`;
      }
      if (bottomLabel) {
        bottomLabel.innerHTML = `<span class="${whiteIsMe ? 'my-robot' : ''}" id="board-white-name">♔ ${match.white_name}</span>`;
      }
    }

    if (match.status === "finished" || match.status === "forfeited") {
      this.matchFinished = true;
      this.stopPolling();
      this.updateLiveIndicator();
    }
  }

  private renderMoves(moves: Array<Record<string, unknown>>): void {
    const prevTotal = this.moves.length;
    this.moves = moves;

    // If user is at last move, auto-advance to new last; otherwise keep position.
    const targetIdx = this.isAtLastMove ? moves.length - 1 : this.currentMoveIdx;

    const el = this.container.querySelector("#move-list");
    if (el) {
      if (moves.length === 0) {
        el.innerHTML = `<div class="text-muted text-center">${Trans.t("game.waiting_start", "等待对局开始...")}</div>`;
      } else {
        el.innerHTML = moves.map((m, i) => {
          const moveUci = m.move_uci as string;
          const robotId = m.robot_id as number;
          const robotName = this.robotNames.get(robotId) || `${Trans.t("game.robot", "机器人")} ${robotId}`;
          let moveDisplay = moveUci;

          // For doudizhu, format the move display
          if (this.gameType === 'doudizhu') {
            if (moveUci === 'pass') {
              moveDisplay = Trans.t("game.pass_move", "不出");
            } else {
              // Format cards: 3,4,5,6,7 -> 3 4 5 6 7
              moveDisplay = moveUci.split(',').join(' ');
            }
          }

          return `
          <div class="move-item ${i === targetIdx ? "active" : ""}" data-idx="${i}">
            <div class="move-header">
              <span class="move-num">${m.move_number}.</span>
              <span class="move-robot">${robotName}</span>
            </div>
            <div class="move-content">
              <span class="move-uci">${moveDisplay}</span>
              <span class="move-cost text-muted">$${Number(m.cost_usd).toFixed(6)}</span>
            </div>
          </div>`;
        }).join("");
        el.querySelectorAll(".move-item").forEach((item) => {
          item.addEventListener("click", () => {
            const idx = Number((item as HTMLElement).dataset.idx);
            this.isAtLastMove = idx === this.moves.length - 1;
            this.goToMove(idx);
          });
        });
        // Scroll active item into view
        const active = el.querySelector(".move-item.active") as HTMLElement | null;
        active?.scrollIntoView({ block: "nearest" });
      }
    }

    if (this.isAtLastMove) {
      // Auto-advance board to latest move
      this.goToMove(moves.length - 1);
    } else {
      // Only refresh the counter total, keep board position unchanged
      const counter = this.container.querySelector("#move-counter");
      if (counter) counter.textContent = `${this.currentMoveIdx + 1} / ${moves.length}`;
    }

    // First load: initialise to last move
    if (prevTotal === 0 && moves.length > 0) {
      this.isAtLastMove = true;
      this.goToMove(moves.length - 1);
    }

    this.updateLiveIndicator();
  }

  private goToMove(idx: number): void {
    if (!this.moves.length) {
      // No moves yet - show initial position
      if (this.chessBoard) {
        this.chessBoard.render("", "");
      } else if (this.doudizhuBoard) {
        this.doudizhuBoard.render("", "");
      }
      const counter = this.container.querySelector("#move-counter");
      if (counter) counter.textContent = "0 / 0";
      return;
    }
    const clamped = Math.max(0, Math.min(idx, this.moves.length - 1));
    this.currentMoveIdx = clamped;
    this.isAtLastMove = clamped === this.moves.length - 1;
    const move = this.moves[clamped];

    if (this.chessBoard) {
      this.chessBoard.render(move.fen_after as string, move.move_uci as string);
    } else if (this.doudizhuBoard) {
      this.doudizhuBoard.render(move.fen_after as string, move.move_uci as string);
    }

    const counter = this.container.querySelector("#move-counter");
    if (counter) counter.textContent = `${clamped + 1} / ${this.moves.length}`;
    this.updateLiveIndicator();
  }

  private updateLiveIndicator(): void {
    const el = this.container.querySelector("#live-indicator") as HTMLElement | null;
    if (!el) return;
    const showLive = this.isAtLastMove && !this.matchFinished;
    el.style.display = showLive ? "inline-flex" : "none";
    this.updateThinkingIndicator();
  }

  private updateThinkingIndicator(): void {
    const boardWhiteEl = this.container.querySelector("#board-white-name");
    const boardBlackEl = this.container.querySelector("#board-black-name");

    // Remove existing bubbles
    boardWhiteEl?.querySelector(".thinking-bubble")?.remove();
    boardBlackEl?.querySelector(".thinking-bubble")?.remove();

    if (!this.isAtLastMove || this.matchFinished) return;

    // Whose turn is next: read active color from last FEN, default 'w' when no moves yet
    let turn = "w";
    if (this.moves.length > 0) {
      const lastFen = this.moves[this.moves.length - 1].fen_after as string;
      turn = lastFen.split(" ")[1] ?? "w";
    }

    const bubble = '<span class="thinking-bubble">···</span>';
    if (turn === "w") {
      boardWhiteEl?.insertAdjacentHTML("beforeend", bubble);
    } else {
      boardBlackEl?.insertAdjacentHTML("beforeend", bubble);
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      AppLogic.loadMatch(this.matchId);
      AppLogic.loadMatchMoves(this.matchId);
    }, 5000);
  }

  private stopPolling(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }
}
