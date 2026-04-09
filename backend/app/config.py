import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change_me")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
PORT: int = int(os.environ.get("PORT", 4000))
CLIENT_ORIGIN: str = os.environ.get("CLIENT_ORIGIN", "http://localhost:3000")

# ── Email (SMTP) ───────────────────────────────────────────────────────────────
SMTP_HOST: str     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT: int     = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER: str     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD: str = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM: str     = os.environ.get("SMTP_FROM", "")

# ── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_URI: str = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
