"""Tee-Time scraper entry point.

Loop:
  1. Pull active search_jobs.
  2. For each: find nearby foreUP courses, fetch tee-times for lookahead_days.
  3. Merge group windows, filter, dedup, insert matches.
  4. Notify backend of new matches.
"""
from __future__ import annotations
import asyncio
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from . import config, db
from .foreup_client import fetch_tee_times, deeplink
from .matcher import merge_windows, tee_time_matches_windows, make_fingerprint, dates_for_lookahead
from .notify import notify_backend


def _parse_tee_dt(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s.replace(" ", "T"))
    except Exception:
        return None


async def process_job(job: dict) -> None:
    courses = db.courses_within(job["origin_lat"], job["origin_lng"], job["radius_miles"])
    courses = [c for c in courses if c.get("foreup_schedule_id") and c.get("foreup_booking_class")]
    if not courses:
        db.mark_polled(job["id"])
        return

    member_ids = db.group_member_ids(job["group_id"])
    per_user: dict[str, list[dict]] = {}
    for uid in member_ids:
        # NOTE: scraper currently fetches all windows for the group; tighten to user-scoped query when ready.
        per_user[uid] = [w for w in db.group_windows(job["group_id"]) if w["user_id"] == uid]
    merged = merge_windows(per_user)
    if not merged:
        db.mark_polled(job["id"])
        return

    new_rows: list[dict] = []
    today = datetime.now(timezone.utc)
    for course in courses:
        for d in dates_for_lookahead(today, job["lookahead_days"]):
            try:
                tee_times = await fetch_tee_times(
                    foreup_schedule_id=course["foreup_schedule_id"],
                    foreup_booking_class=course["foreup_booking_class"],
                    on_date=d,
                    holes=job["holes"],
                )
            except Exception as e:
                print(f"[scrape] {course['name']} {d}: {e}")
                continue

            for tt in tee_times:
                tee_dt = _parse_tee_dt(tt.get("time", ""))
                if not tee_dt:
                    continue
                spots = int(tt.get("available_spots", 0))
                if spots < job["party_size"]:
                    continue
                if not tee_time_matches_windows(tee_dt, merged):
                    continue

                price_cents = None
                if isinstance(tt.get("green_fee"), (int, float)):
                    price_cents = int(round(tt["green_fee"] * 100))
                if job.get("max_price_cents") and price_cents and price_cents > job["max_price_cents"]:
                    continue

                new_rows.append({
                    "search_job_id": job["id"],
                    "course_id": course["id"],
                    "tee_time_at": tee_dt.isoformat(),
                    "available_spots": spots,
                    "holes": int(tt.get("holes", job["holes"])),
                    "total_price_cents": price_cents,
                    "booking_deeplink": deeplink(course, d),
                    "fingerprint": make_fingerprint(course["id"], tee_dt, spots),
                })

    inserted_ids = db.insert_matches(new_rows)
    db.mark_polled(job["id"])
    if inserted_ids:
        await notify_backend(inserted_ids)
        print(f"[scrape] job {job['id']}: {len(inserted_ids)} new matches")


async def tick() -> None:
    jobs = db.active_search_jobs()
    print(f"[tick] {len(jobs)} active job(s)")
    for j in jobs:
        try:
            await process_job(j)
        except Exception as e:
            print(f"[tick] job {j['id']} failed: {e}")


async def amain() -> None:
    sched = AsyncIOScheduler()
    sched.add_job(tick, "interval", seconds=config.HOT_POLL_SECONDS, next_run_time=datetime.now())
    sched.start()
    print(f"[scraper] polling every {config.HOT_POLL_SECONDS}s")
    try:
        await asyncio.Event().wait()
    finally:
        sched.shutdown()


if __name__ == "__main__":
    asyncio.run(amain())
