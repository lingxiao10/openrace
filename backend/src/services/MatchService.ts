// ============================================================
// MatchService.ts — Match lifecycle and move recording.
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";

export interface MatchRow extends RowDataPacket {
  id: number;
  season_id: number;
  game_type: "chess" | "doudizhu";
  robot_white_id: number;
  robot_black_id: number;
  robot_third_id: number | null;
  robot_landlord_id: number | null;
  status: "pending" | "running" | "finished" | "forfeited";
  winner_id: number | null;
  forfeit_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface MoveRow extends RowDataPacket {
  id: number;
  match_id: number;
  move_number: number;
  robot_id: number;
  move_uci: string;
  fen_after: string;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
}

export class MatchService {
  static async createMatch(
    seasonId: number,
    whiteId: number,
    blackId: number
  ): Promise<number> {
    const result = await DbTool.execute(
      "INSERT INTO matches (season_id, game_type, robot_white_id, robot_black_id) VALUES (?,?,?,?)",
      [seasonId, "chess", whiteId, blackId]
    );
    return result.insertId;
  }

  static async createDoudizhuMatch(
    seasonId: number,
    player1Id: number,
    player2Id: number,
    player3Id: number,
    landlordId: number
  ): Promise<number> {
    const result = await DbTool.execute(
      "INSERT INTO matches (season_id, game_type, robot_white_id, robot_black_id, robot_third_id, robot_landlord_id) VALUES (?,?,?,?,?,?)",
      [seasonId, "doudizhu", player1Id, player2Id, player3Id, landlordId]
    );
    return result.insertId;
  }

  static async startMatch(matchId: number): Promise<void> {
    await DbTool.execute(
      "UPDATE matches SET status = 'running', started_at = NOW() WHERE id = ?",
      [matchId]
    );
  }

  static async recordMove(
    matchId: number,
    moveNumber: number,
    robotId: number,
    moveUci: string,
    fenAfter: string,
    tokensUsed: number,
    costUsd: number
  ): Promise<void> {
    await DbTool.execute(
      "INSERT INTO match_moves (match_id, move_number, robot_id, move_uci, fen_after, tokens_used, cost_usd) VALUES (?,?,?,?,?,?,?)",
      [matchId, moveNumber, robotId, moveUci, fenAfter, tokensUsed, costUsd]
    );
  }

  static async finishMatch(
    matchId: number,
    winnerId: number | null,
    forfeitReason?: string,
    forfeitRobotId?: number
  ): Promise<void> {
    const status = forfeitReason ? "forfeited" : "finished";
    await DbTool.execute(
      "UPDATE matches SET status = ?, winner_id = ?, forfeit_reason = ?, finished_at = NOW() WHERE id = ?",
      [status, winnerId, forfeitReason ?? null, matchId]
    );
  }

  static async getMatch(matchId: number): Promise<MatchRow | null> {
    const rows = await DbTool.query<MatchRow>(
      `SELECT m.*,
        rw.name as white_name, rw.elo as white_elo, rw.user_id as white_user_id,
        rb.name as black_name, rb.elo as black_elo, rb.user_id as black_user_id,
        rt.name as third_name, rt.elo as third_elo, rt.user_id as third_user_id
       FROM matches m
       JOIN robots rw ON rw.id = m.robot_white_id
       JOIN robots rb ON rb.id = m.robot_black_id
       LEFT JOIN robots rt ON rt.id = m.robot_third_id
       WHERE m.id = ? LIMIT 1`,
      [matchId]
    );
    return rows[0] ?? null;
  }

  static async getMoves(matchId: number): Promise<MoveRow[]> {
    return DbTool.query<MoveRow>(
      "SELECT * FROM match_moves WHERE match_id = ? ORDER BY move_number ASC",
      [matchId]
    );
  }

  static async getRecentMatches(limit = 20): Promise<MatchRow[]> {
    const n = Math.min(Math.max(1, Math.floor(limit)), 200);
    return DbTool.query<MatchRow>(
      `SELECT m.*,
        rw.name as white_name, rb.name as black_name,
        rt.name as third_name
       FROM matches m
       JOIN robots rw ON rw.id = m.robot_white_id
       JOIN robots rb ON rb.id = m.robot_black_id
       LEFT JOIN robots rt ON rt.id = m.robot_third_id
       ORDER BY m.created_at DESC LIMIT ${n}`,
      []
    );
  }

  static async getMatchesByRobot(robotId: number, limit = 20): Promise<MatchRow[]> {
    const n = Math.min(Math.max(1, Math.floor(limit)), 200);
    return DbTool.query<MatchRow>(
      `SELECT m.*,
        rw.name as white_name, rb.name as black_name,
        rt.name as third_name
       FROM matches m
       JOIN robots rw ON rw.id = m.robot_white_id
       JOIN robots rb ON rb.id = m.robot_black_id
       LEFT JOIN robots rt ON rt.id = m.robot_third_id
       WHERE m.robot_white_id = ? OR m.robot_black_id = ? OR m.robot_third_id = ?
       ORDER BY m.created_at DESC LIMIT ${n}`,
      [robotId, robotId, robotId]
    );
  }
  static async getPendingMatches(): Promise<MatchRow[]> {
    return DbTool.query<MatchRow>(
      "SELECT * FROM matches WHERE status = 'pending' ORDER BY created_at ASC",
      []
    );
  }

  static async getRunningMatches(): Promise<MatchRow[]> {
    return DbTool.query<MatchRow>(
      "SELECT * FROM matches WHERE status = 'running'",
      []
    );
  }

  /** Returns robot IDs that are currently in a pending or running match */
  static async getBusyRobotIds(): Promise<Set<number>> {
    const rows = await DbTool.query<RowDataPacket & { rid: number }>(
      `SELECT robot_white_id AS rid FROM matches WHERE status IN ('pending','running')
       UNION
       SELECT robot_black_id FROM matches WHERE status IN ('pending','running')
       UNION
       SELECT robot_third_id FROM matches WHERE status IN ('pending','running') AND robot_third_id IS NOT NULL`,
      []
    );
    return new Set(rows.map((r) => r.rid));
  }

  static async getMatchesByIds(ids: number[]): Promise<MatchRow[]> {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    return DbTool.query<MatchRow>(
      `SELECT m.*,
              rw.name as white_name,
              rb.name as black_name,
              rt.name as third_name
       FROM matches m
       JOIN robots rw ON rw.id = m.robot_white_id
       JOIN robots rb ON rb.id = m.robot_black_id
       LEFT JOIN robots rt ON rt.id = m.robot_third_id
       WHERE m.id IN (${placeholders})`,
      ids
    );
  }
}
