# Framework Specification / 框架规范

> Version 1.0 | Language: TypeScript (full-stack) | DB: MySQL

---

## 1. Project Structure / 项目结构

```
game_ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── config.ts          # ALL configuration (DB, server, app, log)
│   │   ├── core/
│   │   │   ├── Trans.ts           # Backend i18n
│   │   │   ├── Action.ts          # Action builder (backend → frontend instructions)
│   │   │   └── Response.ts        # Standard response envelope
│   │   ├── tools/                 # Decoupled, independently testable tools
│   │   │   ├── DbTool.ts          # MySQL tool
│   │   │   ├── LogTool.ts         # Structured logger
│   │   │   └── AuthTool.ts        # Token + password tool
│   │   ├── services/              # Business adapters (use tools, return data)
│   │   │   └── UserService.ts
│   │   ├── controllers/           # HTTP adapters (call AppLogic only)
│   │   │   ├── UserController.ts
│   │   │   └── InitController.ts
│   │   ├── log/
│   │   │   └── LogCenter.ts       # Central log facade
│   │   ├── test/
│   │   │   └── TestCenter.ts      # Test runner for all tools/services
│   │   ├── AppLogic.ts            # ★ BACKEND LOGIC INDEX
│   │   └── app.ts                 # Express entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── core/
│   │   │   ├── Config.ts          # Frontend config store (loaded from backend)
│   │   │   ├── Trans.ts           # Frontend i18n (loaded from backend)
│   │   │   ├── Action.ts          # Action executor (runs backend instructions)
│   │   │   └── Comm.ts            # HTTP + response handler
│   │   ├── tools/                 # Decoupled, independently testable tools
│   │   │   ├── HttpTool.ts        # Fetch wrapper
│   │   │   ├── StorageTool.ts     # localStorage wrapper
│   │   │   └── EventTool.ts       # Typed event bus
│   │   ├── pages/                 # UI pages (call AppLogic only)
│   │   │   └── ExamplePage.ts
│   │   ├── log/
│   │   │   └── LogCenter.ts       # Central log facade
│   │   ├── test/
│   │   │   └── TestCenter.ts      # Test runner for all tools
│   │   ├── AppLogic.ts            # ★ FRONTEND LOGIC INDEX
│   │   └── main.ts                # Entry point
│   ├── index.html
│   ├── webpack.config.js
│   ├── package.json
│   └── tsconfig.json
│
└── instruction.md                 # This file
```

---

## 2. The Logic Index Files / 逻辑索引文件

`AppLogic.ts` exists on **both** frontend and backend. It is the most important file in the project.

### Rules (strictly enforced by convention):

| Rule | Description |
|------|-------------|
| **No local variables** | No `const x = ...`, no `let y = ...` inside methods |
| **No business logic** | No SQL, no DOM manipulation, no crypto, no fetch |
| **Method calls only** | Every line is a call to another class/method |
| **One method = one use-case** | `handleUserLogin`, `onLoginSubmit`, etc. |
| **Single entry point** | Controllers/pages call AppLogic; never services/tools directly |

### Why?

When you need to change a flow (e.g., "after login, also load notifications"), you open **only** `AppLogic.ts`. You never need to search through business code. The index file is the map; everything else is implementation.

### Example (backend):

```typescript
// ✅ Correct — only method calls, no local variables
static async handleUserLogin(body): Promise<StandardResponse> {
  if (!AppLogic.validateLoginParams(body)) return Response.paramError();
  const result = await UserService.login(body.username, body.password);
  if (!result) return Response.error(401, "user.wrong_password");
  AppLogic.pushLoginActions(result.user.id);
  return Response.success(result, "user.login_success");
}

// ❌ Wrong — contains business logic
static async handleUserLogin(body) {
  const hash = crypto.createHmac("sha256", secret).update(body.password).digest("hex");
  const [rows] = await pool.execute("SELECT * FROM users WHERE ...");
  // ...
}
```

---

## 3. Standard Response Protocol / 标准响应协议

Every API response uses this envelope:

```typescript
interface StandardResponse<T> {
  code: number;          // 0 = success, non-zero = error
  message: string;       // i18n message string
  data: T | null;        // business payload
  action_list: ActionItem[]; // frontend instructions
}
```

### Action List / 动作列表

The backend can attach a list of **actions** to any response. The frontend executes them in order after receiving the response.

