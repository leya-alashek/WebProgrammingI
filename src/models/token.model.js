const db = require('../config/db');

// Store a HASH of the refresh token (e.g. sha256), never the token itself
async function create(userId, tokenHash, expiresAt) {
  const { rows } = await db.query(
    `INSERT INTO refresh_token (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING token_id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
}

// Returns the token row only if it is not revoked and not expired
async function findValid(tokenHash) {
  const { rows } = await db.query(
    `SELECT t.token_id, t.user_id, t.expires_at, u.role
       FROM refresh_token t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.token_hash = $1 AND t.revoked_at IS NULL AND t.expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

// Logout: returns true if a live token was revoked
async function revoke(tokenHash) {
  const { rows } = await db.query(
    `UPDATE refresh_token SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL RETURNING token_id`,
    [tokenHash]
  );
  return rows.length > 0;
}

// Logout from every device (e.g. after a password change)
async function revokeAllForUser(userId) {
  await db.query(
    'UPDATE refresh_token SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId]
  );
}

module.exports = { create, findValid, revoke, revokeAllForUser };
