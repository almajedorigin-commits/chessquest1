-- supabase/schema.sql
-- Run this in your Supabase project's SQL editor (Dashboard -> SQL Editor).
-- It sets up everything ChessQuest online play needs.

-- ---------------------------------------------------------------------------
-- PROFILES: optional persistent identity + rating, keyed by the player id the
-- client generates. (Guests work without a row here; named accounts upsert.)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          text primary key,
  name        text not null,
  rating      integer not null default 800,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- GAMES: one row per room. The move list is the authoritative history; fen is
-- the current position so reconnecting players can resync instantly.
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id          text primary key,            -- short room code
  white_id    text not null,
  white_name  text,
  white_rating integer default 800,
  black_id    text,
  black_name  text,
  fen         text not null,
  turn        text not null default 'w',
  moves       jsonb not null default '[]'::jsonb,
  status      text not null default 'waiting',  -- waiting | active | finished
  result      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists games_status_idx on public.games (status, created_at);
create index if not exists games_matchmaking_idx on public.games (status, black_id, white_rating);

-- Keep updated_at fresh on every change (drives Realtime ordering / cleanup).
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists games_touch on public.games;
create trigger games_touch before update on public.games
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- REALTIME: broadcast row changes to subscribed clients.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.games;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- This app uses anonymous auth + a client-generated player id. For a friendly
-- hobby project we allow any authenticated (incl. anonymous) user to read
-- games and to create/join/update them. Tighten these if you need stricter
-- ownership guarantees.
-- ---------------------------------------------------------------------------
alter table public.games enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "games readable" on public.games;
create policy "games readable" on public.games
  for select using (true);

drop policy if exists "games insertable" on public.games;
create policy "games insertable" on public.games
  for insert with check (true);

drop policy if exists "games updatable" on public.games;
create policy "games updatable" on public.games
  for update using (true) with check (true);

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select using (true);

drop policy if exists "profiles upsertable" on public.profiles;
create policy "profiles upsertable" on public.profiles
  for insert with check (true);

drop policy if exists "profiles updatable" on public.profiles;
create policy "profiles updatable" on public.profiles
  for update using (true) with check (true);

-- ---------------------------------------------------------------------------
-- OPTIONAL CLEANUP: delete abandoned/finished games older than a day. You can
-- run this manually or schedule it with pg_cron if your project has it.
-- ---------------------------------------------------------------------------
-- delete from public.games where updated_at < now() - interval '1 day';
