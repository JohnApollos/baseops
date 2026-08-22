# BaseOps System Architecture

BaseOps is a multi-tenant, offline-first Logistics and Fleet Management Progressive Web Application (PWA) built with Next.js 16, Supabase, and PostgreSQL.

This document describes the architectural topology, multi-tenancy model, offline synchronization pipeline, security boundaries, and data flow of the application.

---

## 1. High-Level System Topology

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Browser / PWA)"]
        Browser["Next.js App Router (React 19)"]
        DexieDB["Dexie.js (IndexedDB Local Store)"]
        SyncEngine["Offline Sync Engine (FIFO Queue)"]
        LeafletMap["React-Leaflet Dispatch Map"]
    end

    subgraph ServerLayer ["Server Layer (Next.js 16 Runtime)"]
        Proxy["RBAC Proxy / Middleware (src/proxy.ts)"]
        ServerActions["Server Actions & Route Handlers"]
        AdminInviteAPI["/api/invite-team (Service Role Boundary)"]
    end

    subgraph SupabaseLayer ["Database & Auth Layer (PostgreSQL 17)"]
        SupabaseAuth["Supabase GoTrue Auth (JWT)"]
        RLS["Row Level Security Policies"]
        Triggers["Security & Tenant Isolation Triggers"]
        Functions["SECURITY DEFINER Helper RPCs"]
        Realtime["PostgreSQL CDC (Supabase Realtime)"]
        Catalog["6 Domain Tables (public schema)"]
    end

    Browser <--> DexieDB
    DexieDB <--> SyncEngine
    SyncEngine -- "HTTPS REST (JWT)" --> SupabaseLayer
    Browser -- "HTTP Request" --> Proxy
    Proxy --> ServerActions
    ServerActions -- "Supabase SSR Client" --> SupabaseLayer
    AdminInviteAPI -- "Service Role Key" --> SupabaseAuth
    Catalog -- "WebSocket CDC" --> Realtime
    Realtime -- "Real-time Events" --> Browser
```

---

## 2. Multi-Tenancy Architecture

BaseOps utilizes a **Shared Database, Shared Schema, Row-Level Isolation** multi-tenancy model:

1. **Tenant Identification**: Every operational record (`parcels`, `vehicles`, `routes`, `delivery_events`) and user profile (`profiles`) contains an `org_id UUID REFERENCES public.organizations(id)`.
2. **Context Resolution**: The authenticated user's identity (`auth.uid()`) maps to a unique row in `public.profiles`. The database extracts the user's `org_id` and `role` via hardened helper functions.
3. **Database Enforcement**: Multi-tenancy is enforced at the database engine level via PostgreSQL Row Level Security (RLS) policies and `BEFORE UPDATE / INSERT` triggers. Client-side filters are treated as UI conveniences, never security boundaries.
4. **Tenant Immutability**: Critical entity ownership (`org_id` on parcels, vehicles, routes, and profiles) is protected by database triggers that reject any attempt to reassign records across tenant boundaries.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Authenticated Driver
    participant App as BaseOps Client
    participant PG as PostgreSQL (RLS Engine)
    participant Data as public.parcels

    Driver->>App: Mark Parcel as Delivered
    App->>PG: UPDATE public.parcels SET status = 'delivered' WHERE id = '...'
    Note over PG: Evaluate RLS: parcels_driver_isolation
    Note over PG: Check: org_id == get_user_org_id(auth.uid())<br/>AND assigned_driver_id == auth.uid()
    alt Authorized Tenant & Assignee
        PG->>Data: Apply UPDATE + Bump updated_at trigger
        PG-->>App: 200 OK (1 row updated)
    else Cross-Tenant / Unauthorized Attempt
        PG-->>App: 200 OK (0 rows affected / Policy Denied)
    end
```

---

## 3. Role-Based Access Control (RBAC) Model

BaseOps implements three distinct user roles within each tenant organization, plus a platform Super-Admin:

| Role | Primary Interface | Allowed Capabilities | Restricted Capabilities |
| :--- | :--- | :--- | :--- |
| **`owner`** | `/owner/*` & `/dispatch/*` | Full organization governance, billing plan selection, team member invitation (all roles), parcel & fleet management, executive analytics. | Cannot modify own `role` or `org_id` directly via client UPDATE (must use administrative RPCs). |
| **`dispatcher`** | `/dispatch/*` | Real-time parcel board (Kanban), parcel creation & assignment, fleet registration, route inspection, driver invitation. | Cannot invite owners/dispatchers, cannot alter organization billing or core settings, cannot access `/owner/*`. |
| **`driver`** | `/driver` | Mobile-first task list, offline parcel status updates (`delivered`, `failed`), offline audit trail creation, local IndexedDB caching. | Cannot view or mutate other drivers' parcels, cannot register vehicles, cannot access dispatch or owner dashboards. |
| **Super-Admin** | `/admin` | Platform-wide organization directory, subscription tier overrides, tenant wallet credit adjustments. | Access gated strictly by matching `SUPER_ADMIN_EMAIL` environment variable. |

---

## 4. Offline-First Synchronization Engine

The driver mobile application is designed to operate seamlessly in cellular dead zones and unreliable network conditions.

