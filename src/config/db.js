const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// An idle client losing its connection must not crash the server
pool.on('error', (err) => console.error('Unexpected PostgreSQL error:', err.message));

// Run one parameterized query: query('SELECT * FROM doctor WHERE doctor_id = $1', [id])
const query = (text, params) => pool.query(text, params);

// Run several queries as one all-or-nothing unit.
// fn receives a client; use client.query(...) inside it. Throwing rolls everything back.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
