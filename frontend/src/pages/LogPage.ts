// ============================================================
// LogPage.ts — Live log viewer. Auto-refreshes every 10s.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  tag: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

export class LogPage {
  private container!: HTMLElement;
  private timer: ReturnType<typeof setInterval> | null = null;
  private currentLevel = "";

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    this.bindControls();
    EventTool.on("logs_loaded", (data) => this.renderLogs(data as LogEntry[]));
    AppLogic.loadLogs();
    this.timer = setInterval(() => AppLogic.loadLogs(this.currentLevel || undefined), 10000);
  }

  unmount(): void {
    if (this.timer) clearInterval(this.timer);
    EventTool.clear("logs_loaded");
  }

  private renderSkeleton(): string {
    return `
<div class="page">
  <h2>${Trans.t("log.title", "System Logs")}</h2>
  <div class="log-toolbar">
    <select id="log-level-filter">
      <option value="">${Trans.t("log.all", "All Levels")}</option>
      <option value="debug">debug</option>
      <option value="info">info</option>
      <option value="warn">warn</option>
      <option value="error">error</option>
    </select>
    <button class="btn btn-sm btn-outline" id="log-refresh">${Trans.t("log.refresh", "Refresh")}</button>
    <span class="log-auto-label text-muted">${Trans.t("log.auto_refresh", "Auto-refresh every 10s")}</span>
  </div>
  <div id="log-list" class="log-list"><div class="loading-pulse"></div></div>
</div>`;
  }

  private bindControls(): void {
    this.container.querySelector("#log-level-filter")?.addEventListener("change", (e) => {
      this.currentLevel = (e.target as HTMLSelectElement).value;
      AppLogic.loadLogs(this.currentLevel || undefined);
    });
    this.container.querySelector("#log-refresh")?.addEventListener("click", () => {
      AppLogic.loadLogs(this.currentLevel || undefined);
    });
  }

  private renderLogs(logs: LogEntry[]): void {
    const el = this.container.querySelector("#log-list");
    if (!el) return;
    if (!logs.length) {
      el.innerHTML = `<p class="text-muted">${Trans.t("log.empty", "No logs yet.")}</p>`;
      return;
    }
    el.innerHTML = [...logs].reverse().map((entry) => `
      <div class="log-row log-${entry.level}">
        <span class="log-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
        <span class="log-level-badge log-badge-${entry.level}">${entry.level}</span>
        <span class="log-tag">[${entry.tag}]</span>
        <span class="log-msg">${LogPage.escapeHtml(entry.message)}</span>
        ${entry.data ? `<span class="log-data">${LogPage.escapeHtml(JSON.stringify(entry.data))}</span>` : ""}
      </div>`).join("");
  }

  private static escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
