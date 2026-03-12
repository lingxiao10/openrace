// ============================================================
// OpenRouterTool.ts — OpenRouter API client. No business logic.
// ============================================================

import config from "../config/config";
import { LogCenter } from "../log/LogCenter";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiCallResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export class OpenRouterTool {
  static async callChat(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    timeoutMs = 30000,
    baseUrl?: string,
    extraBody?: Record<string, unknown>
  ): Promise<AiCallResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiBaseUrl = baseUrl || config.game.openRouterBaseUrl;

    let res: Response;
    try {
      res = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://openrace.ai",
          "X-Title": "OpenRace",
        },
        body: JSON.stringify({ model, messages, max_tokens: 64, temperature: 0.3, ...extraBody }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text();
      LogCenter.error("OpenRouterTool", `API error ${res.status}: ${text}`);
      throw new Error(`OpenRouter API error: ${res.status}`);
    }

    const json = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = json.choices?.[0]?.message?.content ?? "";
    const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return {
      content,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      costUsd: OpenRouterTool.estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
    };
  }

  static buildChessPrompt(
    fen: string,
    moveHistory: string[],
    strategy: string,
    legalMoves: string[],
    previousError?: string
  ): ChatMessage[] {
    const last10 = moveHistory.slice(-10);
    const systemContent = `You are an aggressive chess AI. Your sole goal is to WIN — never settle for a draw.
Rules: Each side has 16 pieces (King, Queen, 2 Rooks, 2 Bishops, 2 Knights, 8 Pawns). Pieces move as follows — King: one square any direction; Queen: any direction any distance; Rook: horizontal/vertical; Bishop: diagonal; Knight: L-shape (can jump); Pawn: forward 1 (or 2 from start), captures diagonally. Special moves: castling (king+rook swap), en passant, pawn promotion. Check = king under attack; must escape. Checkmate = check with no escape = loss. Stalemate = no legal move but not in check = draw.
Strategy: ${strategy || "Control the center, develop all pieces aggressively, push pawns and pieces forward, launch coordinated attacks, and always press for checkmate."}
CRITICAL RULES:
1. NEVER repeat moves. Do NOT play a move that returns to a position already seen — threefold repetition is a draw, which counts as failure.
2. ALWAYS push forward. Move your pieces toward the opponent's side. Avoid retreating unless absolutely forced.
3. Activate ALL your pieces. Idle pieces (especially knights and bishops still on their starting squares) must be developed and brought into the attack.
4. NEVER accept a draw. Avoid moves that lead to stalemate or repetition. Always make progress toward checkmate.
5. Be aggressive. Seek to attack the opponent's king, capture opponent pieces, and dominate the board.
Output ONLY one UCI move from the legal list (e.g. e2e4, g1f3, e7e8q). No explanation.`;

    let userContent = `FEN: ${fen}
Recent moves (last ${last10.length}): ${last10.length ? last10.join(" ") : "-"}
Legal: ${legalMoves.join(",")}`;

    if (previousError) {
      userContent += `\nREJECTED: ${previousError} — pick a LEGAL move.`;
    }

    return [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
    ];
  }

  /** Parse UCI move from AI response text */
  static parseMoveFromResponse(content: string): string | null {
    const clean = content.trim().toLowerCase();
    const match = clean.match(/\b([a-h][1-8][a-h][1-8][qrbn]?)\b/);
    return match ? match[1] : null;
  }

  /** Build Doudizhu prompt for AI */
  static buildDoudizhuPrompt(
    hand: string[],
    lastPlay: { player: number; cards: string[] } | null,
    role: "landlord" | "farmer",
    strategy: string,
    playHistory: Array<{ player: number; action: string }>,
    landlordIdx: number,
    playerNames: string[],
    previousError?: string,
    previousAttempt?: string
  ): ChatMessage[] {
    const systemContent = `You are a Doudizhu (斗地主) AI. Use your good cards wisely and fight to win.

=== CARD REPRESENTATION ===
3,4,5,6,7,8,9,T(=10),J,Q,K,A,2,X(小王),D(大王)
Rank low→high: 3<4<5<6<7<8<9<T<J<Q<K<A<2<X<D

=== VALID PLAY TYPES ===

1. SINGLE — any one card
   ✓ 3 | 9 | A | 2 | X | D
   ✗ 3,3 (that is a pair)

2. PAIR — exactly two of the same rank
   ✓ 3,3 | 9,9 | K,K | 2,2
   ✗ 3,4 (different ranks) | 3,3,3 (three cards) | X,D (jokers cannot pair)

3. TRIPLE — exactly three of the same rank
   ✓ 5,5,5 | K,K,K
   ✗ 5,5,6 (not same rank) | 5,5,5,5 (four = bomb)

4. TRIPLE+1 — three identical + one kicker card
   ✓ 5,5,5,3 | 8,8,8,A | K,K,K,2
   ✗ 5,5,5,3,3 (that is triple+pair) | 5,5,6,7 (no three-of-a-kind)

5. TRIPLE+PAIR — three identical + one pair
   ✓ 5,5,5,3,3 | 8,8,8,K,K
   ✗ 5,5,5,3,4 (3,4 is not a pair) | 5,5,5,5,3,3 (5x4 is a bomb, illegal base)

6. STRAIGHT — 5 or more STRICTLY CONSECUTIVE cards; 2/X/D are FORBIDDEN
   ✓ 3,4,5,6,7 | 7,8,9,T,J | 9,T,J,Q,K,A | 3,4,5,6,7,8,9,T
   ✗ 3,5,6,7,8 — GAP: 4 is missing; consecutive means NO gaps at all
   ✗ 3,4,5,6 — only 4 cards; minimum is 5
   ✗ T,J,Q,K,A,2 — contains 2 which is forbidden
   ✗ J,Q,K,A,X — contains X which is forbidden
   ✗ A,2,3,4,5 — wrapping not allowed; 2 breaks the straight
   CRITICAL: list the cards in order and verify each adjacent pair differs by exactly 1.

7. PAIR-STRAIGHT (连对) — 3 or more consecutive PAIRS; 2/X/D forbidden
   ✓ 3,3,4,4,5,5 | 7,7,8,8,9,9 | 8,8,9,9,T,T,J,J
   ✗ 3,3,4,4 — only 2 pairs; minimum is 3 pairs (6 cards)
   ✗ 3,3,5,5,6,6 — GAP: 4,4 pair is missing
   ✗ K,K,A,A,2,2 — contains 2 which is forbidden

8. PLANE (飞机) — 2 or more consecutive triples ± equal-count attachments
   Bare: ✓ 3,3,3,4,4,4 | 7,7,7,8,8,8,9,9,9
   +singles (one per triple): ✓ 3,3,3,4,4,4,7,8 | 7,7,7,8,8,8,9,9,9,A,2,X
   +pairs (one pair per triple): ✓ 3,3,3,4,4,4,5,5,6,6
   ✗ 3,3,3,5,5,5,4,5 — triples must be consecutive (3 and 5 skip 4)
   ✗ 3,3,3,4,4,4,5 — two triples need exactly 2 kicker singles, not 1

9. BOMB — exactly four of the same rank; beats all except rocket
   ✓ 5,5,5,5 | A,A,A,A | 2,2,2,2
   ✗ 5,5,5 (triple) | X,X,X,X (each joker is unique, only one exists)

10. ROCKET — X,D only; beats everything including bomb
    ✓ X,D
    ✗ X,X or D,D (each joker is unique)

=== BEATING RULES ===
- Must use the SAME type at higher rank, OR play bomb (beats all non-bomb), OR rocket (beats all).
- Same-length straight only: 4,5,6,7,8 beats 3,4,5,6,7 but CANNOT beat 3,4,5,6,7,8 (different length).
- Bomb rank: higher four-of-a-kind beats lower (A,A,A,A beats 5,5,5,5).

=== PASSING ===
- "pass" is ONLY valid when Last ≠ none (there is a play to beat).
- If Last: none(you lead) — you MUST play. Outputting "pass" is FORBIDDEN.

Role: ${role}. Strategy: ${strategy || "Play high cards at the right moment, break the opponent's chains, and clear your hand efficiently."}
Output ONLY comma-separated cards (e.g. 7,7 or 3,4,5,6,7) or "pass". No explanation.`;

    const historyLines = playHistory.map((h) => {
      const name = playerNames[h.player] ?? `Player${h.player}`;
      const r = h.player === landlordIdx ? "地主" : "农民";
      return `[${r}]${name}: ${h.action || "pass"}`;
    });

    const leadingNote = !lastPlay ? " ⚠️ You are leading — you MUST play, passing is NOT allowed." : "";
    const baseUserContent = `Play history:\n${historyLines.length ? historyLines.join("\n") : "(none yet)"}
Hand: ${[...hand].sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]).join(",")}
Last: ${lastPlay ? lastPlay.cards.join(",") : "none(you lead)"}${leadingNote}
Choose your play:`;

    if (!previousError || !previousAttempt) {
      return [
        { role: "system", content: systemContent },
        { role: "user", content: baseUserContent },
      ];
    }

    // Build specific rule hint based on error type
    let ruleHint = "";
    if (previousError.includes("not a recognized card combination") || previousError.includes("not a valid card combination")) {
      ruleHint = `RULE REMINDER: Valid types are single/pair/triple/triple+1/triple+pair/straight(5+ consecutive, no gaps, no 2/X/D)/pair-straight/plane/bomb/rocket. A straight like "3,5,6,7,8" is INVALID because it has a gap (missing 4). Cards must be strictly consecutive.`;
    } else if (previousError.includes("cannot beat last play")) {
      const lastPlayMatch = previousError.match(/last play "([^"]+)"/);
      const lastPlayCards = lastPlayMatch ? lastPlayMatch[1] : "";
      ruleHint = `RULE REMINDER: You must play the SAME type with a HIGHER rank than "${lastPlayCards}", OR play a bomb (4 of a kind), OR play rocket (X+D), OR pass.`;
    } else if (previousError.includes("don't have these cards")) {
      ruleHint = `RULE REMINDER: You can ONLY play cards that are in your hand. Check your hand carefully before choosing.`;
    } else {
      ruleHint = `RULE REMINDER: Only output comma-separated cards from your hand that form a valid play type, or "pass".`;
    }

    // Multi-turn: show the failed attempt and specific rejection reason
    return [
      { role: "system", content: systemContent },
      { role: "user", content: baseUserContent },
      { role: "assistant", content: previousAttempt },
      { role: "user", content: `INVALID PLAY REJECTED: ${previousError}\n${ruleHint}\nHand: ${[...hand].sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]).join(",")} — Try again with a VALID play or output "pass":` },
    ];
  }

  /** Parse Doudizhu action from AI response */
  static parseDoudizhuAction(content: string): string {
    const clean = content.trim().toLowerCase();
    if (clean.includes("pass")) return "pass";

    // Extract card sequence (supports "3,4,5" or "3 4 5")
    const match = clean.match(/([23456789tjqkaxd,\s]+)/i);
    if (!match) return "pass";

    // Normalize to uppercase and comma-separated
    return match[1]
      .toUpperCase()
      .replace(/\s+/g, ",")
      .replace(/10/g, "T")
      .split(",")
      .filter(c => c.length > 0)
      .join(",");
  }

  private static readonly CARD_VALUES: Record<string, number> = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'X': 16, 'D': 17
  };

  /** Rough cost estimate based on model pricing (USD per 1M tokens) */
  private static estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      "x-ai/grok-code-fast-1":         { input: 0.03,  output: 0.15 },
      "x-ai/grok-3-mini-beta":         { input: 0.30,  output: 0.50 },
      "x-ai/grok-3-beta":              { input: 3.00,  output: 15.0 },
      "google/gemini-flash-1-5":       { input: 0.075, output: 0.30 },
      "google/gemini-pro-1-5":         { input: 1.25,  output: 5.00 },
      "google/gemini-2.0-flash-001":   { input: 0.10,  output: 0.40 },
      "openai/gpt-4o-mini":            { input: 0.15,  output: 0.60 },
      "openai/gpt-4o":                 { input: 2.50,  output: 10.0 },
      "anthropic/claude-3-haiku":      { input: 0.25,  output: 1.25 },
      "anthropic/claude-3.5-sonnet":   { input: 3.00,  output: 15.0 },
      "meta-llama/llama-3.1-8b-instruct": { input: 0.055, output: 0.055 },
    };
    const p = pricing[model] ?? { input: 0.5, output: 1.5 };
    return (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
  }
}
