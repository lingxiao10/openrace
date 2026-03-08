// ============================================================
// GameService.ts — Orchestrates chess and doudizhu match execution.
// Called by GameScheduler. Uses all other services + tools.
// ============================================================

import { ChessTool } from "../tools/ChessTool";
import { DoudizhuTool, GameState as DoudizhuState } from "../tools/DoudizhuTool";
import { OpenRouterTool, ChatMessage, AiCallResult } from "../tools/OpenRouterTool";
import { MatchLogTool } from "../tools/MatchLogTool";
import { EncryptTool } from "../tools/EncryptTool";
import { MatchService } from "./MatchService";
import { RobotService, RobotRow } from "./RobotService";
import { BalanceService } from "./BalanceService";
import { LeaderboardService } from "./LeaderboardService";
import { LogCenter } from "../log/LogCenter";
import config from "../config/config";

interface TickRecord {
  time: string;
  match_ids: number[];
}

export class GameService {
  private static readonly MAX_TICKS = 30;
  private static readonly _ticks: TickRecord[] = [];

  static getTicks(): TickRecord[] {
    return [...GameService._ticks];
  }

  static getLastTickTime(): string | null {
    return GameService._ticks[0]?.time ?? null;
  }

  /** Pair active robots and create pending matches for the current season */
  static async pairActiveRobots(): Promise<void> {
    const season = await LeaderboardService.getCurrentSeason();
    if (!season) {
      GameService.recordTick([]);
      return;
    }

    // Separate pairing for chess (2 players) and doudizhu (3 players)
    const chessRobots = await RobotService.getActiveRobotsByGameType("chess");
    const doudizhuRobots = await RobotService.getActiveRobotsByGameType("doudizhu");

    const chessEligible = await GameService.filterEligibleRobots(chessRobots);
    const doudizhuEligible = await GameService.filterEligibleRobots(doudizhuRobots);

    GameService.shuffleArray(chessEligible);
    GameService.shuffleArray(doudizhuEligible);

    const matchIds: number[] = [];

    // Chess pairing (2 players)
    const chessUsed = new Set<number>();
    for (let i = 0; i < chessEligible.length; i++) {
      if (chessUsed.has(chessEligible[i].id)) continue;
      for (let j = i + 1; j < chessEligible.length; j++) {
        if (chessUsed.has(chessEligible[j].id)) continue;
        if (chessEligible[i].user_id === chessEligible[j].user_id) continue;
        chessUsed.add(chessEligible[i].id);
        chessUsed.add(chessEligible[j].id);
        matchIds.push(await MatchService.createMatch(season.id, chessEligible[i].id, chessEligible[j].id));
        LogCenter.info("GameService", `Paired chess robots ${chessEligible[i].id} vs ${chessEligible[j].id}`);
        break;
      }
    }

    // Doudizhu pairing (3 players)
    const doudizhuUsed = new Set<number>();
    for (let i = 0; i < doudizhuEligible.length; i++) {
      if (doudizhuUsed.has(doudizhuEligible[i].id)) continue;
      for (let j = i + 1; j < doudizhuEligible.length; j++) {
        if (doudizhuUsed.has(doudizhuEligible[j].id)) continue;
        if (doudizhuEligible[i].user_id === doudizhuEligible[j].user_id) continue;
        for (let k = j + 1; k < doudizhuEligible.length; k++) {
          if (doudizhuUsed.has(doudizhuEligible[k].id)) continue;
          // Ensure all 3 players are from different users
          if (doudizhuEligible[i].user_id === doudizhuEligible[k].user_id) continue;
          if (doudizhuEligible[j].user_id === doudizhuEligible[k].user_id) continue;

          doudizhuUsed.add(doudizhuEligible[i].id);
          doudizhuUsed.add(doudizhuEligible[j].id);
          doudizhuUsed.add(doudizhuEligible[k].id);

          // Randomly select landlord
          const landlordIdx = Math.floor(Math.random() * 3);
          const players = [doudizhuEligible[i], doudizhuEligible[j], doudizhuEligible[k]];
          const landlordId = players[landlordIdx].id;

          matchIds.push(
            await MatchService.createDoudizhuMatch(
              season.id,
              players[0].id,
              players[1].id,
              players[2].id,
              landlordId
            )
          );
          LogCenter.info(
            "GameService",
            `Paired doudizhu robots ${players[0].id}, ${players[1].id}, ${players[2].id} (landlord: ${landlordId})`
          );
          break;
        }
        if (doudizhuUsed.has(doudizhuEligible[i].id)) break;
      }
    }

    GameService.recordTick(matchIds);
  }

