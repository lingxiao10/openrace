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

  <div class="card mb-2">
    <h3>${Trans.t("settings.profile", "个人信息")}</h3>
    <div id="profile-info">
      <div class="loading-pulse" style="height:20px;width:80px;margin-bottom:.5rem;"></div>
      <div class="loading-pulse" style="height:14px;width:160px;margin-bottom:1rem;"></div>
      <div class="loading-pulse" style="height:80px;"></div>
    </div>
  </div>

  <div class="card">
    <h3>${Trans.t("settings.change_password", "修改密码")}</h3>
    <form id="password-form" class="settings-form" autocomplete="off">
      <div class="form-group">
        <label>${Trans.t("settings.old_password", "当前密码")}</label>
        <input name="old_password" type="password" required autocomplete="current-password" />
      </div>
      <div class="form-group">
        <label>${Trans.t("settings.new_password", "新密码")}</label>
        <input name="new_password" type="password" required minlength="6" autocomplete="new-password" />
        <small>${Trans.t("settings.password_hint", "至少6位")}</small>
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
    const isAdmin = data.role === "admin";
    const initial = (data.username || "?")[0].toUpperCase();

    const infoEl = this.container.querySelector("#profile-info");
    if (!infoEl) return;

    infoEl.innerHTML = `
      <div class="settings-avatar">${initial}</div>
      <div class="settings-name">
        ${SettingsPage.esc(data.username)}
        ${isAdmin ? `<span class="badge badge-info ml-1">Admin</span>` : ""}
      </div>
      <div class="settings-email">${SettingsPage.esc(data.email)}</div>
      <table class="settings-table">
        <tr>
          <td class="st-label">${Trans.t("user.username", "用户名")}</td>
          <td class="st-value">${SettingsPage.esc(data.username)}</td>
        </tr>
        <tr>
          <td class="st-label">${Trans.t("user.email", "邮箱")}</td>
          <td class="st-value">${SettingsPage.esc(data.email)}</td>
        </tr>
        <tr>
          <td class="st-label">${Trans.t("user.role", "角色")}</td>
          <td class="st-value">${isAdmin ? Trans.t("user.role_admin", "管理员") : Trans.t("user.role_user", "普通用户")}</td>
        </tr>
        <tr>
          <td class="st-label">ID</td>
          <td class="st-value">${SettingsPage.esc(String(data.id))}</td>
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
