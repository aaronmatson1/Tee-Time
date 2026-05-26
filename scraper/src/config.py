import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:3001")
WORKER_SECRET = os.environ.get("WORKER_SECRET", "change-me")

HOT_POLL_SECONDS = int(os.environ.get("HOT_POLL_SECONDS", "60"))
COLD_POLL_SECONDS = int(os.environ.get("COLD_POLL_SECONDS", "300"))
FOREUP_RPS = float(os.environ.get("FOREUP_RPS", "1.0"))
