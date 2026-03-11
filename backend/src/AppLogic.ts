// ============================================================
// AppLogic.ts — BACKEND LOGIC INDEX
//
// RULES (enforced by convention):
//   1. NO local variables (no `const x = ...`, no `let y = ...`)
//   2. NO concrete business logic (no SQL, no crypto, no HTTP)
//   3. ONLY method calls between services, tools, and core classes
//   4. Every public method here is the single entry point for one use-case
//   5. All controllers, routes, and tests call THIS file — never services directly
// ============================================================

import { Request } from "express";
import { Action } from "./core/Action";
import { Response, StandardResponse } from "./core/Response";
import { Trans } from "./core/Trans";
import { AuthTool } from "./tools/AuthTool";
import { EncryptTool } from "./tools/EncryptTool";
import { OpenRouterTool } from "./tools/OpenRouterTool";
import { LogCenter } from "./log/LogCenter";
import { VerificationCodeTool } from "./tools/VerificationCodeTool";
import { EmailTool } from "./tools/EmailTool";
import { UserService } from "./services/UserService";
import { RobotService } from "./services/RobotService";
import { MatchService } from "./services/MatchService";
import { GameService } from "./services/GameService";
import { LeaderboardService } from "./services/LeaderboardService";
import { BalanceService } from "./services/BalanceService";
import { SettingsService } from "./services/SettingsService";
import { StatsService } from "./services/StatsService";
import config from "./config/config";
import { PROVIDERS } from "./config/providers";

export class AppLogic {

  // ----------------------------------------------------------------
  // INIT
  // ----------------------------------------------------------------

  static handleInit(lang?: string): StandardResponse<unknown> {
    AppLogic.applyLang(lang);
    AppLogic.pushSyncTrans(lang ?? config.app.defaultLang);
    AppLogic.pushSyncConfig();
    AppLogic.pushProviders();
    return Response.success(AppLogic.buildInitPayload(lang));
  }

  // ----------------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------------

  static async handleUserLogin(body: Record<string, string>): Promise<StandardResponse<unknown>> {
    if (!AppLogic.validateLoginParams(body)) return Response.paramError();
    const result = await UserService.login(body.username, body.password);
    if (!result) return Response.error(401, "user.wrong_password");
    AppLogic.pushLoginActions();
    LogCenter.info("AppLogic", `User login: ${result.user.username}`);
    return Response.success(result, "user.login_success");
  }

  static async handleUserRegister(body: Record<string, string>): Promise<StandardResponse<unknown>> {
    if (!AppLogic.validateRegisterParams(body)) return Response.paramError();
    if (!UserService.isValidEmail(body.email)) return Response.error(400, "user.invalid_email");
    if (await UserService.findByUsername(body.username)) return Response.error(409, "user.already_exists");
    if (await UserService.findByEmail(body.email)) return Response.error(409, "user.email_exists");
    if (config.needCheckEmail) {
      if (!body.verification_code) return Response.error(400, "user.code_required");
      if (!VerificationCodeTool.verify(body.email, body.verification_code))
        return Response.error(400, "user.code_invalid");
    }
    await UserService.create(body.username, body.password, body.email);
    AppLogic.pushRegisterActions();
    return Response.success(null, "user.register_success");
  }

  static async handleSendVerificationCode(body: Record<string, string>): Promise<StandardResponse<unknown>> {
    if (!body.email) return Response.paramError();
    if (!UserService.isValidEmail(body.email)) return Response.error(400, "user.invalid_email");
    if (await UserService.findByEmail(body.email)) return Response.error(409, "user.email_exists");
    const code = VerificationCodeTool.generate(body.email);
    await EmailTool.sendVerificationCode(body.email, code);
    return Response.success(null, "user.code_sent");
  }

  static async handleGetProfile(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    const user = await UserService.findById(AppLogic.extractUserId(req)!);
    if (!user) return Response.notFound();
    return Response.success(UserService.toPublic(user));
  }

  // ----------------------------------------------------------------
  // ROBOT
  // ----------------------------------------------------------------

