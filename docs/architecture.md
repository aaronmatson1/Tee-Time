# Architecture

## High-level

```
        ┌──────────────┐
        │  React PWA   │  (Vite, Supabase JS)
        │   frontend   │
        └──────┬───────┘
               │ HTTPS
               ▼
        ┌──────────────┐         ┌──────────────┐
        │ Express API  │◀───────▶│   Supabase   │
        │   backend    │  SQL +  │  Postgres    │
        └──────┬───────┘  Auth   │  + Auth      │
               │                 └──────┬───────┘
               │ enqueue / read         │
               ▼                        │
        ┌──────────────┐                │
        │ Python worker│◀───────────────┘
        │   scraper    │   read jobs, write matches
        └──────┬───────┘
               │ HTTPS
               ▼
        ┌──────────────┐
        │   foreUP     │
        │ booking API  │
        └──────────────┘
```

## Components

### frontend (React + Vite + PWA)
- Auth via Supabase JS (magic-link + Google).
- Manages: user profile, group create/join/invite, windows editor, matches feed.
- PWA shell + service worker for web push subscriptions.
- Calls backend for protected operations (invites, course search, push subscription persist).

### backend (Node + Express + TS)
- Validates Supabase JWT on each request.
- Routes:
  - `POST /groups` — create
  - `POST /groups/:id/invite` — email invite (token in DB)
  - `POST /invites/:token/accept`
  - `GET/POST /windows`
  - `GET/POST /searches` (search_jobs)
  - `GET /matches?since=...`
  - `GET /courses?lat=&lng=&radius=`
  - `POST /push/subscribe`
- Sends invite + match emails via Resend.
- Triggers VAPID web push.
- Does NOT scrape — that's the worker.

### scraper (Python)
- Reads active `search_jobs` from Postgres.
- For each job: find courses inside radius, poll foreUP tee-sheet for next N days.
- Match tee times against group's merged windows (intersection of all members' day-of-week + time ranges, and player count fits).
- Insert new rows in `tee_time_matches`. Backend or worker triggers notification on insert.
- Schedule: every 60s for "hot" jobs (recently created), every 5min otherwise. APScheduler.

### DB (Postgres via Supabase)
- See `db/migrations/001_init.sql`.
- Row-level security on user-scoped tables (group_members, windows, etc.).
- `courses` is global (no RLS, read-only for users).

## Group window merge logic

Given N members each with weekly recurring windows:

```
merged_window(day, group) =
  ⋂  member.windows.where(day_of_week = day)
   for member in group_members
```

A tee time at `course, start_at, players` is a match iff:
1. `course.lat/lng` within `search_job.radius_miles` of group's centroid (or chosen origin).
2. `start_at.weekday()` has at least one merged window.
3. `start_at.time()` falls inside that merged window (with configurable buffer for travel).
4. Tee time's available player slots ≥ group size.

## Notification flow

1. Scraper inserts `tee_time_matches` row.
2. Postgres trigger or scraper RPC calls backend `/internal/notify`.
3. Backend looks up group members' `notification_prefs`.
4. For each member: send email (Resend) + web push (VAPID) per their prefs.
5. Mark `notified_at` on match.

## Future (v2+)

- One-click autobook (foreUP form fill — encrypted user creds in vault).
- More platforms: Chronogolf, Lightspeed, GolfNow, Club Prophet.
- International: BRS Golf (UK / IE), Club Systems (Scotland).
- Group calendar sync (only suggest times when everyone's Google Cal is free).
- Premium tier: SMS alerts, < 30s polling, priority autobook.
