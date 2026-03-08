// ============================================================
// RunningMatchesPage.ts - All running matches
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

interface Match {
  id: number;
  white_name: string;
  black_name: string;
  third_name?: string;
  game_type: string;
  status: string;
  winner_id: number | null;
  robot_white_id: number;
  robot_black_id: number;
  robot_third_id?: number;
  created_at: string;
}

export class RunningMatchesPage {
  private container!: HTMLElement;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    AppLogic.loadRecentMatches();
    EventTool.on("matches_loaded", (d) => this.renderMatches(d as Match[]));
    this.refreshTimer = setInterval(() => AppLogic.loadRecentMatches(), 10000);
  }

  unmount(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    EventTool.clear("matches_loaded");
  }

  private renderSkeleton(): string {
    return (
      '<div class="page">' +
      '<h2>' + Trans.t("gc.all_running_matches") + '</h2>' +
      '<div id="running-matches-list"><div class="loading-pulse"></div></div>' +
      '</div>'
    );
  }

  private renderMatches(matches: Match[]): void {
    const el = this.container.querySelector("#running-matches-list");
    if (!el) return;
    const running = matches.filter(m => m.status === 'running');
    if (!running.length) {
      el.innerHTML = '<p class="text-muted">' + Trans.t("gc.no_running") + '</p>';
      return;
    }
    el.innerHTML = '<div class="match-grid">' + running.map(m => this.renderMatchCard(m)).join("") + '</div>';
  }

  private renderMatchCard(m: Match): string {
    const gameType = m.game_type === 'doudizhu' ? Trans.t("robot.doudizhu") : Trans.t("robot.chess");
    const players = m.game_type === 'doudizhu'
      ? `${m.white_name} <span class="vs">vs</span> ${m.black_name} <span class="vs">vs</span> ${m.third_name}`
      : `${m.white_name} <span class="vs">vs</span> ${m.black_name}`;
    return (
      '<div class="match-card" onclick="location.hash=\'#/match/' + m.id + '\'">' +
      '<div class="match-card-header">' +
      '<span class="match-game-type">' + gameType + '</span>' +
      '<span class="badge badge-running">' + Trans.t("gc.live") + '</span>' +
      '</div>' +
      '<div class="match-card-players">' + players + '</div>' +
      '<div class="match-card-footer">' +
      '<span class="match-id">#' + m.id + '</span>' +
      '<span class="match-link">' + Trans.t("game.view") + ' →</span>' +
      '</div>' +
      '</div>'
    );
  }
}
