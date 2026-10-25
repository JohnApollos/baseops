# BaseOps — Offline-First Logistics & Settlement Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20RLS-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-65%20Passed-success?style=flat-square)](tests)

**BaseOps** is a production-grade multi-tenant logistics, fleet management, and offline-first last-mile delivery operations platform. Engineered for emerging markets (beginning with Kenya and East Africa), BaseOps bridges the gap between field execution and financial accountability with an append-only settlement ledger, offline mobile driver PWA, automated Cash-on-Delivery (COD) reconciliation, and bulk manifest ingestion.

---

## Key Capabilities

- 🏢 **Multi-Tenant Isolation**: Shared database architecture with hard row-level isolation via `org_id`, PostgreSQL RLS policies, and immutable tenant protection triggers.
- 💰 **COD & Settlement Ledger**: End-to-end Cash-on-Delivery tracking with automated driver reconciliation, variance calculation, and cash vs. mobile money (M-Pesa) split auditing.
- 📡 **Offline-First Driver PWA**: Drivers view assigned stops and log deliveries in complete cellular dead zones. Local mutations buffer inside Dexie.js (IndexedDB) and auto-replay upon reconnection.
- 🛡️ **Collision-Resistant Event Sourcing**: When an offline delivery occurs on a parcel cancelled remotely, the sync engine preserves the financial audit trail, flags an operational collision, and sets reconciliation status to `disputed`.
- 📋 **Bulk Manifest Importer**: Dispatchers upload morning Excel/CSV manifests with automated column mapping, format validation, and batch parcel generation.
- 🗺️ **Real-Time Dispatch Center**: Live parcel Kanban board and interactive Leaflet map projecting driver locations via Supabase Realtime (PostgreSQL CDC).
- 🔒 **Enterprise Security**: `PL/pgSQL SECURITY DEFINER` functions with explicit `search_path = public, pg_temp`, revoked internal RPC privileges, and permanent delivery event immutability.
- 📊 **Executive Analytics**: Multi-metric delivery volume, fleet performance, and parcel status charts built with zero-state fallbacks.

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

The local database seed includes pre-configured accounts in the `QuickShip Logistics` organization:

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

*For detailed instructions including Supabase Cloud connection parameters, see [docs/DBeaver.md](docs/DBeaver.md).*

---

## Automated Verification & Testing

BaseOps includes an automated test harness covering security invariants, offline session isolation, RLS boundaries, and the COD settlement engine:

```bash
# Run all unit, security logic, and settlement engine tests (42 tests)
npm test

# Run live PostgreSQL adversarial penetration tests (23 tests)
npm run test:live

# Run complete test suite (65 tests)
npm run test:all

# Type-check TypeScript
npx tsc --noEmit

# Run ESLint
npm run lint

# Execute Next.js 16 production build
npm run build
```

---

## Technical Documentation Master Index

Comprehensive documentation is maintained in the [`docs/`](docs/) directory:

- [**Architecture Specification**](docs/ARCHITECTURE.md): System topology, multi-tenancy model, offline sync pipeline, and collision engine.
- [**Database Specification**](docs/DATABASE.md): ER diagram, schema data dictionary, check constraints, migrations, and indexing matrix.
- [**Security Engineering**](docs/SECURITY.md): RLS policy matrix, security triggers, search_path hardening, and SEC-01 $\rightarrow$ SEC-16 verification results.
- [**Authentication & RBAC**](docs/AUTHENTICATION.md): Session lifecycle, token cookie management, and role routing rules.
- [**Development Guide**](docs/DEVELOPMENT.md): Step-by-step local setup, environment configuration, and test account credentials.
- [**Testing & Verification**](docs/TESTING.md): Test suite architecture, live DB harnesses, and test execution procedures.
- [**Deployment Guide**](docs/DEPLOYMENT.md): Step-by-step Supabase Cloud migration and Vercel hosting setup.
- [**Environment Configuration**](docs/ENVIRONMENT.md): Client-safe vs. server-only secret classification and variable matrix.
- [**DBeaver Guide**](docs/DBeaver.md): Local and Cloud GUI database connection instructions.
- [**Troubleshooting Guide**](docs/TROUBLESHOOTING.md): Known issues, root causes, and verified solutions.
- [**API Reference**](docs/API.md): HTTP route handlers and database RPC specifications.
- [**Contributing Standards**](docs/CONTRIBUTING.md): Code conventions, security commandments, and PR checklists.
- [**Changelog**](docs/CHANGELOG.md): Detailed version history and architectural evolution.
- [**Production Readiness Audit**](docs/PRODUCTION_READINESS.md): 12-domain production readiness checklist and audit verdict.

---

## License

This project is licensed under the [MIT License](LICENSE).
