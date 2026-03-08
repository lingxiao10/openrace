# mem.md — OpenRace Platform Development Log

> 遵守规范：见 [instruction.md](./instruction.md)

---

## Phase 1 — Framework scaffold (done)

框架已建立，见 instruction.md。核心约定：
- `AppLogic.ts`（前后端各一）= 逻辑索引，**无局部变量，只有方法调用**
- 所有配置在 `backend/src/config/config.ts`
- 标准响应：`{ code, message, data, action_list }`
- 前端通过 `action_list` 执行后端指令

---

## Phase 2 — OpenRace Multi-Game AI Platform (done)

### 项目名称
**OpenRace** — AI 多游戏竞技平台（国际象棋 + 斗地主）

### 启动方式
```bash
# 1. 建库 + 迁移
mysql -u root -p < backend/schema.sql
mysql -u root -p < backend/migrations/add_doudizhu_support.sql

# 2. 后端
cd backend && npm install && npm run dev

# 3. 前端
cd frontend && npm install && npm run dev
```

### 关键配置（config.ts GameConfig）
- `matchIntervalMs: 10000` — 匹配间隔（每10秒）
- `leaderboardIntervalMs: 86400000` — 排行榜快照
- `seasonWaitMs: 600000` — 赛季间隔 10 分钟
- `defaultModel: "x-ai/grok-code-fast-1"`
- `availableModels: ["x-ai/grok-code-fast-1", "minimax/minimax-m2.5", "moonshotai/kimi-k2.5", "z-ai/glm-5"]`
- `aiCostMarkupPercent: 10` — AI 费用加成 10%
- `initialBalance: 5.00` — 初始余额 $5.00
- `maxMatchesPerRobotPerDay: 30` — 每个机器人每天最多30场对局（纽约时间）

### 每日对局限制（2026-03-09）
- 每个机器人每天最多参加30场对局（基于纽约时间 UTC-5）
- `RobotService.getTodayMatchCount(robotId)` — 查询今日对局数
- `GameService.filterEligibleRobots` — 匹配时过滤超限机器人
- 前端机器人卡片显示今日对局数：`今日对局 X/30`，超限时红色显示
- 国际化：`robot.today_matches` (zh: "今日对局", en: "Today's Matches")

### DB 表
`users` `user_settings` `robots` (含 `game_type`) `seasons` `matches` (含 `game_type`, `robot_third_id`, `robot_landlord_id`) `match_moves` `balance_log` `leaderboard_snapshots`

### 后端文件
- tools: `EncryptTool` `ChessTool` `DoudizhuTool` `OpenRouterTool` `LogTool`（含500条内存缓冲）
- services: `RobotService` `BalanceService` `MatchService` `GameService` `LeaderboardService` `SettingsService`
- controllers: `RobotController` `GameController` `LeaderboardController` `SettingsController` `LogController`
- log: `LogCenter`（暴露 `getLogs(level?)`）
- scheduler: `GameScheduler` (setInterval 10s → AppLogic.handleMatchmakingTick)

### 前端文件
- core: `Router`（hash路由）`Trans`（i18n）
- ui: `Toast` `ChessBoard` `DoudizhuBoard`
- pages: `LoginPage` `RegisterPage` `DashboardPage` `RobotPage` `GamePage` `LeaderboardPage` `HistoryPage` `SettingsPage` `LogPage`

### 游戏类型
- **Chess**: 2人对战，UCI格式，FEN状态
- **Doudizhu**: 3人对战（地主vs农民），卡牌序列，JSON状态

### 对局流程
1. `GameScheduler` 每**10秒**触发 → `AppLogic.handleMatchmakingTick`
2. `GameService.pairActiveRobots` 分别配对 chess（2人）和 doudizhu（3人）机器人
3. `GameService.runMatch` 根据 `game_type` 调用 `playChessGame` 或 `playDoudizhuGame`
4. **Chess**: 每步最多12次重试，验证UCI格式+合法性，失败则forfeit
5. **Doudizhu**: 每步最多12次重试，验证手牌+牌型+规则，失败则forfeit。完整规则已写入system prompt
6. **AI调用**: 网络错误最多3次重试（5秒间隔），格式/规则错误在12次内重试（无延迟）
7. ELO计算：斗地主地主 vs 农民平均分

### 品牌更新（2026-03-09）
- 标题：`OpenRace - AI Multi-Game Arena`
- 导航品牌：`♟ OpenRace`
- 支持国际象棋和斗地主两种游戏类型

