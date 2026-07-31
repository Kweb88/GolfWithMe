-- GolfWithMe core schema
-- Replaces the prototype's single-blob-per-trip key/value storage with a
-- real relational model: one row per player, round, score, post, etc.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles: one row per signed-in user, created on first sign-in
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_emoji text not null default '⛳',
  avatar_url text,
  home_course text,
  favorite_format text not null default 'Stroke Play',
  bio text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- courses: hand-curated today, meant to be backed by a licensed GPS/course
-- data provider later (PDF item #12) without changing callers.
-- ---------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  region text,
  country text,
  created_at timestamptz not null default now()
);
create index courses_name_idx on public.courses using gin (to_tsvector('simple', name || ' ' || coalesce(city,'') || ' ' || coalesce(region,'') || ' ' || coalesce(country,'')));

-- ---------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  location text,
  start_date date,
  end_date date,
  is_public boolean not null default false,
  seeking_active boolean not null default false,
  seeking_spots int not null default 1,
  seeking_note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index trips_public_idx on public.trips (is_public) where is_public;

-- trip_members: a player in a trip. profile_id is null for players added by
-- name only (no account) -- matches the prototype's "add a player" flow.
create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  name text not null,
  venmo text,
  cashapp text,
  zelle text,
  joined_at timestamptz not null default now()
);
create unique index trip_members_trip_profile_idx on public.trip_members (trip_id, profile_id) where profile_id is not null;
create index trip_members_trip_idx on public.trip_members (trip_id);

-- ---------------------------------------------------------------------
-- rounds
-- ---------------------------------------------------------------------
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  course_name text not null,
  course_id uuid references public.courses(id),
  course_location text,
  round_date date,
  format text not null check (format in ('stroke','match','skins','nassau','scramble','ryder')),
  skins_bet numeric not null default 0,
  nassau_bet numeric not null default 0,
  par jsonb not null default '[4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4]'::jsonb,
  match_player_a uuid references public.trip_members(id),
  match_player_b uuid references public.trip_members(id),
  team_a_name text,
  team_b_name text,
  created_at timestamptz not null default now()
);
create index rounds_trip_idx on public.rounds (trip_id);

-- which trip_members are playing this round, and their Ryder Cup team (if any)
create table public.round_players (
  round_id uuid not null references public.rounds(id) on delete cascade,
  member_id uuid not null references public.trip_members(id) on delete cascade,
  team text check (team in ('a','b')),
  primary key (round_id, member_id)
);

-- Ryder Cup pairings for team rounds
create table public.round_ryder_pairs (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  member_a uuid not null references public.trip_members(id),
  member_b uuid not null references public.trip_members(id)
);

-- one row per player per hole, instead of a JSON scores blob
create table public.scores (
  round_id uuid not null references public.rounds(id) on delete cascade,
  member_id uuid not null references public.trip_members(id) on delete cascade,
  hole smallint not null check (hole between 1 and 18),
  strokes smallint check (strokes is null or strokes between 1 and 20),
  updated_at timestamptz not null default now(),
  primary key (round_id, member_id, hole)
);

create table public.round_comments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.round_likes (
  round_id uuid not null references public.rounds(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (round_id, profile_id)
);

-- ---------------------------------------------------------------------
-- feed
-- ---------------------------------------------------------------------
create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text not null,
  type text not null default 'update',
  text text,
  photo_url text,
  created_at timestamptz not null default now()
);
create index feed_posts_trip_idx on public.feed_posts (trip_id, created_at desc);

