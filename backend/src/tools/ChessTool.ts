// ============================================================
// ChessTool.ts — Pure chess logic wrapper around chess.js.
// No DB, no HTTP. Independently testable.
// ============================================================

import { Chess } from "chess.js";

export type ChessColor = "w" | "b";

export interface GameOverResult {
  over: boolean;
  result: "white" | "black" | "draw" | null;
  reason: string;
}

export class ChessTool {
  static getInitialFen(): string {
    return new Chess().fen();
  }

  static isMoveLegal(fen: string, moveUci: string): boolean {
    try {
      const chess = new Chess(fen);
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length === 5 ? moveUci[4] : undefined;
      const result = chess.move({ from, to, promotion });
      return result !== null;
    } catch {
      return false;
    }
  }

  /** Returns new FEN after move, or null if illegal */
  static applyMove(fen: string, moveUci: string): string | null {
    try {
      const chess = new Chess(fen);
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length === 5 ? moveUci[4] : undefined;
      const result = chess.move({ from, to, promotion });
      if (!result) return null;
      return chess.fen();
    } catch {
      return null;
    }
  }

  static isGameOver(fen: string): GameOverResult {
    const chess = new Chess(fen);
    if (!chess.isGameOver()) return { over: false, result: null, reason: "" };
    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "black" : "white";
      return { over: true, result: winner, reason: "checkmate" };
    }
    if (chess.isDraw()) return { over: true, result: "draw", reason: ChessTool.drawReason(chess) };
    return { over: true, result: "draw", reason: "unknown" };
  }

  static getLegalMoves(fen: string): string[] {
    const chess = new Chess(fen);
    return chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ""));
  }

  static getTurn(fen: string): ChessColor {
    return new Chess(fen).turn();
  }

  static getBoardAscii(fen: string): string {
    return new Chess(fen).ascii();
  }

  /** ELO delta for player A given result (1=win, 0.5=draw, 0=loss) */
  static eloChange(ratingA: number, ratingB: number, result: 1 | 0.5 | 0): number {
    const K = 32;
    const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    return Math.round(K * (result - expected));
  }

  private static drawReason(chess: Chess): string {
    if (chess.isStalemate()) return "stalemate";
    if (chess.isInsufficientMaterial()) return "insufficient_material";
    if (chess.isThreefoldRepetition()) return "threefold_repetition";
    return "fifty_move_rule";
  }
}
