// npm run db:reset             -> create the database if missing, rebuild all tables, load demo data
// npm run db:reset -- --no-seed -> same, but empty tables
// WARNING: deletes all existing data in DB_NAME.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const dbName = process.env.DB_NAME;
const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};
const sqlFile = (name) => fs.readFileSync(path.join(__dirname, '..', 'database', name), 'utf8');

async function main() {
  if (!/^[a-z_][a-z0-9_]*$/.test(dbName || '')) {
    throw new Error(`DB_NAME "${dbName}" must be lowercase letters, digits and underscores`);
  }

  // Connect to the default "postgres" database to create ours if needed
  const admin = new Client({ ...config, database: 'postgres' });
  await admin.connect();
  const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database ${dbName}`);
  }
  await admin.end();

  const client = new Client({ ...config, database: dbName });
  await client.connect();
  try {
    await client.query(sqlFile('schema.sql'));
    console.log('Tables created (schema.sql)');
    if (!process.argv.includes('--no-seed')) {
      await client.query(sqlFile('seed.sql'));
      console.log('Demo data loaded (seed.sql). Demo password for every account: Clinic@123');
    }
    const counts = await client.query(
      `SELECT relname AS table, n_live_tup::int AS rows
         FROM pg_stat_user_tables ORDER BY relname`
    );
    console.log(`${counts.rows.length} tables in ${dbName}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Database reset failed:', err.message);
  process.exit(1);
});
