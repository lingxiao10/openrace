// ============================================================
// DashboardPage.ts — Home after login. Shows balance + summary.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

export class DashboardPage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    AppLogic.loadDashboard();
    EventTool.on("dashboard_loaded", (data) => this.renderData(data as Record<string, unknown>));
  }

  unmount(): void {
    EventTool.clear("dashboard_loaded");
  }

  private renderSkeleton(): string {
    return `
<div class="page">
  <h2>${Trans.t("nav.dashboard", "Dashboard")}</h2>
  <div class="stats-grid" id="stats-grid">
    <div class="stat-card"><div class="loading-pulse"></div></div>
    <div class="stat-card"><div class="loading-pulse"></div></div>
    <div class="stat-card"><div class="loading-pulse"></div></div>
  </div>
  <div class="section">
    <h3>${Trans.t("game.recent_matches", "Recent Matches")}</h3>
    <div id="recent-matches"><div class="loading-pulse"></div></div>
  </div>
</div>`;
  }

  private renderData(data: Record<string, unknown>): void {
    const user = data.user as Record<string, unknown>;
    const matches = data.matches as Array<Record<string, unknown>>;
    const robots = data.robots as Array<Record<string, unknown>>;

    const statsEl = this.container.querySelector("#stats-grid");
    if (statsEl) {
      statsEl.innerHTML = `
        <!-- balance hidden: users use their own API key -->
        <!-- <div class="stat-card">
          <div class="stat-label">${Trans.t("balance.label", "Balance")}</div>
          <div class="stat-value">$${Number(user?.balance ?? 0).toFixed(4)}</div>
        </div> -->
        <div class="stat-card">
          <div class="stat-label">${Trans.t("robot.count", "Robots")}</div>
          <div class="stat-value">${robots?.length ?? 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${Trans.t("game.matches_played", "Matches")}</div>
          <div class="stat-value">${matches?.length ?? 0}</div>
        </div>`;
    }

    const matchesEl = this.container.querySelector("#recent-matches");
    if (matchesEl) {
      matchesEl.innerHTML = matches?.length
        ? DashboardPage.renderMatchList(matches)
        : `<p class="text-muted">${Trans.t("game.no_matches", "No matches yet")}</p>`;
    }
  }

  private static renderMatchList(matches: Array<Record<string, unknown>>): string {
    return matches.slice(0, 5).map((m) => {
      const players = m.game_type === 'doudizhu'
        ? `♔ ${m.white_name} vs ♚ ${m.black_name} vs ♛ ${m.third_name}`
        : `♔ ${m.white_name} vs ♚ ${m.black_name}`;
      return `
      <div class="match-row" onclick="location.hash='/match/${m.id}'">
        <div class="match-row-header">
          <span class="match-players">${players}</span>
          <span class="match-time">${new Date(m.created_at as string).toLocaleDateString()}</span>
        </div>
        <span class="match-status badge badge-${m.status}">${m.status}</span>
      </div>`;
    }).join("");
  }
}
