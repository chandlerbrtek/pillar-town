-- PillarTown schema. Run this once in the Supabase SQL editor.
-- Every table is limited to the signed-in user's own rows.

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  started_on date not null
);

create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  pillar text not null check (pillar in ('vitality','mind','heart','spirit','bond','craft','fortune','harmony')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid references public.habits on delete set null,
  pillar text not null check (pillar in ('vitality','mind','heart','spirit','bond','craft','fortune','harmony')),
  day date not null,
  created_at timestamptz not null default now()
);
create index if not exists logs_user_day on public.logs (user_id, day);

create table if not exists public.targets (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  pillar text not null check (pillar in ('vitality','mind','heart','spirit','bond','craft','fortune','harmony')),
  week_start date not null,
  target integer not null check (target between 0 and 50),
  primary key (user_id, pillar, week_start)
);

alter table public.settings enable row level security;
alter table public.habits enable row level security;
alter table public.logs enable row level security;
alter table public.targets enable row level security;

create policy "own settings" on public.settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habits" on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs" on public.logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own targets" on public.targets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Yard decorations (also in migrations/002_yard_items.sql).
create table if not exists public.yard_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  cell smallint not null check (cell between 0 and 8),
  decor text not null,
  price integer not null check (price >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, week_start, cell)
);

alter table public.yard_items enable row level security;

create policy "own yard items" on public.yard_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
