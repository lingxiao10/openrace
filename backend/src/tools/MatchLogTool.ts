// ============================================================
// MatchLogTool.ts — Per-match detailed logging to file
// ============================================================

import * as fs from "fs";
import * as path from "path";

export class MatchLogTool {
  private static logDir = path.join(__dirname, "../../logs/matches");

  static init(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  static getLogPath(matchId: number, gameType: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return path.join(this.logDir, `match_${matchId}_${gameType}_${timestamp}.log`);
  }

  static log(logPath: string, message: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logPath, line, "utf8");
  }

  static logMatchStart(logPath: string, matchId: number, gameType: string, players: string[]): void {
    this.log(logPath, `========================================`);
    this.log(logPath, `Match ${matchId} Started - Game Type: ${gameType}`);
    this.log(logPath, `Players: ${players.join(" vs ")}`);
    this.log(logPath, `========================================`);
  }

  static logMove(
    logPath: string,
    moveNum: number,
    robotId: number,
    robotName: string,
    move: string,
    tokens: number,
    cost: number,
    state: string
  ): void {
    this.log(logPath, `Move ${moveNum}: Robot ${robotId} (${robotName}) -> ${move}`);
    this.log(logPath, `  Tokens: ${tokens}, Cost: $${cost.toFixed(6)}`);
    this.log(logPath, `  State: ${state}`);
  }

  static logAiAttempt(
    logPath: string,
    attempt: number,
    robotId: number,
    robotName: string,
    success: boolean,
    error?: string
  ): void {
    if (success) {
      this.log(logPath, `  AI Attempt ${attempt}/3: SUCCESS`);
    } else {
      this.log(logPath, `  AI Attempt ${attempt}/3: FAILED - ${error}`);
    }
  }

  static logForfeit(logPath: string, robotId: number, robotName: string, reason: string): void {
    this.log(logPath, `========================================`);
    this.log(logPath, `FORFEIT: Robot ${robotId} (${robotName})`);
    this.log(logPath, `Reason: ${reason}`);
    this.log(logPath, `========================================`);
  }

  static logMatchEnd(logPath: string, result: string, winnerId?: number, winnerName?: string): void {
    this.log(logPath, `========================================`);
    this.log(logPath, `Match Ended - Result: ${result}`);
    if (winnerId && winnerName) {
      this.log(logPath, `Winner: Robot ${winnerId} (${winnerName})`);
    }
    this.log(logPath, `========================================`);
  }
}
