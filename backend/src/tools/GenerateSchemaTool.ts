// ============================================================
// GenerateSchemaTool.ts — Connect to MySQL and dump full schema
// Usage: ts-node src/tools/GenerateSchemaTool.ts
// Output: schema_generated.sql in backend/
// ============================================================

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

// Load config inline to avoid circular deps
const secretPath = path.resolve(__dirname, "../../../secret_json.json");
const defaultPath = path.resolve(__dirname, "../../../secret_json_default.json");

function loadSecrets(): any {
  if (fs.existsSync(secretPath)) return JSON.parse(fs.readFileSync(secretPath, "utf-8"));
  if (fs.existsSync(defaultPath)) return JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
  return {};
}

const secrets = loadSecrets();

const dbConfig = {
  host: secrets.db?.host || "localhost",
  port: secrets.db?.port || 3306,
  user: secrets.db?.user || "root",
  password: secrets.db?.password || "123456",
  database: secrets.db?.database || "game_ai",
};

async function generate() {
  const conn = await mysql.createConnection(dbConfig);

  try {
    console.log(`Connected to MySQL: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

    // Get all table names
    const [tables] = await conn.query<any[]>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [dbConfig.database]
    );

    const tableNames: string[] = tables.map((r: any) => r.TABLE_NAME);
    console.log(`Found ${tableNames.length} tables: ${tableNames.join(", ")}`);

    const lines: string[] = [];
    lines.push(`-- ============================================================`);
    lines.push(`-- schema_generated.sql — Full database structure`);
    lines.push(`-- Database: ${dbConfig.database}`);
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- ============================================================`);
    lines.push(``);
    lines.push(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    lines.push(`USE \`${dbConfig.database}\`;`);
    lines.push(``);

    for (const table of tableNames) {
      const [[row]] = await conn.query<any[]>(`SHOW CREATE TABLE \`${table}\``);
      const createSql: string = row["Create Table"];

      lines.push(`-- ------------------------------------------------------------`);
      lines.push(`-- Table: ${table}`);
      lines.push(`-- ------------------------------------------------------------`);
      lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      lines.push(createSql + ";");
      lines.push(``);
    }

    const outPath = path.resolve(__dirname, "../../schema_generated.sql");
    fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
    console.log(`\nSchema written to: ${outPath}`);
  } finally {
    await conn.end();
  }
}

generate().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
