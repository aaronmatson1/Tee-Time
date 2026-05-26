import httpx
from . import config


async def notify_backend(match_ids: list[str]) -> None:
    if not match_ids:
        return
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.post(
                f"{config.BACKEND_URL}/internal/notify-matches",
                headers={"X-Worker-Secret": config.WORKER_SECRET},
                json={"match_ids": match_ids},
            )
            r.raise_for_status()
        except Exception as e:
            print(f"[notify] backend call failed: {e}")
