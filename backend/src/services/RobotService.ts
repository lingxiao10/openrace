// ============================================================
// RobotService.ts — Robot CRUD and stats.
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";
import { EmailTool } from "../tools/EmailTool";
import { LogCenter } from "../log/LogCenter";
import { UserService } from "./UserService";
import config from "../config/config";

export interface RobotRow extends RowDataPacket {
  id: number;
  user_id: number;
  name: string;
  model: string;
  strategy: string | null;
  game_type: "chess" | "doudizhu";
  status: "active" | "suspended";
  wins: number;
  losses: number;
  draws: number;
  elo: number;
  points: number;
  provider: string | null;
  api_key_encrypted: string | null;
  base_url: string | null;
  error_count: number;
  removed: number;
  created_at: string;
}

export class RobotService {
  static async checkNameExists(name: string): Promise<boolean> {
    const rows = await DbTool.query<RobotRow>(
      "SELECT id FROM robots WHERE name = ? AND removed = 0 LIMIT 1",
      [name]
    );
    return rows.length > 0;
  }

  static async create(
    userId: number,
    name: string,
    model: string,
    strategy: string | null,
    gameType: "chess" | "doudizhu" = "chess",
    provider: string,
    apiKeyEncrypted: string,
    baseUrl: string | null = null
  ): Promise<number> {
    const result = await DbTool.execute(
      "INSERT INTO robots (user_id, name, model, strategy, game_type, provider, api_key_encrypted, base_url) VALUES (?,?,?,?,?,?,?,?)",
      [userId, name, model, strategy, gameType, provider, apiKeyEncrypted, baseUrl]
    );
    LogCenter.info("RobotService", `Created robot id=${result.insertId} for user ${userId}, game=${gameType}, provider=${provider}`);
    return result.insertId;
  }

  static async findByUser(userId: number): Promise<RobotRow[]> {
    return DbTool.query<RobotRow>(
      "SELECT * FROM robots WHERE user_id = ? AND removed = 0 ORDER BY created_at DESC",
      [userId]
    );
  }

