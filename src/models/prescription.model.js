const db = require('../config/db');
const { ModelError } = require('./helpers');

const ITEM_COLS = ['medication_name', 'dosage', 'frequency', 'duration', 'instructions'];

// patient_id / doctor_id come from the medical record, for ownership checks
async function findById(prescriptionId) {
  const { rows } = await db.query(
    `SELECT pr.*, r.patient_id, r.doctor_id,
            COALESCE((SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.item_id)
                        FROM prescription_item pi
                       WHERE pi.prescription_id = pr.prescription_id), '[]') AS items
       FROM prescription pr
       JOIN medical_record r ON r.record_id = pr.record_id
      WHERE pr.prescription_id = $1`,
    [prescriptionId]
  );
  return rows[0] || null;
}

async function listItems(prescriptionId) {
  const { rows } = await db.query(
    'SELECT * FROM prescription_item WHERE prescription_id = $1 ORDER BY item_id',
    [prescriptionId]
  );
  return rows;
}

// POST /records/{id}/prescriptions. items: [{ medication_name, dosage, frequency, duration, instructions }]
// A prescription must have at least one item (ER rule 1..*)
async function createWithItems(recordId, { refills_allowed, notes, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ModelError('A prescription needs at least one item');
  }
  const prescriptionId = await db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO prescription (record_id, refills_allowed, notes)
       VALUES ($1, COALESCE($2::smallint, 0), $3) RETURNING prescription_id`,
      [recordId, refills_allowed ?? null, notes ?? null]
    );
    const id = rows[0].prescription_id;
    for (const item of items) {
      await client.query(
        `INSERT INTO prescription_item (prescription_id, ${ITEM_COLS.join(', ')})
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, ...ITEM_COLS.map((col) => item[col] ?? null)]
      );
    }
    return id;
  });
  return findById(prescriptionId);
}

// POST /prescriptions/{id}/refill-request (patient).
// Returns null if no refills are left or a request is already pending.
async function requestRefill(prescriptionId) {
  const { rows } = await db.query(
    `UPDATE prescription SET status = 'refill_requested'
      WHERE prescription_id = $1
        AND refills_allowed > 0
        AND status IN ('active', 'refill_approved', 'refill_denied')
      RETURNING prescription_id`,
    [prescriptionId]
  );
  return rows[0] ? findById(prescriptionId) : null;
}

// PATCH /prescriptions/{id} (doctor): approve uses up one refill.
// Returns null if there is no pending refill request.
async function reviewRefill(prescriptionId, approve, notes) {
  const { rows } = await db.query(
    `UPDATE prescription
        SET status = CASE WHEN $2::boolean THEN 'refill_approved' ELSE 'refill_denied' END,
            refills_allowed = refills_allowed - CASE WHEN $2::boolean THEN 1 ELSE 0 END,
            notes = COALESCE($3, notes)
      WHERE prescription_id = $1 AND status = 'refill_requested'
      RETURNING prescription_id`,
    [prescriptionId, Boolean(approve), notes ?? null]
  );
  return rows[0] ? findById(prescriptionId) : null;
}

module.exports = { findById, listItems, createWithItems, requestRefill, reviewRefill };
