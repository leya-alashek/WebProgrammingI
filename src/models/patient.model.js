const db = require('../config/db');
const User = require('./user.model');
const { buildSet, paging, normalizeEmail } = require('./helpers');

const EDITABLE = [
  'first_name', 'last_name', 'date_of_birth', 'gender', 'phone',
  'email', 'address', 'blood_type', 'allergies',
];

// search matches name, phone or email; total_count is the number of matches before paging
async function list({ search, limit, offset } = {}) {
  const [l, o] = paging({ limit, offset });
  const { rows } = await db.query(
    `SELECT *, COUNT(*) OVER()::int AS total_count
       FROM patient
      WHERE $1::text IS NULL
         OR first_name || ' ' || last_name ILIKE '%' || $1 || '%'
         OR phone ILIKE '%' || $1 || '%'
         OR email ILIKE '%' || $1 || '%'
      ORDER BY last_name, first_name
      LIMIT $2 OFFSET $3`,
    [search || null, l, o]
  );
  return rows;
}

async function findById(patientId) {
  const { rows } = await db.query('SELECT * FROM patient WHERE patient_id = $1', [patientId]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM patient WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// Walk-in patient (no account) when userId is omitted
async function create(data, userId = null, client = db) {
  const fields = { ...data, email: normalizeEmail(data.email) };
  const values = EDITABLE.map((col) => fields[col] ?? null);
  const { rows } = await client.query(
    `INSERT INTO patient (user_id, ${EDITABLE.join(', ')})
     VALUES ($1, ${EDITABLE.map((_, i) => `$${i + 2}`).join(', ')})
     RETURNING *`,
    [userId, ...values]
  );
  return rows[0];
}

// POST /auth/register: account + patient profile, both or neither
async function registerWithAccount({ email, passwordHash, ...profile }) {
  return db.withTransaction(async (client) => {
    const user = await User.create({ email, passwordHash, role: 'patient' }, client);
    const patient = await create({ ...profile, email }, user.user_id, client);
    return { user, patient };
  });
}

async function update(patientId, fields) {
  const { clause, values } = buildSet(
    { ...fields, email: normalizeEmail(fields.email) },
    EDITABLE,
    2
  );
  if (!clause) return findById(patientId);
  const { rows } = await db.query(
    `UPDATE patient SET ${clause} WHERE patient_id = $1 RETURNING *`,
    [patientId, ...values]
  );
  return rows[0] || null;
}

module.exports = { list, findById, findByUserId, create, registerWithAccount, update };
