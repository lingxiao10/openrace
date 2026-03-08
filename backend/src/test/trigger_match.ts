// Quick trigger: manually run one matchmaking tick
import { DbTool } from "../tools/DbTool";
import { GameService } from "../services/GameService";
import { MatchService } from "../services/MatchService";
import { LeaderboardService } from "../services/LeaderboardService";
import { LogCenter } from "../log/LogCenter";

DbTool.init();

async function run() {
  LogCenter.info("Trigger", "Pairing robots...");
  await GameService.pairActiveRobots();

  const pending = await MatchService.getPendingMatches();
  LogCenter.info("Trigger", `Found ${pending.length} pending matches`);

  if (pending.length === 0) {
    LogCenter.info("Trigger", "No pending matches — creating one manually");
    const season = await LeaderboardService.getCurrentSeason();
    const matchId = await MatchService.createMatch(season!.id, 1, 2);
    LogCenter.info("Trigger", `Created match ${matchId}, running...`);
    await GameService.runMatch(matchId);
  } else {
    for (const m of pending) {
      LogCenter.info("Trigger", `Running match ${m.id}...`);
      await GameService.runMatch(m.id);
    }
  }

  const recent = await MatchService.getRecentMatches(3);
  for (const m of recent) {
    LogCenter.info("Trigger", `Match ${m.id}: ${(m as any).white_name} vs ${(m as any).black_name} → status=${m.status} winner=${m.winner_id ?? 'draw'} forfeit=${m.forfeit_reason ?? '-'}`);
  }

  process.exit(0);
}

run().catch(e => { LogCenter.error("Trigger", e.message); process.exit(1); });
