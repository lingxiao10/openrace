import { DbTool } from "./src/tools/DbTool";

async function run() {
    DbTool.init();
    const alterSQLs = [
        `ALTER TABLE robots ADD COLUMN provider VARCHAR(50) DEFAULT NULL COMMENT 'AI provider (openrouter, openai, anthropic, etc.)'`,
        `ALTER TABLE robots ADD COLUMN api_key_encrypted VARCHAR(512) DEFAULT NULL COMMENT 'Encrypted API key'`,
        `ALTER TABLE robots ADD COLUMN error_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Consecutive API error count'`,
        `ALTER TABLE robots ADD COLUMN game_type ENUM('chess','doudizhu') NOT NULL DEFAULT 'chess' COMMENT 'Game type'`,
        `ALTER TABLE user_settings DROP COLUMN openrouter_key`
    ];

    for (const sql of alterSQLs) {
        try {
            await DbTool.execute(sql, []);
            console.log("Success: ", sql);
        } catch (e: any) {
            if (!e.message.includes("Duplicate column") && !e.message.includes("check that column")) console.error(e.message);
            else console.log("Skipped: ", sql);
        }
    }

    try {
        await DbTool.execute(`CREATE INDEX idx_robots_status_game_type ON robots(status, game_type)`, []);
        console.log("idx_robots_status_game_type created");
    } catch (e: any) {
        if (!e.message.includes("Duplicate")) console.error(e.message);
    }

    try {
        await DbTool.execute(`CREATE INDEX idx_robots_error_count ON robots(error_count)`, []);
        console.log("idx_robots_error_count created");
    } catch (e: any) {
        if (!e.message.includes("Duplicate")) console.error(e.message);
    }

    process.exit(0);
}

run();
