// ============================================================
// LogCenter.ts — Frontend log facade.
// ============================================================

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

export class LogCenter {
  private static minLevel: LogLevel = "debug";

  static setLevel(level: LogLevel): void {
    LogCenter.minLevel = level;
  }

  static debug(tag: string, message: string, data?: unknown): void {
    LogCenter.log("debug", tag, message, data);
  }

  static info(tag: string, message: string, data?: unknown): void {
    LogCenter.log("info", tag, message, data);
  }

  static warn(tag: string, message: string, data?: unknown): void {
    LogCenter.log("warn", tag, message, data);
  }

  static error(tag: string, message: string, data?: unknown): void {
    LogCenter.log("error", tag, message, data);
  }

  private static log(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[LogCenter.minLevel]) return;
    const prefix = `[${level.toUpperCase()}][${tag}]`;
    const args = data !== undefined ? [prefix, message, data] : [prefix, message];
    switch (level) {
      case "debug": console.debug(...args); break;
      case "info":  console.info(...args);  break;
      case "warn":  console.warn(...args);  break;
      case "error": console.error(...args); break;
    }
  }
}
