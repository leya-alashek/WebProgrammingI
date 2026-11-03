-- Medical Clinic Portal demo data. Run AFTER schema.sql (IDs assume fresh tables).
-- Every demo account's password is:  Clinic@123
-- Hashes are real bcrypt ($2a$), compatible with the bcrypt / bcryptjs npm packages.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, password_hash, role) VALUES
  ('admin@clinic.com',     crypt('Clinic@123', gen_salt('bf', 10)), 'admin'),    -- user 1
  ('dr.khan@clinic.com',   crypt('Clinic@123', gen_salt('bf', 10)), 'doctor'),   -- user 2
  ('dr.lee@clinic.com',    crypt('Clinic@123', gen_salt('bf', 10)), 'doctor'),   -- user 3
  ('reception@clinic.com', crypt('Clinic@123', gen_salt('bf', 10)), 'staff'),    -- user 4
  ('sara.ali@mail.com',    crypt('Clinic@123', gen_salt('bf', 10)), 'patient');  -- user 5

INSERT INTO clinic (name, phone, email, address) VALUES
  ('City Health Clinic', '555-0100', 'info@clinic.com', '12 Main Street');

INSERT INTO doctor (user_id, clinic_id, first_name, last_name, specialization, phone, license_number, bio) VALUES
  (2, 1, 'Omar', 'Khan', 'General Practice', '555-0111', 'LIC-1001', 'Family doctor with 10 years of experience.'),
  (3, 1, 'Mina', 'Lee',  'Cardiology',       '555-0112', 'LIC-1002', 'Heart and blood pressure specialist.');

-- day_of_week: 0 = Sunday ... 6 = Saturday
INSERT INTO doctor_schedule (doctor_id, day_of_week, start_time, end_time, slot_minutes) VALUES
  (1, 1, '09:00', '13:00', 30),
  (1, 3, '09:00', '13:00', 30),
  (2, 2, '14:00', '18:00', 30),
  (2, 4, '14:00', '18:00', 30);

INSERT INTO staff (user_id, clinic_id, first_name, last_name, position, phone) VALUES
  (4, 1, 'Lina', 'Haddad', 'receptionist', '555-0120');

-- John Smith is a walk-in patient with no login account (user_id NULL)
INSERT INTO patient (user_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies) VALUES
  (5,    'Sara', 'Ali',   '1998-04-12', 'female', '555-0200', 'sara.ali@mail.com', '4 Cedar Road', 'O+', 'Penicillin'),
  (NULL, 'John', 'Smith', '1975-09-30', 'male',   '555-0201', NULL,                NULL,           'A-', NULL);

-- Appointment 3 is cancelled and shares a slot with appointment 2:
-- this is allowed because the double-booking rule ignores cancelled appointments.
INSERT INTO appointment (patient_id, doctor_id, appointment_date, appointment_time, status, reason) VALUES
  (1, 1, '2026-11-09', '09:30', 'completed', 'Persistent cough'),      -- 1 (Monday)
  (2, 2, '2026-11-10', '14:00', 'scheduled', 'Chest pain follow-up'),  -- 2 (Tuesday)
  (1, 2, '2026-11-10', '14:00', 'cancelled', 'Blood pressure check'),  -- 3
  (1, 1, '2026-11-16', '10:00', 'requested', 'Follow-up visit');       -- 4 (Monday)

INSERT INTO medical_record (patient_id, doctor_id, appointment_id, visit_date, treatment_plan, notes) VALUES
  (1, 1, 1, '2026-11-09', 'Rest, fluids, antibiotics for 3 days', 'Patient allergic to penicillin: prescribed azithromycin.');

INSERT INTO diagnosis (record_id, icd_code, description) VALUES
  (1, 'J20.9', 'Acute bronchitis');

INSERT INTO prescription (record_id, status, refills_allowed, notes) VALUES
  (1, 'active', 1, 'Finish the full course of antibiotics.');

INSERT INTO prescription_item (prescription_id, medication_name, dosage, frequency, duration, instructions) VALUES
  (1, 'Azithromycin', '500 mg', 'Once daily',              '3 days', 'Take after a meal'),
  (1, 'Paracetamol',  '500 mg', 'Every 6 hours as needed', '5 days', 'Do not exceed 4 doses a day');

INSERT INTO lab_test (record_id, test_name, status, test_date, result) VALUES
  (1, 'Complete Blood Count', 'completed', '2026-11-09', 'Normal'),
  (1, 'Chest X-ray',          'ordered',   NULL,         NULL);
