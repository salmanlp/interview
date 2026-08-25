-- Interview Assessment — shared workspace schema
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Model: ONE shared workspace. Every signed-in user sees the same candidates,
-- interviews, templates and questions — that is the point of moving off local
-- storage. Personal preferences (interviewer name, theme) stay per user.
--
-- Each table keeps the application object verbatim in a jsonb `data` column.
-- The domain types are already plain JSON, so there is no impedance mismatch
-- and no schema migration every time a field is added. The few columns lifted
-- out of the document exist purely so Postgres can index and filter on them.

-- ---------------------------------------------------------------- candidates
create table if not exists public.candidates (
  id          text primary key,
  data        jsonb       not null,
  name        text        generated always as (data->>'name') stored,
  status      text        generated always as (data->>'status') stored,
  archived    boolean     generated always as ((data->>'archived')::boolean) stored,
  updated_at  timestamptz not null default now()
);
create index if not exists candidates_status_idx   on public.candidates (status);
create index if not exists candidates_updated_idx  on public.candidates (updated_at desc);

-- ---------------------------------------------------------------- interviews
create table if not exists public.interviews (
  id            text primary key,
  candidate_id  text        generated always as (data->>'candidateId') stored,
  data          jsonb       not null,
  status        text        generated always as (data->>'status') stored,
  updated_at    timestamptz not null default now()
);
create index if not exists interviews_candidate_idx on public.interviews (candidate_id);
create index if not exists interviews_status_idx    on public.interviews (status);

-- ----------------------------------------------------------------- templates
create table if not exists public.templates (
  id         text primary key,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- questions
create table if not exists public.questions (
  id         text primary key,
  data       jsonb       not null,
  category   text        generated always as (data->>'category') stored,
  active     boolean     generated always as ((data->>'active')::boolean) stored,
  updated_at timestamptz not null default now()
);
create index if not exists questions_category_idx on public.questions (category);

-- --------------------------------------------------------------------- audit
create table if not exists public.audit (
  id           text primary key,
  candidate_id text        generated always as (data->>'candidateId') stored,
  data         jsonb       not null,
  at           timestamptz generated always as ((data->>'at')::timestamptz) stored,
  updated_at   timestamptz not null default now()
);
create index if not exists audit_candidate_idx on public.audit (candidate_id);
create index if not exists audit_at_idx        on public.audit (at desc);

-- ------------------------------------------------------------------ settings
-- Per user: interviewer name, theme, default duration and so on. Scoring rules
-- that must stay comparable across interviewers live on the shared templates.
create table if not exists public.settings (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------- row security
-- Candidate records are personal data. Nothing is readable without a session:
-- the anon key alone gets you nowhere.
alter table public.candidates enable row level security;
alter table public.interviews enable row level security;
alter table public.templates  enable row level security;
alter table public.questions  enable row level security;
alter table public.audit      enable row level security;
alter table public.settings   enable row level security;

-- Shared workspace: any authenticated user has full access to the hiring data.
do $$
declare t text;
begin
  foreach t in array array['candidates', 'interviews', 'templates', 'questions', 'audit']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated', t
    );
  end loop;
end $$;

-- Settings are private to the user they belong to.
drop policy if exists settings_own on public.settings;
create policy settings_own on public.settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------- updated_at upkeep
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['candidates', 'interviews', 'templates', 'questions', 'audit', 'settings']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch', t
    );
  end loop;
end $$;
