// ============================================================
// AdminService.ts — Admin-only data queries.
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";
import { LogCenter } from "../log/LogCenter";

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

interface RobotRow extends RowDataPacket {
  id: number;
  user_id: number;
  username: string;
  name: string;
  model: string;
  game_type: string;
  status: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  created_at: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

export class AdminService {
  static async getUserList(page: number, limit: number): Promise<{ rows: UserRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const limitInt = Math.trunc(limit);
    const offsetInt = Math.trunc(offset);
    LogCenter.info("AdminService", `getUserList page=${page} limit=${limitInt} offset=${offsetInt} (types: limit=${typeof limitInt} offset=${typeof offsetInt})`);
    try {
      const [rows, counts] = await Promise.all([
        DbTool.query<UserRow>(
          `SELECT id, username, email, role, created_at FROM users ORDER BY id DESC LIMIT ${limitInt} OFFSET ${offsetInt}`
        ),
        DbTool.query<CountRow>("SELECT COUNT(*) AS total FROM users"),
      ]);
      return { rows, total: counts[0]?.total ?? 0 };
    } catch (err: any) {
      LogCenter.error("AdminService", `getUserList SQL error: ${err.message}`, { stack: err.stack });
      throw err;
    }
  }

  static async getRobotList(page: number, limit: number): Promise<{ rows: RobotRow[]; total: number }> {
    const offset = (page - 1) * limit;
    const limitInt = Math.trunc(limit);
    const offsetInt = Math.trunc(offset);
    LogCenter.info("AdminService", `getRobotList page=${page} limit=${limitInt} offset=${offsetInt} (types: limit=${typeof limitInt} offset=${typeof offsetInt})`);
    try {
      const [rows, counts] = await Promise.all([
        DbTool.query<RobotRow>(
          `SELECT r.id, r.user_id, u.username, r.name, r.model, r.game_type, r.status,
                  r.wins, r.losses, r.draws, r.points, r.created_at
           FROM robots r
           LEFT JOIN users u ON r.user_id = u.id
           WHERE r.removed = 0
           ORDER BY r.id DESC
           LIMIT ${limitInt} OFFSET ${offsetInt}`
        ),
        DbTool.query<CountRow>("SELECT COUNT(*) AS total FROM robots WHERE removed = 0"),
      ]);
      return { rows, total: counts[0]?.total ?? 0 };
    } catch (err: any) {
      LogCenter.error("AdminService", `getRobotList SQL error: ${err.message}`, { stack: err.stack });
      throw err;
    }
  }
}
