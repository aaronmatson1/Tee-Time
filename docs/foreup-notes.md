# foreUP notes

Reverse-engineering notes for foreUP booking system. **For research/learning. Confirm ToS + add throttling before production traffic.**

## Booking URL shape

Courses live at: `https://foreupsoftware.com/index.php/booking/<course_id>/<schedule_id>#/teetimes`

Each course has:
- `course_id` (int) — top-level org
- `schedule_id` (int) — specific schedule under that course (e.g. 18-hole vs 9-hole)
- `booking_class` (int) — public vs member tier

You discover these by visiting the course's booking page and inspecting the network tab.

## Tee-sheet endpoint

```
GET https://foreupsoftware.com/index.php/api/booking/times
  ?time=all
  &date=MM-DD-YYYY
  &holes=18
  &players=0
  &booking_class=<id>
  &schedule_id=<id>
  &api_key=no_limits
```

Response: JSON array of tee time objects.

Each object roughly:
```json
{
  "time": "2026-05-26 06:30",
  "available_spots": 4,
  "holes": 18,
  "green_fee": 45.00,
  "cart_fee": 18.00,
  "schedule_id": 1234,
  "course_name": "...",
  "teesheet_id": ...
}
```

## Polling strategy

- Cache static metadata (`course_id`, `schedule_id`, `booking_class`) per course in `courses` table.
- Poll active courses (any covered by an active `search_job`) for next 14 days.
- Backoff: 60s for "hot" search_jobs (created < 24h ago), 5min otherwise.
- Respect ~1 req/sec per origin host. Use a global token bucket.

## Risks / TBD

- **ToS** — foreUP terms may prohibit automated polling. Confirm before public launch. Likely path: throttle aggressively, identify ourselves via User-Agent, offer opt-out to courses.
- **Anti-bot** — if foreUP starts blocking, fall back to headless Playwright with realistic browser fingerprint.
- **Course discovery** — initial seed list (Utah courses) by hand. Long term: scrape foreUP's course directory or crowdsource from users.

## Deep-link to book

```
https://foreupsoftware.com/index.php/booking/<course_id>/<schedule_id>#/teetimes?date=MM-DD-YYYY&time=HHMM
```

User clicks → lands on foreUP's booking page pre-filtered. They finish booking on foreUP (auth + payment stays with the course).

## Autobook (v2 only — not v1)

If pursued: store user's foreUP credentials encrypted (KMS), use Playwright session to log in + click through booking. Legal review required.
