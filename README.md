# CodeYoung Trial Class Booking

A full-stack trial-class scheduling application for parents booking a complimentary CodeYoung class. Parents choose a date and time in their timezone; the server checks availability and assigns a mentor automatically. The project is organized as a single React frontend and Django REST backend backed by PostgreSQL.

## Problem statement

Parents and mentors live in different timezones, and many parents observe daylight-saving time. The booking flow must make it clear when the parent should join, enforce each mentor's daily capacity using the mentor's own calendar, avoid overlapping appointments under concurrent requests, and preserve one canonical appointment instant.

## Features

- Three-step parent flow for contact details, location, timezone, date, and live available slots.
- Browser timezone detection with a human-readable timezone selector and manual override.
- Parent-local time shown first; mentor-local time shown alongside it.
- Automatic least-loaded mentor assignment; parents cannot choose a mentor.
- Confirmation page with class link, mentor name, and both local times. Dummy class links open a local `/class/<meeting_id>` demo meeting page.
- Read-only mentor schedule at `/mentor`.
- Staff-only booking diagnostics at `/debug` and email delivery records at `/outbox`.
- Floating, local FAQ assistant focused on CodeYoung booking and timezone questions.
- PostgreSQL constraints, transaction locks, request idempotency, and transactional email outbox.

## Tech stack

- Frontend: React 18, Vite 5, plain CSS, browser `Intl` timezone data.
- Backend: Python 3.11+, Django 5.1+, Django REST Framework.
- Database: PostgreSQL 15+ running locally on the developer machine.
- Timezone conversion: Python `zoneinfo` and valid IANA timezone identifiers.

## Architecture

This is one application with modular Django apps, not a microservice system. The frontend talks to JSON endpoints under `/api/`. In development, Vite proxies `/api` to Django on `127.0.0.1:8000`.

### Frontend architecture

- `src/app/`: path-based app shell and page selection.
- `src/features/booking/`: parent form, location/timezone selectors, date selector, availability slots, and confirmation.
- `src/features/operations/`: mentor dashboard, staff debug dashboard, and email outbox.
- `src/features/help/`: fixed-answer floating booking FAQ; it makes no external AI calls.
- `src/shared/api/`: central `fetch` client for Django APIs.
- `src/styles.css`: shared responsive styling and component states.

The frontend displays availability from Django and submits a booking with an `Idempotency-Key`. It is a convenience layer only; booking rules are checked again by Django.

### Django architecture

- `config/`: settings, root URL configuration, ASGI/WSGI.
- `common/`: IANA timezone validation, local/UTC conversion, and health endpoint.
- `bookings/`: parent and appointment models, request serializers, thin REST views, and transactional booking orchestration in `services/creation.py`.
- `mentors/`: mentor model, seed command, and slot calculation in `services/availability.py`.
- `notifications/`: transactional email outbox model and SMTP delivery service.
- `chatbot/`: reserved Django app shell; current FAQ assistant is a small local React feature and does not require an API.

Views handle HTTP validation and response codes. Assignment, working-hour checks, local-day capacity, conflict checks, appointment persistence, and outbox creation live in services.

## Database schema

- **Parent**: name, unique case-insensitive email, location, IANA timezone, creation timestamp.
- **Mentor**: name, registered email, location, IANA timezone, weekly working-hours JSON, active flag, creation timestamp.
- **Appointment**: parent and mentor foreign keys, canonical UTC start/end, unique dummy class URL, status, unique idempotency key, request fingerprint, creation timestamp. The database enforces positive duration.
- **EmailOutbox**: appointment, exact recipient, email type, subject, body, status, creation timestamp. The appointment/recipient/type tuple is unique.

There are no separate stored parent-local or mentor-local appointment timestamps. Local values are derived when the appointment is displayed or included in a notification.

**Appointments are stored canonically in UTC and converted into the relevant IANA timezone for display.**

