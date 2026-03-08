
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

async function run() {
    const secretPath = path.resolve(__dirname, '../secret_json.json');
    const secrets = JSON.parse(fs.readFileSync(secretPath, 'utf8'));

    const connection = await mysql.createConnection({
        host: secrets.db.host,
        user: secrets.db.user,
        password: secrets.db.password,
        database: secrets.db.database
    });

    const [matches] = await connection.execute('SELECT id, status, game_type, robot_white_id, robot_black_id, robot_third_id, created_at FROM matches ORDER BY created_at DESC LIMIT 5');
    console.log('--- Matches ---');
    console.log(matches);

    const [robots] = await connection.execute('SELECT id, name, removed FROM robots');
    console.log('--- Robots ---');
    console.log(robots);

    await connection.end();
}

run().catch(console.error);
