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
    const systemContent = `Chess AI. Strategy: ${strategy || "solid, standard chess"}.
Output ONLY one UCI move from the legal list (e.g. e2e4, g1f3, e7e8q). No explanation.`;

    let userContent = `FEN: ${fen}
History: ${moveHistory.length ? moveHistory.join(" ") : "-"}
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
    previousError?: string
  ): ChatMessage[] {
    const systemContent = `Doudizhu AI. Role: ${role}. Strategy: ${strategy || "play smart, win"}.
Cards(asc): 3<4<5<6<7<8<9<T<J<Q<K<A<2<X<D. Valid: single,pair,triple,triple+1,triple+pair,straight(5+),pair-straight(3+pairs),plane(2+triples),bomb(4-same),rocket(X+D).
Beat: same type+higher, or bomb>any, or rocket>all. Pass if unwilling/unable.
Output ONLY comma-separated cards (e.g. 7,7 or 3,4,5,6,7) or "pass". No explanation.`;

    let userContent = `Hand: ${hand.sort((a, b) => this.CARD_VALUES[a] - this.CARD_VALUES[b]).join(",")}
Last: ${lastPlay ? lastPlay.cards.join(",") : "none(you lead)"}`;

    if (previousError) {
      userContent += `\nREJECTED: ${previousError} — play VALID cards from hand.`;
    }

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
