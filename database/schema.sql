-- Medical Clinic Portal schema (matches docs/er-diagram.md)
-- Run order: schema.sql, then seed.sql (or: npm run db:reset).
-- In DBeaver: open the file on the clinic_portal connection, Alt+X (execute script).
-- WARNING: drops and recreates all tables, so all data is lost.

DROP TABLE IF EXISTS refresh_token, lab_test, prescription_item, prescription,
  diagnosis, medical_record, appointment, staff, doctor_schedule, doctor,
  patient, clinic, users CASCADE;

-- Login accounts only; personal details live in patient / doctor / staff
CREATE TABLE users (
  user_id       SERIAL PRIMARY KEY,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('patient', 'doctor', 'staff', 'admin')),
  created_at    TIMESTAMP DEFAULT NOW(),
  last_login    TIMESTAMP
);

CREATE TABLE clinic (
  clinic_id  SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  email      VARCHAR(150),
  address    TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_id is nullable: staff can register walk-in patients without an account
CREATE TABLE patient (
  patient_id    SERIAL PRIMARY KEY,
  user_id       INT UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  date_of_birth DATE,
  gender        VARCHAR(10),
  phone         VARCHAR(20),
  email         VARCHAR(150),
  address       TEXT,
  blood_type    VARCHAR(5),
  allergies     TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctor (
  doctor_id      SERIAL PRIMARY KEY,
  user_id        INT NOT NULL UNIQUE REFERENCES users(user_id),
  clinic_id      INT NOT NULL REFERENCES clinic(clinic_id),
  first_name     VARCHAR(50) NOT NULL,
  last_name      VARCHAR(50) NOT NULL,
  specialization VARCHAR(100),
  phone          VARCHAR(20),
  license_number VARCHAR(50) NOT NULL UNIQUE,
  bio            TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- Weekly working hours; availability = these slots minus booked appointments
CREATE TABLE doctor_schedule (
  schedule_id  SERIAL PRIMARY KEY,
  doctor_id    INT NOT NULL REFERENCES doctor(doctor_id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  slot_minutes SMALLINT NOT NULL DEFAULT 30,
  CHECK (end_time > start_time)
);

CREATE TABLE staff (
  staff_id   SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE REFERENCES users(user_id),
  clinic_id  INT NOT NULL REFERENCES clinic(clinic_id),
  first_name VARCHAR(50) NOT NULL,
  last_name  VARCHAR(50) NOT NULL,
  position   VARCHAR(30),  -- receptionist / nurse / etc.
  phone      VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE appointment (
  appointment_id   SERIAL PRIMARY KEY,
  patient_id       INT NOT NULL REFERENCES patient(patient_id),
  doctor_id        INT NOT NULL REFERENCES doctor(doctor_id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested', 'scheduled', 'completed', 'cancelled', 'no_show')),
  reason           TEXT,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- No double booking: one active appointment per doctor per slot.
-- Partial index so a cancelled slot can be booked again.
CREATE UNIQUE INDEX uq_appointment_doctor_slot
  ON appointment (doctor_id, appointment_date, appointment_time)
  WHERE status <> 'cancelled';

CREATE TABLE medical_record (
  record_id      SERIAL PRIMARY KEY,
  patient_id     INT NOT NULL REFERENCES patient(patient_id),
  doctor_id      INT NOT NULL REFERENCES doctor(doctor_id),
  appointment_id INT UNIQUE REFERENCES appointment(appointment_id),
  visit_date     DATE NOT NULL,
  treatment_plan TEXT,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE diagnosis (
  diagnosis_id SERIAL PRIMARY KEY,
  record_id    INT NOT NULL REFERENCES medical_record(record_id) ON DELETE CASCADE,
  icd_code     VARCHAR(10),
  description  TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prescription (
  prescription_id SERIAL PRIMARY KEY,
  record_id       INT NOT NULL REFERENCES medical_record(record_id) ON DELETE CASCADE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'refill_requested', 'refill_approved', 'refill_denied', 'expired')),
  refills_allowed SMALLINT NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prescription_item (
  item_id         SERIAL PRIMARY KEY,
  prescription_id INT NOT NULL REFERENCES prescription(prescription_id) ON DELETE CASCADE,
  medication_name VARCHAR(100) NOT NULL,
  dosage          VARCHAR(50),
  frequency       VARCHAR(50),
  duration        VARCHAR(50),
  instructions    TEXT
);

CREATE TABLE lab_test (
  lab_test_id SERIAL PRIMARY KEY,
  record_id   INT NOT NULL REFERENCES medical_record(record_id) ON DELETE CASCADE,
  test_name   VARCHAR(100) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'completed')),
  test_date   DATE,
  result      TEXT,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Backs /auth/refresh and /auth/logout (logout = set revoked_at)
CREATE TABLE refresh_token (
  token_id   SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes on foreign keys and common lookups (PostgreSQL does not index FKs automatically)
CREATE INDEX idx_doctor_clinic          ON doctor (clinic_id);
CREATE INDEX idx_staff_clinic           ON staff (clinic_id);
CREATE INDEX idx_schedule_doctor_day    ON doctor_schedule (doctor_id, day_of_week);
CREATE INDEX idx_appointment_patient    ON appointment (patient_id, appointment_date);
CREATE INDEX idx_appointment_doctor     ON appointment (doctor_id, appointment_date);
CREATE INDEX idx_record_patient         ON medical_record (patient_id, visit_date);
CREATE INDEX idx_record_doctor          ON medical_record (doctor_id);
CREATE INDEX idx_diagnosis_record       ON diagnosis (record_id);
CREATE INDEX idx_prescription_record    ON prescription (record_id);
CREATE INDEX idx_item_prescription      ON prescription_item (prescription_id);
CREATE INDEX idx_lab_test_record        ON lab_test (record_id);
CREATE INDEX idx_refresh_token_user     ON refresh_token (user_id);
