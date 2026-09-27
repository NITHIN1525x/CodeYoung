# CodeYoung

A trial-class booking app where parents choose a time and the system assigns an available mentor.

## How to Run the Project

Use Python 3.11 or newer, Node.js with npm, and PostgreSQL. Keep PostgreSQL running while using the app. In `backend/.env`, set `POSTGRES_PASSWORD` to the password you create for the local database role.

### Linux

The PostgreSQL commands below are for Debian/Ubuntu.

1. Install and start PostgreSQL:

   ```sh
   sudo apt update
   sudo apt install postgresql postgresql-client
   sudo systemctl start postgresql
   ```

2. Create the database role and database:

   ```sh
   sudo -u postgres psql
   ```

   At the `psql` prompt, run:

   ```sql
   CREATE ROLE codeyoung LOGIN;
   \password codeyoung
   CREATE DATABASE codeyoung OWNER codeyoung;
   \q
   ```

   Enter a local password when prompted.

3. Configure and start Django from the repository root:

   ```sh
   cp backend/.env.example backend/.env
   ```

   Set `POSTGRES_PASSWORD` in `backend/.env` to the password entered above. Then run:

   ```sh
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_mentors
   python manage.py runserver 127.0.0.1:8000
   ```

4. Open a second terminal at the repository root and start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

5. Open <http://localhost:5173>.

### macOS

1. Install Homebrew if needed, then install and start PostgreSQL:

   ```sh
   brew install postgresql
   brew services start postgresql
   ```

2. Create the database role and database:

   ```sh
   psql postgres
   ```

   At the `psql` prompt, run:

   ```sql
   CREATE ROLE codeyoung LOGIN;
   \password codeyoung
   CREATE DATABASE codeyoung OWNER codeyoung;
   \q
   ```

   Enter a local password when prompted.

3. Configure and start Django from the repository root:

   ```sh
   cp backend/.env.example backend/.env
   ```

   Set `POSTGRES_PASSWORD` in `backend/.env` to the password entered above. Then run:

   ```sh
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_mentors
   python manage.py runserver 127.0.0.1:8000
   ```

4. Open a second terminal at the repository root and start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

5. Open <http://localhost:5173>.

### Windows (PowerShell)

1. Install PostgreSQL for Windows and start its PostgreSQL service from the Windows Services app. Open **SQL Shell (psql)** from the Start menu and connect to the default `postgres` database as the `postgres` user.

2. At the `psql` prompt, create the role and database:

   ```sql
   CREATE ROLE codeyoung LOGIN;
   \password codeyoung
   CREATE DATABASE codeyoung OWNER codeyoung;
   \q
   ```

   Enter a local password when prompted.

3. In PowerShell at the repository root, copy the environment file:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```

   Set `POSTGRES_PASSWORD` in `backend/.env` to the password entered above. Then configure and start Django:

   ```powershell
   Set-Location backend
   py -3 -m venv .venv
   .venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_mentors
   python manage.py runserver 127.0.0.1:8000
   ```

4. Open a second PowerShell terminal at the repository root and start the frontend:

   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

5. Open <http://localhost:5173>.

## User Workflow

1. Open the application and continue through the landing page.
2. Select **Register for a free demo** to begin booking.
3. Enter your name and email, then provide your location and timezone.
4. Choose a date and an available time.
5. The system checks availability; you do not choose a mentor. It automatically assigns an available mentor.
6. After confirmation, view the appointment details and parent/mentor local times.
7. When SMTP is configured, the parent and mentor receive the class link by email. The link becomes available at the scheduled time.