  private static recordTick(matchIds: number[]): void {
    GameService._ticks.unshift({ time: new Date().toISOString(), match_ids: matchIds });
    if (GameService._ticks.length > GameService.MAX_TICKS) GameService._ticks.pop();
  }

  /** Run all pending matches sequentially */
  static async runPendingMatches(): Promise<void> {
    const pending = await MatchService.getPendingMatches();
    for (const match of pending) {
      await GameService.runMatch(match.id).catch((err) =>
        LogCenter.error("GameService", `Match ${match.id} failed: ${err.message}`)
      );
    }
  }

  /** Execute a single match from start to finish */
  static async runMatch(matchId: number): Promise<void> {
    const match = await MatchService.getMatch(matchId);
    if (!match) return;

    // Only start if not already running
    if (match.status === "pending") {
      await MatchService.startMatch(matchId);
    }

    if (match.game_type === "chess") {
      const white = await RobotService.findById(match.robot_white_id);
      const black = await RobotService.findById(match.robot_black_id);
      if (!white || !black) return;

      // 解密API密钥
      const whiteKey = white.api_key_encrypted ? EncryptTool.decrypt(white.api_key_encrypted) : "";
      const blackKey = black.api_key_encrypted ? EncryptTool.decrypt(black.api_key_encrypted) : "";

      await GameService.playChessGame(matchId, white, black, whiteKey, blackKey);
    } else if (match.game_type === "doudizhu") {
      const player1 = await RobotService.findById(match.robot_white_id);
      const player2 = await RobotService.findById(match.robot_black_id);
      const player3 = await RobotService.findById(match.robot_third_id!);
      if (!player1 || !player2 || !player3) return;
      await GameService.playDoudizhuGame(matchId, player1, player2, player3, match.robot_landlord_id!);
    }
  }

