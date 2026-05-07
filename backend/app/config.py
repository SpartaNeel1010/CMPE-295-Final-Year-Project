import os
from dotenv import load_dotenv

# Try to load from the Cloud Run secret mount first
if os.path.exists("/secrets/.env"):
    load_dotenv("/secrets/.env")
# Fallback to local secrets/.env if it exists
elif os.path.exists("secrets/.env"):
    load_dotenv("secrets/.env")
# Fallback to standard local .env
else:
    load_dotenv()


DATABASE_URL: str = os.environ["DATABASE_URL"]
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change_me")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
PORT: int = int(os.environ.get("PORT", 4000))
CLIENT_ORIGIN: str = os.environ.get("CLIENT_ORIGIN", "https://10.0.0.226:3000")

# ── Email (SMTP) ───────────────────────────────────────────────────────────────
SMTP_HOST: str     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER: str     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM: str     = os.environ.get("SMTP_FROM", "")

# ── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_URI: str = os.environ.get("MONGO_URI", "mongodb://localhost:27017")

# ── LiveKit ───────────────────────────────────────────────────────────────────
LIVEKIT_URL:        str = os.environ.get("LIVEKIT_URL", "")
LIVEKIT_API_KEY:    str = os.environ.get("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET: str = os.environ.get("LIVEKIT_API_SECRET", "")

# ── Anthropic / Claude ────────────────────────────────────────────────────────
OPENAI_API_KEY:     str = os.environ.get("OPENAI_API_KEY", "")
