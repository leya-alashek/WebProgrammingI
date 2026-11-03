const db = require('../config/db');
const { buildSet, normalizeEmail } = require('./helpers');

// Never return password_hash except to the login check
const SAFE_COLS = 'user_id, email, role, created_at, last_login';

// Login only: includes password_hash for bcrypt.compare
async function findByEmailWithPassword(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [normalizeEmail(email)]);
  return rows[0] || null;
}

async function findById(userId) {
  const { rows } = await db.query(`SELECT ${SAFE_COLS} FROM users WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

// client: pass a transaction client when creating the account together with a profile
async function create({ email, passwordHash, role }, client = db) {
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING ${SAFE_COLS}`,
    [normalizeEmail(email), passwordHash, role]
  );
  return rows[0];
}

async function updateLastLogin(userId) {
  await db.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [userId]);
}

// fields: { email?, passwordHash? }
async function update(userId, fields) {
  const { clause, values } = buildSet(
    { email: normalizeEmail(fields.email), password_hash: fields.passwordHash },
    ['email', 'password_hash'],
    2
  );
  if (!clause) return findById(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${clause} WHERE user_id = $1 RETURNING ${SAFE_COLS}`,
    [userId, ...values]
  );
  return rows[0] || null;
}

// Account plus its patient / doctor / staff profile (profile is null for admin)
async function getProfile(userId) {
  const { rows } = await db.query(
    `SELECT u.user_id, u.email, u.role, u.created_at, u.last_login,
            COALESCE(to_jsonb(p), to_jsonb(d), to_jsonb(s)) AS profile
       FROM users u
       LEFT JOIN patient p ON p.user_id = u.user_id
       LEFT JOIN doctor  d ON d.user_id = u.user_id
       LEFT JOIN staff   s ON s.user_id = u.user_id
      WHERE u.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

module.exports = { findByEmailWithPassword, findById, create, updateLastLogin, update, getProfile };
