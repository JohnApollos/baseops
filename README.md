# BaseOps — Multi-Tenant Logistics & Fleet Management SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-61%20Passed-success?style=flat-square)](file:///c:/dev/Multi-tenancy/baseops/tests)

**BaseOps** is a production-grade multi-tenant logistics, fleet management, and last-mile delivery Progressive Web Application (PWA). Built on Next.js 16, Supabase, and PostgreSQL, it provides database-level Row Level Security (RLS), real-time dispatcher telemetry, and an offline-first mutation engine for drivers operating in cellular dead zones.

---

## Key Capabilities

- **🏢 Multi-Tenant Isolation**: Shared database architecture with hard row-level isolation via `org_id`, PostgreSQL RLS policies, and immutable tenant protection triggers.
- **📡 Offline-First Driver PWA**: Drivers update parcel statuses offline without network latency. Mutations buffer locally inside IndexedDB via Dexie.js and auto-flush in FIFO order upon reconnection.
- **🗺️ Real-Time Dispatch Center**: Live parcel Kanban board and interactive Leaflet map projecting driver locations via Supabase Realtime (PostgreSQL CDC).
- **🔒 Enterprise Security**: `PL/pgSQL SECURITY DEFINER` functions with explicit `search_path = public, pg_temp` hardening, revoked internal RPC privileges, and permanent audit log immutability.
- **📊 Executive Analytics**: Multi-metric delivery volume, fleet performance, and parcel status charts connected directly to database queries with zero-state fallbacks.
- **✉️ Team Onboarding**: Secure invitation workflow generating magic links via Resend API and pre-configured role templates.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16 App Router](https://nextjs.org/) (Turbopack, React 19) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Database** | [PostgreSQL 17](https://www.postgresql.org/) (Supabase Local / Supabase Cloud) |
| **Authentication** | [Supabase Auth / GoTrue](https://supabase.com/auth) (`@supabase/ssr` with HTTP Cookies) |
| **Offline Storage** | [Dexie.js / IndexedDB](https://dexie.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) |
| **Mapping** | [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Email Service** | [Resend](https://resend.com/) |

---

## Quickstart (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20+ or v22+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Running)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase` or via `npx`)

### 2. Clone & Install
```bash
git clone https://github.com/JohnApollos/baseops.git
cd baseops
npm install
```

### 3. Start Local Supabase Stack
```bash
npx supabase start
```

### 4. Configure Environment Variables
Copy the template to `.env.local`:
```bash
cp .env.example .env.local
```
*(The default `.env.example` is pre-configured with local Supabase CLI default credentials).*

### 5. Reset & Seed the Database
```bash
npm run db:reset
```

### 6. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Pre-Configured Test Accounts

The local database seed includes four pre-configured accounts in the `QuickShip Logistics` organization:

| Role | Email | Password | Direct Dashboard URL |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@baseops.dev` | `baseops123` | [http://localhost:3000/owner](http://localhost:3000/owner) |
| **Dispatcher** | `dispatcher@baseops.dev` | `baseops123` | [http://localhost:3000/dispatch](http://localhost:3000/dispatch) |
| **Driver 1** | `driver1@baseops.dev` | `baseops123` | [http://localhost:3000/driver](http://localhost:3000/driver) |
| **Driver 2** | `driver2@baseops.dev` | `baseops123` | [http://localhost:3000/driver](http://localhost:3000/driver) |

---

## Local Service Ports

| Service | Endpoint | Description |
| :--- | :--- | :--- |
| **BaseOps Web App** | `http://localhost:3000` | Application frontend & API |
| **Supabase Studio** | `http://127.0.0.1:54323` | Web SQL Editor & Table Browser |
| **Inbucket (Mailpit)** | `http://127.0.0.1:54324` | Local email inbox for magic links & invites |
| **PostgreSQL Database**| `127.0.0.1:54322` | Direct PostgreSQL connection for DBeaver |
| **Supabase REST API** | `http://127.0.0.1:54321` | PostgREST / GoTrue endpoint |

---

## Connecting with DBeaver

To inspect the local PostgreSQL database using DBeaver:
- **Host**: `127.0.0.1`
- **Port**: `54322`
- **Database**: `postgres`
- **Username**: `postgres`
- **Password**: `postgres`
- **SSL**: Disabled

*For detailed instructions including Supabase Cloud connection parameters, see [`docs/DBeaver.md`](file:///c:/dev/Multi-tenancy/baseops/docs/DBeaver.md).*

---

## Automated Verification & Testing

BaseOps includes an automated test suite comprising 38 unit/contract tests and 23 live database adversarial attack tests (61 total):

```bash
# Run all unit and security logic tests (38 tests)
npm test

# Run live PostgreSQL adversarial penetration tests (23 tests)
npm run test:live

# Run complete test suite (61 tests)
npm run test:all

# Type-check TypeScript
npx tsc --noEmit

# Execute Next.js 16 production build
npm run build
```

---

## Technical Documentation Master Index

Comprehensive documentation is available in the [`docs/`](file:///c:/dev/Multi-tenancy/baseops/docs) directory:

- [**Architecture Specification**](file:///c:/dev/Multi-tenancy/baseops/docs/ARCHITECTURE.md): System topology, multi-tenancy model, and offline sync pipeline.
- [**Database Specification**](file:///c:/dev/Multi-tenancy/baseops/docs/DATABASE.md): ER diagram, schema data dictionary, check constraints, and indexing matrix.
- [**Security Engineering**](file:///c:/dev/Multi-tenancy/baseops/docs/SECURITY.md): RLS policy matrix, security triggers, search_path hardening, and SEC-01 $\rightarrow$ SEC-16 verification results.
- [**Authentication & RBAC**](file:///c:/dev/Multi-tenancy/baseops/docs/AUTHENTICATION.md): Session lifecycle, token cookie management, and role routing rules.
- [**Development Guide**](file:///c:/dev/Multi-tenancy/baseops/docs/DEVELOPMENT.md): Step-by-step local setup, environment configuration, and test account credentials.
- [**Testing & Verification**](file:///c:/dev/Multi-tenancy/baseops/docs/TESTING.md): Test suite architecture, live DB harnesses, and test execution procedures.
- [**Deployment Guide**](file:///c:/dev/Multi-tenancy/baseops/docs/DEPLOYMENT.md): Step-by-step Supabase Cloud migration and Vercel hosting setup.
- [**Environment Configuration**](file:///c:/dev/Multi-tenancy/baseops/docs/ENVIRONMENT.md): Client-safe vs. server-only secret classification and variable matrix.
- [**DBeaver Guide**](file:///c:/dev/Multi-tenancy/baseops/docs/DBeaver.md): Local and Cloud GUI database connection instructions.
- [**Troubleshooting Guide**](file:///c:/dev/Multi-tenancy/baseops/docs/TROUBLESHOOTING.md): Known issues, root causes, and verified solutions.
- [**API Reference**](file:///c:/dev/Multi-tenancy/baseops/docs/API.md): HTTP route handlers and database RPC specifications.
- [**Contributing Standards**](file:///c:/dev/Multi-tenancy/baseops/docs/CONTRIBUTING.md): Code conventions, security commandments, and PR checklists.
- [**Changelog**](file:///c:/dev/Multi-tenancy/baseops/docs/CHANGELOG.md): Detailed version history and architectural evolution.
- [**Production Readiness Audit**](file:///c:/dev/Multi-tenancy/baseops/docs/PRODUCTION_READINESS.md): 12-domain production readiness checklist and audit verdict.

---

## License

This project is licensed under the [MIT License](file:///c:/dev/Multi-tenancy/baseops/LICENSE).