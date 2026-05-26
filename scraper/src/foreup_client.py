"""Minimal foreUP tee-sheet client. HTTP-only, no browser.

Endpoint shape (best-effort, may change):
  GET https://foreupsoftware.com/index.php/api/booking/times
    ?time=all&date=MM-DD-YYYY&holes=18&players=0
    &booking_class=<id>&schedule_id=<id>&api_key=no_limits

See ../docs/foreup-notes.md.
"""

from __future__ import annotations
import asyncio
import time
from datetime import date
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from . import config

BASE = "https://foreupsoftware.com/index.php/api/booking/times"
UA = "TeeTimeBot/0.1 (+https://github.com/aaronmatson1/Tee-Time; throttled)"


class _TokenBucket:
    def __init__(self, rps: float):
        self.interval = 1.0 / rps
        self._last = 0.0
        self._lock = asyncio.Lock()

    async def take(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait = self.interval - (now - self._last)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()


_bucket = _TokenBucket(config.FOREUP_RPS)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def fetch_tee_times(
    *, foreup_schedule_id: int, foreup_booking_class: int, on_date: date, holes: int = 18
) -> list[dict[str, Any]]:
    await _bucket.take()
    params = {
        "time": "all",
        "date": on_date.strftime("%m-%d-%Y"),
        "holes": str(holes),
        "players": "0",
        "booking_class": str(foreup_booking_class),
        "schedule_id": str(foreup_schedule_id),
        "api_key": "no_limits",
    }
    async with httpx.AsyncClient(timeout=15.0, headers={"User-Agent": UA}) as client:
        r = await client.get(BASE, params=params)
        r.raise_for_status()
        try:
            data = r.json()
        except Exception:
            return []
        return data if isinstance(data, list) else []


def deeplink(course: dict, on_date: date) -> str:
    cid = course.get("foreup_course_id")
    sid = course.get("foreup_schedule_id")
    base = course.get("booking_url") or "https://foreupsoftware.com/index.php/booking/"
    if cid and sid:
        return f"{base.rstrip('/')}/{cid}/{sid}#/teetimes?date={on_date.strftime('%m-%d-%Y')}"
    return base
