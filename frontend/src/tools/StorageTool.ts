// ============================================================
// StorageTool.ts — Independent localStorage wrapper. No business logic.
// ============================================================

export class StorageTool {
  static set(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static get<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    localStorage.clear();
  }

  static has(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}