  static async handleCreateRobot(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    if (!AppLogic.validateRobotParams(req.body)) return Response.paramError();
    if (!RobotService.canCreate(await RobotService.countByUser(AppLogic.extractUserId(req)!)))
      return Response.error(409, "robot.limit_reached");

    // 检查昵称是否重复
    if (await RobotService.checkNameExists(req.body.name))
      return Response.error(409, "robot.name_exists");

    // 验证provider和api_key
    if (!req.body.provider || !req.body.api_key) {
      return Response.error(400, "robot.provider_required");
    }

    // 测试API是否可用
    const testResult = await AppLogic.testRobotApi(req.body.api_key, req.body.model, req.body.provider, req.body.base_url);
    if (!testResult.success) {
      return Response.error(400, testResult.error || "robot.api_test_failed");
    }

    const gameType = req.body.game_type === "doudizhu" ? "doudizhu" : "chess";

    // 加密API密钥
    const apiKeyEncrypted = EncryptTool.encrypt(req.body.api_key);

    await RobotService.create(
      AppLogic.extractUserId(req)!,
      req.body.name,
      req.body.model ?? config.game.defaultModel,
      req.body.strategy ?? null,
      gameType,
      req.body.provider,
      apiKeyEncrypted,
      req.body.base_url ?? null
    );
    Action.success(Trans.t("robot.created"));
    Action.navigate("/robots");
    return Response.success(null, "robot.created");
  }

  static async handleGetRobots(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    const robots = await RobotService.findByUser(AppLogic.extractUserId(req)!);
    const busyRobotIds = await MatchService.getBusyRobotIds();

    // Add today's match count for each robot, remove encrypted API key
    const robotsWithStats = await Promise.all(
      robots.map(async (robot) => {
        const { api_key_encrypted, ...robotData } = robot;
        return {
          ...robotData,
          today_matches: await RobotService.getTodayMatchCount(robot.id),
          max_daily_matches: config.game.maxMatchesPerRobotPerDay,
          in_game: busyRobotIds.has(robot.id),
        };
      })
    );

    return Response.success(robotsWithStats);
  }

  static async handleUpdateRobot(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    if (!await RobotService.update(
      Number(req.params.id),
      AppLogic.extractUserId(req)!,
      AppLogic.pickRobotFields(req.body)
    )) return Response.error(403, "robot.forbidden");
    Action.success(Trans.t("robot.updated"));
    return Response.success(null, "robot.updated");
  }

  static async handleDeleteRobot(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    if (!await RobotService.delete(Number(req.params.id), AppLogic.extractUserId(req)!))
      return Response.error(403, "robot.forbidden");
    Action.success(Trans.t("robot.deleted"));
    return Response.success(null, "robot.deleted");
  }

  static async handleActivateRobot(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    const robot = await RobotService.findById(Number(req.params.id));
    if (!robot || robot.user_id !== AppLogic.extractUserId(req)) return Response.error(403, "robot.forbidden");

    // 测试API是否可用
    if (robot.api_key_encrypted && robot.provider) {
      const apiKey = EncryptTool.decrypt(robot.api_key_encrypted);
      const testResult = await AppLogic.testRobotApi(apiKey, robot.model, robot.provider, robot.base_url ?? undefined);
      if (!testResult.success) {
        return Response.error(400, testResult.error || "robot.api_test_failed");
      }
    }

    await RobotService.activate(robot.id);
    await RobotService.resetErrorCount(robot.id);
    Action.success(Trans.t("robot.activated"));
    return Response.success(null, "robot.activated");
  }