create table public.feed_reactions (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

-- ---------------------------------------------------------------------
-- money: expenses, lodging (both split among trip_members)
-- ---------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  description text not null,
  amount numeric not null check (amount >= 0),
  paid_by uuid not null references public.trip_members(id),
  split_among uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.lodging (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  address text,
  checkin date,
  checkout date,
  cost numeric check (cost is null or cost >= 0),
  confirmation text,
  paid_by uuid references public.trip_members(id),
  split_among uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- course reviews: tied to a round actually logged (PDF item #14)
-- ---------------------------------------------------------------------
create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_name text not null,
  round_id uuid references public.rounds(id) on delete set null,
  author_id uuid not null references public.profiles(id),
  rating smallint not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (round_id, author_id)
);
create index course_reviews_course_idx on public.course_reviews (course_name);

-- ---------------------------------------------------------------------
-- auto-create a profile row the moment someone signs in via OAuth, using
-- whatever name/avatar Google or Apple handed back.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- helper functions for RLS (security definer so they can read trip_members
-- without the caller needing direct select rights on it)
-- ---------------------------------------------------------------------
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = _trip_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_trip_public(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_public from public.trips where id = _trip_id), false);
$$;

create or replace function public.can_read_trip(_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_trip_public(_trip_id) or public.is_trip_member(_trip_id);
$$;

create or replace function public.trip_id_for_round(_round_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select trip_id from public.rounds where id = _round_id;
$$;

create or replace function public.trip_id_for_post(_post_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select trip_id from public.feed_posts where id = _post_id;
$$;

-- ---------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.rounds enable row level security;
alter table public.round_players enable row level security;
alter table public.round_ryder_pairs enable row level security;
alter table public.scores enable row level security;
alter table public.round_comments enable row level security;
alter table public.round_likes enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_reactions enable row level security;
alter table public.expenses enable row level security;
alter table public.lodging enable row level security;
alter table public.course_reviews enable row level security;

-- profiles: readable by any signed-in user (needed to show co-players'
-- names/avatars); writable only by the owner.
create policy "profiles readable by authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update self" on public.profiles
  for update to authenticated using (id = auth.uid());

-- courses: readable by everyone; writes reserved for admin/service role
-- (curation today, licensed data import later).
create policy "courses readable by all" on public.courses
  for select to authenticated, anon using (true);

-- trips: public trips readable by anyone; private trips readable/writable
-- by members, plus the creator even before they've added themself as a
-- member (avoids a chicken-and-egg gap right after insert). Any signed-in
-- user may create a trip.
create policy "trips readable" on public.trips
  for select to authenticated, anon using (is_public or public.is_trip_member(id) or created_by = auth.uid());
create policy "trips insert by creator" on public.trips
  for insert to authenticated with check (created_by = auth.uid());
create policy "trips update by member" on public.trips
  for update to authenticated using (public.is_trip_member(id) or created_by = auth.uid());

-- trip_members: visible to other members and to anyone viewing a public
-- trip. Insert allowed for the trip's creator (adding themself right after
-- creating the trip) or any existing member (adding a player).
create policy "trip_members readable" on public.trip_members
  for select to authenticated, anon using (public.can_read_trip(trip_id));
create policy "trip_members insert" on public.trip_members
  for insert to authenticated with check (
    public.is_trip_member(trip_id)
    or exists (select 1 from public.trips where id = trip_id and created_by = auth.uid())
  );
create policy "trip_members update by member" on public.trip_members
  for update to authenticated using (public.is_trip_member(trip_id));
create policy "trip_members delete by member" on public.trip_members
  for delete to authenticated using (public.is_trip_member(trip_id));

-- rounds and everything hung off a round: same "member of the trip" rule,
-- with public trips getting read-only access.
create policy "rounds readable" on public.rounds
  for select to authenticated, anon using (public.can_read_trip(trip_id));
create policy "rounds write by member" on public.rounds
  for all to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

create policy "round_players readable" on public.round_players
  for select to authenticated, anon using (public.can_read_trip(public.trip_id_for_round(round_id)));
create policy "round_players write by member" on public.round_players
  for all to authenticated
  using (public.is_trip_member(public.trip_id_for_round(round_id)))
  with check (public.is_trip_member(public.trip_id_for_round(round_id)));

create policy "round_ryder_pairs readable" on public.round_ryder_pairs
  for select to authenticated, anon using (public.can_read_trip(public.trip_id_for_round(round_id)));
create policy "round_ryder_pairs write by member" on public.round_ryder_pairs
  for all to authenticated
  using (public.is_trip_member(public.trip_id_for_round(round_id)))
  with check (public.is_trip_member(public.trip_id_for_round(round_id)));

create policy "scores readable" on public.scores
  for select to authenticated, anon using (public.can_read_trip(public.trip_id_for_round(round_id)));
create policy "scores write by member" on public.scores
  for all to authenticated
  using (public.is_trip_member(public.trip_id_for_round(round_id)))
  with check (public.is_trip_member(public.trip_id_for_round(round_id)));

create policy "round_comments readable" on public.round_comments
  for select to authenticated, anon using (public.can_read_trip(public.trip_id_for_round(round_id)));
create policy "round_comments insert by member" on public.round_comments
  for insert to authenticated with check (public.is_trip_member(public.trip_id_for_round(round_id)));
create policy "round_comments delete own" on public.round_comments
  for delete to authenticated using (author_id = auth.uid());

create policy "round_likes readable" on public.round_likes
  for select to authenticated, anon using (public.can_read_trip(public.trip_id_for_round(round_id)));
create policy "round_likes write own" on public.round_likes
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- feed
create policy "feed_posts readable" on public.feed_posts
  for select to authenticated, anon using (public.can_read_trip(trip_id));
create policy "feed_posts insert by member" on public.feed_posts
  for insert to authenticated with check (public.is_trip_member(trip_id));
create policy "feed_posts delete own" on public.feed_posts
  for delete to authenticated using (author_id = auth.uid());

create policy "feed_reactions readable" on public.feed_reactions
  for select to authenticated, anon using (public.can_read_trip(public.trip_id_for_post(post_id)));
create policy "feed_reactions write own" on public.feed_reactions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- money
create policy "expenses readable" on public.expenses
  for select to authenticated, anon using (public.can_read_trip(trip_id));
create policy "expenses write by member" on public.expenses
  for all to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

create policy "lodging readable" on public.lodging
  for select to authenticated, anon using (public.can_read_trip(trip_id));
create policy "lodging write by member" on public.lodging
  for all to authenticated
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));

-- course reviews: readable by everyone (they power Explore averages for
-- courses, independent of trip privacy); only the author can write/delete
-- their own, and only for a round they were actually in.
create policy "course_reviews readable by all" on public.course_reviews
  for select to authenticated, anon using (true);
create policy "course_reviews insert own" on public.course_reviews
  for insert to authenticated with check (
    author_id = auth.uid()
    and (round_id is null or public.is_trip_member(public.trip_id_for_round(round_id)))
  );
create policy "course_reviews update own" on public.course_reviews
  for update to authenticated using (author_id = auth.uid());
create policy "course_reviews delete own" on public.course_reviews
  for delete to authenticated using (author_id = auth.uid());
