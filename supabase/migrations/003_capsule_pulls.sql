-- Adds the capsule machine. Run once in the Supabase SQL editor.

create table if not exists public.capsule_pulls (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  critter text not null,
  source text not null check (source in ('seeds', 'lamp', 'golden', 'wish')),
  seeds integer not null default 0 check (seeds >= 0),
  glimmer integer not null default 0 check (glimmer >= 0),
  created_at timestamptz not null default now()
);
create index if not exists capsule_pulls_user on public.capsule_pulls (user_id, created_at);

alter table public.capsule_pulls enable row level security;

create policy "own capsule pulls" on public.capsule_pulls for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
