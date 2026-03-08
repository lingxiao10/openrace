// ============================================================
// Config.ts — Frontend config store. Populated from backend /api/init.
// Frontend never hardcodes config values.
// ============================================================

export interface FrontendConfig {
  app_name: string;
  version: string;
  default_lang: string;
  supported_langs: string[];
  [key: string]: unknown;
}

export class Config {
  private static _data: FrontendConfig = {
    app_name: "",
    version: "",
    default_lang: "zh",
    supported_langs: ["zh", "en"],
  };

  static load(data: FrontendConfig): void {
    Config._data = { ...Config._data, ...data };
  }

  static get<K extends keyof FrontendConfig>(key: K): FrontendConfig[K] {
    return Config._data[key];
  }

  static getAll(): FrontendConfig {
    return { ...Config._data };
  }

  static getLang(): string {
    return Config._data.default_lang;
  }
}
