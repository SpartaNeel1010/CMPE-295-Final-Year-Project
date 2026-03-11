import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.environ["DATABASE_URL"]
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change_me")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
PORT: int = int(os.environ.get("PORT", 4000))
CLIENT_ORIGIN: str = os.environ.get("CLIENT_ORIGIN", "http://localhost:3000")
