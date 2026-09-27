# TRANSCRIPT.md

# CodeYoung – Full-Stack Trial Class Appointment Booking System
## AI Development Session Transcript

> **Note:** This document records the AI-assisted development process for the CodeYoung assignment, including development prompts/requests and corresponding agent responses/results. It is organized chronologically for readability. No credentials, passwords, API keys, or app passwords are included.

---

## Table of Contents

1. [Part 1 – Architecture and Project Setup](#part-1--architecture-and-project-setup)
2. [Part 2 – PostgreSQL, Django Models and Mentor Seed Data](#part-2--postgresql-django-models-and-mentor-seed-data)
3. [Part 3 – Timezones, DST and Availability Engine](#part-3--timezones-dst-and-availability-engine)
4. [Part 4 – Booking API, Auto Assignment, Idempotency and Concurrency](#part-4--booking-api-auto-assignment-idempotency-and-concurrency)
5. [Part 5 – React Parent Booking UI](#part-5--react-parent-booking-ui)
6. [Part 6 – Confirmation, Mentor Dashboard, Admin/Debug and Email Outbox](#part-6--confirmation-mentor-dashboard-admindebug-and-email-outbox)
7. [Part 7 – Chatbot and UX Polish](#part-7--chatbot-and-ux-polish)
8. [Part 8 – Testing, Documentation and Submission Cleanup](#part-8--testing-documentation-and-submission-cleanup)
9. [Debugging – Docker Removal](#debugging--docker-removal)
10. [Debugging – PostgreSQL Setup and Authentication](#debugging--postgresql-setup-and-authentication)
11. [Debugging – Mentor Capacity and 20 Bookings per Day](#debugging--mentor-capacity-and-20-bookings-per-day)
12. [Debugging – Mentor Auto Assignment Clarification](#debugging--mentor-auto-assignment-clarification)
13. [Debugging – Real Gmail SMTP Email Delivery](#debugging--real-gmail-smtp-email-delivery)
14. [Debugging – Timezone Selection UX](#debugging--timezone-selection-ux)
15. [Debugging – Email Recipient Failure](#debugging--email-recipient-failure)
16. [Debugging – Functional Dummy Class Link](#debugging--functional-dummy-class-link)
17. [Final Requirement Verification](#final-requirement-verification)

---

# Part 1 – Architecture and Project Setup

## User Prompt

Build the CodeYoung Full-Stack Development assignment as a complete working application.

The product is a trial-class booking system where:

- A parent books a trial class.
- The parent chooses a suitable date/time.
- The parent provides name, email and location/timezone information.
- The parent must never choose a mentor.
- The system automatically assigns an available mentor.
- There are 10 mentors.
- Each mentor can conduct at most 2 demo classes per local calendar day.
- Parents and mentors may be in different timezones.
- The backend must handle UTC storage and IANA timezones correctly.
- A dummy class/video link is acceptable.
- The system should send confirmation information to the parent and mentor.
- The application should be production-structured, readable and suitable for a recruitment assignment.

Use:

- React + Vite for the frontend.
- Django + Django REST Framework for the backend.
- PostgreSQL for the database.
- Modular backend architecture.
- Plain CSS for the frontend.

The implementation should cover the complete booking workflow, timezone handling, mentor availability, assignment, email/outbox handling, testing and documentation.

## Agent Response / Result

The application architecture was planned around the following flow:

```text
Parent
  ↓
React + Vite
  ↓
HTTP / REST API
  ↓
Django REST Framework
  ├── Authentication / validation
  ├── Booking flow
  ├── Availability
  ├── Mentor assignment
  ├── Email/outbox
  └── Reporting / admin support
  ↓
PostgreSQL
```

The major backend modules were separated into logical areas for:

- common utilities
- mentors
- bookings
- parent information
- email/outbox handling
- timezone utilities

The frontend was structured as a React/Vite application with reusable booking components and plain CSS.

The canonical design decision was:

```text
Parent local time
       ↓
Parent IANA timezone
       ↓
UTC canonical timestamp
       ↓
Assigned mentor IANA timezone
       ↓
Mentor local time
```

The parent selects the time, while the backend determines the mentor.

---

# Part 2 – PostgreSQL, Django Models and Mentor Seed Data

## User Prompt

Implement the PostgreSQL database and Django models for the trial-class system.

Create the required models for:

- Parent
- Mentor
- Appointment
- EmailOutbox

Seed 10 mentors.

Each mentor should have:

- name
- email
- timezone
- active/inactive state
- daily demo-class capacity

The daily capacity must be 2 classes per mentor per mentor-local calendar day.

Use PostgreSQL and Django migrations.

## Agent Response / Result

The database model was implemented with UTC-aware appointment timestamps and mentor timezone information.

The mentor data was seeded with 10 active mentors.

The capacity rule was implemented as:

```text
10 mentors × 2 classes/day = 20 maximum mentor assignments/day
```

The system does not create 20 parent records merely because 20 parents are interested. The 20-parent figure represents the practical daily booking capacity based on the mentor limit.

The database was connected to PostgreSQL through environment variables.

The core schema supports:

```text
Parent
  └── parent contact/location information

Mentor
  └── registered email
  └── IANA timezone
  └── active status
  └── daily capacity

Appointment
  └── parent
  └── mentor
  └── UTC start/end
  └── meeting link
  └── booking/idempotency information

EmailOutbox
  └── appointment
  └── recipient
  └── email type
  └── delivery status
  └── timestamps
```

---

# Part 3 – Timezones, DST and Availability Engine

## User Prompt

Implement timezone-aware availability.

Parents and mentors can be in different timezones. Parents are commonly in the US/UK and mentors are commonly in India.

Requirements:

- Use IANA timezone names.
- Store appointment times canonically in UTC.
- Display the parent's local time.
- Display the assigned mentor's local time.
- Handle daylight-saving changes.
- Do not use fixed UTC offsets as the stored timezone.
- Handle nonexistent and repeated local times.
- Availability should be calculated correctly.
- Mentor daily limits must reset according to the mentor's local calendar day.

## Agent Response / Result

The system uses Python `zoneinfo` and IANA timezone identifiers.

Examples:

```text
India:
Asia/Kolkata

New York:
America/New_York

London:
Europe/London
```

The system does not use:

```text
Asia/India/Kolkata
```

and does not store:

```text
UTC+05:30
```

as the canonical timezone.

Instead:

```text
Parent local selection
        ↓
IANA timezone
        ↓
Convert to UTC
        ↓
Store UTC in database
        ↓
Convert UTC to local time for display
```

Example:

```text
Parent timezone:
America/New_York

Mentor timezone:
Asia/Kolkata

Appointment:
12:00 UTC

Parent:
8:00 AM EDT

Mentor:
5:30 PM IST
```

DST handling was implemented with IANA timezone rules.

The system also handles:

- spring-forward nonexistent times
- fall-back repeated times
- 23-hour local days
- 25-hour local days

Availability shows the parent-local slot as the primary time and the mentor-local time as secondary information.

---

# Part 4 – Booking API, Auto Assignment, Idempotency and Concurrency

## User Prompt

Implement the complete booking API.

The parent should:

1. Submit name and email.
2. Select location/timezone.
3. Select date.
4. Select a time slot.
5. Submit the booking.

The parent must never submit a mentor identifier.

The backend must:

- validate the request
- verify the slot is still available
- automatically select a mentor
- enforce 2 classes per mentor per local day
- prevent overlapping bookings
- generate a unique dummy meeting link
- support idempotent retries
- safely handle concurrent booking requests
- return a clear error if no mentor is available

Use PostgreSQL transactions and row locking where necessary.

## Agent Response / Result

The booking flow was implemented so mentor selection happens entirely on the backend.

The assignment strategy uses the eligible active mentors and prefers the least-loaded eligible mentor.

The booking transaction:

```text
Validate request
    ↓
Validate requested local time
    ↓
Convert to UTC
    ↓
Find eligible mentors
    ↓
Lock relevant mentor rows
    ↓
Check local-day capacity
    ↓
Check overlap/conflict
    ↓
Assign mentor
    ↓
Create appointment
    ↓
Create meeting link
    ↓
Create email outbox entries
```

Concurrency protection was implemented with PostgreSQL transaction/locking behavior.

Idempotency was implemented so repeated requests do not create duplicate appointments.

The system also handles:

- invalid email
- past booking
- unavailable slot
- no available mentor
- conflicting booking
- idempotency mismatch
- retry after network failure

The parent cannot control which mentor is selected.

---

# Part 5 – React Parent Booking UI

## User Prompt

Build the React parent-facing booking flow.

Make it simple and suitable for a real parent.

The flow should collect:

- parent name
- email
- location
- timezone
- date
- available time

Do not make the parent choose a mentor.

Show local times clearly and make the UI responsive and understandable.

## Agent Response / Result

The React booking flow was implemented with:

```text
Step 1 – Parent information
Step 2 – Location / timezone
Step 3 – Date
Step 4 – Available time
Step 5 – Confirmation
```

The parent sees the parent's local time as the primary time.

Mentor local time is shown as supporting information.

Availability states include:

- loading
- available slots
- no available mentors
- API failure
- booking conflict
- successful booking

The UI was built using React/Vite and plain CSS.

The parent does not get a mentor-selection control.

---

# Part 6 – Confirmation, Mentor Dashboard, Admin/Debug and Email Outbox

## User Prompt

Implement the remaining product workflow.

After a successful booking:

- Show a confirmation page.
- Show parent local time.
- Show mentor local time.
- Show assigned mentor.
- Show meeting link.
- Send parent confirmation.
- Send mentor notification.
- Track email delivery through an outbox.
- Add a read-only mentor dashboard.
- Add an admin/debug dashboard.

The parent email must be sent to the exact email entered by the parent.

The mentor email must be sent to the assigned mentor's registered email.

## Agent Response / Result

The confirmation page was implemented with the appointment details.

The mentor dashboard is read-only and exposes the information needed by the assigned mentor without exposing unrelated private data.

An admin/debug area was added for development visibility.

The email outbox records email delivery separately.

The intended email flow is:

```text
Booking created
      ↓
Parent email
      +
Mentor email
      ↓
EmailOutbox
      ↓
SMTP delivery
```

Both emails use the same meeting link.

The parent email contains:

- parent name
- confirmation
- date
- parent local time
- assigned mentor
- mentor local time
- meeting link

The mentor email contains:

- parent name
- parent email
- appointment details
- mentor local time
- same meeting link

---

# Part 7 – Chatbot and UX Polish

## User Prompt

Add the requested chatbot and polish the overall UX.

The chatbot should help answer common questions about:

- trial classes
- booking
- timezones
- mentor assignment
- availability
- confirmation

Keep it useful and lightweight rather than making it unnecessarily complex.

Also polish the booking interface and error states.

## Agent Response / Result

A lightweight chatbot/help experience was added to the frontend.

The UX was refined around the parent journey:

```text
Understand
   ↓
Choose time
   ↓
Confirm
   ↓
Receive meeting details
```

Important product behavior was kept explicit:

- parent chooses a suitable time
- system chooses the mentor
- local times are shown
- no mentor-selection burden is placed on the parent
- errors are communicated clearly
- successful bookings show confirmation information

---

# Part 8 – Testing, Documentation and Submission Cleanup

## User Prompt

Complete the testing and documentation for the assignment.

Test:

- timezone conversion
- DST
- mentor daily limit
- mentor assignment
- conflicts
- no available mentor
- idempotency
- concurrency
- invalid email
- past slot
- API booking
- dashboard privacy
- admin protection

Also prepare README and TRANSCRIPT.md for GitHub submission.

## Agent Response / Result

The project was tested through Django's test suite and frontend production build.

The test suite covered the booking workflow, timezone behavior, mentor capacity, assignment, idempotency, API behavior and PostgreSQL concurrency.

The documentation was prepared for GitHub submission.

The README was later refined to provide a concise project overview and setup instructions for:

- macOS
- Linux
- Windows

The project was kept focused on the assignment instead of adding unnecessary infrastructure.

---

# Debugging – Docker Removal

## User Prompt

Is Docker required for this assignment? Remove Docker if it is not necessary and keep the project using local PostgreSQL.

## Agent Response / Result

Docker was determined not to be required by the assignment.

The project was kept with:

```text
React/Vite
Django/DRF
PostgreSQL
```

Docker-related configuration was removed where appropriate.

The backend was configured to use local PostgreSQL through environment variables.

The project remained testable without Docker.

---

# Debugging – PostgreSQL Setup and Authentication

## User Prompt

The Django migrations fail because PostgreSQL is not running / authentication is failing. Help configure PostgreSQL locally on Fedora.

## Agent Response / Result

PostgreSQL was installed and initialized.

The service was enabled and started.

The database and role were created for the project.

The local PostgreSQL authentication configuration initially used `ident`, which caused:

```text
FATAL: Ident authentication failed for user "codeyoung"
```

The local host authentication method was changed to password-based authentication using SCRAM.

After restarting PostgreSQL, direct authentication succeeded.

Django was then configured through `.env` with:

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_HOST
POSTGRES_PORT
```

The database connection worked and migrations could proceed.

No database credentials are recorded in this transcript.

---

# Debugging – Mentor Capacity and 20 Bookings per Day

## User Prompt

How do I verify that there are 10 mentors available and 20 parents interested per day? I also need to test the 2 classes per mentor rule.

## Agent Response / Result

The requirement was interpreted as:

```text
10 active mentors
×
2 demo classes per mentor per local day
=
20 maximum mentor assignments per day
```

It does not require creating 20 Parent records just to represent interest.

The test coverage was expanded to:

- seed 10 active mentors
- create 20 bookings distributed across the mentors
- verify the 21st booking is rejected
- verify no extra appointment is created
- verify no extra email/outbox record is created

The isolated PostgreSQL API test was added for this capacity scenario.

---

# Debugging – Mentor Auto Assignment Clarification

## User Prompt

Does the parent select the time and then the system automatically selects the mentor?

## Agent Response / Result

Yes.

The intended flow is:

```text
Parent chooses:
Date + Time
       ↓
Backend checks eligible mentors
       ↓
System automatically assigns mentor
```

The parent never chooses the mentor.

The assignment strategy considers mentor availability and daily load.

---

# Debugging – Real Gmail SMTP Email Delivery

## User Prompt

I want real email instead of only a mock email.

When the parent books:

- send a real confirmation email to the exact parent email
- send a real notification to the assigned mentor
- use the same dummy meeting link
- keep the outbox status

## Agent Response / Result

Real SMTP support was configured using the existing environment-based email settings.

The parent recipient is taken from the email submitted in the booking form.

The mentor recipient is taken from the assigned mentor record.

The two messages are tracked independently through the email outbox.

A real SMTP booking was performed successfully.

The reported verification showed:

```text
Parent:
nnitin90430@gmail.com

Mentor:
nithinnn241@gmail.com
```

Both messages were reported as successfully sent and contained the same class link and appropriate local times.

Later verification used a deliverable mentor test address:

```text
nithinnn241+codeyoung-mentor@gmail.com
```

No credentials are included in this transcript.

---

# Debugging – Timezone Selection UX

## User Prompt

The timezone dropdown contains hundreds of entries and is difficult for parents to use. Can timezone/location be auto-selected when the parent enters location information?

## Agent Response / Result

The timezone selector was identified as poor UX because exposing the complete IANA timezone list makes the parent search through hundreds of technical values.

The recommended UX was:

```text
Location detected

Country: India
State/Region: Karnataka
City: Mangalore

Timezone:
Asia/Kolkata (IST, UTC+5:30)
```

The browser can detect the timezone through:

```javascript
Intl.DateTimeFormat().resolvedOptions().timeZone
```

The preferred manual fallback is:

```text
Country
   ↓
State/Region
   ↓
City
```

rather than a huge timezone dropdown.

The canonical backend timezone remains an IANA value such as:

```text
Asia/Kolkata
America/New_York
Europe/London
```

The UTC/DST architecture is unchanged.

---

# Debugging – Email Recipient Failure

## User Prompt

The Gmail delivery screen shows:

```text
Address not found

ananya.rao@codeyoung.example

DNS Error: DNS type 'mx' lookup of codeyoung.example
```

The parent should receive the confirmation email too, not only the mentor.

## Agent Response / Result

The problem was identified as a fake/nonexistent seeded mentor domain.

The required flow was clarified as:

```text
Parent books
    ↓
Parent email → exact email entered in form
    +
Assigned mentor → mentor's registered deliverable email
```

The parent email must contain:

- confirmation
- parent local time
- mentor name
- mentor local time
- same dummy video/class link

The mentor email must contain:

- parent name
- parent email
- class details
- mentor local time
- same dummy link

The system must not send real SMTP messages to:

```text
@codeyoung.example
```

For demo delivery, mentor email configuration was made environment-driven.

The implementation also keeps separate outbox records and delivery status for parent and mentor.

---

# Debugging – Functional Dummy Class Link

## User Prompt

The audit says the generated `.demo` URL has no matching route and therefore is not actually usable.

Make the dummy class link functional in the local React app.

Use a route such as:

```text
/class/<meeting_id>
```

The page should show:

- Trial Class / Demo Class heading
- appointment information
- mentor name
- date
- relevant local time
- clear demo meeting message

The same meeting link must be used in both emails.

Also verify the real SMTP flow and ensure no `@codeyoung.example` address is used.

## Agent Response / Result

A functional frontend class route was implemented:

```text
/class/<meeting_id>
```

The route provides a simple read-only demo class experience.

The backend exposes the appointment details required by the page.

The generated meeting link now points to the working frontend route rather than an unusable `.demo` domain.

The email verification requirements were retained:

- exact parent recipient
- deliverable assigned mentor recipient
- same meeting link
- correct local times
- no fake `.example` recipient
- no hardcoded parent email
- no credentials in source code

The final verification reported:

```text
37 Django tests passed
Vite production build passed
Real SMTP booking passed
Parent email sent
Mentor email sent
Both outbox records marked sent
Both emails contained the same link
```

The class route returned HTTP 200 and the backend returned the appointment details.

SMTP reported successful sending, although inbox placement itself could not be independently verified by the development agent.

---

# Final Requirement Verification

## User Prompt

The assignment specifically requires:

1. Mentors and parents may be in different timezones.
2. Daylight Saving Time must be handled.
3. Parents and mentors can receive a dummy link that is assumed to work.
4. Mentors have at most 2 demo classes a day.
5. If no mentors are available, communicate an appropriate error state.

Tell me whether these requirements are satisfied.

## Agent Response / Result

The five requirements were verified as satisfied.

### 1. Different timezones

The system stores UTC appointment timestamps and converts them to the parent and assigned mentor IANA timezones for display and communication.

### 2. Daylight Saving Time

The system uses IANA timezone data and `zoneinfo`.

DST-related tests cover New York conversions and local-day edge cases.

### 3. Dummy class link

A functional local `/class/<meeting_id>` route was added so the dummy class link is actually demonstrable.

### 4. Two classes per mentor per local day

The mentor capacity is enforced according to each mentor's local calendar day.

With 10 mentors:

```text
10 × 2 = 20 possible assignments
```

The capacity test verifies that the 21st booking is rejected when all mentor capacity is exhausted.

### 5. No mentor available

Unavailable slots are shown appropriately.

If availability changes between slot selection and booking, the backend returns a conflict response and the frontend displays the error.

---

# Final Development Verification

The final reported verification included:

```text
Django tests:
37 passed

Frontend:
Vite production build passed

Real SMTP:
Parent email sent
Mentor email sent

Meeting link:
Functional /class/<meeting_id> route

Email:
Same meeting link in both messages

Timezone:
Parent and mentor local times communicated

Security:
.env excluded from Git commit
Credentials not stored in source code
```

## Final Architecture

```text
                         ┌──────────────────────┐
                         │       Parent         │
                         │  Name / Email / TZ   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    React + Vite      │
                         │   Parent Booking UI  │
                         └──────────┬───────────┘
                                    │ REST
                                    ▼
                         ┌──────────────────────┐
                         │    Django + DRF      │
                         │   Booking Services   │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
      │ Availability │      │   Mentor     │      │   Timezone   │
      │    Engine    │      │ Assignment   │      │  / DST Logic │
      └──────────────┘      └──────────────┘      └──────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │     PostgreSQL       │
                         │ Parent / Mentor /    │
                         │ Appointment / Outbox│
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴───────────┐
                         ▼                      ▼
                  ┌──────────────┐      ┌──────────────┐
                  │ Parent Email │      │ Mentor Email │
                  └──────────────┘      └──────────────┘
                         │                      │
                         └──────────┬───────────┘
                                    ▼
                         ┌──────────────────────┐
                         │ Same Demo Class Link │
                         │ /class/<meeting_id>  │
                         └──────────────────────┘
```

---

# Key Product Decisions Recorded During Development

- Parent chooses the date and time.
- Parent never chooses the mentor.
- Mentor assignment happens automatically on the backend.
- Appointment timestamps are stored canonically in UTC.
- Timezones are stored as IANA identifiers.
- Parent local time is the primary displayed time.
- Mentor local time is displayed as secondary information.
- Mentor capacity is 2 demo classes per mentor per local calendar day.
- Ten mentors provide a theoretical maximum of 20 mentor assignments per day.
- Booking transactions use PostgreSQL concurrency protection.
- Duplicate retries are handled through idempotency.
- Parent and mentor emails are tracked separately.
- The parent email always uses the exact email entered in the booking form.
- Mentor email uses the assigned mentor's registered/deliverable email.
- Fake `.example` domains are not used for real SMTP delivery.
- The class link is a dummy link for the assignment.
- The dummy class link is implemented as a working frontend route.
- Email credentials are kept outside source code.
- `.env` is not committed to GitHub.

---

# Part 15 — README Documentation Update

## User Prompt

Update the existing README so it accurately documents the current CodeYoung project.

Requirements included:

- Preserve the existing setup/run instructions and keep a single setup section.
- Inspect the current repository and README before making changes.
- Document the local PostgreSQL setup; do not add Docker or submission instructions.
- Do not include secrets or credentials.
- Document only behavior present in the project: the landing and login flows; parent details; automatic/manual location and IANA timezone selection; date/time selection; availability and automatic mentor assignment; validation; appointment creation; parent and mentor email/outbox; confirmation; and the application-controlled `/class/<meeting_id>` route with its UTC time gate and demo video.
- Describe the shared UTC/timezone architecture, mentor-local daily capacity of two, normalized-email parent overlap checks over UTC intervals, HTTP 409 behavior, idempotency, and PostgreSQL concurrency protection.
- Document the mentor and staff dashboards, support chatbot, callback request, security/privacy, architecture, and tests only as implemented and verified.
- Verify authentication and password reset, class access and Drive destination behavior, and parent-overlap side effects/concurrency before describing them.
- Inspect the final diff and confirm only the README changed.

## Codex Response / Result

The initial ordinary workspace command failed before running because the sandbox could not initialize (`mountinfo path is not absolute`). An approved elevated path was then used to inspect and update the README. The existing local PostgreSQL setup/run section was preserved; documentation was added for the current workflow, timezone and availability architecture, seeded mentors and capacity, overlap/idempotency/concurrency behavior, email/outbox, class access, support features, dashboards, environment configuration, and architecture.

A follow-up audit compared the README with the implementation and corrected descriptions that otherwise would have overstated behavior:

- Password reset has a page and endpoint, but requests for an existing account currently error because the email template references an unconfigured `password_reset_confirm` route.
- The class API returns 404 for malformed or unknown IDs. The frontend only mounts the class page for a 32-character hexadecimal ID; malformed browser paths fall back to the landing page.
- Parent overlap validation is performed during booking confirmation; the availability preview does not have the parent's email with which to check it.
- The parent email says to use the link at the scheduled time. The mentor email contains the same application-controlled class URL and both local appointment times, but does not explicitly describe the time gate.
- An optional `python manage.py createsuperuser` step was documented for local staff-only pages.

The final README diff passed `git diff --check`; README was the only file changed during the README update and audit.
