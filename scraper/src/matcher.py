"""Window merging + tee-time filter."""
from __future__ import annotations
from datetime import datetime, time, timedelta
from collections import defaultdict


def _t(s: str) -> time:
    parts = [int(p) for p in s.split(":")]
    return time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)


def _intersect(a: list[tuple[time, time]], b: list[tuple[time, time]]) -> list[tuple[time, time]]:
    out: list[tuple[time, time]] = []
    for s1, e1 in a:
        for s2, e2 in b:
            s, e = max(s1, s2), min(e1, e2)
            if s < e:
                out.append((s, e))
    return out


def merge_windows(member_windows: dict[str, list[dict]]) -> dict[int, list[tuple[time, time]]]:
    """Given {user_id: [window rows]}, return {day_of_week: [(start, end), ...]}
    representing the intersection across all members."""
    if not member_windows:
        return {}

    per_user_per_day: dict[str, dict[int, list[tuple[time, time]]]] = {}
    for uid, rows in member_windows.items():
        by_day: dict[int, list[tuple[time, time]]] = defaultdict(list)
        for w in rows:
            by_day[w["day_of_week"]].append((_t(w["start_time"]), _t(w["end_time"])))
        per_user_per_day[uid] = by_day

    days = set.intersection(*(set(d.keys()) for d in per_user_per_day.values()))
    out: dict[int, list[tuple[time, time]]] = {}
    for day in days:
        acc: list[tuple[time, time]] | None = None
        for uid in per_user_per_day:
            ranges = per_user_per_day[uid][day]
            acc = ranges if acc is None else _intersect(acc, ranges)
            if not acc:
                break
        if acc:
            out[day] = acc
    return out


def tee_time_matches_windows(tee_dt: datetime, merged: dict[int, list[tuple[time, time]]]) -> bool:
    # Python weekday: Mon=0..Sun=6. DB: Sun=0..Sat=6.
    dow = (tee_dt.weekday() + 1) % 7
    ranges = merged.get(dow, [])
    t = tee_dt.time()
    return any(s <= t <= e for s, e in ranges)


def make_fingerprint(course_id: str, tee_dt: datetime, spots: int) -> str:
    return f"{course_id}|{tee_dt.isoformat()}|{spots}"


def dates_for_lookahead(today: datetime, lookahead_days: int):
    for i in range(lookahead_days):
        yield (today + timedelta(days=i)).date()
