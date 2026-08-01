-- Trip-level Ryder Cup teams. Unlike Scramble (teams are per-round), Ryder
-- Cup teams persist across the whole trip, so they live on trips/
-- trip_members rather than on a single round.

alter table public.trips
  add column if not exists team_a_name text,
  add column if not exists team_b_name text;

alter table public.trip_members
  add column if not exists team text check (team in ('a', 'b'));

-- No new RLS policies needed: these are new columns on tables that already
-- have SELECT/UPDATE policies gated by trip membership.
