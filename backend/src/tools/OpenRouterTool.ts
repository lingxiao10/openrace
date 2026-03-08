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
    baseUrl?: string
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
        body: JSON.stringify({ model, messages, max_tokens: 64, temperature: 0.3 }),
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
    const systemContent = `You are a chess-playing AI. Your strategy: ${strategy || "play solid, standard chess"}.

CHESS RULES (International Chess / FIDE Rules):
1. Board: 8×8 grid, files a-h (left to right), ranks 1-8 (bottom to top for White).
2. Pieces: King (K), Queen (Q), Rook (R), Bishop (B), Knight (N), Pawn (no letter).
3. Movement:
   - King: one square in any direction (including diagonals).
   - Queen: any number of squares in straight lines or diagonals.
   - Rook: any number of squares horizontally or vertically.
   - Bishop: any number of squares diagonally.
   - Knight: L-shape (2 squares in one direction + 1 square perpendicular), can jump over pieces.
   - Pawn: moves forward one square (or two from starting position), captures diagonally forward one square.
4. Special moves:
   - Castling: King moves two squares toward a Rook, Rook jumps over. Conditions: neither piece has moved, no pieces between them, King not in check, King doesn't pass through or land on attacked square.
   - En passant: if opponent's pawn moves two squares forward and lands beside your pawn, you can capture it as if it moved only one square (must be done immediately).
   - Promotion: when a pawn reaches the opposite end (rank 8 for White, rank 1 for Black), it must be promoted to Q/R/B/N.
5. Check & Checkmate: King is in check if attacked. Must escape check. Checkmate = no legal move to escape check (you lose).
6. Stalemate: if it's your turn and you have no legal moves but are NOT in check, the game is a draw.
7. Draw conditions: stalemate, insufficient material, threefold repetition, fifty-move rule, mutual agreement.

OUTPUT FORMAT:
- Respond with ONLY a single UCI move in lowercase (e.g., e2e4, g1f3, e7e8q for pawn promotion to queen).
- UCI format: <from_square><to_square>[promotion_piece]
- Examples: e2e4 (pawn advance), e1g1 (kingside castling for White), e7e8q (pawn promotion to queen).
- Do NOT include any explanation, commentary, or extra text. ONLY the move.`;

    let userContent = `Current position (FEN): ${fen}
Move history: ${moveHistory.length ? moveHistory.join(" ") : "none"}
Legal moves: ${legalMoves.join(", ")}`;

    if (previousError) {
      userContent += `\n\n⚠️ PREVIOUS ATTEMPT REJECTED: ${previousError}
Please output a LEGAL move from the list above. Double-check the rules.`;
    }

    userContent += "\nYour move:";

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
    previousError?: string
  ): ChatMessage[] {
    const systemContent = `You are playing Doudizhu (斗地主), a 3-player Chinese card game. Your role: ${role}.
Your strategy: ${strategy || "play smart, win the game"}.

DOUDIZHU RULES (斗地主规则):
1. Players: 3 players - 1 landlord (地主) vs 2 farmers (农民)
2. Cards: 54 cards total (4 suits × 13 ranks + 2 jokers)
3. Card values (low to high): 3, 4, 5, 6, 7, 8, 9, T(10), J, Q, K, A, 2, X(小王/small joker), D(大王/big joker)
4. Goal:
   - Landlord wins if they play all their cards first
   - Farmers win if either farmer plays all their cards first
5. Turn order: Players take turns clockwise. Landlord starts first.

VALID PLAY TYPES:
- Single: one card (e.g., "5")
- Pair: two same cards (e.g., "7,7")
- Triple: three same cards (e.g., "K,K,K")
- Triple + Single: three same + one different (e.g., "K,K,K,5")
- Triple + Pair: three same + one pair (e.g., "K,K,K,7,7")
- Straight: 5+ consecutive singles (e.g., "3,4,5,6,7") - cannot include 2, X, or D
- Pair straight: 3+ consecutive pairs (e.g., "3,3,4,4,5,5") - cannot include 2, X, or D
- Plane: 2+ consecutive triples (e.g., "3,3,3,4,4,4") - cannot include 2, X, or D
- Bomb: four same cards (e.g., "A,A,A,A") - beats everything except rocket
- Rocket: both jokers (X,D) - beats everything

PLAY RULES:
- If you lead (no last play), you can play ANY valid combination from your hand
- If there's a last play, you must:
  * Beat it with the SAME TYPE and HIGHER value, OR
  * Use a bomb (beats any non-bomb/non-rocket), OR
  * Use a rocket (beats everything)
- You can "pass" if you cannot or don't want to play
- After 2 consecutive passes, the last player who played leads the next round

BEATING RULES:
- Same type: compare the main card value (e.g., pair 8,8 beats pair 7,7)
- Bomb beats any non-bomb (except rocket)
- Rocket beats everything
- Different types cannot beat each other (except bomb/rocket)

OUTPUT FORMAT:
- Respond with ONLY comma-separated cards (e.g., "3,3,3" or "5,6,7,8,9") OR "pass"
- Cards must be from your hand
- NO explanation, NO extra text, NO quotes`;

    let userContent = `Your hand: ${hand.sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]).join(", ")}
Last play: ${lastPlay ? lastPlay.cards.join(", ") : "none (you lead)"}`;

    if (previousError) {
      userContent += `\n\n⚠️ PREVIOUS ATTEMPT REJECTED: ${previousError}
Please output a VALID play from your hand. Double-check the rules and your hand.`;
    }

    userContent += "\nYour action:";

    return [
      { role: "system", content: systemContent },
      { role: "user", content: userContent },
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
