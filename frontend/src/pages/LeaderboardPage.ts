// ============================================================
// LeaderboardPage.ts - Multiple leaderboards (all-time, weekly, daily)
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

interface LeaderboardData {
  allTime: LeaderboardRow[];
  weekly: LeaderboardRow[];
  daily: LeaderboardRow[];
}

interface LeaderboardRow {
  rank_position: number;
  robot_name: string;
  username: string;
  elo: number;
  points?: number;
  wins: number;
  losses: number;
  draws: number;
  game_type?: string;
}

export class LeaderboardPage {
  private container!: HTMLElement;
  private currentTab: 'daily' | 'weekly' | 'allTime' = 'daily';
  private currentGameType: 'chess' | 'doudizhu' = 'chess';
  private cachedData: LeaderboardData | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    // 根据当前语言设置默认游戏类型
    this.currentGameType = Trans.getLang() === 'zh' ? 'doudizhu' : 'chess';
    this.container.innerHTML = this.renderSkeleton();
    this.bindTabs();
    this.bindGameTypeTabs();
    AppLogic.loadLeaderboard();
    EventTool.on("leaderboard_loaded", (d) => {
      this.cachedData = d as LeaderboardData;
      this.renderData();
    });
  }

  unmount(): void { EventTool.clear("leaderboard_loaded"); }

  private renderSkeleton(): string {
    const isChessActive = this.currentGameType === 'chess' ? 'active' : '';
    const isDoudizhuActive = this.currentGameType === 'doudizhu' ? 'active' : '';
    return `
<div class="page">
  <h2>${Trans.t("nav.leaderboard")}</h2>
  <div class="leaderboard-game-tabs">
    <button class="game-tab-btn ${isChessActive}" data-game="chess">${Trans.t("robot.chess")}</button>
    <button class="game-tab-btn ${isDoudizhuActive}" data-game="doudizhu">${Trans.t("robot.doudizhu")}</button>
  </div>
  <div class="leaderboard-tabs">
    <button class="tab-btn active" data-tab="daily">${Trans.t("leaderboard.daily")}</button>
    <button class="tab-btn" data-tab="weekly">${Trans.t("leaderboard.weekly")}</button>
    <button class="tab-btn" data-tab="allTime">${Trans.t("leaderboard.all_time")}</button>
  </div>
  <div id="leaderboard-content"><div class="loading-pulse"></div></div>
</div>`;
  }

  private bindTabs(): void {
    this.container.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = (btn as HTMLElement).dataset.tab as 'daily' | 'weekly' | 'allTime';
        this.currentTab = tab;
        this.container.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderData();
      });
    });
  }

  private bindGameTypeTabs(): void {
    this.container.querySelectorAll(".game-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const gameType = (btn as HTMLElement).dataset.game as 'chess' | 'doudizhu';
        this.currentGameType = gameType;
        this.container.querySelectorAll(".game-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderData();
      });
    });
  }

  private renderData(): void {
    const el = this.container.querySelector("#leaderboard-content");
    if (!el || !this.cachedData) return;

    let rows = this.cachedData[this.currentTab].filter(r => r.game_type === this.currentGameType);

    // Re-rank after filtering
    rows = rows.map((r, idx) => ({ ...r, rank_position: idx + 1 }));

    if (!rows?.length) {
      el.innerHTML = `<p class="text-muted">${Trans.t("leaderboard.empty")}</p>`;
      return;
    }
    el.innerHTML = `
<table class="table">
  <thead><tr>
    <th>#</th>
    <th>${Trans.t("robot.name")}</th>
    <th>${Trans.t("user.username")}</th>
    <th>${Trans.t("leaderboard.points")}</th>
    <th>${Trans.t("leaderboard.wins")}</th>
    <th>${Trans.t("leaderboard.losses")}</th>
    <th>${Trans.t("leaderboard.draws")}</th>
  </tr></thead>
  <tbody>
    ${rows.map((r) => `
    <tr>
      <td>${r.rank_position}</td>
      <td>${r.robot_name}</td>
      <td>${r.username}</td>
      <td><strong>${r.points || 0}</strong></td>
      <td>${r.wins}</td>
      <td>${r.losses}</td>
      <td>${r.draws}</td>
    </tr>`).join("")}
  </tbody>
</table>`;
  }
}
