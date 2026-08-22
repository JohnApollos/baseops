# BaseOps Local Development Guide

This guide walks through configuring and running BaseOps locally from a fresh clone.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **Node.js**: v20.x or v22.x (`node --version`)
2. **Docker Desktop**: Installed and running (`docker info`)
3. **Supabase CLI**: Installed via npm or Homebrew (`supabase --version` or `npx supabase --version`)
4. **Git**: Version 2.x+

---

## 2. Quickstart (Zero to Running in 5 Minutes)

### Step 1: Clone the Repository
```bash
git clone https://github.com/JohnApollos/baseops.git
cd baseops
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Local Supabase Stack
Make sure Docker Desktop is running, then start the Supabase containers:
```bash
npx supabase start
```

Upon successful startup, the CLI will output your local service endpoints and keys:
```text
Started supabase local development setup.
         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Configure Environment Variables
Copy the environment template to `.env.local`:
```bash
cp .env.example .env.local
```

Ensure `.env.local` contains the keys output by the `supabase start` command:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key_from_supabase_start
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_from_supabase_start
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPER_ADMIN_EMAIL=owner@baseops.dev
RESEND_API_KEY=
```

### Step 5: Reset & Seed the Database
Run a database reset to apply all migrations (`00001` $\rightarrow$ `00004`) and populate the database with seed test records:
```bash
npm run db:reset
```

*(Optional)* If you ever need to re-seed administrative accounts directly:
```bash
npm run seed
```

### Step 6: Start Next.js Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Pre-Seeded Development Test Accounts

The local database seed includes four pre-configured accounts in the `QuickShip Logistics` organization:

| Role | Email | Password | Assigned Dashboard |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@baseops.dev` | `baseops123` | [http://localhost:3000/owner](http://localhost:3000/owner) |
| **Dispatcher** | `dispatcher@baseops.dev` | `baseops123` | [http://localhost:3000/dispatch](http://localhost:3000/dispatch) |
| **Driver 1** | `driver1@baseops.dev` | `baseops123` | [http://localhost:3000/driver](http://localhost:3000/driver) |
| **Driver 2** | `driver2@baseops.dev` | `baseops123` | [http://localhost:3000/driver](http://localhost:3000/driver) |

---

## 4. Local Service Ports Summary

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Next.js Web App** | `http://localhost:3000` | Application frontend & API endpoints. |
| **Supabase Studio** | `http://127.0.0.1:54323` | Web UI for inspecting tables, running SQL, and managing Auth. |
| **Inbucket (Mailpit)**| `http://127.0.0.1:54324` | Local email inbox catching all magic link and invite emails. |
| **PostgreSQL Database**| `127.0.0.1:54322` | Direct PostgreSQL connection for DBeaver or psql. |
| **Supabase REST API** | `http://127.0.0.1:54321` | PostgREST / GoTrue API endpoint. |

---

## 5. Development Commands Reference

```bash
# Start local Next.js dev server
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Run unit and security logic tests
npm test

# Run live database adversarial penetration tests
npm run test:live

# Run complete test suite (unit + live)
npm run test:all

# Clean reset of local database from migrations + seed
npm run db:reset

# Build optimized production bundle
npm run build
```
