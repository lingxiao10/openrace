// ============================================================
// AuthTool.ts — Independent auth/token tool. No business logic.
// ============================================================

import crypto from "crypto";

export interface TokenPayload {
  userId: number;
  role: string;
  exp: number;
}

export class AuthTool {
  private static secret = process.env.JWT_SECRET || "change_me_in_production";

  /** Create a simple signed token (base64 payload + HMAC signature) */
  static createToken(payload: Omit<TokenPayload, "exp">, ttlSeconds = 86400): string {
    const full: TokenPayload = { ...payload, exp: Date.now() + ttlSeconds * 1000 };
    const data = Buffer.from(JSON.stringify(full)).toString("base64url");
    const sig = AuthTool.sign(data);
    return `${data}.${sig}`;
  }

  /** Verify and decode a token. Returns null if invalid/expired. */
  static verifyToken(token: string): TokenPayload | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    if (AuthTool.sign(data) !== sig) return null;
    try {
      const payload: TokenPayload = JSON.parse(
        Buffer.from(data, "base64url").toString("utf8")
      );
      if (payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  static hashPassword(plain: string): string {
    return crypto.createHmac("sha256", AuthTool.secret).update(plain).digest("hex");
  }

  static checkPassword(plain: string, hashed: string): boolean {
    return AuthTool.hashPassword(plain) === hashed;
  }

  private static sign(data: string): string {
    return crypto.createHmac("sha256", AuthTool.secret).update(data).digest("base64url");
  }
}
