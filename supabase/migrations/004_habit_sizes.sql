-- Habit sizes: what Small, Usual and Big mean for each habit, and the size of each log.
alter table public.habits add column if not exists small text;
alter table public.habits add column if not exists usual text;
alter table public.habits add column if not exists big text;
alter table public.logs add column if not exists size text not null default 'usual' check (size in ('small','usual','big'));
