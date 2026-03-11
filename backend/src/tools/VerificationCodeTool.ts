// ============================================================
// VerificationCodeTool.ts — In-memory email verification codes.
// ============================================================

interface CodeEntry {
  code: string;
  expiresAt: number;
}

export class VerificationCodeTool {
  private static readonly EXPIRES_MS = 10 * 60 * 1000; // 10 minutes
  private static _store: Map<string, CodeEntry> = new Map();

  static generate(email: string): string {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    VerificationCodeTool._store.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + VerificationCodeTool.EXPIRES_MS,
    });
    return code;
  }

  static verify(email: string, code: string): boolean {
    const entry = VerificationCodeTool._store.get(email.toLowerCase());
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      VerificationCodeTool._store.delete(email.toLowerCase());
      return false;
    }
    if (entry.code !== code) return false;
    VerificationCodeTool._store.delete(email.toLowerCase());
    return true;
  }
}
