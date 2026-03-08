// ============================================================
// LeaderboardService.ts — Season and leaderboard management.
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";
import { LogCenter } from "../log/LogCenter";
import config from "../config/config";

export interface SeasonRow extends RowDataPacket {
  id: number;
  status: "active" | "waiting" | "ended";
  started_at: string;
  ended_at: string | null;
}

export interface SnapshotRow extends RowDataPacket {
  id: number;
  season_id: number;
  robot_id: number;
  rank_position: number;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  snapshotted_at: string;
  robot_name?: string;
  username?: string;
}

export class LeaderboardService {
  static async getCurrentSeason(): Promise<SeasonRow | null> {
    const rows = await DbTool.query<SeasonRow>(
      "SELECT * FROM seasons WHERE status = 'active' ORDER BY id DESC LIMIT 1",
      []
    );
    return rows[0] ?? null;
  }

  static async startNewSeason(): Promise<number> {
    const result = await DbTool.execute(
      "INSERT INTO seasons (status) VALUES ('active')",
      []
    );
    LogCenter.info("LeaderboardService", `New season started: id=${result.insertId}`);
    return result.insertId;
  }

  static async endSeason(seasonId: number): Promise<void> {
    await DbTool.execute(
      "UPDATE seasons SET status = 'ended', ended_at = NOW() WHERE id = ?",
      [seasonId]
    );
    LogCenter.info("LeaderboardService", `Season ${seasonId} ended`);
  }

  static async setSeasonWaiting(seasonId: number): Promise<void> {
    await DbTool.execute(
      "UPDATE seasons SET status = 'waiting', ended_at = NOW() WHERE id = ?",
      [seasonId]
    );
  }

  static async takeSnapshot(seasonId: number): Promise<void> {
    const robots = await DbTool.query<RowDataPacket & {
      id: number; elo: number; wins: number; losses: number; draws: number;
    }>(
      `SELECT r.id, r.elo, r.wins, r.losses, r.draws
       FROM robots r
       JOIN matches m ON (m.robot_white_id = r.id OR m.robot_black_id = r.id)
       WHERE m.season_id = ?
       GROUP BY r.id
       ORDER BY r.elo DESC`,
      [seasonId]
    );

    for (let i = 0; i < robots.length; i++) {
      const r = robots[i];
      await DbTool.execute(
        `INSERT INTO leaderboard_snapshots (season_id, robot_id, rank_position, elo, wins, losses, draws)
         VALUES (?,?,?,?,?,?,?)`,
        [seasonId, r.id, i + 1, r.elo, r.wins, r.losses, r.draws]
      );
    }
    LogCenter.info("LeaderboardService", `Snapshot taken for season ${seasonId}, ${robots.length} robots`);
  }

  static async getLatestSnapshot(seasonId: number): Promise<SnapshotRow[]> {
    return DbTool.query<SnapshotRow>(
      `SELECT ls.*, r.name as robot_name, u.username, r.game_type
       FROM leaderboard_snapshots ls
       JOIN robots r ON r.id = ls.robot_id
       JOIN users u ON u.id = r.user_id
       WHERE ls.season_id = ?
         AND ls.snapshotted_at = (
           SELECT MAX(snapshotted_at) FROM leaderboard_snapshots WHERE season_id = ?
         )
       ORDER BY ls.rank_position ASC`,
      [seasonId, seasonId]
    );
  }

  /** Get all-time leaderboard (current points rankings) */
  static async getAllTimeLeaderboard(): Promise<SnapshotRow[]> {
    return DbTool.query<SnapshotRow>(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY r.points DESC, r.elo DESC) as rank_position,
        r.id as robot_id,
        r.elo,
        r.points,
        r.wins,
        r.losses,
        r.draws,
        r.name as robot_name,
        r.game_type,
        u.username,
        NOW() as snapshotted_at
       FROM robots r
       JOIN users u ON u.id = r.user_id
       WHERE (r.wins + r.losses + r.draws) > 0
       ORDER BY r.points DESC, r.elo DESC
       LIMIT 100`,
      []
    );
  }

  /** Get weekly leaderboard (matches from last 7 days) */
  static async getWeeklyLeaderboard(): Promise<SnapshotRow[]> {
    return DbTool.query<SnapshotRow>(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN m.winner_id = r.id THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'doudizhu' AND (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id) THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'chess' THEN 1 ELSE 0 END) DESC, r.elo DESC) as rank_position,
        r.id as robot_id,
        r.elo,
        SUM(CASE WHEN m.winner_id = r.id THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'doudizhu' AND (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id) THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'chess' THEN 1 ELSE 0 END) as points,
        COUNT(CASE WHEN m.winner_id = r.id OR (m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'doudizhu' AND (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id)) THEN 1 END) as wins,
        COUNT(CASE WHEN m.status = 'finished' AND m.winner_id != r.id AND m.winner_id IS NOT NULL THEN 1 END) as losses,
        COUNT(CASE WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'chess' THEN 1 END) as draws,
        r.name as robot_name,
        r.game_type,
        u.username,
        NOW() as snapshotted_at
       FROM robots r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN matches m ON (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id)
         AND m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY r.id
       HAVING (wins + losses + draws) > 0
       ORDER BY points DESC, r.elo DESC
       LIMIT 100`,
      []
    );
  }

  /** Get daily leaderboard (matches from today) */
  static async getDailyLeaderboard(): Promise<SnapshotRow[]> {
    return DbTool.query<SnapshotRow>(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN m.winner_id = r.id THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'doudizhu' AND (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id) THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'chess' THEN 1 ELSE 0 END) DESC, r.elo DESC) as rank_position,
        r.id as robot_id,
        r.elo,
        SUM(CASE WHEN m.winner_id = r.id THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'doudizhu' AND (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id) THEN 3 WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'chess' THEN 1 ELSE 0 END) as points,
        COUNT(CASE WHEN m.winner_id = r.id OR (m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'doudizhu' AND (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id)) THEN 1 END) as wins,
        COUNT(CASE WHEN m.status = 'finished' AND m.winner_id != r.id AND m.winner_id IS NOT NULL THEN 1 END) as losses,
        COUNT(CASE WHEN m.status = 'finished' AND m.winner_id IS NULL AND m.game_type = 'chess' THEN 1 END) as draws,
        r.name as robot_name,
        r.game_type,
        u.username,
        NOW() as snapshotted_at
       FROM robots r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN matches m ON (m.robot_white_id = r.id OR m.robot_black_id = r.id OR m.robot_third_id = r.id)
         AND DATE(m.created_at) = CURDATE()
       GROUP BY r.id
       HAVING (wins + losses + draws) > 0
       ORDER BY points DESC, r.elo DESC
       LIMIT 100`,
      []
    );
  }

  static async isSeasonExpired(): Promise<boolean> {
    const season = await LeaderboardService.getCurrentSeason();
    if (!season) return false;
    const ageMs = Date.now() - new Date(season.started_at).getTime();
    return ageMs > config.game.leaderboardIntervalMs;
  }
}
