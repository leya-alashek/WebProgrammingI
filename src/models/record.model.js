const db = require('../config/db');
const { buildSet, ModelError } = require('./helpers');

const EDITABLE = ['visit_date', 'treatment_plan', 'notes'];

// GET /patients/{id}/records: newest first, with a one-line diagnosis summary
async function listByPatient(patientId) {
  const { rows } = await db.query(
    `SELECT r.record_id, r.visit_date, r.appointment_id, r.treatment_plan,
            r.doctor_id, d.first_name || ' ' || d.last_name AS doctor_name, d.specialization,
            (SELECT string_agg(dg.description, '; ' ORDER BY dg.diagnosis_id)
               FROM diagnosis dg WHERE dg.record_id = r.record_id) AS diagnoses_summary
       FROM medical_record r
       JOIN doctor d ON d.doctor_id = r.doctor_id
      WHERE r.patient_id = $1
      ORDER BY r.visit_date DESC, r.record_id DESC`,
    [patientId]
  );
  return rows;
}

// GET /records/{id}: full record with diagnoses, prescriptions (+ items) and lab tests.
// patient_id / doctor_id are included so controllers can check ownership.
async function findById(recordId) {
  const { rows } = await db.query(
    `SELECT r.*,
            p.first_name || ' ' || p.last_name AS patient_name,
            d.first_name || ' ' || d.last_name AS doctor_name,
            COALESCE((SELECT jsonb_agg(to_jsonb(dg) ORDER BY dg.diagnosis_id)
                        FROM diagnosis dg WHERE dg.record_id = r.record_id), '[]') AS diagnoses,
            COALESCE((SELECT jsonb_agg(to_jsonb(pr) || jsonb_build_object('items',
                               COALESCE((SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.item_id)
                                           FROM prescription_item pi
                                          WHERE pi.prescription_id = pr.prescription_id), '[]'))
                               ORDER BY pr.prescription_id)
                        FROM prescription pr WHERE pr.record_id = r.record_id), '[]') AS prescriptions,
            COALESCE((SELECT jsonb_agg(to_jsonb(lt) ORDER BY lt.lab_test_id)
                        FROM lab_test lt WHERE lt.record_id = r.record_id), '[]') AS lab_tests
       FROM medical_record r
       JOIN patient p ON p.patient_id = r.patient_id
       JOIN doctor  d ON d.doctor_id  = r.doctor_id
      WHERE r.record_id = $1`,
    [recordId]
  );
  return rows[0] || null;
}

// POST /patients/{id}/records. visit_date defaults to today.
// If appointment_id is given it must belong to this patient and doctor,
// and that appointment is marked completed in the same transaction.
async function create({ patient_id, doctor_id, appointment_id, visit_date, treatment_plan, notes }) {
  const recordId = await db.withTransaction(async (client) => {
    if (appointment_id) {
      const { rows } = await client.query(
        `UPDATE appointment SET status = 'completed'
          WHERE appointment_id = $1 AND patient_id = $2 AND doctor_id = $3
            AND status <> 'cancelled'
          RETURNING appointment_id`,
        [appointment_id, patient_id, doctor_id]
      );
      if (!rows[0]) throw new ModelError('Appointment not found for this patient and doctor, or it was cancelled');
    }
    const { rows } = await client.query(
      `INSERT INTO medical_record (patient_id, doctor_id, appointment_id, visit_date, treatment_plan, notes)
       VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6)
       RETURNING record_id`,
      [patient_id, doctor_id, appointment_id || null, visit_date || null, treatment_plan ?? null, notes ?? null]
    );
    return rows[0].record_id;
  });
  return findById(recordId);
}

async function update(recordId, fields) {
  const { clause, values } = buildSet(fields, EDITABLE, 2);
  if (!clause) return findById(recordId);
  const { rows } = await db.query(
    `UPDATE medical_record SET ${clause} WHERE record_id = $1 RETURNING record_id`,
    [recordId, ...values]
  );
  return rows[0] ? findById(recordId) : null;
}

// POST /records/{id}/diagnoses
async function addDiagnosis(recordId, { icd_code, description }) {
  const { rows } = await db.query(
    `INSERT INTO diagnosis (record_id, icd_code, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [recordId, icd_code ?? null, description]
  );
  return rows[0];
}

module.exports = { listByPatient, findById, create, update, addDiagnosis };
