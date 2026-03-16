require('dotenv').config();
const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host:     process.env.DB_HOST     || 'task-db',
        port:     5432,
        database: process.env.DB_NAME     || 'task_db',
        user:     process.env.DB_USER     || 'task_user',
        password: process.env.DB_PASSWORD || 'task_secret',
      }
);

async function initDB() {
  const sqlPath = path.join(__dirname, 'init.sql');
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('[task-db] Tables initialized ✅');
  }
}

module.exports = { pool, initDB };