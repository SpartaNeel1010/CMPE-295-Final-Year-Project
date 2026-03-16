"""
Seed script — run once from the backend/ directory:
    python seed.py

Creates 5 dummy users and a spread of sessions across the current and next month
so the schedule page shows realistic slot availability.
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from datetime import date, timedelta
from app.database import execute

# ── Helpers ───────────────────────────────────────────────────────────────────

today = date.today()

def d(offset: int) -> str:
    """Return YYYY-MM-DD for today + offset days."""
    return (today + timedelta(days=offset)).isoformat()


# ── Dummy users ───────────────────────────────────────────────────────────────

USERS = [
    ("user_dummy_001", "Alice Chen",   "alice.chen@example.com",   "Software Engineer"),
    ("user_dummy_002", "Bob Kumar",    "bob.kumar@example.com",    "Backend Developer"),
    ("user_dummy_003", "Carol Zhang",  "carol.zhang@example.com",  "Frontend Developer"),
    ("user_dummy_004", "David Park",   "david.park@example.com",   "Full Stack Engineer"),
    ("user_dummy_005", "Emma Wilson",  "emma.wilson@example.com",  "ML Engineer"),
]

print("Inserting dummy users…")
for uid, name, email, role in USERS:
    execute(
        """INSERT INTO users (id, name, email, role)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (id) DO NOTHING""",
        (uid, name, email, role),
    )
print(f"  {len(USERS)} users ready.")


# ── Clear existing dummy sessions ─────────────────────────────────────────────

print("Clearing old dummy sessions…")
dummy_ids = [u[0] for u in USERS]
placeholders = ",".join(["%s"] * len(dummy_ids))
execute(
    f"""DELETE FROM sessions
        WHERE host_user_id IN ({placeholders})
           OR guest_user_id IN ({placeholders})""",
    tuple(dummy_ids * 2),
)
print("  Done.")


# ── Session seed data ─────────────────────────────────────────────────────────
# Layout:
#   matched  → host + guest set, status='matched'  (slot FULL, shows unavailable)
#   pending  → host only,        status='pending'  (slot still joinable)
#
# Dates: today+1 … today+46 (current + next month window)
# DSA slots    (every 2h):   9:00 AM 11:00 AM 1:00 PM 3:00 PM 5:00 PM 7:00 PM 9:00 PM
# Behavioral   (every 90m):  9:00 AM 10:30 AM 12:00 PM 1:30 PM 3:00 PM 4:30 PM 6:00 PM 7:30 PM 9:00 PM

MATCHED_SESSIONS = [
    # (date_offset, track,        difficulty,      time,       host,          guest)
    # ── DSA ──
    (2,  "dsa",        "beginner",      "9:00 AM",  "user_dummy_001", "user_dummy_002"),
    (2,  "dsa",        "intermediate",  "11:00 AM", "user_dummy_003", "user_dummy_004"),
    (4,  "dsa",        "beginner",      "3:00 PM",  "user_dummy_002", "user_dummy_005"),
    (6,  "dsa",        "advanced",      "9:00 AM",  "user_dummy_001", "user_dummy_003"),
    (9,  "dsa",        "intermediate",  "1:00 PM",  "user_dummy_004", "user_dummy_005"),
    (12, "dsa",        "beginner",      "5:00 PM",  "user_dummy_002", "user_dummy_003"),
    (16, "dsa",        "intermediate",  "11:00 AM", "user_dummy_001", "user_dummy_004"),
    (20, "dsa",        "advanced",      "3:00 PM",  "user_dummy_003", "user_dummy_005"),
    (25, "dsa",        "beginner",      "7:00 PM",  "user_dummy_001", "user_dummy_002"),
    (30, "dsa",        "intermediate",  "9:00 AM",  "user_dummy_004", "user_dummy_003"),
    (35, "dsa",        "beginner",      "1:00 PM",  "user_dummy_002", "user_dummy_005"),
    # ── Behavioral ──
    (3,  "behavioral", "beginner",      "9:00 AM",  "user_dummy_001", "user_dummy_004"),
    (3,  "behavioral", "intermediate",  "10:30 AM", "user_dummy_002", "user_dummy_003"),
    (5,  "behavioral", "beginner",      "3:00 PM",  "user_dummy_004", "user_dummy_005"),
    (7,  "behavioral", "advanced",      "12:00 PM", "user_dummy_001", "user_dummy_005"),
    (11, "behavioral", "intermediate",  "4:30 PM",  "user_dummy_002", "user_dummy_004"),
    (15, "behavioral", "beginner",      "9:00 AM",  "user_dummy_001", "user_dummy_002"),
    (18, "behavioral", "intermediate",  "1:30 PM",  "user_dummy_003", "user_dummy_005"),
    (22, "behavioral", "advanced",      "6:00 PM",  "user_dummy_002", "user_dummy_004"),
    (28, "behavioral", "beginner",      "10:30 AM", "user_dummy_003", "user_dummy_001"),
    (33, "behavioral", "intermediate",  "3:00 PM",  "user_dummy_005", "user_dummy_002"),
    (40, "behavioral", "advanced",      "7:30 PM",  "user_dummy_001", "user_dummy_003"),
]

PENDING_SESSIONS = [
    # (date_offset, track,        difficulty,      time,       host)
    # ── DSA ──
    (1,  "dsa",        "beginner",      "11:00 AM", "user_dummy_005"),
    (4,  "dsa",        "intermediate",  "5:00 PM",  "user_dummy_001"),
    (8,  "dsa",        "beginner",      "7:00 PM",  "user_dummy_003"),
    (14, "dsa",        "advanced",      "9:00 AM",  "user_dummy_004"),
    (19, "dsa",        "intermediate",  "3:00 PM",  "user_dummy_002"),
    (27, "dsa",        "beginner",      "1:00 PM",  "user_dummy_005"),
    # ── Behavioral ──
    (2,  "behavioral", "intermediate",  "12:00 PM", "user_dummy_004"),
    (6,  "behavioral", "beginner",      "4:30 PM",  "user_dummy_003"),
    (10, "behavioral", "advanced",      "7:30 PM",  "user_dummy_002"),
    (17, "behavioral", "intermediate",  "9:00 AM",  "user_dummy_005"),
    (23, "behavioral", "beginner",      "1:30 PM",  "user_dummy_001"),
    (38, "behavioral", "advanced",      "6:00 PM",  "user_dummy_004"),
]

print("Inserting matched sessions…")
for offset, track, difficulty, time, host, guest in MATCHED_SESSIONS:
    execute(
        """INSERT INTO sessions
             (host_user_id, guest_user_id, track, mode, difficulty,
              scheduled_date, scheduled_time, status)
           VALUES (%s, %s, %s, 'peer', %s, %s, %s, 'matched')""",
        (host, guest, track, difficulty, d(offset), time),
    )
print(f"  {len(MATCHED_SESSIONS)} matched sessions inserted.")

print("Inserting pending sessions…")
for offset, track, difficulty, time, host in PENDING_SESSIONS:
    execute(
        """INSERT INTO sessions
             (host_user_id, track, mode, difficulty,
              scheduled_date, scheduled_time, status)
           VALUES (%s, %s, 'peer', %s, %s, %s, 'pending')""",
        (host, track, difficulty, d(offset), time),
    )
print(f"  {len(PENDING_SESSIONS)} pending sessions inserted.")

print("\nSeed complete.")
print(f"  {len(MATCHED_SESSIONS)} matched slots (unavailable to new users)")
print(f"  {len(PENDING_SESSIONS)} pending slots (1 spot still open)")
