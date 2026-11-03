const db = require('../config/db');

// patient_id / doctor_id come from the medical record, for ownership checks
async function findById(labTestId) {
  const { rows } = await db.query(
    `SELECT lt.*, r.patient_id, r.doctor_id
       FROM lab_test lt
       JOIN medical_record r ON r.record_id = lt.record_id
      WHERE lt.lab_test_id = $1`,
    [labTestId]
  );
  return rows[0] || null;
}

// POST /records/{id}/lab-tests: new tests start as 'ordered'
async function create(recordId, { test_name, notes }) {
  const { rows } = await db.query(
    `INSERT INTO lab_test (record_id, test_name, notes)
     VALUES ($1, $2, $3) RETURNING lab_test_id`,
    [recordId, test_name, notes ?? null]
  );
  return findById(rows[0].lab_test_id);
}

// PATCH /lab-tests/{id}: stores the result and marks the test completed (test_date defaults to today)
async function recordResult(labTestId, { result, test_date, notes }) {
  const { rows } = await db.query(
    `UPDATE lab_test
        SET result = $2, status = 'completed',
            test_date = COALESCE($3::date, test_date, CURRENT_DATE),
            notes = COALESCE($4, notes)
      WHERE lab_test_id = $1
      RETURNING lab_test_id`,
    [labTestId, result, test_date || null, notes ?? null]
  );
  return rows[0] ? findById(labTestId) : null;
}

module.exports = { findById, create, recordResult };
