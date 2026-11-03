# Database Layer: Guide for the Team

All SQL lives in `src/models/`. Controllers **never write SQL**: they call a model function and turn the result into an HTTP response.

```js
const { Appointment, Doctor, PG_ERRORS } = require('../models');

const slots = await Doctor.getAvailability(req.params.id, req.query.date);
res.json(slots);
```

## Setup (each team member, once)

1. Install PostgreSQL. Remember the password you give the `postgres` user.
2. `npm install`
3. Copy `.env.example` to `.env` and fill in `DB_PASSWORD`. **Never commit `.env`** (it is git-ignored).
4. `npm run db:reset`: creates the `clinic_portal` database and all 13 tables, then loads the demo data.
   Run it again at any time to get a clean database (**it deletes all data**). Use `npm run db:reset -- --no-seed` for empty tables.

## Demo accounts (password for all: `Clinic@123`)

| Email | Role | Profile |
|---|---|---|
| admin@clinic.com | admin | none |
| dr.khan@clinic.com | doctor | doctor_id 1, General Practice (works Mon and Wed 09:00–13:00) |
| dr.lee@clinic.com | doctor | doctor_id 2, Cardiology (works Tue and Thu 14:00–18:00) |
| reception@clinic.com | staff | staff_id 1, receptionist |
| sara.ali@mail.com | patient | patient_id 1 |
| none (walk-in) | none | patient_id 2, John Smith |

The password hashes are real bcrypt hashes: `bcrypt.compare('Clinic@123', user.password_hash)` returns true (works with `bcrypt` and `bcryptjs`).

## Rules every model follows

- **Not found → `null`.** `findById(999)` returns `null` instead of throwing, so send a 404.
- **"Not allowed right now" → `null`.** For example, cancelling an already completed appointment, or requesting a refill when none are left. Send 400 or 409.
- **Database rule broken → the error is thrown with `err.code`.** Map it with `PG_ERRORS`:

  | `err.code` | Meaning | HTTP |
  |---|---|---|
  | `PG_ERRORS.UNIQUE` (23505) | Email taken, slot already booked, duplicate licence | 409 |
  | `PG_ERRORS.FOREIGN_KEY` (23503) | Referenced patient/doctor/clinic/record doesn't exist | 400 |
  | `PG_ERRORS.NOT_NULL` (23502) | Required field missing | 400 |
  | `PG_ERRORS.CHECK` (23514) | Invalid role/status, schedule end before start | 400 |
  | `PG_ERRORS.INVALID_INPUT` (22P02), `INVALID_DATETIME` (22007) | `abc` instead of a number or date | 400 |
- **`ModelError`** is thrown for business rules (for example, a prescription with no items). Send `err.status` (400) with `err.message`.
- **Update functions ignore unknown keys,** so `Patient.update(id, req.body)` cannot change `patient_id` or `user_id`. Passing no editable fields returns the current row.
- **Passwords:** hash them in the controller (bcrypt) and pass `passwordHash`. Only `User.findByEmailWithPassword` returns `password_hash`.
- **Ownership checks** ("own patient") are the controller's job. Records, prescriptions, lab tests and appointments all return `patient_id` and `doctor_id` to compare with the logged-in user (`Patient.findByUserId(req.user.user_id)`).
- **Multi-table writes are transactions.** If any step fails, nothing is saved.

## Endpoint → model function

| Endpoint | Function |
|---|---|
| POST /auth/register | `Patient.registerWithAccount({ email, passwordHash, first_name, last_name, ... })` |
| POST /auth/login | `User.findByEmailWithPassword(email)` → bcrypt.compare → `User.updateLastLogin(id)` → `Token.create(userId, sha256(token), expiresAt)` |
| POST /auth/refresh | `Token.findValid(sha256(token))` |
| POST /auth/logout | `Token.revoke(sha256(token))` |
| GET /users/me | `User.getProfile(userId)` (account + patient/doctor/staff profile) |
| PATCH /users/me | `User.update(userId, { email, passwordHash })` plus `Patient.update(...)` for patient details |
| GET /patients | `Patient.list({ search, limit, offset })` (rows include `total_count`) |
| POST /patients | `Patient.create(body)` (walk-in, no account) |
| GET /patients/{id} | `Patient.findById(id)` |
| PATCH /patients/{id} | `Patient.update(id, body)` |
| GET /patients/{id}/records | `Record.listByPatient(id)` |
| POST /patients/{id}/records | `Record.create({ patient_id, doctor_id, appointment_id?, visit_date?, treatment_plan, notes })` (marks the appointment completed) |
| GET /doctors | `Doctor.list({ search, specialization, clinicId, limit, offset })` |
| POST /doctors | `Doctor.createWithAccount({ email, passwordHash, clinic_id, first_name, last_name, license_number, ... })` |
| GET /doctors/{id} | `Doctor.findById(id)`, optionally plus `Doctor.getSchedule(id)` |
| GET /doctors/{id}/availability | `Doctor.getAvailability(id, 'YYYY-MM-DD')` → `[{ time: '09:00' }, ...]` |
| PUT /doctors/{id}/schedule | `Doctor.replaceSchedule(id, [{ day_of_week, start_time, end_time, slot_minutes? }])` |
| GET /clinics, /clinics/{id} | `Clinic.list()`, `Clinic.findById(id)` |
| GET /clinics/{id}/staff | `Clinic.listStaff(id)` |
| POST /staff | `Staff.createWithAccount({ email, passwordHash, clinic_id, first_name, last_name, position, phone })` |
| PATCH /staff/{id} | `Staff.update(id, body)` |
| GET /appointments | `Appointment.list({ patientId \| doctorId, status, from, to, limit, offset })` |
| POST /appointments | `Doctor.isSlotAvailable(doctorId, date, time)` then `Appointment.create(body)` |
| GET /appointments/{id} | `Appointment.findById(id)` |
| PATCH /appointments/{id} | `Appointment.update(id, body)` (check `isSlotAvailable` when the time changes) |
| DELETE /appointments/{id} | `Appointment.cancel(id)` (sets status to cancelled; the slot becomes free) |
| GET /records/{id} | `Record.findById(id)` (includes diagnoses, prescriptions with items, lab tests) |
| PATCH /records/{id} | `Record.update(id, { visit_date, treatment_plan, notes })` |
| POST /records/{id}/diagnoses | `Record.addDiagnosis(id, { icd_code, description })` |
| POST /records/{id}/prescriptions | `Prescription.createWithItems(id, { refills_allowed, notes, items: [...] })` |
| POST /records/{id}/lab-tests | `LabTest.create(id, { test_name, notes })` |
| GET /prescriptions/{id} | `Prescription.findById(id)` (includes items) |
| GET /prescriptions/{id}/items | `Prescription.listItems(id)` |
| POST /prescriptions/{id}/refill-request | `Prescription.requestRefill(id)` |
| PATCH /prescriptions/{id} | `Prescription.reviewRefill(id, approve, notes?)` (approving uses one refill) |
| GET /lab-tests/{id} | `LabTest.findById(id)` |
| PATCH /lab-tests/{id} | `LabTest.recordResult(id, { result, test_date?, notes })` |

## Files

| File | Purpose |
|---|---|
| `database/schema.sql` | All 13 tables, constraints and indexes (matches `docs/er-diagram.md`) |
| `database/seed.sql` | Demo data |
| `scripts/db-reset.js` | `npm run db:reset` |
| `src/config/db.js` | Connection pool, `query()`, `withTransaction()` |
| `src/models/*.model.js` | One file per resource |
| `src/models/helpers.js` | `PG_ERRORS`, `ModelError`, update/paging helpers |
