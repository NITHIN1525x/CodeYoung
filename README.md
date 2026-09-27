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

If PowerShell blocks virtual environment activation, use Command Prompt and `.venv\Scripts\activate.bat` instead. For staff-only operations pages, optionally create a local staff account from the backend directory with `python manage.py createsuperuser`. Leave Django running in this terminal.

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

### Environment variables

backend/.env.example lists Django's environment variables. The setup above copies it to backend/.env. Configure DJANGO_SECRET_KEY and POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, and POSTGRES_PORT for your local PostgreSQL instance. DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS, and CORS_ALLOWED_ORIGINS control local application settings. TRIAL_CLASS_DURATION_MINUTES and TRIAL_CLASS_SLOT_STEP_MINUTES control scheduling. FRONTEND_BASE_URL creates class links; DEMO_CLASS_VIDEO_URL is revealed only after the scheduled start. SMTP sender variables and DEMO_MENTOR_EMAIL are optional. frontend/.env.example documents optional VITE_API_BASE_URL. Keep .env files private and use placeholders when sharing configuration.

## How the system works

```text
Landing page → Parent details → Location/timezone → Choose date/time
    → Availability check → Automatic mentor assignment → Booking validation
    → Appointment and email notifications → Confirmation page
    → /class/<meeting_id> → Locked until scheduled UTC start → Demo video
```

The polished landing page introduces the experience before booking; its main action is **Register for a Free Demo Class**. The parent enters details, selects location and timezone, then chooses an available date and time. **Parents do not choose a mentor**; the backend assigns an eligible mentor during confirmation.

### Login and account access

`/login` accepts email and password, validates required fields and email format, and displays loading, connection, and incorrect-credential states. Django authenticates by email and creates a session; Remember me controls session expiry on browser close. `/forgot-password` and its request endpoint exist, but a request for an existing account currently errors because Django's password-reset email template references an unconfigured `password_reset_confirm` route. The generic response for an unknown account does not disclose whether the account exists. Registration begins demo booking and does not create an account; account access is managed by the CodeYoung team. Staff users can continue to operations after login.

### Location and UTC/timezone architecture

The booking flow detects the browser timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`, or lets the parent select Continent → Country → State/Region → City. Browser detection identifies a timezone, not the parent's physical city. Manual location derives the timezone; the form accepts and validates canonical IANA timezone names rather than fixed UTC offsets.

Parent local date/time → parent IANA timezone → one canonical UTC appointment interval → mentor eligibility → assigned mentor IANA timezone → mentor local time.

There is one UTC appointment instant. Parent and mentor display different local clock times for that same instant. For example, 12:00 UTC, 8:00 AM EDT, and 5:30 PM IST can describe the same appointment (illustrative only). DST gaps are rejected and repeated booking times require a fold choice. Class access uses the appointment's canonical UTC start.

### Availability, mentors, and capacity

Availability converts the requested parent-local time to UTC, checks active mentors' working hours, mentor overlaps and local-day capacity, and shows eligible mentor-local times alongside the parent's time. On confirmation, booking validation also checks the parent's existing overlapping appointments and repeats the mentor checks.

The seed command creates ten mentors in India, the UK, the US, Australia, Singapore, and Japan, using these zones: India—Asia/Kolkata; London—Europe/London; New York—America/New_York; Chicago—America/Chicago; Denver—America/Denver; Los Angeles—America/Los_Angeles; Sydney—Australia/Sydney; Singapore—Asia/Singapore; Tokyo—Asia/Tokyo. Each mentor can take at most two demo classes per mentor-local calendar day. Capacity is counted independently per mentor by converting the UTC start to that mentor's timezone and counting scheduled or completed classes on that local date.

PostgreSQL transaction locks on active mentors serialize competing assignment decisions; booking correctness is enforced by the backend/database, not just the frontend. `Idempotency-Key` retries replay the existing booking; reusing a key for different details conflicts. Parent identity and overlap checks use case-insensitive normalized email matching and canonical UTC intervals. A parent overlap with a scheduled or completed appointment returns HTTP 409 and creates no new appointment or outbox records; adjacent intervals are allowed. Mentor overlap/capacity also prevents assignment.

### Confirmation and email

The confirmation page shows appointment date/time, parent and assigned mentor, their locations and local timezones, class link, and separate email-delivery statuses. The parent email goes to the address entered; the mentor email goes to the assigned mentor's registered address. Both contain the same application-controlled `/class/<meeting_id>` URL and neither uses the raw Drive URL as the class link. The parent email says to use the link at the scheduled time; the mentor email includes the parent and mentor local appointment times. Email is tracked in the outbox; delivery failure does not undo the booking.

### Dummy class/video access

Each appointment has a unique `/class/<meeting_id>`. The frontend fetches appointment details from Django using the meeting ID rather than trusting appointment information supplied by the browser. The API returns 404 for malformed or unknown IDs. The frontend mounts the class page only for a 32-character hexadecimal ID; a malformed browser path falls back to the landing page. Before current UTC reaches appointment start UTC, the response omits the Drive destination; the page shows the scheduled time and parent/mentor local times and rechecks periodically. At or after that single UTC instant, the page displays **Open Demo Class Video**, opening configured `DEMO_CLASS_VIDEO_URL` in a new tab. Google Drive is only the final destination, revealed by the backend after the time check.

### Parent support and callback requests

The floating deterministic, local support assistant opens with “How can we help you?”, “Chat with us”, and “Schedule a call”. Chat provides quick questions/actions, timestamps, typing indicator, and follow-up call actions. Its 28 FAQ entries cover trial classes, booking, mentors, availability, timezone, email/confirmation, class links, rescheduling, cancellation, missed classes, privacy, and support calls. Separate fallback handling covers unknown or irrelevant questions. It reads configured trial duration from Django's `/api/health/` endpoint. It uses no external LLM: uncertain questions are not invented, and irrelevant questions are redirected to CodeYoung support.

The demo callback form collects parent name, email, preferred date/time, timezone, and topic. Valid requests are stored in PostgreSQL in UTC for staff review. Past times, invalid IANA zones, DST gaps, and repeated local times are rejected. This is a demo callback request only; it does not place a real call or send a callback email.

### Mentor and staff dashboards

`/mentor` shows a mentor schedule, appointments, status, both users' local times, and today's count against the two-class limit. The assignment's mentor dashboard and schedule endpoint are open and allow choosing a seeded mentor; do not use them with real personal data. `/debug` provides staff operations and per-mentor timezone, local date, count, and daily limit. `/outbox` shows email records. Admin booking, capacity, outbox, and callback-review API endpoints require staff access; Django `/admin/` is also available to staff.

### Architecture and privacy

```text
React + Vite → Django / Django REST Framework → Local PostgreSQL
```

Backend modules: common (health, session login, password reset, timezone helpers), bookings (appointments, availability, assignment, class access), mentors (seed and capacity), notifications (email outbox/delivery), chatbot (FAQ and callbacks). Frontend features are under frontend/src/features/. Configuration uses environment variables; keep .env private. The Drive URL is omitted before class start, and invalid meeting IDs return not found. The mentor dashboard is intentionally open for this demo; admin operations endpoints are staff-protected.

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

## Project layout

```text
backend/    Django project, API, models, scheduling, email delivery
frontend/   React app, booking flow, dashboards, demo class page
README.md   Setup and project notes
TRANSCRIPT.md  AI development conversation record
```

For architecture and API details, see the code under `backend/` and `frontend/src/`. The staff pages require Django staff access. Mentor dashboard access is intentionally open for this assignment and should be protected before using real personal data.
