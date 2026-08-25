# Database

`migrations/20260825120000_init.sql` creates everything the app needs: tables,
indexes, row-level security policies and the `updated_at` triggers.

Apply it either way:

**By hand** — Supabase Dashboard → SQL Editor → New query → paste the file →
Run. Takes a few seconds and needs no tooling.

**Via the GitHub integration** — if you have connected this repository to
Supabase, it applies files in `supabase/migrations` automatically on push.

The script is idempotent, so running it twice is harmless.

## What it sets up

One shared workspace. Every signed-in user reads and writes the same
candidates, interviews, templates and questions; `settings` rows are private to
their owner.

Each table stores the application object verbatim in a `jsonb` data column, so
the TypeScript types in `src/lib/types.ts` remain the single source of truth and
adding a field needs no migration. A few columns are lifted out of the document
purely so Postgres can index and filter on them.

## Security

Every table has row-level security requiring an authenticated session. That is
what makes it safe to ship the anon key in the browser bundle: without a session
it reads nothing and writes nothing.

Verified against PostgreSQL 16 — as the `anon` role every table returns zero
rows and inserts are rejected; as `authenticated` all rows are visible; and one
user cannot read or modify another user's settings.

Never put the `service_role` key in the app. It bypasses row-level security.
