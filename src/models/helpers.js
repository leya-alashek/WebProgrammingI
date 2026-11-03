// PostgreSQL error codes worth turning into HTTP responses (err.code)
const PG_ERRORS = {
  UNIQUE: '23505',        // duplicate email, double-booked slot, ... -> 409
  FOREIGN_KEY: '23503',   // referenced row does not exist -> 400
  NOT_NULL: '23502',      // required column missing -> 400
  CHECK: '23514',         // value outside allowed set (role, status, ...) -> 400
  INVALID_INPUT: '22P02', // e.g. 'abc' passed where an integer is expected -> 400
  INVALID_DATETIME: '22007',
  DATETIME_OVERFLOW: '22008',
};

// Error for rule violations detected in the models; controllers send err.status
class ModelError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Builds "col_a = $1, col_b = $2" from the allowed keys present in fields.
// Keys not in `allowed` are ignored, so request bodies can be passed straight in.
function buildSet(fields, allowed, startIndex = 1) {
  const cols = allowed.filter((col) => fields[col] !== undefined);
  return {
    clause: cols.map((col, i) => `${col} = $${startIndex + i}`).join(', '),
    values: cols.map((col) => fields[col]),
  };
}

// Normalizes ?limit=&offset= into safe numbers (limit 1-100, default 20)
function paging({ limit, offset } = {}) {
  const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const o = Math.max(parseInt(offset, 10) || 0, 0);
  return [l, o];
}

const normalizeEmail = (email) => (email == null ? email : String(email).trim().toLowerCase());

module.exports = { PG_ERRORS, ModelError, buildSet, paging, normalizeEmail };
