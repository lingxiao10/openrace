// ============================================================
// AppLogic.ts — FRONTEND LOGIC INDEX
//
// RULES:
//   1. NO local variables
//   2. NO business logic (no DOM, no fetch, no storage directly)
//   3. ONLY method calls between core classes, tools, and pages
//   4. Every public method = one user action or one data load
//   5. All pages call THIS file only
// ============================================================

import { Comm } from "./core/Comm";
import { Config } from "./core/Config";
import { Trans } from "./core/Trans";
import { ActionExecutor } from "./core/Action";
import { Router } from "./core/Router";
import { HttpTool } from "./tools/HttpTool";
import { StorageTool } from "./tools/StorageTool";
import { EventTool } from "./tools/EventTool";
import { Toast } from "./ui/Toast";
import { LogCenter } from "./log/LogCenter";

export class AppLogic {

  // ----------------------------------------------------------------
  // BOOTSTRAP
  // ----------------------------------------------------------------

  static async boot(): Promise<void> {
    AppLogic.setupHttp();
    Toast.init();
    ActionExecutor.registerBuiltins();
    AppLogic.registerCustomActions();
    Trans.init(AppLogic.getStoredLang()); // 立即用本地翻译初始化，无需等待后端
    await AppLogic.loadInit();
  }

  // ----------------------------------------------------------------
  // INIT
  // ----------------------------------------------------------------

  static async loadInit(): Promise<void> {
    await Comm.get(
      `/api/init?lang=${AppLogic.getStoredLang()}`,
      AppLogic.handleInitResponse
    );
  }

  // ----------------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------------

  static async onLoginSubmit(form: HTMLFormElement): Promise<void> {
    await Comm.post(
      "/api/user/login",
      AppLogic.formToObject(form),
      AppLogic.handleLoginSuccess,
      AppLogic.handleApiError
    );
  }

  static async onRegisterSubmit(form: HTMLFormElement): Promise<void> {
    await Comm.post(
      "/api/user/register",
      AppLogic.formToObject(form),
      AppLogic.handleRegisterSuccess,
      AppLogic.handleApiError
    );
  }

  static async onSendVerificationCode(container: HTMLElement): Promise<void> {
    const emailInput = container.querySelector<HTMLInputElement>("input[name='email']");
    const btn = container.querySelector<HTMLButtonElement>("#send-code-btn");
    if (!emailInput || !btn) return;
    AppLogic.setSendCodeBtnLoading(btn, true);
    await Comm.post(
      "/api/user/send-code",
      { email: emailInput.value },
      () => { AppLogic.handleSendCodeSuccess(btn); },
      (res: { message: string }) => { AppLogic.handleSendCodeError(btn, res); }
    );
  }

  static onLogout(): void {
    AppLogic.clearSession();
    Router.navigate("/login");
  }

  static async onSwitchLang(lang: string): Promise<void> {
    StorageTool.set("lang", lang);
    Trans.switch(lang); // 立即生效，触发 lang_changed 事件，无需 API 调用
  }

  // ----------------------------------------------------------------
  // DASHBOARD
  // ----------------------------------------------------------------

  static async loadGameCenter(): Promise<void> {
    await Comm.get("/api/stats", AppLogic.handleStatsLoaded);
    await Comm.get("/api/stats/ticks", AppLogic.handleTicksLoaded);
  }

  static async loadDashboard(): Promise<void> {
    await Comm.get("/api/user/profile", AppLogic.handleProfileForDashboard);
    await Comm.get("/api/robot", AppLogic.handleRobotsForDashboard);
    await Comm.get("/api/match", AppLogic.handleMatchesForDashboard);
  }

  // ----------------------------------------------------------------
  // ROBOT
  // ----------------------------------------------------------------

  static async loadRobots(): Promise<void> {
    await Comm.get("/api/robot", AppLogic.handleRobotsLoaded);
  }

  static async onCreateRobot(form: HTMLFormElement): Promise<void> {
    EventTool.emit("robot_create_start");
    await Comm.post(
      "/api/robot",
      AppLogic.formToObject(form),
      (res) => {
        AppLogic.handleRobotCreated(res);
        EventTool.emit("robot_create_success");
      },
      (res) => {
        AppLogic.handleApiError(res);
        EventTool.emit("robot_create_error");
      }
    );
  }

  static async onDeleteRobot(id: number): Promise<void> {
    if (!confirm(Trans.t("robot.confirm_delete", "Delete this robot?"))) return;
    await Comm.delete(
      `/api/robot/${id}`,
      AppLogic.handleRobotDeleted,
      AppLogic.handleApiError
    );
  }

  static async onActivateRobot(id: number): Promise<void> {
    await Comm.post(`/api/robot/${id}/activate`, {}, AppLogic.handleRobotActivated, AppLogic.handleApiError);
  }

  static async onSuspendRobot(id: number): Promise<void> {
    await Comm.put(
      `/api/robot/${id}`,
      { status: "suspended" },
      AppLogic.handleRobotUpdated,
      AppLogic.handleApiError
    );
  }

