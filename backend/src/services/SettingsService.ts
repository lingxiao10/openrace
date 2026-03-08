// ============================================================
// SettingsService.ts — User settings (API key storage).
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";
import { EncryptTool } from "../tools/EncryptTool";

interface SettingsRow extends RowDataPacket {
  id: number;
  user_id: number;
  openrouter_key: string | null;
}

export class SettingsService {
  static async getApiKey(userId: number): Promise<string | null> {
    const rows = await DbTool.query<SettingsRow>(
      "SELECT openrouter_key FROM user_settings WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const raw = rows[0]?.openrouter_key;
    if (!raw) return null;
    return EncryptTool.decrypt(raw);
  }

  static async setApiKey(userId: number, plainKey: string): Promise<void> {
    const encrypted = EncryptTool.encrypt(plainKey);
    await DbTool.execute(
      `INSERT INTO user_settings (user_id, openrouter_key)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE openrouter_key = VALUES(openrouter_key)`,
      [userId, encrypted]
    );
  }

  static async deleteApiKey(userId: number): Promise<void> {
    await DbTool.execute(
      "UPDATE user_settings SET openrouter_key = NULL WHERE user_id = ?",
      [userId]
    );
  }

  static async hasApiKey(userId: number): Promise<boolean> {
    const rows = await DbTool.query<SettingsRow>(
      "SELECT openrouter_key FROM user_settings WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return Boolean(rows[0]?.openrouter_key);
  }
}
