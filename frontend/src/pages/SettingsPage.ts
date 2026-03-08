// ============================================================
// SettingsPage.ts — API key + preferences.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

export class SettingsPage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    AppLogic.loadSettings();
    AppLogic.loadBalance();
    EventTool.on("settings_loaded", (d) => this.renderSettings(d as Record<string, unknown>));
    EventTool.on("balance_loaded", (d) => this.renderBalance(d as Record<string, unknown>));
    this.container.querySelector("#settings-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      AppLogic.onSaveSettings(e.target as HTMLFormElement);
    });
  }

  unmount(): void {
    EventTool.clear("settings_loaded");
    EventTool.clear("balance_loaded");
  }

  private renderSkeleton(): string {
    return `
<div class="page">
  <h2>${Trans.t("nav.settings", "Settings")}</h2>

  <div class="card mb-2">
    <h3>${Trans.t("balance.label", "Balance")}</h3>
    <div id="balance-display">
      <div class="loading-pulse"></div>
    </div>
    <p class="text-muted mt-1">${Trans.t("balance.info", "Balance is deducted for each AI move. When it reaches $0, your robots are suspended.")}</p>
  </div>

  <div class="card">
    <h3>${Trans.t("settings.api_key", "OpenRouter API Key")}</h3>
    <p class="text-muted">${Trans.t("settings.api_key_info", "Your API key is encrypted and stored securely. Get one at openrouter.ai")}</p>
    <form id="settings-form">
      <div class="form-group">
        <label>${Trans.t("settings.api_key_label", "API Key")}</label>
        <input name="openrouter_key" type="password" placeholder="sk-or-..." autocomplete="off" />
        <small class="text-muted">${Trans.t("settings.api_key_hint", "Leave blank to remove the key")}</small>
      </div>
      <div id="key-status" class="mb-1"></div>
      <button type="submit" class="btn btn-primary">${Trans.t("settings.save", "Save")}</button>
    </form>
  </div>
</div>`;
  }

  private renderSettings(data: Record<string, unknown>): void {
    const el = this.container.querySelector("#key-status");
    if (el) {
      el.innerHTML = data.has_api_key
        ? `<span class="badge badge-success">✓ ${Trans.t("settings.key_set", "API key is set")}</span>`
        : `<span class="badge badge-warn">⚠ ${Trans.t("settings.key_not_set", "No API key set")}</span>`;
    }
  }

  private renderBalance(data: Record<string, unknown>): void {
    const el = this.container.querySelector("#balance-display");
    if (el) {
      el.innerHTML = `<div class="balance-amount">$${Number(data.balance ?? 0).toFixed(6)}</div>`;
    }
  }
}
