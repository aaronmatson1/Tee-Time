-- Tee-Time v1 schema
-- Run in Supabase SQL editor. Assumes auth.users exists (Supabase Auth).

-- ───────────────────────────────────────────────────────────────────
-- Extensions
-- ───────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- for course lat/lng radius queries

-- ───────────────────────────────────────────────────────────────────
-- Profiles (1:1 with auth.users)
-- ───────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_lat double precision,
  home_lng double precision,
  created_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────
-- Groups
-- ───────────────────────────────────────────────────────────────────
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_invites (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index group_invites_token_idx on public.group_invites(token);

-- ───────────────────────────────────────────────────────────────────
-- Courses (global, read-only for users)
-- ───────────────────────────────────────────────────────────────────
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text,
  state text,
  country text not null default 'US',
  lat double precision not null,
  lng double precision not null,
  geog geography(point, 4326) generated always as
    (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  booking_platform text not null default 'foreup'
    check (booking_platform in ('foreup','golfnow','chronogolf','lightspeed','clubprophet','other')),
  foreup_course_id integer,
  foreup_schedule_id integer,
  foreup_booking_class integer,
  booking_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index courses_geog_idx on public.courses using gist (geog);
create index courses_platform_idx on public.courses(booking_platform) where active;

-- ───────────────────────────────────────────────────────────────────
-- Windows (per-member weekly availability)
-- ───────────────────────────────────────────────────────────────────
create table public.windows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,  -- null = personal default
  day_of_week smallint not null check (day_of_week between 0 and 6),  -- 0=Sun
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index windows_user_idx on public.windows(user_id);
create index windows_group_idx on public.windows(group_id);

-- ───────────────────────────────────────────────────────────────────
-- Search jobs (an active "find me tee times for this group")
-- ───────────────────────────────────────────────────────────────────
create table public.search_jobs (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  origin_lat double precision not null,
  origin_lng double precision not null,
  radius_miles integer not null default 25 check (radius_miles between 1 and 200),
  party_size smallint not null default 2 check (party_size between 1 and 6),
  holes smallint not null default 18 check (holes in (9, 18)),
  max_price_cents integer,
  lookahead_days smallint not null default 14 check (lookahead_days between 1 and 60),
  active boolean not null default true,
  last_polled_at timestamptz,
  created_at timestamptz not null default now()
);
create index search_jobs_active_idx on public.search_jobs(active, last_polled_at)
  where active;

-- ───────────────────────────────────────────────────────────────────
-- Matches
-- ───────────────────────────────────────────────────────────────────
create table public.tee_time_matches (
  id uuid primary key default uuid_generate_v4(),
  search_job_id uuid not null references public.search_jobs(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  tee_time_at timestamptz not null,
  available_spots smallint not null,
  holes smallint not null,
  total_price_cents integer,
  booking_deeplink text not null,
  fingerprint text not null,  -- hash of (course, time, spots) to dedup
  first_seen_at timestamptz not null default now(),
  notified_at timestamptz,
  is_active boolean not null default true,  -- false once tee time passes or fills
  unique (search_job_id, fingerprint)
);
create index matches_search_idx on public.tee_time_matches(search_job_id, is_active, tee_time_at);
create index matches_unnotified_idx on public.tee_time_matches(notified_at)
  where notified_at is null and is_active;

-- ───────────────────────────────────────────────────────────────────
-- Notification prefs + push subscriptions
-- ───────────────────────────────────────────────────────────────────
create table public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subs_user_idx on public.push_subscriptions(user_id);

-- ───────────────────────────────────────────────────────────────────
-- RLS
-- ───────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.windows enable row level security;
alter table public.search_jobs enable row level security;
alter table public.tee_time_matches enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: own row
create policy "profiles self read"   on public.profiles for select using (id = auth.uid());
create policy "profiles self upsert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid());

-- groups: members can read, owner can write
create policy "groups read by members" on public.groups for select
  using (exists (select 1 from public.group_members gm
                 where gm.group_id = id and gm.user_id = auth.uid()));
create policy "groups insert by owner" on public.groups for insert
  with check (owner_id = auth.uid());
create policy "groups update by owner" on public.groups for update
  using (owner_id = auth.uid());

-- group_members: members can read own rows
create policy "members read" on public.group_members for select
  using (user_id = auth.uid()
         or exists (select 1 from public.group_members gm
                    where gm.group_id = group_members.group_id and gm.user_id = auth.uid()));

-- windows: user owns
create policy "windows self all" on public.windows for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- search_jobs: any group member
create policy "search_jobs by group member" on public.search_jobs for all
  using (exists (select 1 from public.group_members gm
                 where gm.group_id = search_jobs.group_id and gm.user_id = auth.uid()))
  with check (exists (select 1 from public.group_members gm
                      where gm.group_id = search_jobs.group_id and gm.user_id = auth.uid()));

-- matches: any member of the owning group
create policy "matches read by group member" on public.tee_time_matches for select
  using (exists (
    select 1 from public.search_jobs sj
    join public.group_members gm on gm.group_id = sj.group_id
    where sj.id = tee_time_matches.search_job_id and gm.user_id = auth.uid()
  ));

-- notification_prefs + push_subscriptions: own row
create policy "notif self all" on public.notification_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push self all" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- courses are public read (no RLS policy = locked; allow public select explicitly)
create policy "courses public read" on public.courses for select using (true);
alter table public.courses enable row level security;

-- ───────────────────────────────────────────────────────────────────
-- Trigger: auto-create profile + add owner as group member
-- ───────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.notification_prefs (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_new_group()
returns trigger language plpgsql security definer as $$
begin
  insert into public.group_members (group_id, user_id, role)
    values (new.id, new.owner_id, 'owner') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();
