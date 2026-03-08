// Quick migration runner
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const config = JSON.parse(fs.readFileSync('../secret_json.json', 'utf8'));

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true
  });

  console.log('Connected to database:', config.db.database);

  const sql = fs.readFileSync(path.join(__dirname, 'migrations/add_doudizhu_support.sql'), 'utf8');

  try {
    await connection.query(sql);
    console.log('✓ Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
