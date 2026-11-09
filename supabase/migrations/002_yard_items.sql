-- Adds yard decorations. Run once in the Supabase SQL editor.

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
