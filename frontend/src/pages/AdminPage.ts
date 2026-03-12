// ============================================================
// AdminPage.ts — Admin-only data management page.
// Only accessible when logged in as lingxiao16@126.com.
// ============================================================

import { AppLogic } from "../AppLogic";
import { Trans } from "../core/Trans";
import { EventTool } from "../tools/EventTool";
import { Router } from "../core/Router";

interface UserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface RobotRow {
  id: number;
  user_id: number;
  username: string;
  name: string;
  model: string;
  game_type: string;
  status: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  created_at: string;
}

interface PagedResult<T> {
  rows: T[];
  total: number;
}

export class AdminPage {
  private container!: HTMLElement;
  private currentTab: "users" | "robots" = "users";
  private usersPage = 1;
  private robotsPage = 1;

  mount(container: HTMLElement): void {
    if (!AppLogic.isAdmin()) {
      Router.navigate("/");
      return;
    }
    this.container = container;
    this.container.innerHTML = this.renderSkeleton();
    this.bindTabs();
    EventTool.on("admin_users_loaded", (data) => this.renderUsers(data as PagedResult<UserRow>));
    EventTool.on("admin_robots_loaded", (data) => this.renderRobots(data as PagedResult<RobotRow>));
    AppLogic.loadAdminUsers(this.usersPage);
  }

  unmount(): void {
    EventTool.clear("admin_users_loaded");
    EventTool.clear("admin_robots_loaded");
  }

  private renderSkeleton(): string {
    return `
<div class="page">
  <h2>${Trans.t("admin.title", "数据管理")}</h2>
  <div class="tab-bar" style="margin-bottom:1.5rem;display:flex;gap:.5rem;">
    <button class="btn btn-sm ${this.currentTab === "users" ? "btn-primary" : "btn-outline"}" id="tab-users">
      ${Trans.t("admin.tab_users", "注册用户")}
    </button>
    <button class="btn btn-sm ${this.currentTab === "robots" ? "btn-primary" : "btn-outline"}" id="tab-robots">
      ${Trans.t("admin.tab_robots", "机器人")}
    </button>
  </div>
  <div id="admin-content"><div class="loading-pulse"></div></div>
</div>`;
  }

  private bindTabs(): void {
    this.container.querySelector("#tab-users")?.addEventListener("click", () => {
      if (this.currentTab === "users") return;
      this.currentTab = "users";
      this.usersPage = 1;
      this.refreshTabButtons();
      this.setLoading();
      AppLogic.loadAdminUsers(this.usersPage);
    });
    this.container.querySelector("#tab-robots")?.addEventListener("click", () => {
      if (this.currentTab === "robots") return;
      this.currentTab = "robots";
      this.robotsPage = 1;
      this.refreshTabButtons();
      this.setLoading();
      AppLogic.loadAdminRobots(this.robotsPage);
    });
  }

  private refreshTabButtons(): void {
    const u = this.container.querySelector("#tab-users");
    const r = this.container.querySelector("#tab-robots");
    if (u) {
      u.className = `btn btn-sm ${this.currentTab === "users" ? "btn-primary" : "btn-outline"}`;
    }
    if (r) {
      r.className = `btn btn-sm ${this.currentTab === "robots" ? "btn-primary" : "btn-outline"}`;
    }
  }

  private setLoading(): void {
    const el = this.container.querySelector("#admin-content");
    if (el) el.innerHTML = '<div class="loading-pulse"></div>';
  }