  private static async playChessGame(
    matchId: number,
    white: RobotRow,
    black: RobotRow,
    whiteKey: string,
    blackKey: string
  ): Promise<void> {
    const logPath = MatchLogTool.getLogPath(matchId, "chess");

    // Check if there are existing moves to resume from
    const existingMoves = await MatchService.getMoves(matchId);
    const moveHistory: string[] = [];
    let fen: string;
    let startMoveNum: number;

    if (existingMoves.length > 0) {
      // Resume from last move
      const lastMove = existingMoves[existingMoves.length - 1];
      fen = lastMove.fen_after;
      startMoveNum = lastMove.move_number + 1;
      // Rebuild move history
      for (const m of existingMoves) {
        moveHistory.push(m.move_uci);
      }
      LogCenter.info("GameService", `Resuming chess match ${matchId} from move ${startMoveNum}`);
      MatchLogTool.log(logPath, `\n=== RESUMING MATCH ${matchId} FROM MOVE ${startMoveNum} ===`);
    } else {
      // New game
      fen = ChessTool.getInitialFen();
      startMoveNum = 1;
      MatchLogTool.logMatchStart(logPath, matchId, "chess", [
        `White: ${white.name} (ID:${white.id})`,
        `Black: ${black.name} (ID:${black.id})`
      ]);
    }

    for (let moveNum = startMoveNum; moveNum <= config.game.maxMovesPerMatch; moveNum++) {
      const isWhiteTurn = ChessTool.getTurn(fen) === "w";
      const robot = isWhiteTurn ? white : black;
      const apiKey = isWhiteTurn ? whiteKey : blackKey;

      const legalMoves = ChessTool.getLegalMoves(fen);
      MatchLogTool.log(logPath, `\n--- Move ${moveNum} (${isWhiteTurn ? 'White' : 'Black'}: ${robot.name}) ---`);
      MatchLogTool.log(logPath, `FEN: ${fen}`);
      MatchLogTool.log(logPath, `Legal moves: ${legalMoves.join(", ")}`);

      // Try up to 12 times to get a legal move from AI
      let move: string | null = null;
      let aiResult: AiCallResult | null = null;
      let lastError = "";

      for (let attempt = 1; attempt <= 12; attempt++) {
        const messages = OpenRouterTool.buildChessPrompt(
          fen, moveHistory, robot.strategy ?? "", legalMoves, lastError
        );

        aiResult = await GameService.callChatWithRetry(apiKey, robot.model, messages, robot.id);

        if (!aiResult) {
          lastError = "AI call failed (network/timeout/API error)";
          MatchLogTool.logAiAttempt(logPath, attempt, robot.id, robot.name, false, lastError);
          LogCenter.warn("GameService", `Robot ${robot.id} attempt ${attempt}/12: ${lastError}`);
          continue;
        }

        const rawMove = OpenRouterTool.parseMoveFromResponse(aiResult.content);

        if (!rawMove) {
          lastError = `Invalid format: "${aiResult.content.trim()}". Expected UCI format (e.g., e2e4).`;
          MatchLogTool.logAiAttempt(logPath, attempt, robot.id, robot.name, false, lastError);
          LogCenter.warn("GameService", `Robot ${robot.id} attempt ${attempt}/12: ${lastError}`);
          continue;
        }

        if (!ChessTool.isMoveLegal(fen, rawMove)) {
          lastError = `Illegal move: "${rawMove}". Not in legal moves list.`;
          MatchLogTool.logAiAttempt(logPath, attempt, robot.id, robot.name, false, lastError);
          LogCenter.warn("GameService", `Robot ${robot.id} attempt ${attempt}/12: ${lastError}`);
          continue;
        }

        // Success!
        move = rawMove;
        MatchLogTool.logAiAttempt(logPath, attempt, robot.id, robot.name, true);
        break;
      }

      // If all 12 attempts failed, forfeit
      if (!move || !aiResult) {
        MatchLogTool.logForfeit(logPath, robot.id, robot.name, `Failed to produce legal move after 12 attempts. Last error: ${lastError}`);

        // 增加错误计数并检查是否需要暂停
        const errorCount = await RobotService.incrementErrorCount(robot.id);
        if (errorCount >= 5) {
          await RobotService.suspend(robot.id, "Failed to produce legal move 5 times");
        }

        await GameService.forfeitRobot(
          matchId, robot, isWhiteTurn ? black : white,
          `Failed to produce legal move after 12 attempts. Last error: ${lastError}`
        );
        return;
      }

      // 成功走棋，重置错误计数
      await RobotService.resetErrorCount(robot.id);

      const newFen = ChessTool.applyMove(fen, move);
      if (!newFen) {
        MatchLogTool.logForfeit(logPath, robot.id, robot.name, "Move application failed");
        await GameService.forfeitRobot(matchId, robot, isWhiteTurn ? black : white, "Move application failed");
        return;
      }

      const cost = aiResult.costUsd * (1 + config.game.aiCostMarkupPercent / 100);
      const paid = await BalanceService.deduct(robot.user_id, cost, "chess_move", matchId);

      if (!paid) {
        MatchLogTool.logForfeit(logPath, robot.id, robot.name, "Insufficient balance");
        await GameService.forfeitInsufficientBalance(matchId, robot, isWhiteTurn ? black : white);
        return;
      }

      await MatchService.recordMove(matchId, moveNum, robot.id, move, newFen, aiResult.totalTokens, cost);
      MatchLogTool.logMove(logPath, moveNum, robot.id, robot.name, move, aiResult.totalTokens, cost, newFen);

      moveHistory.push(move);
      fen = newFen;

      const gameOver = ChessTool.isGameOver(fen);
      if (gameOver.over) {
        MatchLogTool.logMatchEnd(logPath, gameOver.result ?? "draw",
          gameOver.result === "white" ? white.id : gameOver.result === "black" ? black.id : undefined,
          gameOver.result === "white" ? white.name : gameOver.result === "black" ? black.name : undefined
        );
        await GameService.finishWithResult(matchId, white, black, gameOver.result);
        return;
      }
    }

    MatchLogTool.logMatchEnd(logPath, "draw");
    await GameService.finishWithResult(matchId, white, black, "draw");
  }

