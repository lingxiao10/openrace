// ============================================================
// GameScheduler.ts — Starts all background intervals.
// Called once from app.ts after DB init.
// ============================================================

import { AppLogic } from "../AppLogic";
import { LogCenter } from "../log/LogCenter";
import config from "../config/config";

export class GameScheduler {
  static start(): void {
    GameScheduler.startMatchmaking();
    GameScheduler.startLeaderboard();
    LogCenter.info("GameScheduler", "Scheduler started");
  }

  private static startMatchmaking(): void {
    setInterval(
      () => GameScheduler.matchmakingTick(),
      config.game.matchIntervalMs
    );
    LogCenter.info("GameScheduler", `Matchmaking every ${config.game.matchIntervalMs}ms`);
  }

  private static startLeaderboard(): void {
    setInterval(
      () => GameScheduler.leaderboardTick(),
      config.game.leaderboardIntervalMs
    );
    LogCenter.info("GameScheduler", `Leaderboard snapshot every ${config.game.leaderboardIntervalMs}ms`);
  }

  private static async matchmakingTick(): Promise<void> {
    LogCenter.debug("GameScheduler", "Matchmaking tick");
    await AppLogic.handleMatchmakingTick().catch((err) =>
      LogCenter.error("GameScheduler", `Matchmaking error: ${err.message}`)
    );
  }

  private static async leaderboardTick(): Promise<void> {
    LogCenter.debug("GameScheduler", "Leaderboard tick");
    await AppLogic.handleLeaderboardTick().catch((err) =>
      LogCenter.error("GameScheduler", `Leaderboard error: ${err.message}`)
    );
  }
}