```typescript
interface ActionItem {
  name: string;                      // action name
  params: Record<string, unknown>;   // action parameters
  wait_time?: number;                // delay in ms before execution
}
```

### Built-in Actions / 内置动作

| Name | Description | Key params |
|------|-------------|------------|
| `alert` | Show browser alert | `message` |
| `success` | Show success toast | `message` |
| `navigate` | Navigate to route | `path` |
| `refresh` | Reload page | — |
| `update_html` | Update DOM elements by id | `html: {id: value}` |
| `fire_event` | Emit a frontend event | `event_name`, `params` |
| `syn_trans` | Load i18n map | `trans_map` |
| `syn_config` | Load config | `config_map` |
| `call_function` | Call a global function | `function_name`, `params` |
| `confirm` | Show confirm dialog | `title`, `action_name` |

### Adding a custom action:

```typescript
// Frontend: register handler
ActionExecutor.register("show_modal", (params) => {
  Modal.show(params.title as string, params.content as string);
});

// Backend: emit the action
Action.add("show_modal", { title: "Hello", content: "World" });
```

---

## 4. Configuration / 配置

**All configuration lives in `backend/src/config/config.ts`.**

The frontend receives its config via `GET /api/init` on startup. The frontend never hardcodes any config values.

```typescript
// Frontend boot sequence
await AppLogic.boot();
// → HttpTool.setBaseUrl(...)
// → ActionExecutor.registerBuiltins()
// → GET /api/init → Config.load(...) + Trans.load(...)
```

---

## 5. Internationalization / 国际化

- All user-facing strings are keys (e.g., `"user.login_success"`)
- Backend: `Trans.t("key")` or `Trans.t("key", lang)`
- Frontend: `Trans.t("key")` — map loaded from backend on init
- Add new strings to `backend/src/core/Trans.ts` in the `translations` object
- Supported languages: `zh` (Chinese), `en` (English)

```typescript
// Adding a new string
"feature.new_thing": { zh: "新功能", en: "New feature" }
```

---

## 6. Tools / 工具

Tools are **decoupled, independently testable** utilities with no business logic.

| Tool | Side | Purpose |
|------|------|---------|
| `DbTool` | Backend | MySQL queries, transactions |
| `LogTool` | Backend | Structured logging |
| `AuthTool` | Backend | Token creation/verification, password hashing |
| `HttpTool` | Frontend | Fetch wrapper with base URL + headers |
| `StorageTool` | Frontend | localStorage wrapper |
| `EventTool` | Frontend | Typed event bus |

### Tool rules:
- No imports from `services/` or `controllers/`
- No knowledge of business domain
- Every public method is independently testable
- Registered and tested in `TestCenter.ts`

---

## 7. Services / 服务

Services are **business adapters** that combine tools to implement domain logic.

- Import tools, never other services (unless explicitly needed)
- Return plain data objects, never HTTP responses
- Never import from `controllers/` or `AppLogic.ts`
- Never call `Action` or `Response` — that's AppLogic's job

---

## 8. Logging / 日志

All code logs through `LogCenter` (never directly to `console`).

```typescript
LogCenter.debug("Tag", "message", optionalData);
LogCenter.info("Tag", "message");
LogCenter.warn("Tag", "message");
LogCenter.error("Tag", "message", error);
```

---

## 9. Testing / 测试

```bash
# Backend tests
cd backend && npm test

# Frontend tests (Node, no browser needed)
cd frontend && npm test
```

Each tool/service has its own test cases registered in `TestCenter.ts`. Tests are plain functions — no test framework dependency.

---

## 10. Adding a New Feature / 添加新功能

1. **Add i18n strings** to `backend/src/core/Trans.ts`
2. **Add tool methods** if new low-level capability is needed
3. **Add service methods** for business logic
4. **Add AppLogic methods** (backend) — orchestrate service calls + actions
5. **Add controller method** that calls `AppLogic`
6. **Register route** in `app.ts`
7. **Add AppLogic method** (frontend) — call `Comm.post/get`
8. **Add page event handler** that calls `AppLogic`
9. **Register custom actions** if new frontend actions are needed
10. **Add tests** to `TestCenter.ts`

---

## 11. Dependency Rules / 依赖规则

```
app.ts / main.ts
    └── controllers / pages
            └── AppLogic (index)
                    ├── services
                    │       └── tools
                    └── core (Action, Response, Trans)
                            └── tools
```

**Arrows go one way only.** Lower layers never import from upper layers.