  private static async playDoudizhuGame(
    matchId: number,
    player1: RobotRow,
    player2: RobotRow,
    player3: RobotRow,
    landlordId: number
  ): Promise<void> {
    const players = [player1, player2, player3];
    const landlordIdx = players.findIndex((p) => p.id === landlordId);

    // Check if there are existing moves to resume from
    const existingMoves = await MatchService.getMoves(matchId);
    let state: DoudizhuState;
    let startMoveNum: number;

    if (existingMoves.length > 0) {
      // Resume from last move
      const lastMove = existingMoves[existingMoves.length - 1];
      state = JSON.parse(lastMove.fen_after);

      // Backward compatibility: add playedCards if missing
      if (!state.playedCards) {
        state.playedCards = [[], [], []];
      }

      startMoveNum = lastMove.move_number + 1;
      LogCenter.info("GameService", `Resuming doudizhu match ${matchId} from move ${startMoveNum}`);
    } else {
      // Deal cards for new game
      const { hands, bottom } = DoudizhuTool.dealCards();
      hands[landlordIdx].push(...bottom);
      hands[landlordIdx].sort((a, b) => {
        const values: Record<string, number> = {
          '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
          'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
          'X': 16, 'D': 17
        };
        return values[a] - values[b];
      });
      state = DoudizhuTool.getInitialState(hands, bottom, landlordIdx);
      startMoveNum = 1;
    }

    for (let moveNum = startMoveNum; moveNum <= config.game.maxMovesPerMatch; moveNum++) {
      const currentPlayer = players[state.currentPlayerIdx];
      const role = state.currentPlayerIdx === landlordIdx ? "landlord" : "farmer";

      // 解密当前玩家的API密钥
      const apiKey = currentPlayer.api_key_encrypted ? EncryptTool.decrypt(currentPlayer.api_key_encrypted) : "";

      // Try up to 12 times to get a valid play from AI
      let finalCards: string[] | null = null;
      let aiResult: AiCallResult | null = null;
      let lastError = "";

      for (let attempt = 1; attempt <= 12; attempt++) {
        const messages = OpenRouterTool.buildDoudizhuPrompt(
          state.hands[state.currentPlayerIdx],
          state.lastPlay,
          role,
          currentPlayer.strategy ?? "",
          lastError
        );

        aiResult = await GameService.callChatWithRetry(
          apiKey,
          currentPlayer.model,
          messages,
          currentPlayer.id
        );

        if (!aiResult) {
          lastError = "AI call failed (network/timeout/API error)";
          LogCenter.warn("GameService", `Robot ${currentPlayer.id} attempt ${attempt}/12: ${lastError}`);
          continue;
        }

        // Parse action
        const actionStr = OpenRouterTool.parseDoudizhuAction(aiResult.content);
        const cards = actionStr === "pass" ? [] : actionStr.split(",").filter((c) => c.length > 0);

        // Validate play
        if (cards.length > 0) {
          // Check if cards are in hand
          const handCopy = [...state.hands[state.currentPlayerIdx]];
          let hasAllCards = true;
          for (const card of cards) {
            const idx = handCopy.indexOf(card);
            if (idx === -1) {
              hasAllCards = false;
              break;
            }
            handCopy.splice(idx, 1);
          }

          if (!hasAllCards) {
            lastError = `Invalid cards: "${cards.join(",")}" - you don't have these cards in your hand.`;
            LogCenter.warn("GameService", `Robot ${currentPlayer.id} attempt ${attempt}/12: ${lastError}`);
            continue;
          }

          // Check if play is valid
          if (!DoudizhuTool.isValidPlay(cards, state.lastPlay)) {
            const playType = DoudizhuTool.parsePlayType(cards);
            if (!playType) {
              lastError = `Invalid play type: "${cards.join(",")}" - not a recognized card combination.`;
            } else if (state.lastPlay) {
              lastError = `Invalid play: "${cards.join(",")}" - cannot beat last play "${state.lastPlay.cards.join(",")}" (type: ${state.lastPlay.type}).`;
            } else {
              lastError = `Invalid play: "${cards.join(",")}" - not a valid card combination.`;
            }
            LogCenter.warn("GameService", `Robot ${currentPlayer.id} attempt ${attempt}/12: ${lastError}`);
            continue;
          }
        }

        // Success!
        finalCards = cards;
        break;
      }

      // If all 12 attempts failed, forfeit
      if (finalCards === null || !aiResult) {
        await GameService.forfeitDoudizhuRobot(
          matchId,
          players,
          landlordIdx,
          state.currentPlayerIdx,
          `Failed to produce valid play after 12 attempts. Last error: ${lastError}`
        );
        return;
      }

      // Deduct cost
      const cost = aiResult.costUsd * (1 + config.game.aiCostMarkupPercent / 100);
      const paid = await BalanceService.deduct(currentPlayer.user_id, cost, "doudizhu_move", matchId);

      if (!paid) {
        await GameService.forfeitDoudizhuRobot(matchId, players, landlordIdx, state.currentPlayerIdx, "insufficient_balance");
        return;
      }

      // Apply play
      state = DoudizhuTool.applyPlay(state, finalCards);

      // Record move
      await MatchService.recordMove(
        matchId,
        moveNum,
        currentPlayer.id,
        finalCards.length ? finalCards.join(",") : "pass",
        JSON.stringify(state),
        aiResult.totalTokens,
        cost
      );

      // Check game over
      const gameOver = DoudizhuTool.isGameOver(state);
      if (gameOver.over) {
        await GameService.finishDoudizhuMatch(matchId, players, landlordIdx, gameOver.winner);
        return;
      }
    }

    // Max moves reached → draw
    await GameService.finishDoudizhuMatch(matchId, players, landlordIdx, null);
  }

