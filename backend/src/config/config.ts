// ============================================================
// config.ts — Single source of truth for ALL configuration.
// Frontend never holds config directly; it loads via /api/init.
// ============================================================

import fs from "fs";
import path from "path";

interface SecretJson {
  db?: { host?: string; port?: number; user?: string; password?: string; database?: string };
  openrouter_api_key?: string;
  resend_api_key?: string;
  resend_from?: string;
  encryption_salt?: string;
}

function loadSecrets(): SecretJson {
  const secretPath = path.resolve(__dirname, "../../../secret_json.json");
  const defaultPath = path.resolve(__dirname, "../../../secret_json_default.json");

  try {
    // 优先读取 secret_json.json
    if (fs.existsSync(secretPath)) {
      return JSON.parse(fs.readFileSync(secretPath, "utf-8")) as SecretJson;
    }
    // 如果不存在，读取 secret_json_default.json
    if (fs.existsSync(defaultPath)) {
      return JSON.parse(fs.readFileSync(defaultPath, "utf-8")) as SecretJson;
    }
    return {};
  } catch (err) {
    console.error("Failed to load secrets:", err);
    return {};
  }
}

const secrets = loadSecrets();

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

export interface ServerConfig {
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

export interface AppConfig {
  name: string;
  version: string;
  env: "development" | "production" | "test";
  defaultLang: "zh" | "en";
  supportedLangs: string[];
}

export interface LogConfig {
  level: "debug" | "info" | "warn" | "error";
  enableConsole: boolean;
  enableFile: boolean;
  filePath: string;
}

export interface GameConfig {
  matchIntervalMs: number;
  leaderboardIntervalMs: number;
  seasonWaitMs: number;
  defaultModel: string;
  availableModels: string[];
  aiCostMarkupPercent: number;
  initialBalance: number;
  openRouterBaseUrl: string;
  platformApiKey: string;
  maxMovesPerMatch: number;
  robotMaxPerUser: number;
  maxMatchesPerRobotPerDay: number;
}

export interface Config {
  app: AppConfig;
  server: ServerConfig;
  db: DbConfig;
  log: LogConfig;
  game: GameConfig;
  encryptionSalt: string;
}

const config: Config = {
  app: {
    name: "AI Chess Arena",
    version: "1.0.0",
    env: (process.env.NODE_ENV as AppConfig["env"]) || "development",
    defaultLang: "zh",
    supportedLangs: ["zh", "en"],
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    apiPrefix: "/api",
    corsOrigins: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3001"],
  },
  db: {
    host: secrets.db?.host || process.env.DB_HOST || "localhost",
    port: secrets.db?.port || Number(process.env.DB_PORT) || 3306,
    user: secrets.db?.user || process.env.DB_USER || "root",
    password: secrets.db?.password || process.env.DB_PASS || "123456",
    database: secrets.db?.database || process.env.DB_NAME || "game_ai",
    connectionLimit: 10,
  },
  log: {
    level: "debug",
    enableConsole: true,
    enableFile: false,
    filePath: "./logs/app.log",
  },
  game: {
    matchIntervalMs: 10000,
    leaderboardIntervalMs: 86400000,
    seasonWaitMs: 600000,
    defaultModel: "x-ai/grok-code-fast-1",
    availableModels: [
      "x-ai/grok-code-fast-1",
      "minimax/minimax-m2.5",
      "moonshotai/kimi-k2.5",
      "z-ai/glm-5",
    ],
    aiCostMarkupPercent: 10,
    initialBalance: 5.00,
    openRouterBaseUrl: "https://openrouter.ai/api/v1",
    platformApiKey: secrets.openrouter_api_key || process.env.OPENROUTER_KEY || "",
    maxMovesPerMatch: 200,
    robotMaxPerUser: 5,
    maxMatchesPerRobotPerDay: 30,
  },
  encryptionSalt: secrets.encryption_salt || "openrace",
};

export default config;
