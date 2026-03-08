// ============================================================
// LogTool.ts — Independent structured logger. No business logic.
// Wraps console + optional file output. Used by LogCenter.
// ============================================================

import config from "../config/config";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogEntry {
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

export class LogTool {
  private static minLevel: LogLevel = config.log.level;
  private static readonly MAX_BUFFER = 500;
  private static readonly _buffer: LogEntry[] = [];

  static setLevel(level: LogLevel): void {
    LogTool.minLevel = level;
  }

  static getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...LogTool._buffer];
    return LogTool._buffer.filter((e) => e.level === level);
  }

  static log(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[LogTool.minLevel]) return;

    const entry: LogEntry = {
      level,
      tag,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    LogTool._buffer.push(entry);
    if (LogTool._buffer.length > LogTool.MAX_BUFFER) LogTool._buffer.shift();

    if (config.log.enableConsole) {
      LogTool.writeConsole(entry);
    }
  }

  private static writeConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.tag}]`;
    const line = `${prefix} ${entry.message}`;
    switch (entry.level) {
      case "debug": console.debug(line, entry.data ?? ""); break;
      case "info":  console.info(line, entry.data ?? "");  break;
      case "warn":  console.warn(line, entry.data ?? "");  break;
      case "error": console.error(line, entry.data ?? ""); break;
    }
  }

  static debug(tag: string, message: string, data?: unknown): void {
    LogTool.log("debug", tag, message, data);
  }

  static info(tag: string, message: string, data?: unknown): void {
    LogTool.log("info", tag, message, data);
  }

  static warn(tag: string, message: string, data?: unknown): void {
    LogTool.log("warn", tag, message, data);
  }

  static error(tag: string, message: string, data?: unknown): void {
    LogTool.log("error", tag, message, data);
  }
}
