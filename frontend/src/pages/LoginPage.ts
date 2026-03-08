// ============================================================
// LoginPage.ts — Login page. Calls AppLogic only.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";

export class LoginPage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.render();
    this.container.querySelector("form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      AppLogic.onLoginSubmit(e.target as HTMLFormElement);
    });
  }

  unmount(): void {}

  private render(): string {
    return `
<div class="page-center">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-icon">🔐</div>
      <h2 class="auth-title">${Trans.t("user.login_title", "Login / 登录")}</h2>
      <p class="auth-subtitle">${Trans.t("user.login_subtitle", "Welcome back to OpenRace")}</p>
    </div>
    <form id="login-form" class="auth-form">
      <div class="form-group">
        <label>${Trans.t("user.username", "Username")}</label>
        <input name="username" required autocomplete="username" placeholder="Enter your username" />
      </div>
      <div class="form-group">
        <label>${Trans.t("user.password", "Password")}</label>
        <input name="password" type="password" required autocomplete="current-password" placeholder="Enter your password" />
      </div>
      <button type="submit" class="btn btn-primary btn-full btn-lg">${Trans.t("user.login_btn", "Login")}</button>
    </form>
    <div class="auth-footer">
      <p class="text-center">
        ${Trans.t("user.no_account", "No account?")}
        <a href="#/register" class="auth-link">${Trans.t("user.register_link", "Register now")}</a>
      </p>
    </div>
  </div>
</div>`;
  }
}
