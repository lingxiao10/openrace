// ============================================================
// Trans.ts — Backend i18n. All user-facing strings go here.
// Usage: Trans.t("key") or Trans.t("key", lang)
// ============================================================

import config from "../config/config";

type LangMap = Record<string, string>;
type TransMap = Record<string, LangMap>;

const translations: TransMap = {
  // ---- system ----
  "sys.success": { zh: "操作成功", en: "Success" },
  "sys.error": { zh: "系统错误", en: "System error" },
  "sys.unauthorized": { zh: "未授权，请登录", en: "Unauthorized, please login" },
  "sys.not_found": { zh: "资源不存在", en: "Not found" },
  "sys.param_error": { zh: "参数错误", en: "Invalid parameters" },
  "sys.forbidden": { zh: "无权限", en: "Forbidden" },

  // ---- user ----
  "user.login_success": { zh: "登录成功", en: "Login successful" },
  "user.logout_success": { zh: "退出成功", en: "Logged out" },
  "user.register_success": { zh: "注册成功", en: "Registered successfully" },
  "user.not_found": { zh: "用户不存在", en: "User not found" },
  "user.wrong_password": { zh: "密码错误", en: "Wrong password" },
  "user.already_exists": { zh: "用户已存在", en: "User already exists" },

  // ---- user (extended) ----
  "user.email_exists":      { zh: "邮箱已被注册", en: "Email already registered" },
  "user.email_required":    { zh: "邮箱不能为空", en: "Email is required" },
  "user.invalid_email":     { zh: "邮箱格式不正确", en: "Invalid email format" },

  // ---- robot ----
  "robot.created":          { zh: "机器人已创建", en: "Robot created" },
  "robot.updated":          { zh: "机器人已更新", en: "Robot updated" },
  "robot.deleted":          { zh: "机器人已删除", en: "Robot deleted" },
  "robot.not_found":        { zh: "机器人不存在", en: "Robot not found" },
  "robot.suspended":        { zh: "机器人已暂停（余额不足）", en: "Robot suspended (insufficient balance)" },
  "robot.activated":        { zh: "机器人已启用", en: "Robot activated" },
  "robot.limit_reached":    { zh: "机器人数量已达上限", en: "Robot limit reached" },
  "robot.forbidden":        { zh: "无权操作此机器人", en: "Not your robot" },
  "robot.name_exists":      { zh: "机器人昵称已存在", en: "Robot name already exists" },

  // ---- game ----
  "game.match_started":     { zh: "对局开始", en: "Match started" },
  "game.match_finished":    { zh: "对局结束", en: "Match finished" },
  "game.forfeit":           { zh: "认负（余额不足）", en: "Forfeit (insufficient balance)" },
  "game.not_found":         { zh: "对局不存在", en: "Match not found" },
  "game.season_started":    { zh: "新赛季开始", en: "New season started" },
  "game.season_ended":      { zh: "赛季结束", en: "Season ended" },

  // ---- balance ----
  "balance.insufficient":   { zh: "余额不足", en: "Insufficient balance" },
  "balance.deducted":       { zh: "余额已扣除", en: "Balance deducted" },

  // ---- settings ----
  "settings.saved":         { zh: "设置已保存", en: "Settings saved" },
  "settings.key_required":  { zh: "请先设置 OpenRouter API Key", en: "Please set your OpenRouter API key first" },
  "settings.key_deleted":   { zh: "API Key 已删除", en: "API key deleted" },

  // ---- leaderboard ----
  "leaderboard.updated":    { zh: "排行榜已更新", en: "Leaderboard updated" },

  // ---- nav ----
  "nav.dashboard":          { zh: "仪表盘", en: "Dashboard" },
  "nav.settings":           { zh: "设置", en: "Settings" },
  "nav.history":            { zh: "对局历史", en: "Match History" },
  "nav.leaderboard":        { zh: "排行榜", en: "Leaderboard" },
  "nav.robots":             { zh: "机器人", en: "Robots" },
  "nav.logs":               { zh: "系统日志", en: "Logs" },

  // ---- user (ui labels) ----
  "user.login_title":       { zh: "登录", en: "Login" },
  "user.register_title":    { zh: "注册", en: "Register" },
  "user.username":          { zh: "用户名", en: "Username" },
  "user.password":          { zh: "密码", en: "Password" },
  "user.email":             { zh: "邮箱", en: "Email" },
  "user.login_btn":         { zh: "登录", en: "Login" },
  "user.register_btn":      { zh: "注册", en: "Register" },
  "user.no_account":        { zh: "没有账号？", en: "No account?" },
  "user.have_account":      { zh: "已有账号？", en: "Have an account?" },
  "user.register_link":     { zh: "注册", en: "Register" },
  "user.login_link":        { zh: "登录", en: "Login" },

  // ---- balance (ui labels) ----
  "balance.label":          { zh: "余额", en: "Balance" },
  "balance.info":           { zh: "每次AI走棋都会扣除余额，余额归零后机器人将被暂停", en: "Balance is deducted for each AI move. When it reaches $0, your robots are suspended." },

  // ---- robot (ui labels) ----
  "robot.title":            { zh: "我的机器人", en: "My Robots" },
  "robot.create":           { zh: "创建机器人", en: "Create Robot" },
  "robot.create_btn":       { zh: "创建机器人", en: "Create Robot" },
  "robot.name":             { zh: "机器人名称", en: "Robot Name" },
  "robot.model":            { zh: "AI 模型", en: "AI Model" },
  "robot.strategy":         { zh: "下棋策略", en: "Chess Strategy" },
  "robot.strategy_placeholder": { zh: "描述你的机器人下棋策略…", en: "Describe your robot's chess strategy..." },
  "robot.use_default":      { zh: "使用默认策略", en: "Use Default Strategy" },
  "robot.none":             { zh: "暂无机器人，请在上方创建", en: "No robots yet. Create one above!" },
  "robot.count":            { zh: "机器人数", en: "Robots" },
  "robot.activate":         { zh: "启用", en: "Activate" },
  "robot.suspend":          { zh: "暂停", en: "Suspend" },
  "robot.edit":             { zh: "编辑", en: "Edit" },
  "robot.delete":           { zh: "删除", en: "Delete" },
  "robot.confirm_delete":   { zh: "确认删除此机器人？", en: "Delete this robot?" },

  // ---- game (ui labels) ----
  "game.recent_matches":    { zh: "最近对局", en: "Recent Matches" },
  "game.matches_played":    { zh: "对局数", en: "Matches" },
  "game.no_matches":        { zh: "暂无对局", en: "No matches yet" },
  "game.white":             { zh: "白方", en: "White" },
  "game.black":             { zh: "黑方", en: "Black" },
  "game.status":            { zh: "状态", en: "Status" },
  "game.date":              { zh: "日期", en: "Date" },
  "game.view":              { zh: "查看", en: "View" },
  "game.move_history":      { zh: "走棋记录", en: "Move History" },
  "game.winner":            { zh: "胜者", en: "Winner" },

  // ---- settings (ui labels) ----
  "settings.api_key":       { zh: "OpenRouter API 密钥", en: "OpenRouter API Key" },
  "settings.api_key_info":  { zh: "您的密钥经过加密存储，请前往 openrouter.ai 获取", en: "Your API key is encrypted and stored securely. Get one at openrouter.ai" },
  "settings.api_key_label": { zh: "API 密钥", en: "API Key" },
  "settings.api_key_hint":  { zh: "留空则删除密钥", en: "Leave blank to remove the key" },
  "settings.save":          { zh: "保存", en: "Save" },
  "settings.key_set":       { zh: "API 密钥已设置", en: "API key is set" },
  "settings.key_not_set":   { zh: "未设置 API 密钥", en: "No API key set" },

  // ---- leaderboard (ui labels) ----
  "leaderboard.empty":      { zh: "暂无数据", en: "No data yet" },

  // ---- log (ui labels) ----
  "log.title":              { zh: "系统日志", en: "System Logs" },
  "log.all":                { zh: "全部级别", en: "All Levels" },
  "log.refresh":            { zh: "刷新", en: "Refresh" },
  "log.auto_refresh":       { zh: "每10秒自动刷新", en: "Auto-refresh every 10s" },
  "log.empty":              { zh: "暂无日志", en: "No logs yet." },

  // ---- example ----
  "example.hello": { zh: "你好，世界！", en: "Hello, World!" },
  "example.item_created": { zh: "条目已创建", en: "Item created" },
  "example.item_deleted": { zh: "条目已删除", en: "Item deleted" },
};

export class Trans {
  private static currentLang: string = config.app.defaultLang;

  static setLang(lang: string): void {
    if (config.app.supportedLangs.includes(lang)) {
      Trans.currentLang = lang;
    }
  }

  static getLang(): string {
    return Trans.currentLang;
  }

  /** Translate a key, optionally override lang */
  static t(key: string, lang?: string): string {
    const l = lang || Trans.currentLang;
    const entry = translations[key];
    if (!entry) return key;
    return entry[l] || entry["en"] || key;
  }

  /** Return the full translation map for a lang (sent to frontend on init) */
  static getMapForLang(lang: string): LangMap {
    const result: LangMap = {};
    for (const key in translations) {
      result[key] = translations[key][lang] || translations[key]["en"] || key;
    }
    return result;
  }

  /** Register additional translations at runtime */
  static register(key: string, map: LangMap): void {
    translations[key] = map;
  }
}
