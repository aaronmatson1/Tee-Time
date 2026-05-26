from supabase import create_client, Client
from . import config

_client: Client | None = None


def db() -> Client:
    global _client
    if _client is None:
        _client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    return _client


def active_search_jobs() -> list[dict]:
    res = db().table("search_jobs").select("*").eq("active", True).execute()
    return res.data or []


def courses_within(lat: float, lng: float, radius_miles: int, platform: str = "foreup") -> list[dict]:
    """Naive bbox filter — replace with PostGIS RPC once `courses_within` SQL function is created."""
    d_lat = radius_miles / 69.0
    import math
    d_lng = radius_miles / (69.0 * max(math.cos(math.radians(lat)), 0.01))
    res = (
        db().table("courses")
        .select("*")
        .eq("active", True)
        .eq("booking_platform", platform)
        .gte("lat", lat - d_lat).lte("lat", lat + d_lat)
        .gte("lng", lng - d_lng).lte("lng", lng + d_lng)
        .execute()
    )
    return res.data or []


def group_windows(group_id: str) -> list[dict]:
    res = db().table("windows").select("*").or_(f"group_id.eq.{group_id},group_id.is.null").execute()
    return res.data or []


def group_member_ids(group_id: str) -> list[str]:
    res = db().table("group_members").select("user_id").eq("group_id", group_id).execute()
    return [r["user_id"] for r in (res.data or [])]


def insert_matches(rows: list[dict]) -> list[str]:
    """Upsert by (search_job_id, fingerprint). Returns ids of newly inserted matches."""
    if not rows:
        return []
    res = (
        db().table("tee_time_matches")
        .upsert(rows, on_conflict="search_job_id,fingerprint", ignore_duplicates=True)
        .execute()
    )
    return [r["id"] for r in (res.data or [])]


def mark_polled(search_job_id: str) -> None:
    from datetime import datetime, timezone
    db().table("search_jobs").update(
        {"last_polled_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", search_job_id).execute()