### 对局页面机器人标识（2026-03-09）
- 后端：`MatchService.getMatch` 增加 `white_user_id` `black_user_id` 字段
- 前端：登录时存储 `user_id` 到 localStorage，`AppLogic.getUserId()` 获取
- 棋盘上下显示机器人名字标签（`board-label`，居左，字体1.1rem），当前用户机器人标记为绿色（`.my-robot`）
- 对局信息卡片中机器人名字也标记绿色，思考气泡只显示在棋盘标签上

### 对局详细日志（2026-03-09）
- `MatchLogTool` — 每局对战独立日志文件
- 日志路径：`backend/logs/matches/match_{id}_{game_type}_{timestamp}.log`
- 记录：对局开始、每步走法、AI尝试、FEN状态、token消耗、费用、认负原因、对局结果
- `GameService.playChessGame` 集成日志记录

### 棋盘渲染修复（2026-03-09）
- `ChessBoard.ts` 增加 `INITIAL_FEN` 常量，空FEN时显示初始棋盘
- `buildHtml` 使用可选链 `board[r]?.[c]` 防止数组越界
- `GamePage.goToMove` 处理空moves数组，显示"0 / 0"
- `renderMoves` 空数组时显示"等待对局开始..."

### 斗地主3人对局显示修复（2026-03-09）
- 后端 `MatchService.getMatch/getRecentMatches/getMatchesByRobot` 增加 `LEFT JOIN robots rt` 查询第三个机器人
- 前端 `GamePage.renderMatchInfo` 根据 `game_type` 区分显示：
  - 斗地主：显示3个机器人 + 地主标识
  - 国际象棋：显示2个机器人 + 棋盘标签
- `DashboardPage/GameCenterPage` 对局列表根据 `game_type` 显示2人或3人
- `GameCenterPage.ts` 类型定义增加 `robot_third_id?` `third_name?` `game_type` 字段
- 新增 `DoudizhuBoard.ts` 组件，显示斗地主游戏状态（手牌、上家出牌、当前出牌）
- `GamePage` 根据 `game_type` 动态创建 ChessBoard 或 DoudizhuBoard

### 斗地主界面优化（2026-03-09）
- ~~后端增加 `forfeit_robot_id` 字段~~（已移除，数据库表中不存在）
- `MatchService.finishMatch` 移除 `forfeit_robot_id` 参数（数据库表中无此字段）
- 前端显示认负信息：只显示原因（insufficient_balance / 12次尝试失败）
- 斗地主棋盘优化：
  - 地主在最上方，黄色渐变背景 🤴
  - 农民在下方，绿色渐变背景 👨‍🌾
  - **每一步只有一个机器人框框显示出牌记录**：
    - 逻辑：从 moveHistory 取最后一个元素（当前步），只显示该玩家的出牌
    - 每一步（move_number）= 一个机器人的决策
    - 渐变背景 + 彩色边框 + 阴影效果
    - "本轮出牌:" 标签（小写、灰色）
    - 卡牌：白色小卡片带阴影
    - 不出：居中斜体显示
  - **获胜者名字旁显示 🏆 标志**
  - 思考中状态显示动画
  - 当前玩家高亮边框
- `GamePage` 游戏结束后停止轮询（status === 'finished' 或 'forfeited'）
- 修复 `MatchService.finishMatch` SQL 错误（移除不存在的 forfeit_robot_id 字段）
- **历史记录优化**（右侧列表）：
  - 显示机器人名字 + 出牌内容
  - 斗地主：pass 显示为"不出"，卡牌用空格分隔（如 "3 4 5 6 7"）
  - 两行布局：第一行显示步数+机器人名，第二行显示出牌+费用
  - `GamePage` 存储 `robotNames` Map 用于快速查找机器人名字

### Webpack配置（2026-03-09）
- 前端使用webpack dev server（port 8080）
- `webpack.config.js` 配置 `/api` proxy到 `http://localhost:3000`
- `AppLogic.getApiBase()` 返回空字符串，使用webpack proxy（dev）或同源（prod）
- 移除 `MatchService.getMatch` 中不存在的 `forfeit_robot_id` 列JOIN


### 界面优化（2026-03-09）
- **机器人卡片**：渐变背景、悬停效果、网格布局meta信息、策略高亮显示
- **斗地主对局页面**：
  - 移除重复的"地主："文字（下方框已显示角色）
  - 对局信息卡片：卡片式布局，显示玩家头像、名字、奖杯
  - 玩家框：渐变背景、阴影、悬停效果
  - 地主框：黄色渐变 + 金色边框
  - 农民框：绿色渐变 + 绿色边框
  - 当前玩家：蓝色光晕 + 缩放效果
  - 卡牌：白色背景、阴影、悬停动画
  - 本轮出牌区：蓝色渐变背景 + 阴影
  - 思考指示器：紫色渐变 + 脉冲动画
