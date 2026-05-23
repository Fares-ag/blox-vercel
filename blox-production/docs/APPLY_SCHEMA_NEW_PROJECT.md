# Apply database schema to a new Supabase project

Use this when you point the apps at a **new** Supabase project (new database) while keeping Vercel/build config unchanged. Client apps only need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the new project; the **schema** must exist in that project’s Postgres.

## Prerequisites

- A **new** Supabase project (empty `public` data for applications/payments).
- Your **database password** (Project Settings → Database).

## Install `psql` on Windows (if you see “psql not found”)

1. Download **PostgreSQL for Windows** from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (EDB installer is fine).
2. During setup you can install only what you need; ensure **Command Line Tools** (or the full server) is selected so `psql.exe` is installed under `C:\Program Files\PostgreSQL\<version>\bin\`.
3. **Close and reopen PowerShell** after install, or add that `bin` folder to your user **PATH** (Settings → Environment variables).
4. Confirm: `psql --version`

The `ApplySupabaseSchema.ps1` script also tries to find `psql.exe` under `Program Files\PostgreSQL` if it is not on `PATH`.

## Option A — Automatic (recommended)

1. Install PostgreSQL for Windows (includes `psql`) as above, or put `psql` on your `PATH`.
2. Copy the **URI** connection string from Supabase: **Project Settings → Database → Connection string → URI** (replace `[YOUR-PASSWORD]`).
3. From the `blox-production` folder, set `DATABASE_URL` then run the script (**same window**, no need to nest another `powershell`):

```powershell
$env:DATABASE_URL = "postgresql://postgres:ENCODED_PASSWORD@db.nczhzvwxsisfyvxjljoy.supabase.co:5432/postgres?sslmode=require"
.\scripts\ApplySupabaseSchema.ps1
```

The script runs, in order:

- `supabase-schema.sql` (core tables)
- `supabase/bootstrap/*.sql` (helpers, TEXT `applications.id` on empty DB, `credit_history`, fix for Blox Credit payment insert)
- `ADD_PAYMENT_INTENTS_AND_IMPROVEMENTS.sql` (SkipCash-related columns/tables)
- `supabase-add-user-credits-table.sql`
- `supabase/migrations/*.sql` in a **corrected** order (see script comments)

## Option B — SQL Editor (manual)

If you cannot use `psql`, open **Supabase → SQL Editor** and run the same files **in the order listed in** `scripts/ApplySupabaseSchema.ps1` (copy/paste each file’s contents, run, then the next).

## After schema apply

1. **Authentication → URL configuration**: add your local and production site URLs.
2. **Edge Functions**: deploy and set secrets for the new project if you use SkipCash webhooks, etc.
3. **Production RLS**: for real production, plan to replace permissive policies with something like `supabase-secure-rls-policies.sql` (review first).
4. **Optional data**: this process does **not** copy rows from the old project; only schema + functions. Use a separate backup/restore or ETL if you need data migration.

## Common issues

- **`applications` not empty**: the TEXT-id bootstrap aborts. Use the old project’s migration path or `supabase-migration-simple-ids.sql` if you already have UUID rows to convert.
- **`psql` SSL**: if you see SSL errors, add `?sslmode=require` to the URI (Supabase usually documents the exact URI).
