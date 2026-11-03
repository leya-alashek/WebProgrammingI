const db = require('../config/db');
const { buildSet, paging } = require('./helpers');

const EDITABLE = ['appointment_date', 'appointment_time', 'status', 'reason', 'notes'];

const SELECT_APPOINTMENT = `
  SELECT a.*,
         p.first_name || ' ' || p.last_name AS patient_name,
         d.first_name || ' ' || d.last_name AS doctor_name,
         d.specialization
    FROM appointment a
    JOIN patient p ON p.patient_id = a.patient_id
    JOIN doctor  d ON d.doctor_id  = a.doctor_id`;

// "List appointments by role": pass patientId for a patient, doctorId for a doctor,
// neither for staff/admin. from / to are 'YYYY-MM-DD' (inclusive).
async function list({ patientId, doctorId, status, from, to, limit, offset } = {}) {
  const [l, o] = paging({ limit, offset });
  const { rows } = await db.query(
    `${SELECT_APPOINTMENT}
      WHERE ($1::int  IS NULL OR a.patient_id = $1)
        AND ($2::int  IS NULL OR a.doctor_id = $2)
        AND ($3::text IS NULL OR a.status = $3)
        AND ($4::date IS NULL OR a.appointment_date >= $4)
        AND ($5::date IS NULL OR a.appointment_date <= $5)
      ORDER BY a.appointment_date, a.appointment_time
      LIMIT $6 OFFSET $7`,
    [patientId || null, doctorId || null, status || null, from || null, to || null, l, o]
  );
  return rows;
}

async function findById(appointmentId) {
  const { rows } = await db.query(`${SELECT_APPOINTMENT} WHERE a.appointment_id = $1`, [appointmentId]);
  return rows[0] || null;
}

// Throws err.code '23505' (PG_ERRORS.UNIQUE) if the slot is already taken.
// Check Doctor.isSlotAvailable() first to also enforce working hours.
async function create({ patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes }) {
  const { rows } = await db.query(
    `INSERT INTO appointment (patient_id, doctor_id, appointment_date, appointment_time, status, reason, notes)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'requested'), $6, $7)
     RETURNING appointment_id`,
    [patient_id, doctor_id, appointment_date, appointment_time, status || null, reason ?? null, notes ?? null]
  );
  return findById(rows[0].appointment_id);
}

// Reschedule (date/time) or change status. Same '23505' rule as create
async function update(appointmentId, fields) {
  const { clause, values } = buildSet(fields, EDITABLE, 2);
  if (!clause) return findById(appointmentId);
  const { rows } = await db.query(
    `UPDATE appointment SET ${clause} WHERE appointment_id = $1 RETURNING appointment_id`,
    [appointmentId, ...values]
  );
  return rows[0] ? findById(appointmentId) : null;
}

// DELETE /appointments/{id}: soft cancel. Returns null if missing, completed or already cancelled
async function cancel(appointmentId) {
  const { rows } = await db.query(
    `UPDATE appointment SET status = 'cancelled'
      WHERE appointment_id = $1 AND status NOT IN ('cancelled', 'completed')
      RETURNING appointment_id`,
    [appointmentId]
  );
  return rows[0] ? findById(appointmentId) : null;
}

module.exports = { list, findById, create, update, cancel };