  private static async finishDoudizhuMatch(
    matchId: number,
    players: RobotRow[],
    landlordIdx: number,
    winner: "landlord" | "farmers" | null,
    forfeitReason?: string,
    forfeitRobotId?: number
  ): Promise<void> {
    const landlord = players[landlordIdx];
    const farmers = players.filter((_, i) => i !== landlordIdx);

    if (winner === "landlord") {
      await MatchService.finishMatch(matchId, landlord.id, forfeitReason, forfeitRobotId);

      // ELO: landlord vs average of farmers
      const farmerAvgElo = (farmers[0].elo + farmers[1].elo) / 2;
      const landlordDelta = ChessTool.eloChange(landlord.elo, farmerAvgElo, 1);
      const farmerDelta = ChessTool.eloChange(farmerAvgElo, landlord.elo, 0);

      await RobotService.updateStats(landlord.id, "win", landlordDelta);
      await RobotService.updateStats(farmers[0].id, "loss", farmerDelta);
      await RobotService.updateStats(farmers[1].id, "loss", farmerDelta);

      LogCenter.info("GameService", `Doudizhu match ${matchId} finished: landlord wins`);
    } else if (winner === "farmers") {
      await MatchService.finishMatch(matchId, null, forfeitReason, forfeitRobotId);

      const farmerAvgElo = (farmers[0].elo + farmers[1].elo) / 2;
      const farmerDelta = ChessTool.eloChange(farmerAvgElo, landlord.elo, 1);
      const landlordDelta = ChessTool.eloChange(landlord.elo, farmerAvgElo, 0);

      await RobotService.updateStats(landlord.id, "loss", landlordDelta);
      await RobotService.updateStats(farmers[0].id, "win", farmerDelta);
      await RobotService.updateStats(farmers[1].id, "win", farmerDelta);

      LogCenter.info("GameService", `Doudizhu match ${matchId} finished: farmers win`);
    } else {
      // Draw
      await MatchService.finishMatch(matchId, null);
      for (const p of players) {
        await RobotService.updateStats(p.id, "draw", 0);
      }
      LogCenter.info("GameService", `Doudizhu match ${matchId} finished: draw`);
    }
  }

  private static async forfeitDoudizhuRobot(
    matchId: number,
    players: RobotRow[],
    landlordIdx: number,
    forfeitPlayerIdx: number,
    reason: string
  ): Promise<void> {
    const forfeitPlayer = players[forfeitPlayerIdx];
    await RobotService.suspend(forfeitPlayer.id);

    // Determine winner based on who forfeited
    if (forfeitPlayerIdx === landlordIdx) {
      // Landlord forfeited → farmers win
      await GameService.finishDoudizhuMatch(matchId, players, landlordIdx, "farmers", reason, forfeitPlayer.id);
    } else {
      // A farmer forfeited → landlord wins
      await GameService.finishDoudizhuMatch(matchId, players, landlordIdx, "landlord", reason, forfeitPlayer.id);
    }

    LogCenter.warn("GameService", `Doudizhu robot ${forfeitPlayer.id} forfeited: ${reason}`);
  }

  private static async finishWithResult(
    matchId: number,
    white: RobotRow,
    black: RobotRow,
    result: "white" | "black" | "draw" | null
  ): Promise<void> {
    const winnerId = result === "white" ? white.id : result === "black" ? black.id : null;
    await MatchService.finishMatch(matchId, winnerId);

    const whiteResult = result === "white" ? 1 : result === "draw" ? 0.5 : 0;
    const blackResult = 1 - whiteResult as 1 | 0.5 | 0;

    await RobotService.updateStats(
      white.id,
      result === "white" ? "win" : result === "draw" ? "draw" : "loss",
      ChessTool.eloChange(white.elo, black.elo, whiteResult as 1 | 0.5 | 0)
    );
    await RobotService.updateStats(
      black.id,
      result === "black" ? "win" : result === "draw" ? "draw" : "loss",
      ChessTool.eloChange(black.elo, white.elo, blackResult)
    );
    LogCenter.info("GameService", `Match ${matchId} finished: ${result ?? "draw"}`);
  }

