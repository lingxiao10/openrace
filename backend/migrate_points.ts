import { DbTool } from "./src/tools/DbTool";

async function run() {
    DbTool.init();
    try {
        await DbTool.execute("ALTER TABLE robots ADD COLUMN points INT DEFAULT 0 AFTER elo", []);
        console.log("points column added");
    } catch (e: any) {
        if (!e.message.includes("Duplicate column")) console.error(e);
    }
    try {
        await DbTool.execute("UPDATE robots SET points = (wins * 3 + draws * 1)", []);
        console.log("points updated");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();
