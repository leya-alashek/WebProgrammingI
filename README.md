# Medical Clinic Portal

Web Programming project: a REST API for a medical clinic, built with Node.js, Express and PostgreSQL.

## Setup

1. Install packages:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and set `DB_PASSWORD` to your PostgreSQL password. `.env` is git-ignored; never commit it.
3. Create the database, tables and demo data:
   ```
   npm run db:reset
   ```
   **This deletes all existing data** in `clinic_portal`. Every demo account's password is `Clinic@123`.
4. Start the server:
   ```
   npm run dev
   ```
   You should see `Connected to PostgreSQL`. Try `http://localhost:3000/api/doctors`.

To view the data in DBeaver, add a PostgreSQL connection to `localhost:5432`, database `clinic_portal`, user `postgres`.

## Docs

- `docs/database.md`: **how to use the database layer** (models, error codes, demo accounts, endpoint → function map).
- `docs/er-diagram.md`: ER diagram (Mermaid source), relationships, and what changed. `docs/er-diagram.html` renders it.
- `docs/endpoints.html`: all 38 endpoints. Open it in a browser and use Ctrl+P → Save as PDF.
- `docs/powerpoint-prompt.md`: prompt for generating the Stage 2 presentation.

## Status

- Database layer (`database/`, `src/config/db.js`, `src/models/`): done.
- Routes: stubs returning `501 Not implemented yet`. Controllers come next.
