// Check table structure
const mysql = require('mysql2/promise');
const fs = require('fs');

async function checkTable() {
  const config = JSON.parse(fs.readFileSync('../secret_json.json', 'utf8'));

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  const [columns] = await connection.query('DESCRIBE robots');
  console.log('Current robots table structure:');
  console.table(columns);

  await connection.end();
}

checkTable().catch(console.error);
