// Add indexes only
const mysql = require('mysql2/promise');
const fs = require('fs');

async function addIndexes() {
  const config = JSON.parse(fs.readFileSync('../secret_json.json', 'utf8'));

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  console.log('Adding indexes...');

  try {
    // Check if index exists before creating
    const [robotIndexes] = await connection.query("SHOW INDEX FROM robots WHERE Key_name = 'idx_robots_game_type'");
    if (robotIndexes.length === 0) {
      await connection.query('CREATE INDEX idx_robots_game_type ON robots(game_type, status)');
      console.log('✓ Created idx_robots_game_type');
    } else {
      console.log('✓ idx_robots_game_type already exists');
    }

    const [matchIndexes] = await connection.query("SHOW INDEX FROM matches WHERE Key_name = 'idx_matches_game_type'");
    if (matchIndexes.length === 0) {
      await connection.query('CREATE INDEX idx_matches_game_type ON matches(game_type, status)');
      console.log('✓ Created idx_matches_game_type');
    } else {
      console.log('✓ idx_matches_game_type already exists');
    }

    console.log('\n✓ Migration completed successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addIndexes().catch(console.error);
