# Ark Client — 火山引擎豆包 API 独立客户端

零依赖，仅需 `ArkClient.ts` 一个文件，可直接复制到任何 TypeScript / Node.js 项目。

---

## 快速开始

```ts
import { ArkClient, ARK_MODELS } from "./ArkClient";

const client = new ArkClient("your-api-key");

const result = await client.ask(
  ARK_MODELS.SEED_2_0_MINI,
  "You are a helpful assistant.",
  "你好，介绍一下自己"
);

console.log(result.content);
console.log(`消耗 ${result.totalTokens} tokens，约 $${result.costUsd.toFixed(6)}`);
```

---

## API 说明

### `new ArkClient(apiKey, baseUrl?)`

| 参数 | 类型 | 说明 |
|------|------|------|
| `apiKey` | `string` | 火山引擎 Ark API Key |
| `baseUrl` | `string` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |

### `client.chat(model, messages, options?)`

多轮对话接口。

```ts
const result = await client.chat(
  ARK_MODELS.SEED_2_0_MINI,
  [
    { role: "system", content: "You are a chess AI." },
    { role: "user",   content: "FEN: rnbqkbnr/pppp..." },
  ],
  { maxTokens: 64, temperature: 0.3 }
);
```

### `client.ask(model, systemPrompt, userPrompt, options?)`

单轮问答快捷方法，内部封装 system + user 消息。

### `ArkCallOptions`

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeoutMs` | `number` | `30000` | 超时毫秒 |
| `maxTokens` | `number` | `512` | 最大输出 token |
| `temperature` | `number` | `0.7` | 温度 |
| `thinking` | `"disabled"\|"enabled"\|"auto"` | `"disabled"` | 深度思考模式（见下） |

### `ArkCallResult`

```ts
{
  content: string;        // 模型回复文本
  promptTokens: number;   // 输入 token 数
  completionTokens: number; // 输出 token 数
  totalTokens: number;    // 总 token 数
  costUsd: number;        // 粗略费用估算（USD）
}
```

---

## 模型列表（2026-03）

| 常量 | 模型 ID | 适用场景 |
|------|---------|---------|
| `ARK_MODELS.SEED_2_0_PRO` | `doubao-seed-2-0-pro-260215` | 高精度任务 |
| `ARK_MODELS.SEED_2_0_LITE` | `doubao-seed-2-0-lite-260215` | 均衡 |
| `ARK_MODELS.SEED_2_0_MINI` | `doubao-seed-2-0-mini-260215` | **最便宜，推荐免费/高频场景** |
| `ARK_MODELS.SEED_1_8` | `doubao-seed-1-8-251228` | 上一代 |

---

## thinking 参数说明

豆包 seed 系列模型支持"深度思考"模式，通过请求体中的 `thinking.type` 控制：

| 值 | 说明 | 推荐场景 |
|----|------|---------|
| `"disabled"` | 关闭深度思考（**默认**） | 游戏 AI、问答、高频调用——响应快、token 少 |
| `"enabled"` | 强制开启深度思考 | 数学推理、复杂逻辑 |
| `"auto"` | 模型自动决定 | 通用场景 |

> **注意**：开启 thinking 会显著增加 token 消耗和延迟，游戏场景建议保持 `"disabled"`。

---

## 在本项目（OpenRace）中的集成方式

本项目通过以下机制集成：

| 层级 | 文件 | 说明 |
|------|------|------|
| 配置 | `secret_json.json` → `ark_api_key` | 存储平台 API Key |
| 配置 | `config.ts` → `platformArkApiKey` / `arkBaseUrl` | 读取并暴露 |
| Provider | `providers.ts` → `ark-free` | 免费选项，`requiresApiKey: false`，固定 mini 模型 |
| Provider | `providers.ts` → `ark` | 用户自填 key，4 个模型可选 |
| 底层 | `OpenRouterTool.callChat(extraBody)` | 传 `thinking:{type:"disabled"}` |
| 调度 | `GameService.resolveRobotApiParams` | 自动选 key/baseUrl/extraBody |
| 业务 | `AppLogic.handleCreateRobot` | `ark-free` 跳过 api_key 必填 |
| 前端 | `RobotPage.ts` | 选 `ark-free` 隐藏 API key 输入，显示免费标签 |

---

## 充值 / 获取 API Key

[火山引擎 Ark 控制台](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D)