  static async findById(id: number): Promise<RobotRow | null> {
    const rows = await DbTool.query<RobotRow>(
      "SELECT * FROM robots WHERE id = ? AND removed = 0 LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  }

  static async update(
    id: number,
    userId: number,
    fields: Partial<Pick<RobotRow, "name" | "strategy" | "status">>
  ): Promise<boolean> {
    // API信息（provider, model, api_key_encrypted）不允许修改
    const sets: string[] = [];
    const vals: (string | number | boolean | null)[] = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      vals.push(v as string | number | boolean | null);
    }
    if (!sets.length) return false;
    vals.push(id, userId);
    const result = await DbTool.execute(
      `UPDATE robots SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
      vals
    );
    return result.affectedRows > 0;
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const result = await DbTool.execute(
      "UPDATE robots SET removed = 1 WHERE id = ? AND user_id = ?",
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  static async suspend(id: number, reason?: string): Promise<void> {
    await DbTool.execute("UPDATE robots SET status = 'suspended' WHERE id = ?", [id]);
    LogCenter.info("RobotService", `Robot ${id} suspended${reason ? `: ${reason}` : ""}`);

    // 发送邮件通知用户
    if (reason) {
      const robot = await RobotService.findById(id);
      if (robot) {
        const user = await UserService.findById(robot.user_id);
        if (user?.email) {
          await EmailTool.sendRobotSuspendedNotification(user.email, robot.name, reason);
        }
      }
    }
  }

  static async incrementErrorCount(id: number): Promise<number> {
    await DbTool.execute("UPDATE robots SET error_count = error_count + 1 WHERE id = ?", [id]);
    const rows = await DbTool.query<RobotRow>("SELECT error_count FROM robots WHERE id = ? LIMIT 1", [id]);
    return rows[0]?.error_count ?? 0;
  }

  static async resetErrorCount(id: number): Promise<void> {
    await DbTool.execute("UPDATE robots SET error_count = 0 WHERE id = ?", [id]);
  }

  static async activate(id: number): Promise<void> {
    await DbTool.execute("UPDATE robots SET status = 'active' WHERE id = ?", [id]);
  }

  static async updateStats(
    id: number,
    result: "win" | "loss" | "draw",
    eloDelta: number
  ): Promise<void> {
    const col = result === "win" ? "wins" : result === "loss" ? "losses" : "draws";
    // 积分系统：赢=3分，平=1分，输=0分
    const pointsDelta = result === "win" ? 3 : result === "draw" ? 1 : 0;
    await DbTool.execute(
      `UPDATE robots SET ${col} = ${col} + 1, elo = elo + ?, points = points + ? WHERE id = ?`,
      [eloDelta, pointsDelta, id]
    );
  }

  static async getActiveRobots(): Promise<RobotRow[]> {
    return DbTool.query<RobotRow>(
      "SELECT * FROM robots WHERE status = 'active' AND removed = 0",
      []
    );
  }

  static async getActiveRobotsByGameType(gameType: "chess" | "doudizhu"): Promise<RobotRow[]> {
    return DbTool.query<RobotRow>(
      "SELECT * FROM robots WHERE status = 'active' AND removed = 0 AND game_type = ?",
      [gameType]
    );
  }

  static async countByUser(userId: number): Promise<number> {
    const rows = await DbTool.query<RowDataPacket & { cnt: number }>(
      "SELECT COUNT(*) as cnt FROM robots WHERE user_id = ? AND removed = 0",
      [userId]
    );
    return rows[0]?.cnt ?? 0;
  }

  static canCreate(count: number): boolean {
    return count < config.game.robotMaxPerUser;
  }

  static async countAll(): Promise<number> {
    const rows = await DbTool.query<RowDataPacket & { cnt: number }>(
      "SELECT COUNT(*) as cnt FROM robots WHERE removed = 0", []
    );
    return rows[0]?.cnt ?? 0;
  }

  static async countActive(): Promise<number> {
    const rows = await DbTool.query<RowDataPacket & { cnt: number }>(
      "SELECT COUNT(*) as cnt FROM robots WHERE status = 'active' AND removed = 0", []
    );
    return rows[0]?.cnt ?? 0;
  }

  static async countInGame(): Promise<number> {
    const rows = await DbTool.query<RowDataPacket & { cnt: number }>(
      `SELECT COUNT(*) as cnt FROM (
         SELECT robot_white_id as rid FROM matches WHERE status = 'running'
         UNION
         SELECT robot_black_id FROM matches WHERE status = 'running'
         UNION
         SELECT robot_third_id FROM matches WHERE status = 'running' AND robot_third_id IS NOT NULL
       ) t`,
      []
    );
    return rows[0]?.cnt ?? 0;
  }

  static async countEligible(): Promise<number> {
    const { PROVIDERS } = await import("../config/providers");
    const noKeyProviders = PROVIDERS.filter(p => !p.requiresApiKey).map(p => `'${p.id}'`);

    let keyCheck = `(r.api_key_encrypted IS NOT NULL AND TRIM(r.api_key_encrypted) != '')`;
    if (noKeyProviders.length > 0) {
      keyCheck = `(${keyCheck} OR r.provider IN (${noKeyProviders.join(",")}))`;
    }

    const rows = await DbTool.query<RowDataPacket & { cnt: number }>(
      `SELECT COUNT(DISTINCT r.id) as cnt
       FROM robots r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.status = 'active' AND r.removed = 0 AND ${keyCheck}`,
      []
    );
    return rows[0]?.cnt ?? 0;
  }

  /** Get today's match count for a robot (based on New York time) */
  static async getTodayMatchCount(robotId: number): Promise<number> {
    const rows = await DbTool.query<RowDataPacket & { cnt: number }>(
      `SELECT COUNT(*) as cnt FROM matches
       WHERE (robot_white_id = ? OR robot_black_id = ? OR robot_third_id = ?)
       AND status IN ('finished', 'forfeited')
       AND DATE(CONVERT_TZ(finished_at, '+00:00', '-05:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-05:00'))`,
      [robotId, robotId, robotId]
    );
    return rows[0]?.cnt ?? 0;
  }
}