**A mentor's maximum 2 demo classes per day is calculated according to the mentor's local calendar day and resets at the mentor's local midnight.**

## Booking flow and mentor assignment

1. The parent submits name, email, location, IANA timezone, local date, local time, and optional DST `fold`.
2. DRF validates the fields; the service validates the local wall time and converts it to UTC. Past and nonexistent local times are rejected. Ambiguous fall-back times require an explicit `fold`.
3. In a PostgreSQL transaction, active mentor rows are locked in stable primary-key order. Eligible mentors must be working, below the two-class local-day limit, and free of an overlapping appointment.
4. The least-loaded eligible mentor is selected. Ties are resolved by case-folded mentor name and primary key.
5. A unique dummy class URL, appointment, and parent/mentor outbox records are created in the same transaction.
6. The API returns the UTC appointment and both local displays. The parent never sends a mentor identifier.

The daily load includes scheduled and completed appointments; cancelled appointments do not consume capacity. An appointment counts on the mentor-local calendar date on which it starts.

## Timezones and DST

All timezone values are IANA names, such as `America/New_York`, `Europe/London`, and `Asia/Kolkata`. Indian mentors use `Asia/Kolkata`. Runtime code never calculates time using manually specified offsets.

Conversions use `zoneinfo` in `common/timezones.py`. Spring-forward wall times that do not exist are rejected. Repeated fall-back wall times are represented by separate UTC instants using `fold`. Local calendar-day bounds are converted independently, so DST days may span 23 or 25 UTC hours.

For example, the same UTC instant can display as `8:00 AM EDT` in New York, `1:00 PM BST` in London, and `5:30 PM IST` in India. The parent-facing instruction is always to join at **Your time**.

## Idempotency and concurrency

The client sends an `Idempotency-Key` header. The key is unique in PostgreSQL. A repeated request with the same key and payload returns the original booking without creating another appointment or outbox messages. Reusing the key with a different fingerprint returns HTTP 409.

PostgreSQL `transaction.atomic()` and `select_for_update()` lock active mentors in stable order. Competing assignment transactions therefore recheck conflicts and local-day counts against the previous committed booking before assigning. Database uniqueness constraints protect idempotency and meeting links. The simultaneous-booking test requires PostgreSQL row locks; run the suite against PostgreSQL to verify concurrency protection.

## Email outbox

Booking creation creates two outbox records atomically with the appointment, then attempts delivery after the database transaction commits:

- Parent confirmation to the exact email submitted for the parent.
- Mentor notice to the assigned mentor's registered email.

Both contain the same class link and both recipients' local appointment times. The parent message includes the parent's name, confirmation, and join link. Django sends the messages through its configured SMTP backend; the outbox records each message as pending, sent, or failed and is visible at `/outbox` to a Django staff user. Email delivery failure does not undo a confirmed appointment.

Configure SMTP in the ignored `backend/.env` file before expecting messages in real inboxes. For Gmail, use `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_USE_TLS=True`, `EMAIL_USE_SSL=False`, and `EMAIL_HOST_USER` / `DEFAULT_FROM_EMAIL` set to the authorized sending Gmail account. Put that account's Google App Password in `EMAIL_HOST_PASSWORD`; do not use the account's regular sign-in password. Set `DEMO_MENTOR_EMAIL` to a deliverable test inbox before running `seed_mentors`; the seeded mentor named by `DEMO_MENTOR_NAME` (default `Aarav Nair`) uses that registered address for demo notifications. The sender refuses to attempt delivery to reserved `.example` addresses and records those messages as failed. Keep real credentials private and never commit `.env`. `EMAIL_BACKEND` should remain `django.core.mail.backends.smtp.EmailBackend`.

## Chatbot

