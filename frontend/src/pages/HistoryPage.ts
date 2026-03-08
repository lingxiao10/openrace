// ============================================================
// HistoryPage.ts — All matches list.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

export class HistoryPage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    AppLogic.loadRecentMatches();
    EventTool.on("matches_loaded", (d) => this.renderMatches(d as Array<Record<string, unknown>>));
  }

  unmount(): void { EventTool.clear("matches_loaded"); }

  private renderSkeleton(): string {
    return `
<div class="page">
  <h2>${Trans.t("nav.history", "Match History")}</h2>
  <div id="match-list"><div class="loading-pulse"></div></div>
</div>`;
  }

  private renderMatches(matches: Array<Record<string, unknown>>): void {
    const el = this.container.querySelector("#match-list");
    if (!el) return;
    if (!matches.length) {
      el.innerHTML = `<p class="text-muted">${Trans.t("game.no_matches")}</p>`;
      return;
    }
    el.innerHTML = `
<table class="table">
  <thead><tr>
    <th>ID</th>
    <th>${Trans.t("game.game_type")}</th>
    <th>${Trans.t("game.players")}</th>
    <th>${Trans.t("game.status")}</th>
    <th>${Trans.t("game.date")}</th>
    <th></th>
  </tr></thead>
  <tbody>
    ${matches.map((m) => {
      const gameType = m.game_type === 'doudizhu' ? Trans.t("robot.doudizhu") : Trans.t("robot.chess");
      const players = m.game_type === 'doudizhu'
        ? `${m.white_name} <span class="vs">vs</span> ${m.black_name} <span class="vs">vs</span> ${m.third_name}`
        : `${m.white_name} <span class="vs">vs</span> ${m.black_name}`;
      const statusText = Trans.t(`game.status.${m.status}`);
      return `
    <tr>
      <td>#${m.id}</td>
      <td>${gameType}</td>
      <td>${players}</td>
      <td><span class="badge badge-${m.status}">${statusText}</span></td>
      <td>${new Date(m.created_at as string).toLocaleDateString()}</td>
      <td><a href="#/match/${m.id}" class="btn btn-sm btn-outline">${Trans.t("game.view")}</a></td>
    </tr>`;
    }).join("")}
  </tbody>
</table>`;
  }
}