  private static async testRobotApi(apiKey: string, model: string, provider: string, baseUrl?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const messages = [
        { role: "system" as const, content: "You are a test assistant." },
        { role: "user" as const, content: "请直接输出数字：1" }
      ];
      const result = await OpenRouterTool.callChat(apiKey, model, messages, 10000, baseUrl);
      if (!result || !result.content || result.content.trim().length === 0) {
        return { success: false, error: "robot.api_no_response" };
      }
      LogCenter.info("AppLogic", `API test passed for provider ${provider}, model ${model}`);
      return { success: true };
    } catch (err: any) {
      LogCenter.error("AppLogic", `API test failed: ${err.message}`);
      if (err.message.includes("quota") || err.message.includes("insufficient") || err.message.includes("balance")) {
        return { success: false, error: "robot.api_quota_error" };
      }
      if (err.message.includes("401") || err.message.includes("403") || err.message.includes("invalid")) {
        return { success: false, error: "robot.api_invalid_key" };
      }
      return { success: false, error: "robot.api_test_failed" };
    }
  }

  // ----------------------------------------------------------------
  // MATCH / GAME
  // ----------------------------------------------------------------

  static async handleGetRecentMatches(_req: Request): Promise<StandardResponse<unknown>> {
    return Response.success(await MatchService.getRecentMatches(30));
  }

  static async handleGetMyMatches(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    const robots = await RobotService.findByUser(AppLogic.extractUserId(req)!);
    if (!robots.length) return Response.success([]);
    return Response.success(await MatchService.getMatchesByRobot(robots[0].id));
  }

  static async handleGetMatch(req: Request): Promise<StandardResponse<unknown>> {
    const match = await MatchService.getMatch(Number(req.params.id));
    if (!match) return Response.notFound();
    return Response.success(match);
  }

  static async handleGetMatchMoves(req: Request): Promise<StandardResponse<unknown>> {
    return Response.success(await MatchService.getMoves(Number(req.params.id)));
  }

  // ----------------------------------------------------------------
  // LEADERBOARD
  // ----------------------------------------------------------------

  static async handleGetLeaderboard(_req: Request): Promise<StandardResponse<unknown>> {
    return Response.success({
      allTime: await LeaderboardService.getAllTimeLeaderboard(),
      weekly: await LeaderboardService.getWeeklyLeaderboard(),
      daily: await LeaderboardService.getDailyLeaderboard(),
    });
  }

  // ----------------------------------------------------------------
  // BALANCE
  // ----------------------------------------------------------------

  static async handleGetBalance(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    return Response.success({ balance: await BalanceService.getBalance(AppLogic.extractUserId(req)!) });
  }

  static async handleGetBalanceLog(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    return Response.success(await BalanceService.getLog(AppLogic.extractUserId(req)!));
  }

  // ----------------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------------

  static async handleGetSettings(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    return Response.success({
      has_api_key: await SettingsService.hasApiKey(AppLogic.extractUserId(req)!),
    });
  }

  static async handleSaveSettings(req: Request): Promise<StandardResponse<unknown>> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    if (req.body.openrouter_key) {
      await SettingsService.setApiKey(AppLogic.extractUserId(req)!, req.body.openrouter_key);
    } else {
      await SettingsService.deleteApiKey(AppLogic.extractUserId(req)!);
    }
    Action.success(Trans.t("settings.saved"));
    return Response.success(null, "settings.saved");
  }

  // ----------------------------------------------------------------
  // STATS / GAME CENTER
  // ----------------------------------------------------------------

  static async handleGetStats(_req: Request): Promise<StandardResponse<unknown>> {
    return Response.success(await StatsService.getPlatformStats());
  }

  static async handleGetTicks(_req: Request): Promise<StandardResponse<unknown>> {
    return Response.success(await StatsService.getEnrichedTicks());
  }

  // ----------------------------------------------------------------
  // LOGS
  // ----------------------------------------------------------------

  static handleGetLogs(req: Request): StandardResponse<unknown> {
    if (!AppLogic.extractUserId(req)) return Response.unauthorized();
    return Response.success(LogCenter.getLogs((req.query.level as string | undefined) as Parameters<typeof LogCenter.getLogs>[0]));
  }

  // ----------------------------------------------------------------
  // SCHEDULER CALLBACKS (called by GameScheduler, not HTTP)
  // ----------------------------------------------------------------

  static async handleMatchmakingTick(): Promise<void> {
    await GameService.cleanupZombieMatches();
    await GameService.pairActiveRobots();
    await GameService.runPendingMatches();
    await AppLogic.checkAndRotateSeason();
  }

  static async handleLeaderboardTick(): Promise<void> {
    await AppLogic.snapshotCurrentSeason();
  }

  // ----------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------

  private static applyLang(lang?: string): void {
    Trans.setLang(lang ?? config.app.defaultLang);
  }

  private static pushSyncTrans(lang: string): void {
    Action.syncTrans(Trans.getMapForLang(lang));
  }

  private static pushSyncConfig(): void {
    Action.syncConfig(AppLogic.buildPublicConfig());
  }

  private static buildInitPayload(lang?: string): Record<string, unknown> {
    return {
      app: config.app.name,
      version: config.app.version,
      lang: lang ?? config.app.defaultLang,
      supported_langs: config.app.supportedLangs,
      available_models: config.game.availableModels,
      default_model: config.game.defaultModel,
      robot_max_per_user: config.game.robotMaxPerUser,
      need_check_email: config.needCheckEmail,
    };
  }

  private static buildPublicConfig(): Record<string, unknown> {
    return {
      app_name: config.app.name,
      version: config.app.version,
      default_lang: config.app.defaultLang,
      supported_langs: config.app.supportedLangs,
      available_models: config.game.availableModels,
      default_model: config.game.defaultModel,
      initial_balance: config.game.initialBalance,
      robot_max_per_user: config.game.robotMaxPerUser,
    };
  }

  private static validateLoginParams(body: Record<string, string>): boolean {
    return Boolean(body.username && body.password);
  }

  private static validateRegisterParams(body: Record<string, string>): boolean {
    return Boolean(body.username && body.password && body.email && body.username.length >= 3);
  }

  private static validateRobotParams(body: Record<string, string>): boolean {
    return Boolean(body.name && body.name.trim().length >= 1);
  }

  private static pickRobotFields(body: Record<string, unknown>): Record<string, unknown> {
    // API信息（provider, model, api_key）不允许修改
    const allowed = ["name", "strategy", "status"] as const;
    return Object.fromEntries(
      allowed.filter((k) => body[k] !== undefined).map((k) => [k, body[k]])
    );
  }

  private static pushLoginActions(): void {
    Action.navigate("/game-center");
  }

  private static pushRegisterActions(): void {
    Action.navigate("/login");
  }

  private static pushProviders(): void {
    Action.syncData("providers", PROVIDERS);
  }

  private static extractToken(req: Request): ReturnType<typeof AuthTool.verifyToken> {
    return AuthTool.verifyToken((req.headers.authorization ?? "").replace("Bearer ", ""));
  }

  private static extractUserId(req: Request): number | null {
    return AppLogic.extractToken(req)?.userId ?? null;
  }

  private static async checkAndRotateSeason(): Promise<void> {
    if (await LeaderboardService.isSeasonExpired()) {
      await AppLogic.rotateSeason();
    }
  }

  private static async rotateSeason(): Promise<void> {
    const season = await LeaderboardService.getCurrentSeason();
    if (!season) return;
    await LeaderboardService.takeSnapshot(season.id);
    await LeaderboardService.setSeasonWaiting(season.id);
    await AppLogic.scheduleNewSeason();
  }

  private static async scheduleNewSeason(): Promise<void> {
    setTimeout(
      async () => { await LeaderboardService.startNewSeason(); },
      config.game.seasonWaitMs
    );
  }

  private static async snapshotCurrentSeason(): Promise<void> {
    const season = await LeaderboardService.getCurrentSeason();
    if (season) await LeaderboardService.takeSnapshot(season.id);
  }

  // Example action (kept for testing)
  static handleExampleAction(params: Record<string, unknown>): StandardResponse<unknown> {
    Action.alert(Trans.t("example.hello"));
    Action.fireEvent("example_triggered", params);
    return Response.success({ echo: params }, "example.hello");
  }
}
