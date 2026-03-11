// ============================================================
// RegisterPage.ts — Register page. Calls AppLogic only.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { Config } from "../core/Config";

export class RegisterPage {
  private container!: HTMLElement;

  mount(container: HTMLElement): void {
    this.container = container;
    this.container.innerHTML = this.render();
    this.container.querySelector("form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      AppLogic.onRegisterSubmit(e.target as HTMLFormElement);
    });
    if (Config.get("need_check_email")) {
      this.container.querySelector("#send-code-btn")?.addEventListener("click", () => {
        AppLogic.onSendVerificationCode(this.container);
      });
    }
  }

  unmount(): void {}

  private render(): string {
    const needCheckEmail = Config.get("need_check_email") as boolean;
    return `
<div class="page-center">
  <div class="auth-card">
    <div class="auth-header">
      <div class="auth-icon">🚀</div>
      <h2 class="auth-title">${Trans.t("user.register_title", "Register / 注册")}</h2>
      <p class="auth-subtitle">${Trans.t("user.register_subtitle", "Create your OpenRace account")}</p>
    </div>
    <form id="register-form" class="auth-form">
      <div class="form-group">
        <label>${Trans.t("user.username", "Username")} <small class="text-muted">(min 3 chars)</small></label>
        <input name="username" required minlength="3" autocomplete="username" placeholder="Choose a username" />
      </div>
      <div class="form-group">
        <label>${Trans.t("user.email", "Email")}</label>
        <div style="display:flex;gap:8px;">
          <input name="email" type="email" required autocomplete="email" placeholder="your@email.com" style="flex:1;" />
          ${needCheckEmail ? `<button type="button" id="send-code-btn" class="btn btn-secondary" style="white-space:nowrap;">${Trans.t("user.send_code", "发送验证码")}</button>` : ""}
        </div>
      </div>
      ${needCheckEmail ? `
      <div class="form-group">
        <label>${Trans.t("user.code_label", "验证码")}</label>
        <input name="verification_code" required maxlength="6" placeholder="${Trans.t("user.code_placeholder", "请输入6位验证码")}" autocomplete="one-time-code" />
      </div>` : ""}
      <div class="form-group">
        <label>${Trans.t("user.password", "Password")} <small class="text-muted">(min 6 chars)</small></label>
        <input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Create a password" />
      </div>
      <button type="submit" class="btn btn-primary btn-full btn-lg">${Trans.t("user.register_btn", "Register")}</button>
    </form>
    <div class="auth-footer">
      <p class="text-center">
        ${Trans.t("user.have_account", "Have an account?")}
        <a href="#/login" class="auth-link">${Trans.t("user.login_link", "Login here")}</a>
      </p>
    </div>
  </div>
</div>`;
  }
}