The floating help assistant answers common booking, timezone, joining, mentor assignment, availability, and email questions with a small local FAQ matcher. It does not call a third-party AI service, change a booking, check live availability, or collect/send chat text to Django. Unknown questions get a focused fallback response.

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health/` | Public | Health check |
| `GET` | `/api/availability/?date=YYYY-MM-DD&timezone=America/New_York` | Public | Available parent-local slots and mentor count |
| `POST` | `/api/bookings/` | Public | Create booking; requires `Idempotency-Key` header |
| `GET` | `/api/bookings/<id>/?email=...` | Parent email match | Retrieve a confirmation |
| `GET` | `/api/mentors/` | Public | List mentors for the assignment dashboard |
| `GET` | `/api/mentors/<id>/bookings/` | Public, limited fields | Mentor's schedule; parent email is omitted |
| `GET` | `/api/mentor/bookings/` | Authenticated mentor | Current mentor's bookings |
| `GET` | `/api/admin/bookings/` | Django staff | Booking diagnostics |
| `GET` | `/api/admin/email-outbox/` | Django staff | Mock emails |

The public mentor schedule follows the assignment's no-auth dashboard requirement and includes parent name, local time, and class link. Do not treat this demo endpoint as suitable for real student/parent data without adding mentor authentication and access controls. Debug and outbox endpoints remain staff-only.

## Example data

The `seed_mentors` command creates or updates ten active India-based mentors. They use `Asia/Kolkata`, India location fields, and weekday working hours from 9:00 AM to 6:00 PM mentor-local time. The booking tests use a single test mentor named Rahul to make automatic assignment deterministic.

For a future weekday while New York is observing EDT, this sample request books Nithin at 8:00 AM New York time. When Rahul is the sole eligible mentor, the same appointment is 12:00 PM UTC and 5:30 PM IST:

```json
{
  "name": "Nithin",
  "email": "nithin@gmail.com",
  "continent": "North America",
  "country": "United States",
  "state_region": "New York",
  "city": "New York City",
  "timezone": "America/New_York",
  "selected_date": "2026-10-05",
  "selected_time": "08:00"
}
```

Send it to `POST /api/bookings/` with an `Idempotency-Key` header. The actual assignment may differ if multiple mentors have the same lowest load; the API never lets the parent select Rahul directly.

## Installation and local setup

Requirements: Python 3.11+, Node.js 20+, npm, and PostgreSQL 15+ installed and running directly on your machine. Install PostgreSQL using the [official platform downloads](https://www.postgresql.org/download/). On Debian/Ubuntu, for example:

```sh
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

On macOS, install a PostgreSQL package or Postgres.app and start its local server. On Windows, use the official installer and ensure the PostgreSQL service is running. The project connects directly to PostgreSQL at `localhost:5432`.

1. Create a local role and database. On Debian/Ubuntu, open a PostgreSQL shell with `sudo -u postgres psql`. On macOS/Windows, open `psql` or pgAdmin using the PostgreSQL administrator account. Run:

   ```sql
   CREATE ROLE codeyoung LOGIN PASSWORD 'choose_a_local_password';
   CREATE DATABASE codeyoung OWNER codeyoung;
   ```

   If the `codeyoung` role or database already exists, keep it and update the `.env` values to match your local PostgreSQL credentials.

2. Configure Django's local environment:

   ```sh
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and set `POSTGRES_PASSWORD` to the role password you chose. `.env` files are ignored by Git. The example Django key is for local development only. Generate a private key with `python -c 'import secrets; print(secrets.token_urlsafe(48))'`. For production, set `DJANGO_DEBUG=False`, use a unique secret, and configure allowed hosts and CORS origins explicitly.

3. Install backend dependencies and activate a virtual environment:

   ```sh
   cd backend
   python -m venv .venv
   . .venv/bin/activate
   python -m pip install -r requirements.txt
   ```

   On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1`.

4. Apply migrations and seed the ten mentors:

   ```sh
   python manage.py migrate
   python manage.py seed_mentors
   ```