  private static async forfeitRobot(
    matchId: number,
    loser: RobotRow,
    winner: RobotRow,
    reason: string
  ): Promise<void> {
    await MatchService.finishMatch(matchId, winner.id, reason);
    await RobotService.updateStats(loser.id, "loss", ChessTool.eloChange(loser.elo, winner.elo, 0));
    await RobotService.updateStats(winner.id, "win", ChessTool.eloChange(winner.elo, loser.elo, 1));
    LogCenter.warn("GameService", `Robot ${loser.id} forfeited: ${reason}`);
  }

  private static async forfeitInsufficientBalance(
    matchId: number,
    loser: RobotRow,
    winner: RobotRow
  ): Promise<void> {
    await RobotService.suspend(loser.id);
    await GameService.forfeitRobot(matchId, loser, winner, "insufficient_balance");
  }

  /** Call AI with up to 3 retries for network errors, 5s delay between attempts */
  private static async callChatWithRetry(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    robotId: number
  ): Promise<AiCallResult | null> {
    const maxAttempts = 3;
    const retryDelayMs = 5000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await OpenRouterTool.callChat(apiKey, model, messages).catch((err: Error) => {
        LogCenter.warn("GameService", `Robot ${robotId} AI call attempt ${attempt}/${maxAttempts} failed: ${err.message}`);

        // 检查是否是余额不足错误
        if (err.message.includes("quota") || err.message.includes("insufficient") || err.message.includes("balance")) {
          LogCenter.error("GameService", `Robot ${robotId} API quota/balance error detected`);
          RobotService.incrementErrorCount(robotId).then(count => {
            if (count >= 5) {
              RobotService.suspend(robotId, "API quota/balance error (5 consecutive failures)");
              LogCenter.error("GameService", `Robot ${robotId} suspended due to 5 consecutive API errors`);
            }
          });
        }

        return null;
      });

      if (result) {
        // 成功调用，重置错误计数
        await RobotService.resetErrorCount(robotId);
        return result;
      }

      if (attempt < maxAttempts) {
        await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    // 所有重试失败，增加错误计数
    const errorCount = await RobotService.incrementErrorCount(robotId);
    LogCenter.error("GameService", `Robot ${robotId} AI call failed after ${maxAttempts} attempts (error count: ${errorCount}/5)`);

    if (errorCount >= 5) {
      await RobotService.suspend(robotId, "API call failed 5 consecutive times");
      LogCenter.error("GameService", `Robot ${robotId} suspended due to 5 consecutive API failures`);
    }

    return null;
  }

  /** Resume matches stuck in 'running' with no moves for over 3 minutes */
  static async cleanupZombieMatches(): Promise<void> {
    const running = await MatchService.getRunningMatches();
    for (const match of running) {
      const moves = await MatchService.getMoves(match.id);
      const lastActivityAt = moves.length
        ? new Date(moves[moves.length - 1].created_at).getTime()
        : new Date(match.started_at ?? match.created_at).getTime();
      const staleMs = Date.now() - lastActivityAt;
      if (staleMs > 3 * 60 * 1000) {
        LogCenter.warn("GameService", `Match ${match.id} stale (${Math.round(staleMs / 60000)}min), resuming...`);
        await GameService.runMatch(match.id).catch((err) =>
          LogCenter.error("GameService", `Failed to resume match ${match.id}: ${err.message}`)
        );
      }
    }
  }

  private static async filterEligibleRobots(robots: RobotRow[]): Promise<RobotRow[]> {
    const busyIds = await MatchService.getBusyRobotIds();
    const eligible: RobotRow[] = [];
    for (const r of robots) {
      if (busyIds.has(r.id)) continue;
      const balance = await BalanceService.getBalance(r.user_id);
      if (balance <= 0) continue;

      // Check daily match limit (30 matches per day based on NY time)
      const todayCount = await RobotService.getTodayMatchCount(r.id);
      if (todayCount >= config.game.maxMatchesPerRobotPerDay) {
        LogCenter.debug("GameService", `Robot ${r.id} reached daily limit: ${todayCount}/${config.game.maxMatchesPerRobotPerDay}`);
        continue;
      }

      eligible.push(r);
    }
    return eligible;
  }

  private static shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
