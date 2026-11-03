const db = require('../config/db');
const User = require('./user.model');
const { buildSet } = require('./helpers');

const EDITABLE = ['clinic_id', 'first_name', 'last_name', 'position', 'phone'];

async function findById(staffId) {
  const { rows } = await db.query('SELECT * FROM staff WHERE staff_id = $1', [staffId]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM staff WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// POST /staff (admin): login account + staff profile, both or neither
async function createWithAccount({ email, passwordHash, ...profile }) {
  return db.withTransaction(async (client) => {
    const user = await User.create({ email, passwordHash, role: 'staff' }, client);
    const { rows } = await client.query(
      `INSERT INTO staff (user_id, ${EDITABLE.join(', ')})
       VALUES ($1, ${EDITABLE.map((_, i) => `$${i + 2}`).join(', ')})
       RETURNING *`,
      [user.user_id, ...EDITABLE.map((col) => profile[col] ?? null)]
    );
    return { user, staff: rows[0] };
  });
}

async function update(staffId, fields) {
  const { clause, values } = buildSet(fields, EDITABLE, 2);
  if (!clause) return findById(staffId);
  const { rows } = await db.query(
    `UPDATE staff SET ${clause} WHERE staff_id = $1 RETURNING *`,
    [staffId, ...values]
  );
  return rows[0] || null;
}

module.exports = { findById, findByUserId, createWithAccount, update };
