// ============================================================
// LogCenter.ts — Central log facade. All code logs through here.
// Delegates to LogTool. Add sinks (file, remote) here.
// ============================================================

import { LogTool, LogEntry, LogLevel } from "../tools/LogTool";

export class LogCenter {
  static debug(tag: string, message: string, data?: unknown): void {
    LogTool.debug(tag, message, data);
  }

  static info(tag: string, message: string, data?: unknown): void {
    LogTool.info(tag, message, data);
  }

  static warn(tag: string, message: string, data?: unknown): void {
    LogTool.warn(tag, message, data);
  }

  static error(tag: string, message: string, data?: unknown): void {
    LogTool.error(tag, message, data);
  }

  /** Log an incoming request */
  static request(method: string, path: string, body?: unknown): void {
    LogCenter.info("Request", `${method} ${path}`, body);
  }

  /** Log an outgoing response */
  static response(path: string, code: number, durationMs: number): void {
    LogCenter.info("Response", `${path} → code=${code} (${durationMs}ms)`);
  }

  /** Get buffered log entries (most recent up to 500) */
  static getLogs(level?: LogLevel): LogEntry[] {
    return LogTool.getLogs(level);
  }
}
