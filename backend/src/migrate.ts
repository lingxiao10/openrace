// ============================================================
// migrate.ts — One-command database setup & migration runner
// Usage: npm run migrate
// ============================================================

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import config from "./config/config";

const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");
const SCHEMA_FILE   = path.resolve(__dirname, "../schema.sql");

async function run(): Promise<void> {
  const conn = await mysql.createConnection({
    host:     config.db.host,
    port:     config.db.port,
    user:     config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  console.log("✅ Connected to database:", config.db.database);

  // 1. Apply base schema (all CREATE TABLE IF NOT EXISTS — safe to re-run)
  console.log("\n📄 Applying base schema (schema.sql)...");
  const schemaSql = fs.readFileSync(SCHEMA_FILE, "utf-8");
  await conn.query(schemaSql);
  console.log("   ✓ Base schema applied");

  // 2. Ensure migrations tracking table exists
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Get already-applied migrations
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT name FROM _migrations"
  );
  const applied = new Set(rows.map((r) => r.name));

  // 4. Read and sort migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`\n🔄 Running migrations (${files.length} total)...`);

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`   ⏭  ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    try {
      await conn.query(sql);
      await conn.query("INSERT INTO _migrations (name) VALUES (?)", [file]);
      console.log(`   ✓  ${file}`);
      ran++;
    } catch (err: any) {
      // Ignore "duplicate column" / "already exists" errors — idempotent
      if (
        err.code === "ER_DUP_FIELDNAME" ||
        err.code === "ER_TABLE_EXISTS_ERROR" ||
        err.code === "ER_DUP_KEYNAME" ||
        (err.message && err.message.includes("Duplicate column"))
      ) {
        await conn.query("INSERT IGNORE INTO _migrations (name) VALUES (?)", [file]);
        console.log(`   ⚠  ${file} (skipped — already exists)`);
      } else {
        console.error(`   ✗  ${file} FAILED:`, err.message);
        await conn.end();
        process.exit(1);
      }
    }
  }

  console.log(
    ran > 0
      ? `\n🎉 Done — ${ran} migration(s) applied.`
      : "\n🎉 Done — database is already up to date."
  );

  await conn.end();
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