```mermaid
flowchart TD
    A[Driver Action in UI] --> B[Write Mutation to Dexie.js IndexedDB]
    B --> C[Optimistic UI Update via useLiveQuery]
    B --> D[Enqueue Mutation in syncQueue Table]
    
    E{Network Status} -->|Online| F[Sync Engine Auto-Flush]
    E -->|Offline| G[Buffer in IndexedDB FIFO Queue]
    
    G --> H[Listen for window 'online' Event]
    H --> F
    
    F --> I[Process Items Oldest First]
    I --> J[Push HTTP Mutation to Supabase REST API]
    
    J -->|Success| K[Mark Item 'synced' in Dexie]
    J -->|Failure| L{Retry Count < 3?}
    L -->|Yes| M[Increment retry_count & Backoff]
    L -->|No| N[Mark Item 'failed' for Manual Review]
```

### Key Offline Engine Properties:
1. **Single Source of Truth**: The driver UI binds directly to Dexie.js using `useLiveQuery()`. UI state updates instantaneously on user interaction without waiting for network responses.
2. **FIFO Processing**: Mutations are queued with timestamps and executed sequentially to preserve state transition order (e.g. `picked_up` $\rightarrow$ `in_transit` $\rightarrow$ `delivered`).
3. **Non-Destructive Pulls**: Server state synchronization (`pullAssignedParcels`) explicitly checks `syncQueue` and excludes locally modified parcels from being overwritten by stale server snapshots.
4. **Data Leakage Prevention**: On user logout or session expiration, `clearLocalDatabase()` immediately wipes all cached parcels, routes, and queue entries from IndexedDB.

---

## 5. Security Architecture & Defense-in-Depth

```mermaid
graph TD
    subgraph Layer1 ["Layer 1: Network & Edge Routing"]
        L1A["Next.js RBAC Proxy (src/proxy.ts)"]
        L1B["Public Route Whitelisting"]
        L1C["Onboarding Redirect Gates"]
    end

    subgraph Layer2 ["Layer 2: Server API Boundaries"]
        L2A["Supabase SSR Session Validation"]
        L2B["Role & Tenant Scoping in Route Handlers"]
        L2C["Service-Role Key Isolation (Server-Only)"]
    end

    subgraph Layer3 ["Layer 3: Database Engine (PostgreSQL)"]
        L3A["Row Level Security (RLS) on all 6 Tables"]
        L3B["Tenant Isolation Triggers (IMMUTABLE org_id)"]
        L3C["PL/pgSQL SECURITY DEFINER with search_path = public"]
        L3D["Explicit GRANT / REVOKE Permission Matrix"]
        L3E["Domain CHECK Constraints & Index Enforcements"]
    end

    Layer1 --> Layer2 --> Layer3
```

1. **Edge Route Protection (`src/proxy.ts`)**: Intercepts all incoming requests, refreshes JWT cookies, verifies onboarding completion, and redirects unauthorized role requests before rendering page components.
2. **Server-Side API Boundaries (`src/app/api/*`)**: Server route handlers never trust client-supplied tenant identifiers; caller context is resolved exclusively from validated session cookies.
3. **Database Security Layer**: Even if client application logic is bypassed, PostgreSQL RLS policies, check constraints, and triggers guarantee that cross-tenant access is structurally impossible.

---

## 6. Directory Structure & Code Organization

```text
baseops/
├── .env.example              # Production-grade environment configuration template
├── package.json              # Dependencies and test runner scripts
├── next.config.ts            # Next.js 16 configuration with PWA integration
├── tsconfig.json             # Strict TypeScript configuration
├── scripts/
│   └── seed-users.js         # Administrative seed script for Supabase auth accounts
├── src/
│   ├── app/                  # Next.js 16 App Router
│   │   ├── (admin)/          # Super-admin platform controls (/admin)
│   │   ├── (auth)/           # Authentication flows (login, register, forgot-password)
│   │   ├── (dispatcher)/     # Dispatch center, parcels, fleet, drivers, routes
│   │   ├── (driver)/         # Mobile-first driver delivery app with offline sync
│   │   ├── (onboarding)/     # Organization & initial fleet onboarding wizard
│   │   ├── (owner)/          # Executive dashboard, team management, billing, org settings
│   │   ├── api/              # Secure API route handlers (auth callbacks, invite-team)
│   │   ├── globals.css       # Tailwind CSS v4 styling & dark theme variables
│   │   ├── layout.tsx        # Root HTML shell & ThemeProvider
│   │   └── page.tsx          # Public product landing page
│   ├── components/           # Modular React components (dispatch, driver, owner, shared, ui)
│   ├── lib/                  # Core utilities, Dexie database, Supabase clients, sync engine
│   ├── proxy.ts              # Next.js 16 RBAC routing proxy / session middleware
│   └── types/                # Authoritative TypeScript domain entity interfaces
├── supabase/
│   ├── config.toml           # Local Supabase CLI configuration
│   ├── seed.sql              # Deterministic database seed data
│   └── migrations/           # Authoritative SQL migration history (00001 -> 00004)
├── tests/
│   └── security/             # Automated security, RLS, offline storage, and live DB tests
└── docs/                     # Technical, operational, and architectural documentation
```