  private renderUsers(data: PagedResult<UserRow>): void {
    const el = this.container.querySelector("#admin-content");
    if (!el) return;
    const totalPages = Math.ceil(data.total / 100) || 1;
    el.innerHTML = `
      <div style="margin-bottom:.75rem;color:var(--muted);">
        ${Trans.t("admin.total_users", "共")} <strong>${data.total}</strong> ${Trans.t("admin.users_unit", "名用户")}
        &nbsp;·&nbsp; ${Trans.t("admin.page", "第")} ${this.usersPage} / ${totalPages} ${Trans.t("admin.page_unit", "页")}
      </div>
      <div style="overflow-x:auto;">
      <table class="table">
        <thead><tr>
          <th>ID</th>
          <th>${Trans.t("user.username", "用户名")}</th>
          <th>${Trans.t("user.email", "邮箱")}</th>
          <th>${Trans.t("admin.role", "角色")}</th>
          <th>${Trans.t("admin.created_at", "注册时间")}</th>
        </tr></thead>
        <tbody>
          ${data.rows.map((u) => `
            <tr>
              <td>${u.id}</td>
              <td>${AdminPage.esc(u.username)}</td>
              <td>${AdminPage.esc(u.email)}</td>
              <td>${AdminPage.esc(u.role)}</td>
              <td>${new Date(u.created_at).toLocaleString()}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      </div>
      ${this.renderPagination(this.usersPage, totalPages, "users")}`;
    this.bindPagination("users");
  }

  private renderRobots(data: PagedResult<RobotRow>): void {
    const el = this.container.querySelector("#admin-content");
    if (!el) return;
    const totalPages = Math.ceil(data.total / 100) || 1;
    el.innerHTML = `
      <div style="margin-bottom:.75rem;color:var(--muted);">
        ${Trans.t("admin.total_robots", "共")} <strong>${data.total}</strong> ${Trans.t("admin.robots_unit", "个机器人")}
        &nbsp;·&nbsp; ${Trans.t("admin.page", "第")} ${this.robotsPage} / ${totalPages} ${Trans.t("admin.page_unit", "页")}
      </div>
      <div style="overflow-x:auto;">
      <table class="table">
        <thead><tr>
          <th>ID</th>
          <th>${Trans.t("admin.owner", "所有者")}</th>
          <th>${Trans.t("admin.robot_name", "机器人名")}</th>
          <th>${Trans.t("admin.game_type", "游戏类型")}</th>
          <th>${Trans.t("admin.model", "模型")}</th>
          <th>${Trans.t("admin.status", "状态")}</th>
          <th>${Trans.t("admin.points", "积分")}</th>
          <th>W/L/D</th>
          <th>${Trans.t("admin.created_at", "创建时间")}</th>
        </tr></thead>
        <tbody>
          ${data.rows.map((r) => `
            <tr>
              <td>${r.id}</td>
              <td>${AdminPage.esc(r.username || String(r.user_id))}</td>
              <td>${AdminPage.esc(r.name)}</td>
              <td>${AdminPage.esc(r.game_type)}</td>
              <td style="font-size:.8rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${AdminPage.esc(r.model)}</td>
              <td><span class="badge ${r.status === "active" ? "badge-success" : "badge-warn"}">${AdminPage.esc(r.status)}</span></td>
              <td>${r.points}</td>
              <td>${r.wins}/${r.losses}/${r.draws}</td>
              <td>${new Date(r.created_at).toLocaleString()}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      </div>
      ${this.renderPagination(this.robotsPage, totalPages, "robots")}`;
    this.bindPagination("robots");
  }

  private renderPagination(current: number, total: number, tab: "users" | "robots"): string {
    if (total <= 1) return "";
    return `
      <div style="margin-top:1rem;display:flex;gap:.5rem;align-items:center;">
        <button class="btn btn-sm btn-outline" id="page-prev" ${current <= 1 ? "disabled" : ""}>
          ${Trans.t("admin.prev", "上一页")}
        </button>
        <span style="color:var(--muted);">${current} / ${total}</span>
        <button class="btn btn-sm btn-outline" id="page-next" ${current >= total ? "disabled" : ""}>
          ${Trans.t("admin.next", "下一页")}
        </button>
      </div>`;
  }

  private bindPagination(tab: "users" | "robots"): void {
    this.container.querySelector("#page-prev")?.addEventListener("click", () => {
      if (tab === "users" && this.usersPage > 1) {
        this.usersPage--;
        this.setLoading();
        AppLogic.loadAdminUsers(this.usersPage);
      } else if (tab === "robots" && this.robotsPage > 1) {
        this.robotsPage--;
        this.setLoading();
        AppLogic.loadAdminRobots(this.robotsPage);
      }
    });
    this.container.querySelector("#page-next")?.addEventListener("click", () => {
      if (tab === "users") {
        this.usersPage++;
        this.setLoading();
        AppLogic.loadAdminUsers(this.usersPage);
      } else if (tab === "robots") {
        this.robotsPage++;
        this.setLoading();
        AppLogic.loadAdminRobots(this.robotsPage);
      }
    });
  }

  private static esc(s: string): string {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