  // ----------------------------------------------------------------
  // MATCH
  // ----------------------------------------------------------------

  static async loadRecentMatches(): Promise<void> {
    await Comm.get("/api/match", AppLogic.handleMatchesLoaded);
  }

  static async loadMyMatches(): Promise<void> {
    await Comm.get("/api/match/my", AppLogic.handleMatchesLoaded);
  }

  static async loadMatch(id: number): Promise<void> {
    await Comm.get(`/api/match/${id}`, AppLogic.handleMatchLoaded);
  }

  static async loadMatchMoves(id: number): Promise<void> {
    await Comm.get(`/api/match/${id}/moves`, AppLogic.handleMatchMovesLoaded);
  }

  // ----------------------------------------------------------------
  // LEADERBOARD (public API, no auth required)
  // ----------------------------------------------------------------

  static async loadLeaderboard(): Promise<void> {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.code === 0) {
        AppLogic.handleLeaderboardLoaded(data);
      }
    } catch (err) {
      LogCenter.error("AppLogic", "Failed to load leaderboard", err);
    }
  }

  // ----------------------------------------------------------------
  // ADMIN
  // ----------------------------------------------------------------

  static async loadAdminUsers(page: number): Promise<void> {
    await Comm.get(`/api/admin/users?page=${page}`, AppLogic.handleAdminUsersLoaded);
  }

  static async loadAdminRobots(page: number): Promise<void> {
    await Comm.get(`/api/admin/robots?page=${page}`, AppLogic.handleAdminRobotsLoaded);
  }

  // ----------------------------------------------------------------
  // BALANCE & SETTINGS
  // ----------------------------------------------------------------

  static async loadLogs(level?: string): Promise<void> {
    await Comm.get(`/api/logs${level ? `?level=${level}` : ""}`, AppLogic.handleLogsLoaded);
  }

  static async loadBalance(): Promise<void> {
    await Comm.get("/api/balance", AppLogic.handleBalanceLoaded);
  }

  static async loadSettings(): Promise<void> {
    await Comm.get("/api/settings", AppLogic.handleSettingsLoaded);
  }

  static async onSaveSettings(form: HTMLFormElement): Promise<void> {
    await Comm.post(
      "/api/settings",
      AppLogic.formToObject(form),
      AppLogic.handleSettingsSaved,
      AppLogic.handleApiError
    );
  }

  // ----------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------

  private static setupHttp(): void {
    HttpTool.setBaseUrl(AppLogic.getApiBase());
    AppLogic.applyStoredToken();
  }

  private static applyStoredToken(): void {
    if (AppLogic.getStoredToken()) {
      HttpTool.setHeader("Authorization", `Bearer ${AppLogic.getStoredToken()}`);
    }
  }

  private static handleInitResponse(res: { data: Record<string, unknown> | null }): void {
    Config.load(res.data as Parameters<typeof Config.load>[0]);
    AppLogic.applyTransFromResponse(res.data);
    AppLogic.syncLangSelect();
    EventTool.emit("app_ready");
    LogCenter.info("AppLogic", "App initialized");
  }

  private static syncLangSelect(): void {
    const el = document.getElementById("lang-select") as HTMLSelectElement | null;
    if (el) el.value = AppLogic.getStoredLang();
  }

  private static applyTransFromResponse(data: Record<string, unknown> | null): void {
    const map = AppLogic.extractTransMap(data);
    if (map) Trans.load(map, AppLogic.getStoredLang());
  }

  private static extractTransMap(data: Record<string, unknown> | null): Record<string, string> | null {
    return (data?.trans_map as Record<string, string>) ?? null;
  }

  private static handleLoginSuccess(res: { data: Record<string, unknown> | null }): void {
    const data = res.data as Record<string, any>;
    AppLogic.saveToken(data?.token);
    AppLogic.saveUserId(data?.user?.id);
    AppLogic.saveIsAdmin(Boolean(data?.is_admin));
    AppLogic.applyStoredToken();
    Toast.success(Trans.t("user.login_success", "Login successful"));
    document.dispatchEvent(new CustomEvent("user_logged_in"));
    Router.navigate("/dashboard");
  }

  private static handleRegisterSuccess(_res: unknown): void {
    Toast.success(Trans.t("user.register_success", "Registered!"));
    Router.navigate("/login");
  }

  private static handleApiError(res: { message: string }): void {
    Toast.error(res.message);
  }

  private static handleSendCodeSuccess(btn: HTMLButtonElement): void {
    Toast.success(Trans.t("user.code_sent", "验证码已发送"));
    AppLogic.setSendCodeBtnLoading(btn, false);
  }

  private static handleSendCodeError(btn: HTMLButtonElement, res: { message: string }): void {
    Toast.error(res.message);
    AppLogic.setSendCodeBtnLoading(btn, false);
  }

  private static setSendCodeBtnLoading(btn: HTMLButtonElement, loading: boolean): void {
    btn.disabled = loading;
    btn.textContent = loading
      ? Trans.t("user.sending", "发送中...")
      : Trans.t("user.send_code", "发送验证码");
  }

  private static handleProfileForDashboard(res: { data: unknown }): void {
    EventTool.emit("dashboard_user_loaded", res.data);
    AppLogic.mergeDashboardData("user", res.data);
  }

  private static handleRobotsForDashboard(res: { data: unknown }): void {
    AppLogic.mergeDashboardData("robots", res.data);
  }

  private static handleMatchesForDashboard(res: { data: unknown }): void {
    AppLogic.mergeDashboardData("matches", res.data);
  }

  private static _dashboardBuffer: Record<string, unknown> = {};

  private static mergeDashboardData(key: string, value: unknown): void {
    AppLogic._dashboardBuffer[key] = value;
    if (AppLogic._dashboardBuffer.user && AppLogic._dashboardBuffer.robots && AppLogic._dashboardBuffer.matches) {
      EventTool.emit("dashboard_loaded", { ...AppLogic._dashboardBuffer });
      AppLogic._dashboardBuffer = {};
    }
  }

  private static handleRobotsLoaded(res: { data: unknown }): void {
    EventTool.emit("robots_loaded", res.data);
  }

  private static handleRobotCreated(_res: unknown): void {
    AppLogic.loadRobots();
  }

  private static handleRobotDeleted(_res: unknown): void {
    AppLogic.loadRobots();
  }

  private static handleRobotUpdated(_res: unknown): void {
    AppLogic.loadRobots();
  }

  private static handleRobotActivated(_res: unknown): void {
    AppLogic.loadRobots();
  }

  private static handleMatchesLoaded(res: { data: unknown }): void {
    EventTool.emit("matches_loaded", res.data);
  }

  private static handleMatchLoaded(res: { data: unknown }): void {
    EventTool.emit("match_loaded", res.data);
  }

  private static handleMatchMovesLoaded(res: { data: unknown }): void {
    EventTool.emit("match_moves_loaded", res.data);
  }

  private static handleLeaderboardLoaded(res: { data: unknown }): void {
    EventTool.emit("leaderboard_loaded", res.data);
  }

  private static handleStatsLoaded(res: { data: unknown }): void {
    EventTool.emit("stats_loaded", res.data);
  }

  private static handleTicksLoaded(res: { data: unknown }): void {
    EventTool.emit("ticks_loaded", res.data);
  }

  private static handleLogsLoaded(res: { data: unknown }): void {
    EventTool.emit("logs_loaded", res.data);
  }

  private static handleAdminUsersLoaded(res: { data: unknown }): void {
    EventTool.emit("admin_users_loaded", res.data);
  }

  private static handleAdminRobotsLoaded(res: { data: unknown }): void {
    EventTool.emit("admin_robots_loaded", res.data);
  }

  private static handleBalanceLoaded(res: { data: unknown }): void {
    EventTool.emit("balance_loaded", res.data);
  }

  private static handleSettingsLoaded(res: { data: unknown }): void {
    EventTool.emit("settings_loaded", res.data);
  }

  private static handleSettingsSaved(_res: unknown): void {
    AppLogic.loadSettings();
  }

  private static clearSession(): void {
    StorageTool.remove("token");
    StorageTool.remove("user_id");
    StorageTool.remove("is_admin");
    HttpTool.removeHeader("Authorization");
  }

  private static saveToken(token: string): void {
    StorageTool.set("token", token);
  }

  private static saveUserId(userId: number): void {
    StorageTool.set("user_id", String(userId));
  }

  private static saveIsAdmin(isAdmin: boolean): void {
    StorageTool.set("is_admin", isAdmin ? "1" : "0");
  }

  static isAdmin(): boolean {
    return StorageTool.get<string>("is_admin") === "1";
  }

  static getUserId(): number | null {
    const id = StorageTool.get<string>("user_id");
    return id ? Number(id) : null;
  }

  private static getStoredToken(): string {
    return StorageTool.get<string>("token") ?? "";
  }

  private static getStoredLang(): string {
    const stored = StorageTool.get<string>("lang");
    if (stored) return stored;

    // 自动检测浏览器语言
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) return "zh";
    if (browserLang.startsWith("en")) return "en";
    return "zh"; // 默认中文
  }

  private static getApiBase(): string {
    // Use empty string to use vite proxy (dev) or same origin (prod)
    return "";
  }

  private static formToObject(form: HTMLFormElement): Record<string, string> {
    const result: Record<string, string> = {};
    new FormData(form).forEach((v, k) => { result[k] = v as string; });
    return result;
  }

  private static registerCustomActions(): void {
    ActionExecutor.register("navigate", (p) => Router.navigate(p.path as string));
    ActionExecutor.register("success", (p) => Toast.success(p.message as string));
    ActionExecutor.register("alert", (p) => Toast.info(p.message as string));
    ActionExecutor.register("syn_trans", (p) => {
      Trans.load(p.trans_map as Record<string, string>, AppLogic.getStoredLang());
    });
    ActionExecutor.register("syn_config", (p) => {
      Config.load(p.config_map as Parameters<typeof Config.load>[0]);
    });
  }
}
