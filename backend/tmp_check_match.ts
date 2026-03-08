
import { DbTool } from "./src/tools/DbTool";

async function run() {
    const matchId = 583;
    const matchRows = await DbTool.query("SELECT * FROM matches WHERE id = ?", [matchId]);
    console.log("Match Status:", JSON.stringify(matchRows, null, 2));

    if (matchRows.length > 0) {
        const moves = await DbTool.query("SELECT * FROM match_moves WHERE match_id = ? ORDER BY move_number DESC LIMIT 5", [matchId]);
        console.log("Recent Moves:", JSON.stringify(moves, null, 2));

        const robotIds = [matchRows[0].robot_white_id, matchRows[0].robot_black_id];
        const robots = await DbTool.query("SELECT id, name, model, provider, status, error_count, removed FROM robots WHERE id IN (?, ?)", robotIds);
        console.log("Robots involved:", JSON.stringify(robots, null, 2));
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
