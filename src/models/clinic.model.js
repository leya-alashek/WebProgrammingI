const db = require('../config/db');

async function list() {
  const { rows } = await db.query('SELECT * FROM clinic ORDER BY name');
  return rows;
}

async function findById(clinicId) {
  const { rows } = await db.query('SELECT * FROM clinic WHERE clinic_id = $1', [clinicId]);
  return rows[0] || null;
}

async function listStaff(clinicId) {
  const { rows } = await db.query(
    `SELECT s.staff_id, s.user_id, u.email, s.first_name, s.last_name,
            s.position, s.phone, s.created_at
       FROM staff s
       JOIN users u ON u.user_id = s.user_id
      WHERE s.clinic_id = $1
      ORDER BY s.last_name, s.first_name`,
    [clinicId]
  );
  return rows;
}

module.exports = { list, findById, listStaff };
