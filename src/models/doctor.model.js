const db = require('../config/db');
const User = require('./user.model');
const { paging } = require('./helpers');

const PROFILE_COLS = [
  'clinic_id', 'first_name', 'last_name', 'specialization',
  'phone', 'license_number', 'bio',
];

const SELECT_DOCTOR = `
  SELECT d.doctor_id, d.user_id, d.clinic_id, c.name AS clinic_name,
         d.first_name, d.last_name, d.specialization, d.phone,
         d.license_number, d.bio, d.created_at
    FROM doctor d
    JOIN clinic c ON c.clinic_id = d.clinic_id`;

// search matches name or specialization; specialization / clinicId filter exactly
async function list({ search, specialization, clinicId, limit, offset } = {}) {
  const [l, o] = paging({ limit, offset });
  const { rows } = await db.query(
    `${SELECT_DOCTOR}
      WHERE ($1::text IS NULL
             OR d.first_name || ' ' || d.last_name ILIKE '%' || $1 || '%'
             OR d.specialization ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR d.specialization ILIKE $2)
        AND ($3::int IS NULL OR d.clinic_id = $3)
      ORDER BY d.last_name, d.first_name
      LIMIT $4 OFFSET $5`,
    [search || null, specialization || null, clinicId || null, l, o]
  );
  return rows;
}

async function findById(doctorId) {
  const { rows } = await db.query(`${SELECT_DOCTOR} WHERE d.doctor_id = $1`, [doctorId]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const { rows } = await db.query(`${SELECT_DOCTOR} WHERE d.user_id = $1`, [userId]);
  return rows[0] || null;
}

// POST /doctors (admin): login account + doctor profile, both or neither
async function createWithAccount({ email, passwordHash, ...profile }) {
  return db.withTransaction(async (client) => {
    const user = await User.create({ email, passwordHash, role: 'doctor' }, client);
    const { rows } = await client.query(
      `INSERT INTO doctor (user_id, ${PROFILE_COLS.join(', ')})
       VALUES ($1, ${PROFILE_COLS.map((_, i) => `$${i + 2}`).join(', ')})
       RETURNING *`,
      [user.user_id, ...PROFILE_COLS.map((col) => profile[col] ?? null)]
    );
    return { user, doctor: rows[0] };
  });
}

async function getSchedule(doctorId) {
  const { rows } = await db.query(
    `SELECT schedule_id, day_of_week, start_time, end_time, slot_minutes
       FROM doctor_schedule WHERE doctor_id = $1
      ORDER BY day_of_week, start_time`,
    [doctorId]
  );
  return rows;
}

// PUT /doctors/{id}/schedule: replaces the whole week.
// slots: [{ day_of_week, start_time, end_time, slot_minutes? }]
async function replaceSchedule(doctorId, slots) {
  await db.withTransaction(async (client) => {
    await client.query('DELETE FROM doctor_schedule WHERE doctor_id = $1', [doctorId]);
    for (const s of slots) {
      await client.query(
        `INSERT INTO doctor_schedule (doctor_id, day_of_week, start_time, end_time, slot_minutes)
         VALUES ($1, $2, $3, $4, COALESCE($5::smallint, 30))`,
        [doctorId, s.day_of_week, s.start_time, s.end_time, s.slot_minutes ?? null]
      );
    }
  });
  return getSchedule(doctorId);
}

// Free slots on one date ('YYYY-MM-DD'): working hours minus non-cancelled appointments.
// Past slots are left out. Returns [{ time: 'HH:MM' }]
async function getAvailability(doctorId, date) {
  const { rows } = await db.query(
    `SELECT to_char(slot, 'HH24:MI') AS time
       FROM doctor_schedule s
      CROSS JOIN LATERAL generate_series(
              $2::date + s.start_time,
              $2::date + s.end_time - make_interval(mins => s.slot_minutes),
              make_interval(mins => s.slot_minutes)) AS slot
      WHERE s.doctor_id = $1
        AND s.day_of_week = EXTRACT(DOW FROM $2::date)
        AND slot > LOCALTIMESTAMP
        AND NOT EXISTS (
              SELECT 1 FROM appointment a
               WHERE a.doctor_id = s.doctor_id
                 AND a.appointment_date = $2::date
                 AND a.appointment_time = slot::time
                 AND a.status <> 'cancelled')
      ORDER BY slot`,
    [doctorId, date]
  );
  return rows;
}

// True if the doctor works at that time and nobody has booked it
async function isSlotAvailable(doctorId, date, time) {
  const slots = await getAvailability(doctorId, date);
  const hhmm = String(time).slice(0, 5);
  return slots.some((s) => s.time === hhmm);
}

module.exports = {
  list, findById, findByUserId, createWithAccount,
  getSchedule, replaceSchedule, getAvailability, isSlotAvailable,
};
