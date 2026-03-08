// ============================================================
// BalanceService.ts — User balance management.
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";
import { LogCenter } from "../log/LogCenter";

interface BalanceRow extends RowDataPacket {
  balance: number;
}

interface BalanceLogRow extends RowDataPacket {
  id: number;
  user_id: number;
  match_id: number | null;
  delta: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

export class BalanceService {
  static async getBalance(userId: number): Promise<number> {
    const rows = await DbTool.query<BalanceRow>(
      "SELECT balance FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    return Number(rows[0]?.balance ?? 0);
  }

  /** Deduct amount. Returns false if insufficient balance. */
  static async deduct(
    userId: number,
    amount: number,
    reason: string,
    matchId?: number
  ): Promise<boolean> {
    return DbTool.transaction(async (conn) => {
      const [rows] = await conn.execute<BalanceRow[]>(
        "SELECT balance FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );
      const current = Number(rows[0]?.balance ?? 0);
      if (current < amount) return false;
      const after = current - amount;
      await conn.execute(
        "UPDATE users SET balance = ? WHERE id = ?",
        [after, userId]
      );
      await conn.execute(
        "INSERT INTO balance_log (user_id, match_id, delta, balance_after, reason) VALUES (?,?,?,?,?)",
        [userId, matchId ?? null, -amount, after, reason]
      );
      LogCenter.debug("BalanceService", `Deducted $${amount} from user ${userId}, balance now $${after}`);
      return true;
    });
  }

  static async credit(userId: number, amount: number, reason: string): Promise<void> {
    await DbTool.transaction(async (conn) => {
      const [rows] = await conn.execute<BalanceRow[]>(
        "SELECT balance FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );
      const after = Number(rows[0]?.balance ?? 0) + amount;
      await conn.execute("UPDATE users SET balance = ? WHERE id = ?", [after, userId]);
      await conn.execute(
        "INSERT INTO balance_log (user_id, delta, balance_after, reason) VALUES (?,?,?,?)",
        [userId, amount, after, reason]
      );
    });
  }

  static async getLog(userId: number, limit = 50): Promise<BalanceLogRow[]> {
    return DbTool.query<BalanceLogRow>(
      "SELECT * FROM balance_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, limit]
    );
  }
}