5. Start Django in this terminal:

   ```sh
   python manage.py runserver 127.0.0.1:8000
   ```

6. In another terminal, install frontend dependencies and start React/Vite:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Open the Vite URL printed by npm, normally `http://localhost:5173`.

Django reads `backend/.env`. The frontend uses Vite's `/api` proxy for local development. For staff dashboards using a Django session on port 8000, set `VITE_API_BASE_URL=http://127.0.0.1:8000` in `frontend/.env.local`, sign into Django at `http://127.0.0.1:8000/admin/`, and reload `/debug` or `/outbox`.

### Environment variables

| Variable | Purpose | Default/example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django signing/secret key | Required; example file has local placeholder |
| `DJANGO_DEBUG` | Debug mode | `True` in the local example; use `False` for production |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `POSTGRES_DB` | PostgreSQL database | `codeyoung` |
| `POSTGRES_USER` | PostgreSQL user | `codeyoung` |
| `POSTGRES_PASSWORD` | Password for the local PostgreSQL role | Set in `backend/.env` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins | localhost Vite origins |
| `TRIAL_CLASS_DURATION_MINUTES` | Trial class duration | `30` |
| `TRIAL_CLASS_SLOT_STEP_MINUTES` | Slot increments | `30` |
| `VITE_API_BASE_URL` | Optional frontend API origin | Empty for Vite `/api` proxy |

For local staff dashboards with a separate Vite/Django origin, set `VITE_API_BASE_URL=http://127.0.0.1:8000` in `frontend/.env.local`, sign into Django at `http://127.0.0.1:8000/admin/`, and then reload `/debug` or `/outbox`. Credentialed CORS is enabled for the configured development origins.

## Migrations, seed, and tests

Run these from `backend/` with the local PostgreSQL service running and credentials set in `backend/.env`:

```sh
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py seed_mentors
python manage.py test
```

The tests cover model validation, ten-mentor seed idempotency, timezone conversions and DST, availability/conflicts/local-day capacity, booking validation and assignment, idempotency/network retry, outbox recipients/content, dashboard permissions, a New York-to-Mangalore API booking, and PostgreSQL concurrency locking.

Run the frontend production build from `frontend/` after installing dependencies:

```sh
npm run build
```

There is no frontend test runner configured yet. Manual browser review should cover the parent flow, confirmation, mentor dashboard, staff dashboards, and FAQ assistant.

## Design decisions and assumptions

- One Django project and one PostgreSQL database; Django apps provide domain boundaries.
- Parent and mentor locations are stored as continent, country, state/region, and city text fields.
- The browser detects an initial timezone; the parent may select a different IANA timezone.
- Parents can only book offered, future slots; backend rules remain authoritative.
- The least-loaded eligible mentor is preferred; name and ID make ties deterministic.
- Mentor weekly hours are stored as JSON keyed by ISO weekday and interpreted in mentor-local time.
- Completed appointments consume the daily limit; cancelled appointments do not.
- Request fingerprints include parent data and UTC start time. Idempotency keys are global and unique in the database.
- Mock meeting links use the reserved `.demo` host and are not real video-conference links.
- Email outbox records are persisted but not delivered.

## Security and privacy notes

Parent booking retrieval requires the supplied email to match the booking. Availability does not expose mentor identity. Public mentor dashboard output omits parent email, but it does expose parent name and class link as requested for this assignment; add authentication/authorization before using real personal data. Debug booking and email outbox APIs require Django staff permissions. The frontend cannot supply a mentor ID to the booking API. Django rejects a missing secret key and refuses the example key when `DEBUG=False`.

## Known limitations

- PostgreSQL must be available for the full suite and is required to verify actual row-lock behavior.
- No real email provider, real meeting provider, cancellation/rescheduling flow, mentor login provisioning, or frontend automated test suite is configured.
- The fixed FAQ assistant handles common phrases rather than general conversation and cannot access booking records or live availability.
