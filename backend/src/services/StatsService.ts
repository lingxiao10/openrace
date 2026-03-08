// ============================================================
// StatsService.ts — Platform stats and matchmaking tick log.
// ============================================================

import { RobotService } from "./RobotService";
import { MatchService } from "./MatchService";
import { GameService } from "./GameService";
import config from "../config/config";

export interface PlatformStats {
  total_robots: number;
  active_robots: number;
  in_game_robots: number;
  idle_robots: number;
  eligible_robots: number;
  last_tick_time: string | null;
  next_tick_time: string | null;
  tick_interval_ms: number;
}

export interface TickMatchSummary {
  id: number;
  white_name: string;
  black_name: string;
  status: string;
  winner_id: number | null;
}

export interface EnrichedTick {
  time: string;
  match_count: number;
  matches: TickMatchSummary[];
}

export class StatsService {
  static async getPlatformStats(): Promise<PlatformStats> {
    const total = await RobotService.countAll();
    const active = await RobotService.countActive();
    const inGame = await RobotService.countInGame();
    const eligible = await RobotService.countEligible();
    const lastTickTime = GameService.getLastTickTime();
    const nextTickTime = lastTickTime
      ? new Date(new Date(lastTickTime).getTime() + config.game.matchIntervalMs).toISOString()
      : null;
    return {
      total_robots: total,
      active_robots: active,
      in_game_robots: inGame,
      idle_robots: Math.max(0, active - inGame),
      eligible_robots: eligible,
      last_tick_time: lastTickTime,
      next_tick_time: nextTickTime,
      tick_interval_ms: config.game.matchIntervalMs,
    };
  }

  static async getEnrichedTicks(): Promise<EnrichedTick[]> {
    const ticks = GameService.getTicks();
    const result: EnrichedTick[] = [];

    // 只返回有对局的轮次，最多20条
    for (const tick of ticks) {
      if (tick.match_ids.length === 0) continue; // 跳过没有对局的轮次

      const rows = await MatchService.getMatchesByIds(tick.match_ids);
      result.push({
        time: tick.time,
        match_count: tick.match_ids.length,
        matches: rows.map((m) => ({
          id: m.id,
          white_name: (m as Record<string, unknown>).white_name as string,
          black_name: (m as Record<string, unknown>).black_name as string,
          third_name: (m as Record<string, unknown>).third_name as string | undefined,
          game_type: m.game_type,
          status: m.status,
          winner_id: m.winner_id,
        })),
      });

      if (result.length >= 20) break; // 最多返回20条
    }

    return result;
  }
}
