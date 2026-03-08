// ============================================================
// EncryptTool.ts — AES-256-CBC symmetric encrypt/decrypt.
// Used to store OpenRouter API keys at rest.
// ============================================================

import crypto from "crypto";
import config from "../config/config";

const ALGORITHM = "aes-256-cbc";
const KEY_LEN = 32;
const IV_LEN = 16;

function deriveKey(): Buffer {
  const salt = config.encryptionSalt || "openrace";
  return crypto.createHash("sha256").update(salt).digest();
}

export class EncryptTool {
  static encrypt(plain: string): string {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  }

  static decrypt(cipherText: string): string {
    const [ivHex, encHex] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const enc = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(), iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  }

  static isEncrypted(value: string): boolean {
    return /^[0-9a-f]{32}:[0-9a-f]+$/.test(value);
  }
}