- **Game Center页面**：
  - 移除"对局中"弹窗，点击对局直接跳转到对局详情页
  - 匹配记录只显示有对局的轮次，空轮次不显示

### 对局恢复机制（2026-03-09）
- `GameService.cleanupZombieMatches()` 每10秒检测 `running` 状态对局
- 超过3分钟无新move → 自动恢复并继续游戏（不是清理）
- `runMatch` 检查对局状态，running时不重新startMatch
- `playChessGame` 从最后move的FEN恢复，重建moveHistory
- `playDoudizhuGame` 从最后move的JSON state恢复
- 服务重启后会自动恢复所有超时对局

### 国际化规范（2026-03-09）
**强制要求**：所有用户可见的文本必须使用 `Trans.t()` 进行国际化
- ✅ 正确：`Trans.t("robot.rating", "分数")`
- ❌ 错误：直接写 `"分数"` 或 `"启用"`
- 适用范围：按钮文字、标签、提示信息、空状态文字、表单标签等
- 不适用：代码注释、console.log、开发调试信息
- 翻译键命名：`模块.功能` 格式（如 `robot.activate`、`game.winner`）
- 第二参数为默认文本（中文），用于翻译缺失时的后备显示

### 机器人页面重构（2026-03-09）
- **创建表单**：改为弹窗模式，点击"➕ Create Robot"按钮打开
- **机器人列表**：网格布局（auto-fill, minmax(300px, 1fr)）
- **卡片设计**：
  - 顶部渐变背景（紫色/灰色）
  - 游戏图标圆形 badge（左上角）
  - 状态图标圆形 badge（右上角，▶/⏸）
  - 统计数据 4 列网格（分数、胜、负、平）
  - AI 模型蓝色框 + 脑图标
  - 策略预览黄色边框引用
  - 底部 2 列按钮（启用/暂停 + 删除）
- **悬停效果**：上移 + 阴影 + 边框变蓝
- **空状态**：机器人图标 + 提示文字
- **所有文本已国际化**：使用 Trans.t()

### 对局页面国际化完善（2026-03-09）
- **GamePage.ts**：所有硬编码中文文本已国际化
- **DoudizhuBoard.ts**：所有硬编码中文文本已国际化
- **规则弹窗**：完整的斗地主和国际象棋规则翻译（中英文）
- **翻译键新增**：`game.*` 和 `rules.*` 系列（共30+个键）
- **语言切换持久化修复**：
  - 问题1：`AppLogic.applyTransFromResponse()` 使用 `Config.getLang()`（后端默认语言）
  - 问题2：`syn_trans` action 处理器使用 `Config.getLang()`（后端默认语言）
  - 修复：两处都改为使用 `AppLogic.getStoredLang()`（用户选择的语言）
  - 根本原因：后端通过 `action_list` 返回 `syn_trans` action，前端执行时使用了错误的语言参数
  - 结果：刷新页面后语言设置正确保持
- **导航栏简化**：隐藏 Settings 和 Logs 链接（功能仍可通过直接访问 URL 使用）
- **Matchmaking History 修复**：
  - `MatchService.getMatchesByIds` 增加 `LEFT JOIN robots rt` 查询第三个机器人
  - `StatsService.getEnrichedTicks` 返回数据增加 `third_name` 和 `game_type` 字段
  - 后端过滤：只返回有对局的轮次（`match_ids.length > 0`），最多20条
  - 前端简化：移除重复的过滤逻辑，直接显示后端返回的数据
  - 修复斗地主对局在匹配记录中显示不完整的问题
- **Match History 页面重构**：
  - 表格列从固定的 White/Black 改为动态的 Game Type + Players
  - 根据 `game_type` 显示不同的玩家列表（Chess: 2人，Doudizhu: 3人）
  - 新增翻译键：`game.game_type`, `game.players`

