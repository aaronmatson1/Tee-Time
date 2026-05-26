# Tee-Time scraper

Polls foreUP for available tee-times, matches them against active group search jobs + windows, writes matches to Postgres, and pings the backend to fan out notifications.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in
python -m src.main
```

## What it does

1. Every `HOT_POLL_SECONDS` (default 60s) reads active `search_jobs`.
2. For each job: pull nearby `courses` (PostGIS within radius), poll foreUP tee-sheet for next `lookahead_days`.
3. Match each tee-time against the group's merged windows (intersection of all members' day_of_week+time ranges) and party size.
4. Insert new rows into `tee_time_matches` (dedup by fingerprint).
5. POST `match_ids` to backend `/internal/notify-matches`.

## Modules

- `src/main.py` — APScheduler entry point
- `src/foreup_client.py` — foreUP HTTP client, throttled
- `src/db.py` — Supabase admin client + queries
- `src/matcher.py` — window merge + tee-time filter logic
- `src/notify.py` — POST to backend internal endpoint
- `src/config.py` — env loading

## Notes

See `../docs/foreup-notes.md` for endpoint shape and ToS considerations.
