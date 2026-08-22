# DBeaver Database Connection Guide

This guide explains how to connect **DBeaver** (or any standard PostgreSQL GUI client such as pgAdmin, TablePlus, or DataGrip) to the BaseOps PostgreSQL database in both **Local Development** and **Supabase Cloud** environments.

---

## 1. Connecting to Local PostgreSQL (Docker / Supabase CLI)

When you run `npx supabase start`, PostgreSQL is exposed on local port **`54322`**.

### Connection Settings in DBeaver:

| Setting | Value |
| :--- | :--- |
| **Database Driver** | `PostgreSQL` |
| **Host** | `127.0.0.1` (or `localhost`) |
| **Port** | `54322` |
| **Database** | `postgres` |
| **Authentication** | Database Native |
| **Username** | `postgres` |
| **Password** | `postgres` |
| **SSL** | Disabled (Local connection) |

### Step-by-Step Connection Instructions:
1. Open DBeaver and click **New Database Connection** (Plug icon with `+`).
2. Select **PostgreSQL** and click **Next**.
3. In the **Main** tab:
   - Host: `127.0.0.1`
   - Port: `54322`
   - Database: `postgres`
   - Username: `postgres`
   - Password: `postgres`
4. Click **Test Connection ...**.
5. Once you see `Connected` with PostgreSQL version, click **Finish**.

---

## 2. Connecting to Supabase Cloud PostgreSQL

For production or staging databases hosted on Supabase Cloud:

### Connection Settings in DBeaver:

| Setting | Transaction Pooler (Recommended) | Direct Connection |
| :--- | :--- | :--- |
| **Host** | `aws-0-[region].pooler.supabase.com` | `db.[project-ref].supabase.co` |
| **Port** | `6543` | `5432` |
| **Database** | `postgres` | `postgres` |
| **Username** | `postgres.[project-ref]` | `postgres` |
| **Password** | *Your Supabase Database Password* | *Your Supabase Database Password* |
| **SSL** | **Required** | **Required** |

### Where to Find Your Cloud Connection String:
1. Open your project in the [Supabase Cloud Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings $\rightarrow$ Database**.
3. Under **Connection string**, select **URI** or **Parameters**.
4. Use the pooled connection parameters for GUI clients and migrations.

### Configuring SSL in DBeaver:
1. In the connection settings window, navigate to the **SSL** tab.
2. Check **Use SSL**.
3. Set **SSL Mode** to `require` or `verify-full`.
4. Click **Test Connection**.

---

## 3. Useful SQL Inspection Queries in DBeaver

Once connected, you can execute the following inspection queries in a SQL Editor tab:

```sql
-- 1. Inspect all public domain tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Verify RLS status on all tables
SELECT relname AS table_name, relrowsecurity AS rls_enabled 
FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' AND c.relkind = 'r';

-- 3. List all foreign key and composite indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Inspect active security triggers
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```