### Game Center 和 Leaderboard 重构（2026-03-09）
- **Game Center 页面**：
  - 移除 Matchmaking History（tick 记录）
  - 新增"进行中的对局"卡片网格（status = 'running'，最多显示10个）
  - 超过10个时显示"查看全部"链接，跳转到 `/running-matches` 页面
  - 新增"最近对局"卡片网格（最近30条 finished/forfeited，显示赢家）
  - 所有对局使用统一的卡片样式，移动端友好
  - 每10秒自动刷新对局数据
  - 新增翻译键：`gc.running_matches`, `gc.recent_matches`, `gc.no_running`, `gc.no_recent`, `gc.live`, `gc.view_all_running`, `gc.all_running_matches`
- **RunningMatchesPage 新页面**：
  - 显示所有进行中的对局
  - 卡片网格布局，每10秒自动刷新
  - 路由：`/running-matches`
- **Leaderboard 页面**：
  - 新增 Tab 切换：总榜、本周、今日
  - 总榜：所有机器人按当前 ELO 排序
  - 本周：最近7天有对局的机器人，按 ELO 排序，统计本周战绩
  - 今日：今天有对局的机器人，按 ELO 排序，统计今日战绩
  - 表格新增 Game Type 列
  - 后端新增方法：`LeaderboardService.getAllTimeLeaderboard/getWeeklyLeaderboard/getDailyLeaderboard`
  - 新增翻译键：`leaderboard.all_time`, `leaderboard.weekly`, `leaderboard.daily`
- **状态国际化**：
  - 所有对局状态（pending, running, finished, forfeited）已国际化
  - 新增翻译键：`game.status.pending`, `game.status.running`, `game.status.finished`, `game.status.forfeited`
  - 修改页面：GameCenterPage, HistoryPage, GamePage
- **斗地主赢家显示逻辑**：
  - 后端：地主获胜时 `winner_id` = 地主ID，农民获胜时 `winner_id` = null（两个农民都获得胜利分数）
  - 前端：斗地主对局中，`winner_id` 为 null 且 status 为 finished 时，显示"农民联盟"获胜
  - GameCenterPage 已更新赢家显示逻辑

### 积分系统替代 ELO（2026-03-09）
- **积分规则**：赢=3分，平=1分，输=0分
- **数据库**：`robots` 表新增 `points` 字段
- **后端修改**：
  - `RobotService.updateStats` 更新积分计算
  - `RobotService.checkNameExists` 检查昵称重复
  - `AppLogic.handleCreateRobot` 创建机器人前检查昵称
  - `LeaderboardService` 所有排行榜按积分排序（积分相同时按 ELO 排序）
  - 周榜和日榜积分计算：考虑斗地主农民获胜情况（`winner_id` 为 null）
- **前端修改**：
  - LeaderboardPage 默认显示今日榜（tab 顺序：今日、本周、总榜）
  - 表格列：积分、赢、输、平（已国际化）
  - 移除 ELO 显示，改为积分
- **翻译键**：`robot.name_exists`, `leaderboard.points/wins/losses/draws`
- **迁移文件**：`backend/migrations/add_points_system.sql`

### 浏览器语言自动检测（2026-03-09）
- `AppLogic.getStoredLang()` 增加浏览器语言检测：localStorage 无语言时，读取 `navigator.language`，zh开头→中文，en开头→英文，默认中文

### 根据语言自动选择默认游戏类型（2026-03-09）
- `RobotPage.renderSkeleton()` 根据当前语言设置默认游戏类型：中文→斗地主，英文/其他→国际象棋
- `RobotPage.bindCreateForm()` 打开创建机器人弹窗时，自动设置游戏类型和策略标签
- 游戏中心"符合条件"卡片副标题改为"API有效"（zh: "API有效", en: "API Valid"）

### 欢迎弹窗（2026-03-09）
- 首次访问显示精美弹窗："让AI为你赢得奖金"
- 样式：渐变背景、动画效果、居中显示
- 逻辑：localStorage 存储 `hasSeenWelcome`，点击"知道了"后不再显示
- 国际化：zh "让AI为你赢得奖金" / en "Let AI Win Prizes for You"

### 排行榜按游戏类型分类（2026-03-09）
- 新增游戏类型tab：全部游戏、国际象棋、斗地主
- 前端过滤并重新排名：`LeaderboardPage` 增加 `currentGameType` 和 `cachedData`
- 样式：`.game-tab-btn` 按钮样式，激活状态为主色背景
- 国际化：`leaderboard.all_games`

### 首页与悬浮按钮（2026-03-09）
- 新增 `HomePage.ts` — 未登录用户默认首页
- 路由：`/` → HomePage，未登录用户默认跳转到首页而非登录页
- 首页内容：标题、副标题、3个特性卡片（AI机器人、自动对战、排行榜）
- 底部悬浮按钮："Build Your AI Bot"，渐变背景、阴影、hover动画
- 点击逻辑：未登录→跳转登录页，已登录→跳转robots页面并触发创建弹窗
- `RobotPage` 监听 `trigger_create_robot` 事件，自动打开创建机器人弹窗
- 国际化：zh "创建你的 AI 机器人" / en "Build Your AI Bot"

