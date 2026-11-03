# Medical Clinic Portal: ER Diagram

To export as an image, paste the code block below into https://mermaid.live and choose **Actions → PNG/SVG**,
or open `er-diagram.html` in a browser.

```mermaid
erDiagram
    USERS ||--o| PATIENT : "has profile"
    USERS ||--o| DOCTOR : "has profile"
    USERS ||--o| STAFF : "has profile"
    USERS ||--o{ REFRESH_TOKEN : "holds"
    CLINIC ||--o{ DOCTOR : employs
    CLINIC ||--o{ STAFF : employs
    DOCTOR ||--o{ DOCTOR_SCHEDULE : "works"
    PATIENT ||--o{ APPOINTMENT : books
    DOCTOR ||--o{ APPOINTMENT : attends
    PATIENT ||--o{ MEDICAL_RECORD : has
    DOCTOR ||--o{ MEDICAL_RECORD : writes
    APPOINTMENT |o--o| MEDICAL_RECORD : produces
    MEDICAL_RECORD ||--o{ DIAGNOSIS : includes
    MEDICAL_RECORD ||--o{ PRESCRIPTION : includes
    MEDICAL_RECORD ||--o{ LAB_TEST : orders
    PRESCRIPTION ||--|{ PRESCRIPTION_ITEM : contains

    USERS {
        int user_id PK
        string email UK
        string password_hash
        string role "patient | doctor | staff | admin"
        timestamp created_at
        timestamp last_login
    }
    CLINIC {
        int clinic_id PK
        string name
        string phone
        string email
        string address
        timestamp created_at
    }
    PATIENT {
        int patient_id PK
        int user_id FK "unique, nullable (walk-ins)"
        string first_name
        string last_name
        date date_of_birth
        string gender
        string phone
        string email
        string address
        string blood_type
        string allergies
        timestamp created_at
    }
    DOCTOR {
        int doctor_id PK
        int user_id FK "unique"
        int clinic_id FK
        string first_name
        string last_name
        string specialization
        string phone
        string license_number UK
        string bio
        timestamp created_at
    }
    DOCTOR_SCHEDULE {
        int schedule_id PK
        int doctor_id FK
        int day_of_week "0 = Sunday"
        time start_time
        time end_time
        int slot_minutes
    }
    STAFF {
        int staff_id PK
        int user_id FK "unique"
        int clinic_id FK
        string first_name
        string last_name
        string position "receptionist | nurse | ..."
        string phone
        timestamp created_at
    }
    APPOINTMENT {
        int appointment_id PK
        int patient_id FK
        int doctor_id FK
        date appointment_date
        time appointment_time
        string status "requested | scheduled | completed | cancelled | no_show"
        string reason
        string notes
        timestamp created_at
    }
    MEDICAL_RECORD {
        int record_id PK
        int patient_id FK
        int doctor_id FK
        int appointment_id FK "unique, nullable"
        date visit_date
        string treatment_plan
        string notes
        timestamp created_at
    }
    DIAGNOSIS {
        int diagnosis_id PK
        int record_id FK
        string icd_code
        string description
        timestamp created_at
    }
    PRESCRIPTION {
        int prescription_id PK
        int record_id FK
        string status "active | refill_requested | refill_approved | refill_denied | expired"
        int refills_allowed
        string notes
        timestamp created_at
    }
    PRESCRIPTION_ITEM {
        int item_id PK
        int prescription_id FK
        string medication_name
        string dosage
        string frequency
        string duration
        string instructions
    }
    LAB_TEST {
        int lab_test_id PK
        int record_id FK
        string test_name
        string status "ordered | completed"
        date test_date
        string result
        string notes
        timestamp created_at
    }
    REFRESH_TOKEN {
        int token_id PK
        int user_id FK
        string token_hash UK
        timestamp expires_at
        timestamp revoked_at
        timestamp created_at
    }
```

## Relationships

| Relationship | Cardinality | Meaning |
|---|---|---|
| User – Patient / Doctor / Staff | 1 : 0..1 | A login account has at most one profile. Doctors and staff always have an account; walk-in patients may not. |
| User – Refresh Token | 1 : 0..* | One active token per logged-in device; logout revokes it. |
| Clinic – Doctor, Clinic – Staff | 1 : 0..* | The clinic employs doctors and staff. |
| Doctor – Doctor Schedule | 1 : 0..* | Weekly working hours, used to compute availability. |
| Patient – Appointment, Doctor – Appointment | 1 : 0..* | Each appointment has one patient and one doctor. A doctor can't be double-booked at the same date and time. |
| Patient – Medical Record, Doctor – Medical Record | 1 : 0..* | A record belongs to one patient and is written by one doctor. |
| Appointment – Medical Record | 0..1 : 0..1 | A completed visit produces at most one record. |
| Medical Record – Diagnosis / Prescription / Lab Test | 1 : 0..* | One visit can have many diagnoses, prescriptions and lab tests. |
| Prescription – Prescription Item | 1 : 1..* | A prescription lists one or more medications. |

## What changed from the first version (and why)

**Errors fixed**
1. **Patient and Doctor weren't linked to User** (only Staff was). They now have `user_id`; without it, `/users/me` and role-based access couldn't work.
2. **User `role` had no "staff" option** despite the Staff table. Added `staff`.
3. **"User manages Clinic" had no foreign key** in the Clinic table. Removed it (the admin role covers clinic management).
4. **Doctors weren't linked to the Clinic.** Added `clinic_id` to Doctor.
5. **`POST /records/{id}/diagnoses` had no table** (diagnosis was one column). New Diagnosis table, so a visit can have several diagnoses.
6. **`GET /prescriptions/{id}/items` had no items** (one medication per prescription). Split into Prescription + Prescription Item. Refill requests use the prescription's `status`.
7. **`GET /doctors/{id}/availability` had no data.** New Doctor Schedule table.
8. **`/auth/refresh` and `/auth/logout` had nowhere to store tokens.** New Refresh Token table.
9. **Lab Test, Clinic and Staff had no endpoints.** Added them.
10. **The description promised messaging and billing** with no tables or endpoints behind them. Removed from scope.

**Improvements**
- Removed duplicate data: `name` from Users, `email` from Doctor and Staff.
- A unique (doctor, date, time) rule prevents double booking.
- Each Appointment links to the Medical Record it produces.

Result: 9 → 13 tables, 25 → 38 endpoints.
