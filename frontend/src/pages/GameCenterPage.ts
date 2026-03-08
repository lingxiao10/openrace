// ============================================================
// GameCenterPage.ts - Platform overview: stats + running/recent matches.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

interface PlatformStats {
  total_robots: number;
  active_robots: number;
  in_game_robots: number;
  idle_robots: number;
  eligible_robots: number;
  last_tick_time: string | null;
  next_tick_time: string | null;
  tick_interval_ms: number;
}

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

export class GameCenterPage {
  private container!: HTMLElement;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private stats: PlatformStats | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    EventTool.on("stats_loaded", (d) => this.onStatsLoaded(d as PlatformStats));
    EventTool.on("matches_loaded", (d) => this.onMatchesLoaded(d as Match[]));
    AppLogic.loadGameCenter();
    AppLogic.loadRecentMatches();
    this.refreshTimer = setInterval(() => {
      AppLogic.loadGameCenter();
      AppLogic.loadRecentMatches();
    }, 10000);
    this.countdownTimer = setInterval(() => this.tickCountdown(), 1000);

    // Bind build button
    this.container.querySelector("#gc-build-btn")?.addEventListener("click", () => {
      window.location.hash = "#/robots";
      setTimeout(() => EventTool.emit("trigger_create_robot"), 100);
    });
  }

  unmount(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    EventTool.clear("stats_loaded");
    EventTool.clear("matches_loaded");
  }

  private renderSkeleton(): string {
    return (
      '<div class="page">' +
      '<h2>' + Trans.t("gc.title") + '</h2>' +
      '<div class="gc-stats" id="gc-stats">' +
      '<div class="stat-card"><div class="loading-pulse"></div></div>' +
      '<div class="stat-card"><div class="loading-pulse"></div></div>' +
      '<div class="stat-card"><div class="loading-pulse"></div></div>' +
      '<div class="stat-card"><div class="loading-pulse"></div></div>' +
      '</div>' +
      '<div class="section">' +
      '<h3>' + Trans.t("gc.running_matches") + '</h3>' +
      '<div id="running-matches"><div class="loading-pulse"></div></div>' +
      '</div>' +
      '<div class="section">' +
      '<h3>' + Trans.t("gc.recent_matches") + '</h3>' +
      '<div id="recent-matches"><div class="loading-pulse"></div></div>' +
      '</div>' +
      '<button class="floating-build-btn" id="gc-build-btn">' +
      '<span class="btn-icon">🚀</span>' +
      '<span class="btn-text">' + Trans.t("home.build_bot") + '</span>' +
      '</button>' +
      '</div>'
    );
  }

  private onStatsLoaded(stats: PlatformStats): void {
    this.stats = stats;
    this.renderStats(stats);
    this.renderCountdown();
  }

  private onMatchesLoaded(matches: Match[]): void {
    this.renderMatches(matches);
  }

  private renderStats(s: PlatformStats): void {
    const el = this.container.querySelector("#gc-stats");
    if (!el) return;
    const warn = s.eligible_robots < 2
      ? '<div class="gc-warn">' + Trans.t("gc.warn_eligible").replace("{n}", String(s.eligible_robots)) + '</div>'
      : "";
    const eligibleClass = s.eligible_robots >= 2 ? "gc-val-eligible" : "gc-val-warn";
    el.innerHTML = (
      '<div class="stat-card">' +
      '<div class="stat-label">' + Trans.t("gc.total_robots") + '</div>' +
      '<div class="stat-value">' + s.total_robots + '</div>' +
      '</div>' +
      '<div class="stat-card">' +
      '<div class="stat-label">' + Trans.t("gc.eligible") + '</div>' +
      '<div class="stat-value ' + eligibleClass + '">' + s.eligible_robots + '</div>' +
      '<div class="stat-sublabel">' + Trans.t("gc.api_sublabel") + '</div>' +
      '</div>' +
      '<div class="stat-card">' +
      '<div class="stat-label">' + Trans.t("gc.in_game") + '</div>' +
      '<div class="stat-value gc-val-ingame">' + s.in_game_robots + '</div>' +
      '</div>' +
      '<div class="stat-card">' +
      '<div class="stat-label">' + Trans.t("gc.idle") + '</div>' +
      '<div class="stat-value gc-val-idle">' + s.idle_robots + '</div>' +
      '</div>' +
      warn
    );
  }

  private tickCountdown(): void {
    if (!this.stats?.next_tick_time) return;
    const el = this.container.querySelector("#gc-countdown");
    if (!el) return;
    const secsLeft = Math.max(0, Math.round((new Date(this.stats.next_tick_time).getTime() - Date.now()) / 1000));
    el.textContent = secsLeft > 0
      ? Trans.t("gc.next_tick_in") + " " + secsLeft + "s"
      : Trans.t("gc.matching");
  }

  private renderCountdown(): void {
    this.tickCountdown();
  }

  private renderMatches(matches: Match[]): void {
    const running = matches.filter(m => m.status === 'running').slice(0, 10); // 只显示最近10个
    const finished = matches.filter(m => m.status === 'finished' || m.status === 'forfeited').slice(0, 30);

    this.renderRunningMatches(running, matches.filter(m => m.status === 'running').length);
    this.renderRecentMatches(finished);
  }

  private renderRunningMatches(matches: Match[], totalCount: number): void {
    const el = this.container.querySelector("#running-matches");
    if (!el) return;
    if (!matches.length) {
      el.innerHTML = '<p class="text-muted">' + Trans.t("gc.no_running") + '</p>';
      return;
    }
    const showViewAll = totalCount > 10;
    el.innerHTML = (
      '<div class="match-grid">' + matches.map(m => this.renderMatchCard(m)).join("") + '</div>' +
      (showViewAll ? '<div class="view-all-link"><a href="#/running-matches">' + Trans.t("gc.view_all_running").replace("{n}", String(totalCount)) + ' →</a></div>' : '')
    );
  }

  private renderRecentMatches(matches: Match[]): void {
    const el = this.container.querySelector("#recent-matches");
    if (!el) return;
    if (!matches.length) {
      el.innerHTML = '<p class="text-muted">' + Trans.t("gc.no_recent") + '</p>';
      return;
    }
    el.innerHTML = '<div class="match-grid">' + matches.map(m => this.renderRecentMatchCard(m)).join("") + '</div>';
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

  private renderRecentMatchCard(m: Match): string {
    const gameType = m.game_type === 'doudizhu' ? Trans.t("robot.doudizhu") : Trans.t("robot.chess");
    const players = m.game_type === 'doudizhu'
      ? `${m.white_name} <span class="vs">vs</span> ${m.black_name} <span class="vs">vs</span> ${m.third_name}`
      : `${m.white_name} <span class="vs">vs</span> ${m.black_name}`;

    let winner = '';
    if (m.game_type === 'doudizhu') {
      // 斗地主：如果有 winner_id 就是地主赢，否则是农民赢
      if (m.winner_id) {
        if (m.winner_id === m.robot_white_id) winner = m.white_name;
        else if (m.winner_id === m.robot_black_id) winner = m.black_name;
        else if (m.robot_third_id && m.winner_id === m.robot_third_id) winner = m.third_name || '';
      } else if (m.status === 'finished') {
        // 农民获胜
        winner = Trans.t("game.farmers_alliance");
      }
    } else {
      // 国际象棋
      if (m.winner_id) {
        if (m.winner_id === m.robot_white_id) winner = m.white_name;
        else if (m.winner_id === m.robot_black_id) winner = m.black_name;
      }
    }

    const statusText = Trans.t(`game.status.${m.status}`);

    return (
      '<div class="match-card" onclick="location.hash=\'#/match/' + m.id + '\'">' +
      '<div class="match-card-header">' +
      '<span class="match-game-type">' + gameType + '</span>' +
      '<span class="badge badge-' + m.status + '">' + statusText + '</span>' +
      '</div>' +
      '<div class="match-card-players">' + players + '</div>' +
      (winner ? '<div class="match-card-winner">🏆 ' + winner + '</div>' : '') +
      '<div class="match-card-footer">' +
      '<span class="match-id">#' + m.id + '</span>' +
      '<span class="match-date">' + new Date(m.created_at).toLocaleDateString() + '</span>' +
      '</div>' +
      '</div>'
    );
  }
}