### HttpTool 响应调试（2026-03-09）
- `HttpTool.request` 改为先获取 text，打印到控制台，再 JSON.parse，便于调试后端响应格式问题

### 用户自定义API配置（2026-03-09）
- **数据库迁移**: `migrations/add_user_api_config.sql` — robots表增加 `provider`, `api_key_encrypted`, `error_count`, `game_type`, `points` 字段
- **加密存储**: `EncryptTool` 使用 `secret_json.json` 中的 `encryption_salt` (默认"openrace") 加密API密钥
- **厂商配置**: `backend/src/config/providers.ts` — 定义所有AI厂商（OpenRouter, OpenAI, Anthropic, Google, DeepSeek, Ollama等）及其模型列表和充值链接
- **创建机器人**: 用户必须选择厂商、输入API密钥、选择模型。创建时测试API（发送"请直接输出数字：1"，只要有输出即可）。API密钥加密后存储，创建后不可修改
- **错误追踪**: 连续5次API错误（空响应或quota错误）自动suspend机器人，发送邮件通知用户
- **恢复机制**: 用户点击"启用"按钮时，后端调用 `testRobotApi` 测试API可用性，成功后重置 `error_count` 并激活
- **邮件通知**: `EmailTool` 使用Resend API发送机器人暂停通知，包含失败原因和恢复步骤
- **对局forfeit**: 机器人API错误时，当前对局判对手获胜（斗地主中两个农民都获胜）
- **前端UI**: 创建机器人表单增加厂商选择、API密钥输入、充值链接（_blank跳转）。机器人卡片显示provider、error_count>=5时显示红色警告
- **不再使用余额系统**: 移除 `BalanceService` 相关逻辑，用户使用自己的API密钥和余额

### 未登录用户访问修复（2026-03-09）
- **问题**: 未登录用户访问时，前端自动从localStorage读取token并设置到所有请求header，导致Dashboard调用需要认证的接口返回401
- **修复**:
  1. `Router.ts` 默认跳转从 `/dashboard` 改为 `/` (GameCenterPage)
  2. `Router.ts` 增加 `requireAuth` 参数，需要登录的路由自动重定向到登录页
  3. `GameCenterPage` 作为首页，显示实时对局，调用 `/api/match` (无需认证)
  4. 未登录用户可以在首页看到实时对局，点击查看详情
  5. 导航栏根据登录状态动态显示"登录"或"退出"按钮
  6. 登录成功后触发 `user_logged_in` 事件，更新导航栏按钮状态
  7. 需要登录的路由：`/dashboard` `/robots` `/history` `/settings` `/logs`
  8. 公开路由：`/` `/login` `/register` `/running-matches` `/match/:id` `/leaderboard`
  9. 移除 `HomePage.ts`，`/` 路由直接指向 `GameCenterPage`

### 排行榜页面优化（2026-03-09）
- **移除"所有游戏"选项**: 排行榜必须按游戏类型分开显示
- **默认游戏类型**: 中文用户默认显示斗地主，英文用户默认显示国际象棋
- **无需登录**: `/api/leaderboard` 改为公开接口，前端使用原生fetch调用（不带Authorization header）
- **UI调整**: 游戏类型选择放在顶部，时间范围选择在下方，移除表格中的"游戏类型"列

### OpenRouter APP标识（2026-03-09）
- `OpenRouterTool.ts` 设置 `X-Title: "OpenRace"` 和 `HTTP-Referer: "https://openrace.ai"`，用于OpenRouter排行榜统计

### 创建机器人弹窗优化（2026-03-09）
- **弹窗关闭**: 只能点击右上角叉号关闭，移除点击遮罩层关闭功能
- **Provider配置**: 后端 `config/providers.ts` 定义所有AI提供商（OpenRouter/OpenAI/Anthropic/DeepSeek/Google/Ollama/OpenAI-Compatible）
- **数据同步**: 后端通过 `Action.syncData("providers", PROVIDERS)` 发送，前端通过 `sync_data` action存储到 `window.__sync_providers`
- **API Key加密**: 创建机器人时，后端使用 `EncryptTool.encrypt()` 加密存储API key（AES-256-CBC），使用时解密

