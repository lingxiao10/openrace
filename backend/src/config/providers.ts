// ============================================================
// providers.ts — AI provider configurations
// ============================================================

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  requiresApiKey: boolean;
  supportsCustomModel: boolean;
  topUpUrl?: string; // 充值链接
  isPlatformFree?: boolean; // 平台免费提供，用户无需填写 API key
  models: ProviderModel[];
}

export const PROVIDERS: Provider[] = [
  {
    id: "ark-free",
    name: "Ark 免费 (平台提供)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    requiresApiKey: false,
    supportsCustomModel: false,
    isPlatformFree: true,
    models: [
      { id: "deepseek-v3-2-251201", name: "DeepSeek V3 (免费)" },
      { id: "doubao-seed-1-8-251228", name: "Doubao Seed 1.8 (免费)" },
    ],
  },
  {
    id: "ark",
    name: "Ark (火山引擎)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    requiresApiKey: true,
    supportsCustomModel: false,
    topUpUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D",
    models: [
      { id: "deepseek-v3-2-251201", name: "DeepSeek V3" },
      { id: "doubao-seed-1-8-251228", name: "Doubao Seed 1.8" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://openrouter.ai/credits",
    models: [
      { id: "anthropic/claude-opus-4.6", name: "Claude 4.6 Opus" },
      { id: "anthropic/claude-sonnet-4.6", name: "Claude 4.6 Sonnet" },
      { id: "anthropic/claude-haiku-4.5", name: "Claude 4.5 Haiku" },
      { id: "openai/gpt-5.4", name: "GPT-5.4" },
      { id: "openai/gpt-5.4-pro", name: "GPT-5.4 Pro" },
      { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex" },
      { id: "openai/gpt-5.2-chat", name: "GPT-5.2 Chat" },
      { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
      { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
      { id: "google/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview" },
      { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast" },
      { id: "x-ai/grok-3-mini-beta", name: "Grok 3 Mini" },
      { id: "x-ai/grok-3-beta", name: "Grok 3" },
      { id: "google/gemini-flash-1-5", name: "Gemini Flash 1.5" },
      { id: "google/gemini-pro-1-5", name: "Gemini Pro 1.5" },
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
      { id: "minimax/minimax-m2.5", name: "MiniMax M2.5" },
      { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5" },
      { id: "z-ai/glm-5", name: "GLM-5" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://platform.openai.com/account/billing/overview",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro" },
      { id: "gpt-5.2-codex", name: "GPT-5.2 Codex" },
      { id: "gpt-5.2-chat", name: "GPT-5.2 Chat" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://console.anthropic.com/settings/billing",
    models: [
      { id: "claude-opus-4-6", name: "Claude 4.6 Opus" },
      { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet" },
      { id: "claude-haiku-4-5-20251001", name: "Claude 4.5 Haiku" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://aistudio.google.com/app/apikey",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview" },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://platform.deepseek.com/usage",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-coder", name: "DeepSeek Coder" },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://www.minimaxi.com/user-center/basic-information/interface-key",
    models: [
      { id: "abab6.5s-chat", name: "abab6.5s Chat" },
      { id: "abab6.5-chat", name: "abab6.5 Chat" },
      { id: "abab6.5g-chat", name: "abab6.5g Chat" },
      { id: "abab5.5-chat", name: "abab5.5 Chat" },
    ],
  },
  {
    id: "moonshot",
    name: "Moonshot AI (Kimi)",
    baseUrl: "https://api.moonshot.cn/v1",
    requiresApiKey: true,
    supportsCustomModel: true,
    topUpUrl: "https://platform.moonshot.cn/console/account",
    models: [
      { id: "moonshot-v1-8k", name: "Moonshot v1 8K" },
      { id: "moonshot-v1-32k", name: "Moonshot v1 32K" },
      { id: "moonshot-v1-128k", name: "Moonshot v1 128K" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    requiresApiKey: false,
    supportsCustomModel: true,
    models: [
      { id: "llama3.3", name: "Llama 3.3" },
      { id: "qwen2.5-coder", name: "Qwen 2.5 Coder" },
      { id: "deepseek-r1", name: "DeepSeek R1" },
      { id: "codellama", name: "Code Llama" },
    ],
  },
  {
    id: "openai-compatible",
    name: "OpenAI Compatible",
    baseUrl: "",
    requiresApiKey: true,
    supportsCustomModel: true,
    models: [],
  },
];

export function getProviderById(id: string): Provider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export function getProviderModels(providerId: string): ProviderModel[] {
  const provider = getProviderById(providerId);
  return provider?.models ?? [];
}
