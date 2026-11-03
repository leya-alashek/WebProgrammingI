# Prompt for the Stage 2 PowerPoint

Copy everything inside the box below into a new Claude chat (claude.ai). Before sending, fill in the
`202410907, 202313700, 202411058` are the respective UNI IDs for `Rayan El-Hajj, Leya alashek, Freda Dagher` the team members `Web Programming` course and `Rodrigue Kalash` Instructor.
Optionally, attach the ER diagram PNG exported from `er-diagram.html` and the DBeaver screenshot.

````text
Create a downloadable PowerPoint (.pptx) for a 5-minute university group presentation. It's for a Web Programming course, project Stage 2. Give me the .pptx file, not just an outline.

## Audience and goal
The audience is our instructor and classmates. In 5 minutes we must present: (1) the project idea, (2) the ER diagram of our PostgreSQL database, (3) the API endpoints (routes), and (4) our project directory, plus proof that PostgreSQL is connected to DBeaver. One student presents. All members attend.

## Slide requirements
- 9 slides, 16:9. Clean, professional, medical theme: navy #13294B for headings and table headers, teal #17A398 as the accent, white background. Use one sans-serif font throughout.
- Little text per slide (no paragraphs). Each slide must have speaker notes with what to say, about 30 seconds per slide, to fit 5 minutes in total.
- Tables must be real PowerPoint tables (navy header row, alternating light rows), not images.
- Placeholders: [TEAM NAME], [MEMBER NAMES], [COURSE], [INSTRUCTOR], [DATE].

## Slide plan
1. Title: "Medical Clinic Portal", subtitle "Stage 2: Database Design & API Endpoints", team name, members, course, instructor, date.
2. The Project: one-line description plus 3 user roles with what each can do (Patient / Doctor / Staff & Admin).
3. Tech Stack & Architecture: Browser → Node.js + Express REST API (/api) → PostgreSQL (managed in DBeaver). Draw this as a simple 3-box flow diagram.
4. ER Diagram: draw it natively with shapes. Use 13 entity boxes showing only the table name, PK and FKs, and connect them with labeled lines showing cardinality (1, 0..1, 0..*, 1..*). Colour-group the boxes: Accounts (users, refresh_token), Clinic & People (clinic, doctor, doctor_schedule, staff, patient), Scheduling (appointment), Clinical (medical_record, diagnosis, prescription, prescription_item, lab_test). Add a small note: "Full diagram with all attributes: see attached PNG". If I attached the ER PNG, put it on an extra slide right after this one.
5. Key Design Decisions: 6 short bullets (listed below under "Design decisions").
6. API Endpoints (1/2): tables for Authentication, Patients, Doctors, Clinics & Staff.
7. API Endpoints (2/2): tables for Appointments, Medical Records, Prescriptions, Lab Tests.
   For slides 6–7, use the columns Method | Endpoint | Purpose | Access. Colour-code the method text: GET green, POST blue, PATCH/PUT orange, DELETE red. Keep the font readable (at least 10pt). Split onto more slides if needed rather than shrinking it.
8. Project Structure & Database Connection: show the folder tree below in a monospace box on the left. On the right, put a placeholder box labelled "DBeaver screenshot: clinic_portal database with 13 tables" (use my screenshot if I attached it).
9. Next Steps & Thank You: implement controllers with SQL queries, JWT authentication + role checks, frontend pages, testing. End with "Questions?".

## Project content (use exactly this)

### Description
The Medical Clinic Portal is a secure, centralized web platform for a medical clinic. Patients can register, book and manage appointments, view their medical records and lab results, and request prescription refills. Doctors and clinic staff get tools to manage schedules, record consultations, diagnoses, prescriptions and lab tests.

### Roles
- Patient: register, book/reschedule/cancel appointments, view own records, lab results and prescriptions, request refills.
- Doctor: manage weekly schedule, view appointments, write medical records, add diagnoses, prescriptions and lab tests, approve refills.
- Staff: register walk-in patients, schedule appointments, record lab results.
- Admin: add doctors and staff, manage the clinic.

### Database tables (PostgreSQL, 13 tables)
- users (user_id PK, email UNIQUE, password_hash, role [patient|doctor|staff|admin], created_at, last_login)
- refresh_token (token_id PK, user_id FK→users, token_hash UNIQUE, expires_at, revoked_at, created_at)
- clinic (clinic_id PK, name, phone, email, address, created_at)
- patient (patient_id PK, user_id FK→users UNIQUE nullable, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, created_at)
- doctor (doctor_id PK, user_id FK→users UNIQUE, clinic_id FK→clinic, first_name, last_name, specialization, phone, license_number UNIQUE, bio, created_at)
- doctor_schedule (schedule_id PK, doctor_id FK→doctor, day_of_week, start_time, end_time, slot_minutes)
- staff (staff_id PK, user_id FK→users UNIQUE, clinic_id FK→clinic, first_name, last_name, position, phone, created_at)
- appointment (appointment_id PK, patient_id FK→patient, doctor_id FK→doctor, appointment_date, appointment_time, status [requested|scheduled|completed|cancelled|no_show], reason, notes, created_at; UNIQUE(doctor_id, date, time))
- medical_record (record_id PK, patient_id FK→patient, doctor_id FK→doctor, appointment_id FK→appointment UNIQUE nullable, visit_date, treatment_plan, notes, created_at)
- diagnosis (diagnosis_id PK, record_id FK→medical_record, icd_code, description, created_at)
- prescription (prescription_id PK, record_id FK→medical_record, status [active|refill_requested|refill_approved|refill_denied|expired], refills_allowed, notes, created_at)
- prescription_item (item_id PK, prescription_id FK→prescription, medication_name, dosage, frequency, duration, instructions)
- lab_test (lab_test_id PK, record_id FK→medical_record, test_name, status [ordered|completed], test_date, result, notes, created_at)

