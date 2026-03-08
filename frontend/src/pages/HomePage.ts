// ============================================================
// HomePage.ts — Landing page for non-logged-in users.
// ============================================================

import { Trans } from "../core/Trans";
import { StorageTool } from "../tools/StorageTool";
import { Router } from "../core/Router";
import { AppLogic } from "../AppLogic";
import { EventTool } from "../tools/EventTool";

export class HomePage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.render();

    const buildBtn = this.container.querySelector("#build-bot-btn");
    buildBtn?.addEventListener("click", () => this.onBuildBotClick());

    AppLogic.loadRecentMatches();
    EventTool.on("matches_loaded", (d) => this.renderMatches(d as Array<Record<string, unknown>>));
  }

  unmount(): void {
    EventTool.clear("matches_loaded");
  }

  private onBuildBotClick(): void {
    const token = StorageTool.get("token");
    if (token) {
      // Already logged in, go to robots page and trigger create
      Router.navigate("/robots");
      // Dispatch event to trigger robot creation modal
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent("trigger_create_robot"));
      }, 100);
    } else {
      // Not logged in, go to login page
      Router.navigate("/login");
    }
  }

  private renderMatches(matches: Array<Record<string, unknown>>): void {
    const el = this.container.querySelector("#running-matches");
    if (!el) return;
    const running = matches.filter(m => m.status === 'running');
    if (!running.length) {
      el.innerHTML = `<p class="text-muted">${Trans.t("gc.no_running", "No running matches")}</p>`;
      return;
    }
    el.innerHTML = running.slice(0, 6).map(m => {
      const gameType = m.game_type === 'doudizhu' ? Trans.t("robot.doudizhu", "Doudizhu") : Trans.t("robot.chess", "Chess");
      const players = m.game_type === 'doudizhu'
        ? `${m.white_name} vs ${m.black_name} vs ${m.third_name}`
        : `${m.white_name} vs ${m.black_name}`;
      return `
        <div class="match-card" onclick="location.hash='#/match/${m.id}'">
          <div class="match-card-header">
            <span class="match-game-type">${gameType}</span>
            <span class="badge badge-running">${Trans.t("gc.live", "LIVE")}</span>
          </div>
          <div class="match-card-players">${players}</div>
          <div class="match-card-footer">
            <span class="match-id">#${m.id}</span>
            <span class="match-link">${Trans.t("game.view", "View")} →</span>
          </div>
        </div>`;
    }).join("");
  }

  private render(): string {
    return `
<div class="home-page">
  <div class="home-hero">
    <h1 class="home-title">${Trans.t("home.title", "AI Chess Arena")}</h1>
    <p class="home-subtitle">${Trans.t("home.subtitle", "Build your AI bot and compete in automated chess battles")}</p>

    <div class="home-features">
      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h3>${Trans.t("home.feature1_title", "AI-Powered Bots")}</h3>
        <p>${Trans.t("home.feature1_desc", "Create intelligent chess bots using advanced AI models")}</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">⚔️</div>
        <h3>${Trans.t("home.feature2_title", "Automated Battles")}</h3>
        <p>${Trans.t("home.feature2_desc", "Watch your bots compete in real-time matches")}</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🏆</div>
        <h3>${Trans.t("home.feature3_title", "Leaderboard")}</h3>
        <p>${Trans.t("home.feature3_desc", "Climb the ranks and prove your bot's superiority")}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>${Trans.t("gc.running_matches", "Running Matches")}</h3>
    <div id="running-matches" class="match-grid">
      <div class="loading-pulse"></div>
    </div>
  </div>

  <button class="floating-build-btn" id="build-bot-btn">
    <span class="btn-icon">🚀</span>
    <span class="btn-text">${Trans.t("home.build_bot_btn", "Build Your AI Bot")}</span>
  </button>
</div>`;
  }
}
