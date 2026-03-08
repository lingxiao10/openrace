// ============================================================
// ChessBoard.ts — SVG chess board renderer.
// ============================================================

const PIECES: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

export class ChessBoard {
  private container: HTMLElement;
  private lastMove: string | null = null;
  private static readonly INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(fen: string, lastMoveUci?: string): void {
    this.lastMove = lastMoveUci ?? null;
    const safeFen = fen || ChessBoard.INITIAL_FEN;
    const board = ChessBoard.parseFen(safeFen);
    this.container.innerHTML = ChessBoard.buildHtml(board, this.lastMove);
  }

  private static parseFen(fen: string): (string | null)[][] {
    const rows = fen.split(" ")[0].split("/");
    return rows.map((row) => {
      const cells: (string | null)[] = [];
      for (const ch of row) {
        if (/\d/.test(ch)) {
          for (let i = 0; i < parseInt(ch); i++) cells.push(null);
        } else {
          cells.push(ch);
        }
      }
      return cells;
    });
  }

  private static buildHtml(board: (string | null)[][], lastMove: string | null): string {
    const fromSq = lastMove?.slice(0, 2);
    const toSq = lastMove?.slice(2, 4);
    let html = '<div class="chess-board">';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = String.fromCharCode(97 + c) + (8 - r);
        const light = (r + c) % 2 === 0;
        const highlight = sq === fromSq || sq === toSq;
        const piece = board[r]?.[c] ?? null;
        html += `<div class="sq ${light ? "sq-light" : "sq-dark"}${highlight ? " sq-highlight" : ""}">`;
        if (piece) html += `<span class="piece">${PIECES[piece] ?? piece}</span>`;
        html += "</div>";
      }
    }
    html += "</div>";
    return html;
  }
}