### Relationships
- users 1 — 0..1 patient / doctor / staff (one login account per profile; walk-in patients may have no account)
- users 1 — 0..* refresh_token
- clinic 1 — 0..* doctor; clinic 1 — 0..* staff
- doctor 1 — 0..* doctor_schedule
- patient 1 — 0..* appointment; doctor 1 — 0..* appointment
- patient 1 — 0..* medical_record; doctor 1 — 0..* medical_record
- appointment 0..1 — 0..1 medical_record
- medical_record 1 — 0..* diagnosis / prescription / lab_test
- prescription 1 — 1..* prescription_item

### Design decisions (for slide 5)
- Users table holds login details only; patient/doctor/staff profiles link to it → one login system, role-based access.
- Diagnosis is its own table → one visit can have several diagnoses.
- Prescription split into header + items → one prescription, many medicines; refills tracked by status.
- Doctor schedule table → availability = working hours minus booked appointments.
- UNIQUE(doctor, date, time) on appointments → no double booking.
- Refresh token table → secure login sessions and real logout.

### API endpoints (base URL /api, 38 total)
Authentication
- POST /auth/register: Create patient account (Public)
- POST /auth/login: Authenticate and issue tokens (Public)
- POST /auth/refresh: Refresh access token (Refresh token holder)
- POST /auth/logout: End current session (Signed-in)
- GET /users/me: Get current user profile (Signed-in)
- PATCH /users/me: Update own profile (Signed-in)

Patients
- GET /patients: List / search patients (Staff, Doctor, Admin)
- POST /patients: Register walk-in patient (Staff, Admin)
- GET /patients/{id}: Get authorized patient profile (Own patient, Doctor, Staff)
- PATCH /patients/{id}: Update patient demographics (Own patient, Staff)
- GET /patients/{id}/records: Patient's record history (Own patient, Doctor)
- POST /patients/{id}/records: Create consultation record (Doctor)

Doctors
- GET /doctors: List / search doctors (Public)
- POST /doctors: Add doctor (Admin)
- GET /doctors/{id}: Doctor details and specialty (Public)
- GET /doctors/{id}/availability: View available time slots (Public)
- PUT /doctors/{id}/schedule: Set weekly working hours (Own doctor, Admin)

Clinics & Staff
- GET /clinics: List clinics (Public)
- GET /clinics/{id}: Clinic details (Public)
- GET /clinics/{id}/staff: List clinic staff (Staff, Admin)
- POST /staff: Add staff member (Admin)
- PATCH /staff/{id}: Update staff member (Admin)

Appointments
- GET /appointments: List appointments by role (Signed-in)
- POST /appointments: Request or schedule appointment (Patient, Staff)
- GET /appointments/{id}: View appointment details (Its patient/doctor, Staff)
- PATCH /appointments/{id}: Reschedule or update status (Its patient/doctor, Staff)
- DELETE /appointments/{id}: Cancel appointment (Its patient, Staff)

Medical Records
- GET /records/{id}: View one medical record (Own patient, Doctor)
- PATCH /records/{id}: Update treatment plan / notes (Doctor)
- POST /records/{id}/diagnoses: Add diagnosis (Doctor)
- POST /records/{id}/prescriptions: Create prescription with items (Doctor)
- POST /records/{id}/lab-tests: Order lab test (Doctor)

Prescriptions
- GET /prescriptions/{id}: View prescription (Own patient, Doctor)
- GET /prescriptions/{id}/items: List prescribed items (Own patient, Doctor)
- POST /prescriptions/{id}/refill-request: Request a refill (Own patient)
- PATCH /prescriptions/{id}: Approve or deny refill (Doctor)

Lab Tests
- GET /lab-tests/{id}: View lab test and result (Own patient, Doctor)
- PATCH /lab-tests/{id}: Record lab test result (Doctor, Staff)

### Project directory (for slide 8)
medical-clinic-portal/
├── package.json
├── .env.example            (DB connection settings template)
├── .gitignore
├── README.md               (setup steps)
├── database/
│   └── schema.sql          (13 tables + sample data)
├── docs/
│   ├── er-diagram.md       (ER diagram source + change log)
│   ├── er-diagram.html     (rendered ER diagram)
│   └── endpoints.html      (endpoint tables → PDF)
└── src/
    ├── server.js           (starts server, tests DB connection)
    ├── app.js              (Express app, mounts routes under /api)
    ├── config/db.js        (PostgreSQL pool)
    └── routes/             (10 route files: auth, users, patients, doctors,
                             clinics, staff, appointments, records,
                             prescriptions, labTests + notImplemented stub)

After creating the file, check every slide for text overflow and overlapping shapes, and fix any you find before giving me the download.
````
