// ============================================================
// UserService.ts — Business adapter for user operations.
// Uses DbTool + AuthTool. Returns plain data; never touches HTTP.
// ============================================================

import { RowDataPacket } from "mysql2/promise";
import { DbTool } from "../tools/DbTool";
import { AuthTool } from "../tools/AuthTool";
import { LogCenter } from "../log/LogCenter";

export interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  balance: number;
  created_at: string;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  role: string;
  balance: number;
}

export class UserService {
  static async findById(id: number): Promise<UserRow | null> {
    const rows = await DbTool.query<UserRow>(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  }

  static async findByUsername(username: string): Promise<UserRow | null> {
    const rows = await DbTool.query<UserRow>(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    return rows[0] ?? null;
  }

  static async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await DbTool.query<UserRow>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows[0] ?? null;
  }

  static async create(
    username: string,
    password: string,
    email: string,
    role = "user"
  ): Promise<number> {
    const hash = AuthTool.hashPassword(password);
    const result = await DbTool.execute(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, hash, role]
    );
    LogCenter.info("UserService", `Created user id=${result.insertId}`);
    return result.insertId;
  }

  static async login(
    username: string,
    password: string
  ): Promise<{ token: string; user: PublicUser } | null> {
    const user = await UserService.findByUsername(username);
    if (!user) return null;
    if (!AuthTool.checkPassword(password, user.password_hash)) return null;
    const token = AuthTool.createToken({ userId: user.id, role: user.role });
    return { token, user: UserService.toPublic(user) };
  }

  static toPublic(user: UserRow): PublicUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      balance: Number(user.balance),
    };
  }

  static async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<"ok" | "wrong_password" | "not_found"> {
    const user = await UserService.findById(userId);
    if (!user) return "not_found";
    if (!AuthTool.checkPassword(oldPassword, user.password_hash)) return "wrong_password";
    const hash = AuthTool.hashPassword(newPassword);
    await DbTool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
    LogCenter.info("UserService", `Password changed for user id=${userId}`);
    return "ok";
  }

  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
