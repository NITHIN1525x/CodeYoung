# CodeYoung

A full-stack trial-class booking app. Parents choose a date and time in their own timezone; Django checks availability and assigns a mentor automatically. Appointments are stored in PostgreSQL in UTC, and local times are shown to parents and mentors.

## Features

- Parent booking flow with a browser timezone suggestion, cascading continent/country/region/city selection, and city-derived IANA timezone.
- Automatic mentor assignment, availability checks, and a two-classes-per-mentor-local-day limit.
- Ten seeded mentors across India, the UK, the US, Australia, Singapore, and Japan, each scheduled in their own IANA timezone.
- Timezone and daylight-saving-aware availability, appointment displays, and local-day capacity.
- Email notifications and a delivery outbox (SMTP configuration is optional for local setup).
- Demo class page at `/class/<meeting_id>`, mentor view at `/mentor`, and staff pages at `/debug` and `/outbox`.
- PostgreSQL-backed idempotency and concurrent booking protection.
- Parent-support chat with a structured local FAQ and a timezone-aware demo callback request.

## Technology

- React 18 and Vite
- Python 3.11+, Django, Django REST Framework
- PostgreSQL 15+

## Run the project

Install Python, Node.js (npm included), and PostgreSQL for your operating system. Start PostgreSQL before running Django.

### 1. Create the local database

Create a PostgreSQL role and database once. Open `psql` as a PostgreSQL administrator or use pgAdmin, then run:

```sql
CREATE ROLE codeyoung LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE codeyoung OWNER codeyoung;
```

Use your own local password. If you already created these, keep them and make `backend/.env` match.

Start PostgreSQL:

| OS | Example |
|---|---|
| macOS | With Homebrew: `brew services start postgresql@16` (or start the server in Postgres.app). |
| Linux | Debian/Ubuntu: `sudo systemctl start postgresql`. Fedora: `sudo systemctl start postgresql`. Start/initialize it using your distribution's instructions if this is a new installation. |
| Windows | Start the installed PostgreSQL service from Services, or PowerShell as Administrator: `Start-Service postgresql-x64-16`. Use the service name/version installed on your machine. |

### 2. Configure and run Django

Copy `backend/.env.example` to `backend/.env` and set `POSTGRES_PASSWORD` to the local role password. Keep `.env` private; Git ignores it.

**macOS / Linux** (from the repository root):

```sh
cp backend/.env.example backend/.env
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_mentors
python manage.py runserver 127.0.0.1:8000
```

**Windows PowerShell** (from the repository root):

```powershell
Copy-Item backend/.env.example backend/.env
Set-Location backend
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_mentors
python manage.py runserver 127.0.0.1:8000
```

If PowerShell blocks virtual environment activation, use Command Prompt and `.venv\Scripts\activate.bat` instead. Leave Django running in this terminal.

### 3. Run React and Vite

Open a second terminal at the repository root:

```sh
cd frontend
npm install
npm run dev
```

On Windows, use `Set-Location frontend` in PowerShell instead of `cd` if preferred. Open the URL Vite prints, usually `http://localhost:5173`.

## Email setup (optional)

To send real email, configure the SMTP variables in `backend/.env`. For Gmail, use `smtp.gmail.com`, port `587`, TLS enabled, and a Google App Password. Set `DEMO_MENTOR_EMAIL` to a deliverable inbox and rerun `python manage.py seed_mentors` if you want the demo mentor's notifications delivered to that inbox. Never put passwords in source files or commit them. Without SMTP, bookings still succeed, but email delivery may be marked failed; use Django's console email backend for local message previews.

The callback form stores a demo request for staff review; it does not place a real phone call or send a callback email.

## Tests and production build

With PostgreSQL running and the backend virtual environment active:

```sh
cd backend
python manage.py test
```

Reuse the test database with `python manage.py test --keepdb`. Run the frontend FAQ tests and production build with:

```sh
cd frontend
npm test
npm run build
```

Support endpoints include `GET /api/health/` (configured trial duration), `POST /api/support/callbacks/` (create a demo callback request), and staff-only `GET /api/admin/support-callbacks/`.

## Timezone and capacity rules

The parent confirms a suggested location or selects continent, country, region, and city; the selected city determines the canonical IANA timezone. Browser timezone detection identifies a timezone but is presented as a location suggestion because it cannot identify the parent’s exact city. Seeded mentors cover India, the UK, the US, Australia, Singapore, and Japan. Appointments are stored canonically in UTC and converted to each parent’s and assigned mentor’s IANA timezone for display and email. DST gaps are rejected; repeated local times are disambiguated. A mentor's maximum two demo classes per day is calculated according to the assigned mentor's local calendar day and resets at that mentor's local midnight. Staff can inspect today’s per-mentor local date, timezone, count, and capacity on the debug dashboard.

## Project layout

```text
backend/    Django project, API, models, scheduling, email delivery
frontend/   React app, booking flow, dashboards, demo class page
README.md   Setup and project notes
TRANSCRIPT.md  AI development conversation record
```

For architecture and API details, see the code under `backend/` and `frontend/src/`. The staff pages require Django staff access. Mentor dashboard access is intentionally open for this assignment and should be protected before using real personal data.
