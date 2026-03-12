// ============================================================
// SettingsPage.ts — Profile info + change password.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";

interface ProfileData {
  id: number;
  username: string;
  email: string;
  role: string;
}

export class SettingsPage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    this.bindForms();
    EventTool.on("profile_loaded", (d) => this.renderProfile(d as ProfileData));
    EventTool.on("password_changed", () => this.onPasswordChanged());
    AppLogic.loadProfile();
  }

  unmount(): void {
    EventTool.clear("profile_loaded");
    EventTool.clear("password_changed");
  }

  private renderSkeleton(): string {
    return `
<div class="page">
  <h2>${Trans.t("nav.settings", "设置")}</h2>

  <div class="card" style="margin-bottom:1.5rem;">
    <h3>${Trans.t("settings.profile", "个人信息")}</h3>
    <div id="profile-info"><div class="loading-pulse"></div></div>
  </div>

  <div class="card">
    <h3>${Trans.t("settings.change_password", "修改密码")}</h3>
    <form id="password-form" autocomplete="off">
      <div class="form-group">
        <label>${Trans.t("settings.old_password", "当前密码")}</label>
        <input name="old_password" type="password" required autocomplete="current-password" />
      </div>
      <div class="form-group">
        <label>${Trans.t("settings.new_password", "新密码")}</label>
        <input name="new_password" type="password" required minlength="6" autocomplete="new-password" />
        <small class="text-muted">${Trans.t("settings.password_hint", "至少6位")}</small>
      </div>
      <button type="submit" class="btn btn-primary" id="pw-btn">
        ${Trans.t("settings.save_password", "保存密码")}
      </button>
    </form>
  </div>
</div>`;
  }

  private bindForms(): void {
    this.container.querySelector("#password-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = this.container.querySelector<HTMLButtonElement>("#pw-btn");
      if (btn) btn.disabled = true;
      AppLogic.onChangePassword(e.target as HTMLFormElement);
    });
  }

  private renderProfile(data: ProfileData): void {
    const el = this.container.querySelector("#profile-info");
    if (!el) return;
    el.innerHTML = `
      <table style="border-collapse:collapse;width:100%;max-width:420px;">
        <tr>
          <td style="padding:.5rem 1rem .5rem 0;color:var(--muted);white-space:nowrap;">
            ${Trans.t("user.username", "用户名")}
          </td>
          <td style="padding:.5rem 0;font-weight:600;">${SettingsPage.esc(data.username)}</td>
        </tr>
        <tr>
          <td style="padding:.5rem 1rem .5rem 0;color:var(--muted);white-space:nowrap;">
            ${Trans.t("user.email", "邮箱")}
          </td>
          <td style="padding:.5rem 0;">${SettingsPage.esc(data.email)}</td>
        </tr>
      </table>`;
  }

  private onPasswordChanged(): void {
    const form = this.container.querySelector<HTMLFormElement>("#password-form");
    const btn = this.container.querySelector<HTMLButtonElement>("#pw-btn");
    if (form) form.reset();
    if (btn) btn.disabled = false;
  }

  private static esc(s: string): string {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
