// ============================================================
// integration_test.ts — Full integration test
// Tests: user auth, robot CRUD, match creation, leaderboard
// Run: ts-node src/test/integration_test.ts
// ============================================================

import { DbTool } from "../tools/DbTool";
import { AuthTool } from "../tools/AuthTool";
import { EncryptTool } from "../tools/EncryptTool";
import { ChessTool } from "../tools/ChessTool";
import { UserService } from "../services/UserService";
import { RobotService } from "../services/RobotService";
import { MatchService } from "../services/MatchService";
import { BalanceService } from "../services/BalanceService";
import { SettingsService } from "../services/SettingsService";
import { LeaderboardService } from "../services/LeaderboardService";
import { LogCenter } from "../log/LogCenter";

DbTool.init();

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    LogCenter.info("TEST", `  ✓ ${name}`);
    passed++;
  } catch (err) {
    LogCenter.error("TEST", `  ✗ ${name}: ${(err as Error).message}`);
    failed++;
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function run(): Promise<void> {
  LogCenter.info("TEST", "=== Integration Tests ===");

  // ---- EncryptTool ----
  await test("EncryptTool: round-trip", async () => {
    const enc = EncryptTool.encrypt("my-secret-key");
    assert(enc !== "my-secret-key", "should be encrypted");
    assert(EncryptTool.decrypt(enc) === "my-secret-key", "should decrypt correctly");
  });

  // ---- ChessTool ----
  await test("ChessTool: initial FEN", async () => {
    const fen = ChessTool.getInitialFen();
    assert(fen.startsWith("rnbqkbnr"), "should start with initial position");
  });

  await test("ChessTool: legal move e2e4", async () => {
    const fen = ChessTool.getInitialFen();
    assert(ChessTool.isMoveLegal(fen, "e2e4"), "e2e4 should be legal");
    assert(!ChessTool.isMoveLegal(fen, "e2e5"), "e2e5 should be illegal");
  });

  await test("ChessTool: apply move returns new FEN", async () => {
    const fen = ChessTool.getInitialFen();
    const newFen = ChessTool.applyMove(fen, "e2e4");
    assert(newFen !== null, "should return new FEN");
    assert(newFen !== fen, "FEN should change after move");
  });

  await test("ChessTool: game not over at start", async () => {
    const result = ChessTool.isGameOver(ChessTool.getInitialFen());
    assert(!result.over, "game should not be over at start");
  });

  await test("ChessTool: ELO calculation", async () => {
    const delta = ChessTool.eloChange(1200, 1200, 1);
    assert(delta === 16, `expected 16, got ${delta}`);
    const deltaLoss = ChessTool.eloChange(1200, 1200, 0);
    assert(deltaLoss === -16, `expected -16, got ${deltaLoss}`);
  });

  // ---- DB: clean test data ----
  await test("DB: cleanup test users", async () => {
    // Find any leftover test user IDs first
    const rows = await DbTool.query<{ id: number } & import("mysql2").RowDataPacket>(
      "SELECT id FROM users WHERE username IN ('test_alice','test_bob')", []
    );
    if (!rows.length) return;
    const ids = rows.map(r => r.id);
    const ph = ids.map(() => "?").join(",");
    await DbTool.execute(`DELETE ls FROM leaderboard_snapshots ls JOIN robots r ON r.id = ls.robot_id WHERE r.user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE mm FROM match_moves mm JOIN matches m ON m.id = mm.match_id JOIN robots r ON (r.id = m.robot_white_id OR r.id = m.robot_black_id) WHERE r.user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE m FROM matches m JOIN robots r ON (r.id = m.robot_white_id OR r.id = m.robot_black_id) WHERE r.user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM robots WHERE user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM balance_log WHERE user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM user_settings WHERE user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM users WHERE id IN (${ph})`, ids);
  });

  // ---- UserService ----
  let aliceId = 0;
  let bobId = 0;

  await test("UserService: create alice", async () => {
    aliceId = await UserService.create("test_alice", "pass1234", "test_alice@test.com");
    assert(aliceId > 0, "should return positive id");
  });

  await test("UserService: create bob", async () => {
    bobId = await UserService.create("test_bob", "pass1234", "test_bob@test.com");
    assert(bobId > 0, "should return positive id");
  });

  await test("UserService: login success", async () => {
    const result = await UserService.login("test_alice", "pass1234");
    assert(result !== null, "login should succeed");
    assert(result!.user.username === "test_alice", "username should match");
    assert(result!.token.length > 10, "token should be non-empty");
  });

  await test("UserService: login wrong password", async () => {
    const result = await UserService.login("test_alice", "wrongpass");
    assert(result === null, "login should fail with wrong password");
  });

  await test("UserService: email uniqueness", async () => {
    const existing = await UserService.findByEmail("test_alice@test.com");
    assert(existing !== null, "should find by email");
    assert(existing!.username === "test_alice", "should match username");
  });

  // ---- BalanceService ----
  await test("BalanceService: initial balance is 0.10", async () => {
    const bal = await BalanceService.getBalance(aliceId);
    assert(Math.abs(bal - 0.10) < 0.001, `expected ~0.10, got ${bal}`);
  });

  await test("BalanceService: deduct succeeds when sufficient", async () => {
    const ok = await BalanceService.deduct(aliceId, 0.01, "test_deduct");
    assert(ok, "deduct should succeed");
    const bal = await BalanceService.getBalance(aliceId);
    assert(Math.abs(bal - 0.09) < 0.001, `expected ~0.09, got ${bal}`);
  });

  await test("BalanceService: deduct fails when insufficient", async () => {
    const ok = await BalanceService.deduct(aliceId, 999, "test_overdraft");
    assert(!ok, "deduct should fail when insufficient");
  });

  await test("BalanceService: credit works", async () => {
    await BalanceService.credit(aliceId, 0.01, "test_credit");
    const bal = await BalanceService.getBalance(aliceId);
    assert(Math.abs(bal - 0.10) < 0.001, `expected ~0.10 after credit, got ${bal}`);
  });

  // ---- SettingsService ----
  await test("SettingsService: set and get API key", async () => {
    await SettingsService.setApiKey(aliceId, "sk-or-test-key-abc123");
    const key = await SettingsService.getApiKey(aliceId);
    assert(key === "sk-or-test-key-abc123", `expected key, got ${key}`);
  });

  await test("SettingsService: hasApiKey returns true", async () => {
    const has = await SettingsService.hasApiKey(aliceId);
    assert(has, "should have API key");
  });

  await test("SettingsService: delete API key", async () => {
    await SettingsService.deleteApiKey(aliceId);
    const key = await SettingsService.getApiKey(aliceId);
    assert(key === null, "key should be null after delete");
  });

  // ---- RobotService ----
  let aliceRobotId = 0;
  let bobRobotId = 0;

  await test("RobotService: create robot for alice", async () => {
    aliceRobotId = await RobotService.create(aliceId, "TestAliceBot", "google/gemini-flash-1-5", "Play aggressive", "chess", "openrouter", "my-enc-key");
    assert(aliceRobotId > 0, "should return positive id");
  });

  await test("RobotService: create robot for bob", async () => {
    bobRobotId = await RobotService.create(bobId, "TestBobBot", "google/gemini-flash-1-5", "Play defensive", "chess", "openrouter", "my-enc-key");
    assert(bobRobotId > 0, "should return positive id");
  });

  await test("RobotService: findByUser returns robots", async () => {
    const robots = await RobotService.findByUser(aliceId);
    assert(robots.length >= 1, "should have at least 1 robot");
    assert(robots.some(r => r.id === aliceRobotId), "should include alice's robot");
  });

  await test("RobotService: update robot name", async () => {
    const ok = await RobotService.update(aliceRobotId, aliceId, { name: "AliceBot-v2" });
    assert(ok, "update should succeed");
    const robot = await RobotService.findById(aliceRobotId);
    assert(robot!.name === "AliceBot-v2", "name should be updated");
  });

  await test("RobotService: suspend and activate", async () => {
    await RobotService.suspend(aliceRobotId);
    const suspended = await RobotService.findById(aliceRobotId);
    assert(suspended!.status === "suspended", "should be suspended");
    await RobotService.activate(aliceRobotId);
    const active = await RobotService.findById(aliceRobotId);
    assert(active!.status === "active", "should be active again");
  });

  await test("RobotService: updateStats win", async () => {
    const before = await RobotService.findById(aliceRobotId);
    await RobotService.updateStats(aliceRobotId, "win", 16);
    const after = await RobotService.findById(aliceRobotId);
    assert(after!.wins === before!.wins + 1, "wins should increment");
    assert(after!.elo === before!.elo + 16, "elo should increase");
  });

  // ---- MatchService ----
  let matchId = 0;
  const season = await LeaderboardService.getCurrentSeason();
  const seasonId = season!.id;

  await test("MatchService: create match", async () => {
    matchId = await MatchService.createMatch(seasonId, aliceRobotId, bobRobotId);
    assert(matchId > 0, "should return positive match id");
  });

  await test("MatchService: start match", async () => {
    await MatchService.startMatch(matchId);
    const match = await MatchService.getMatch(matchId);
    assert(match!.status === "running", "status should be running");
    assert(match!.started_at !== null, "started_at should be set");
  });

  await test("MatchService: record moves", async () => {
    const fen1 = ChessTool.applyMove(ChessTool.getInitialFen(), "e2e4")!;
    const fen2 = ChessTool.applyMove(fen1, "e7e5")!;
    await MatchService.recordMove(matchId, 1, aliceRobotId, "e2e4", fen1, 100, 0.000001);
    await MatchService.recordMove(matchId, 2, bobRobotId, "e7e5", fen2, 95, 0.0000009);
    const moves = await MatchService.getMoves(matchId);
    assert(moves.length === 2, `expected 2 moves, got ${moves.length}`);
    assert(moves[0].move_uci === "e2e4", "first move should be e2e4");
  });

  await test("MatchService: finish match with winner", async () => {
    await MatchService.finishMatch(matchId, aliceRobotId);
    const match = await MatchService.getMatch(matchId);
    assert(match!.status === "finished", "status should be finished");
    assert(match!.winner_id === aliceRobotId, "winner should be alice's robot");
  });

  await test("MatchService: getRecentMatches includes our match", async () => {
    const matches = await MatchService.getRecentMatches(10);
    assert(matches.some(m => m.id === matchId), "should include our match");
  });

  // ---- LeaderboardService ----
  await test("LeaderboardService: getCurrentSeason returns active season", async () => {
    const s = await LeaderboardService.getCurrentSeason();
    assert(s !== null, "should have active season");
    assert(s!.status === "active", "season should be active");
  });

  await test("LeaderboardService: takeSnapshot", async () => {
    await LeaderboardService.takeSnapshot(seasonId);
    const rows = await LeaderboardService.getLatestSnapshot(seasonId);
    assert(rows.length >= 0, "snapshot should succeed");
    LogCenter.info("TEST", `  Snapshot has ${rows.length} rows`);
  });

  // ---- AuthTool ----
  await test("AuthTool: token verify", async () => {
    const token = AuthTool.createToken({ userId: 999, role: "user" });
    const payload = AuthTool.verifyToken(token);
    assert(payload !== null, "token should be valid");
    assert(payload!.userId === 999, "userId should match");
  });

  // ---- Cleanup ----
  await test("Cleanup: delete test data in FK order", async () => {
    const ph = "?,?";
    const ids: [number, number] = [aliceId, bobId];
    await DbTool.execute(`DELETE ls FROM leaderboard_snapshots ls JOIN robots r ON r.id = ls.robot_id WHERE r.user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE mm FROM match_moves mm JOIN matches m ON m.id = mm.match_id JOIN robots r ON (r.id = m.robot_white_id OR r.id = m.robot_black_id) WHERE r.user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE m FROM matches m JOIN robots r ON (r.id = m.robot_white_id OR r.id = m.robot_black_id) WHERE r.user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM robots WHERE user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM balance_log WHERE user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM user_settings WHERE user_id IN (${ph})`, ids);
    await DbTool.execute(`DELETE FROM users WHERE id IN (${ph})`, ids);
  });

  // ---- Summary ----
  LogCenter.info("TEST", `\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  LogCenter.error("TEST", `Fatal: ${err.message}`);
  process.exit(1);
});
