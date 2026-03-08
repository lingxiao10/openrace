// ============================================================
// DbTool.ts — Independent MySQL tool. No business logic.
// Can be tested standalone via TestCenter.
// ============================================================

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader, OkPacket } from "mysql2/promise";
import config from "../config/config";
import { LogCenter } from "../log/LogCenter";

export class DbTool {
  private static pool: Pool | null = null;

  static init(): void {
    DbTool.pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      connectionLimit: config.db.connectionLimit,
      waitForConnections: true,
    });
    LogCenter.info("DbTool", "MySQL pool created");
  }

  private static getPool(): Pool {
    if (!DbTool.pool) DbTool.init();
    return DbTool.pool!;
  }

  /** Execute a SELECT query, returns typed rows */
  static async query<T extends RowDataPacket>(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<T[]> {
    LogCenter.debug("DbTool", `query: ${sql}`, params);
    const [rows] = await DbTool.getPool().execute<T[]>(sql, params);
    return rows;
  }

  /** Execute INSERT / UPDATE / DELETE */
  static async execute(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<ResultSetHeader> {
    LogCenter.debug("DbTool", `execute: ${sql}`, params);
    const [result] = await DbTool.getPool().execute<ResultSetHeader>(sql, params);
    return result;
  }

  /** Run multiple statements in a transaction */
  static async transaction<T>(
    fn: (conn: PoolConnection) => Promise<T>
  ): Promise<T> {
    const conn = await DbTool.getPool().getConnection();
    await conn.beginTransaction();
    try {
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /** Health check */
  static async ping(): Promise<boolean> {
    try {
      await DbTool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
