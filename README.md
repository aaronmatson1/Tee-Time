# Tee-Time

Smart tee-time finder. Set your group's available windows, get notified when a matching tee-time opens up.

## Why

Booking sites show every tee-time. We show only the ones that fit your group's actual availability — and ping you the moment a cancellation hits a window.

## v1 scope

- Smart windows per group member (day-of-week + time ranges)
- Invite-based groups (buddies join, windows merge)
- Cancellation / availability alerts (email + web push)
- Deep-link to course's native booking flow (no autobook yet)
- Target booking platform: **foreUP** (covers most US public / semi-private courses)

Out of scope v1: autobook, international platforms (BRS / Club Systems), native mobile, payments.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite + TS, PWA, Supabase JS |
| Backend | Node + Express + TS, Supabase admin |
| DB + Auth | Supabase (Postgres + magic-link / Google OAuth) |
| Workers | Python (httpx + APScheduler) polling foreUP |
| Email | Resend |
| Web push | VAPID + service worker |

## Repo layout

```
frontend/    React PWA
backend/     Express API
scraper/     Python foreUP poller
db/          SQL migrations
docs/        Architecture, scraper notes
```

## Getting started

1. Create Supabase project, copy URL + anon + service keys.
2. Run `db/migrations/001_init.sql` in Supabase SQL editor.
3. `cd backend && npm install && cp .env.example .env && npm run dev`
4. `cd frontend && npm install && cp .env.example .env && npm run dev`
5. `cd scraper && pip install -r requirements.txt && cp .env.example .env && python -m src.main`

## Docs

- [docs/architecture.md](docs/architecture.md) — system design
- [docs/foreup-notes.md](docs/foreup-notes.md) — foreUP endpoint reverse-engineering notes
