from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.database import execute
from app.security import verify_clerk_token, get_or_create_user
from app.config import CLIENT_ORIGIN, LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
from app.email_utils import send_friend_invite_email
from app.mongo import questions_col
import random as _random

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
bearer_scheme          = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)

# DSA: 2-hour blocks, 9 AM–9 PM
DSA_SLOTS = [
    "2:30 AM","9:00 AM", "11:15 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM",
]

# Behavioral: 90-minute blocks, 9 AM–9 PM
BEHAVIORAL_SLOTS = [
    "9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM",
    "3:00 PM", "4:30 PM", "6:00 PM", "7:30 PM", "9:00 PM",
]

def _parse_session_dt(scheduled_date, scheduled_time_str: str) -> datetime:
    """Combine a date (object or 'YYYY-MM-DD' str) with a '9:00 AM' time string."""
    if isinstance(scheduled_date, str):
        d = datetime.strptime(scheduled_date, "%Y-%m-%d").date()
    else:
        d = scheduled_date
    t = datetime.strptime(scheduled_time_str.strip(), "%I:%M %p").time()
    return datetime.combine(d, t)


SLOTS_BY_TRACK: dict[str, list[str]] = {
    "dsa": DSA_SLOTS,
    "behavioral": BEHAVIORAL_SLOTS,
}


def _slot_period(slot: str) -> str:
    time_part, am_pm = slot.rsplit(" ", 1)
    hour = int(time_part.split(":")[0])
    if am_pm == "AM":
        return "morning"
    if hour == 12 or hour < 6:
        return "afternoon"
    return "evening"


# ── Request models ─────────────────────────────────────────────────────────────

class PeerSessionRequest(BaseModel):
    track: str
    difficulty: str
    date: str
    time: str


class FriendSessionRequest(BaseModel):
    track: str
    email: str
    message: str | None = None


class RescheduleRequest(BaseModel):
    date: str
    time: str


class SaveCodeRequest(BaseModel):
    round: int   # 1 or 2
    code: str
    lang: str


# ── Peer endpoints ─────────────────────────────────────────────────────────────

@router.post("/peer", status_code=201)
async def create_peer_session(
    body: PeerSessionRequest,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    if body.track not in ("dsa", "behavioral"):
        raise HTTPException(status_code=400, detail="Invalid track")
    if body.difficulty not in ("beginner", "intermediate", "advanced"):
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    conflict = execute(
        """SELECT id FROM sessions
           WHERE (host_user_id = %s OR guest_user_id = %s)
             AND scheduled_date = %s AND scheduled_time = %s
             AND status NOT IN ('cancelled')""",
        (user_id, user_id, body.date, body.time),
        fetch="one",
    )
    if conflict:
        raise HTTPException(status_code=409, detail="You already have a session at this time")

    match = execute(
        """SELECT id FROM sessions
           WHERE host_user_id != %s
             AND guest_user_id IS NULL
             AND track = %s AND difficulty = %s
             AND scheduled_date = %s AND scheduled_time = %s
             AND mode = 'peer' AND status = 'pending'
           LIMIT 1""",
        (user_id, body.track, body.difficulty, body.date, body.time),
        fetch="one",
    )

    if match:
        session = execute(
            """UPDATE sessions
               SET guest_user_id = %s, status = 'matched'
               WHERE id = %s
               RETURNING *""",
            (user_id, match["id"]),
            fetch="one",
        )
        return {"session": dict(session), "status": "matched"}
    else:
        session = execute(
            """INSERT INTO sessions
                 (host_user_id, track, mode, difficulty, scheduled_date, scheduled_time)
               VALUES (%s, %s, 'peer', %s, %s, %s)
               RETURNING *""",
            (user_id, body.track, body.difficulty, body.date, body.time),
            fetch="one",
        )
        return {"session": dict(session), "status": "pending"}


@router.get("/available-slots")
async def get_available_slots(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
    date: str = Query(...),
    track: str = Query(...),
    difficulty: str = Query(None),
):
    if track not in SLOTS_BY_TRACK:
        raise HTTPException(status_code=400, detail="Invalid track")

    user_id: Optional[str] = None
    if credentials:
        try:
            payload = await verify_clerk_token(request)
            user_id = payload.get("sub")
        except Exception:
            pass

    user_booked: set[str] = set()
    if user_id:
        user_booked_rows = execute(
            """SELECT scheduled_time FROM sessions
               WHERE (host_user_id = %s OR guest_user_id = %s)
                 AND scheduled_date = %s
                 AND status NOT IN ('cancelled')""",
            (user_id, user_id, date),
            fetch="all",
        )
        user_booked = {r["scheduled_time"] for r in (user_booked_rows or [])}

    if difficulty:
        full_rows = execute(
            """SELECT scheduled_time FROM sessions
               WHERE scheduled_date = %s AND track = %s AND difficulty = %s
                 AND status IN ('matched', 'active', 'completed')""",
            (date, track, difficulty),
            fetch="all",
        )
    else:
        full_rows = execute(
            """SELECT scheduled_time FROM sessions
               WHERE scheduled_date = %s AND track = %s
                 AND status IN ('matched', 'active', 'completed')""",
            (date, track),
            fetch="all",
        )
    fully_booked = {r["scheduled_time"] for r in (full_rows or [])}

    unavailable = user_booked | fully_booked

    return [
        {
            "label": slot,
            "period": _slot_period(slot),
            "available": slot not in unavailable,
        }
        for slot in SLOTS_BY_TRACK[track]
    ]


# ── Friend / invite endpoints ──────────────────────────────────────────────────

@router.post("/friend", status_code=201)
async def create_friend_session(
    body: FriendSessionRequest,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    if body.track not in ("dsa", "behavioral"):
        raise HTTPException(status_code=400, detail="Invalid track")

    session = execute(
        """INSERT INTO sessions
             (host_user_id, track, mode, scheduled_date, scheduled_time, status)
           VALUES (%s, %s, 'friend', CURRENT_DATE, '12:00 PM', 'pending')
           RETURNING *""",
        (user_id, body.track),
        fetch="one",
    )

    invite = execute(
        """INSERT INTO friend_invites
             (session_id, inviter_user_id, invitee_email, message)
           VALUES (%s, %s, %s, %s)
           RETURNING invite_code""",
        (session["id"], user_id, body.email, body.message),
        fetch="one",
    )

    invite_code = str(invite["invite_code"])
    session_link = str(session["session_link"])
    invite_link = f"{CLIENT_ORIGIN}/lobby/{session_link}"

    # Send invite email (non-blocking; failures are logged, not raised)
    inviter = execute("SELECT name FROM users WHERE id = %s", (user_id,), fetch="one")
    inviter_name = inviter["name"] if inviter else "Your friend"
    send_friend_invite_email(
        to_email=body.email,
        inviter_name=inviter_name,
        track=body.track,
        lobby_link=invite_link,
        message=body.message,
    )

    return {
        "session_id": session["id"],
        "session_link": session_link,
        "invite_code": invite_code,
        "invite_link": invite_link,
    }


@router.get("/invite/{invite_code}")
async def get_invite(invite_code: str):
    invite = execute(
        """SELECT fi.*, s.track, s.mode, s.scheduled_date, s.scheduled_time, s.status,
                  u.name AS inviter_name, u.email AS inviter_email
           FROM friend_invites fi
           JOIN sessions s ON fi.session_id = s.id
           JOIN users u ON fi.inviter_user_id = u.id
           WHERE fi.invite_code = %s""",
        (invite_code,),
        fetch="one",
    )

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["status"] == "accepted":
        raise HTTPException(status_code=410, detail="Invite already accepted")
    if invite["expires_at"] < datetime.now():
        raise HTTPException(status_code=410, detail="Invite has expired")

    return dict(invite)


@router.post("/invite/{invite_code}/accept", status_code=200)
async def accept_invite(
    invite_code: str,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    invite = execute(
        "SELECT * FROM friend_invites WHERE invite_code = %s",
        (invite_code,),
        fetch="one",
    )

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite["status"] != "pending":
        raise HTTPException(status_code=410, detail="Invite no longer valid")
    if invite["expires_at"] < datetime.now():
        raise HTTPException(status_code=410, detail="Invite has expired")

    execute(
        "UPDATE sessions SET guest_user_id = %s, status = 'matched' WHERE id = %s",
        (user_id, invite["session_id"]),
    )
    execute(
        "UPDATE friend_invites SET status = 'accepted' WHERE id = %s",
        (invite["id"],),
    )

    return {"message": "Invite accepted", "session_id": invite["session_id"]}


# ── Lobby endpoints ────────────────────────────────────────────────────────────

@router.post("/link/{session_link}/join-lobby", status_code=200)
async def join_lobby(
    session_link: str,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        """SELECT * FROM sessions
           WHERE session_link = %s AND (host_user_id = %s OR guest_user_id = %s)""",
        (session_link, user_id, user_id),
        fetch="one",
    )

    if not session:
        # User is not a participant yet — check for a pending invite to auto-accept
        session_base = execute(
            "SELECT * FROM sessions WHERE session_link = %s",
            (session_link,),
            fetch="one",
        )
        if not session_base:
            raise HTTPException(status_code=404, detail="Session not found")

        invite = execute(
            """SELECT * FROM friend_invites
               WHERE session_id = %s AND status = 'pending'
               LIMIT 1""",
            (session_base["id"],),
            fetch="one",
        )
        if not invite or invite["expires_at"] < datetime.now():
            raise HTTPException(status_code=404, detail="Session not found")

        # Auto-accept the invite and add user as guest
        execute(
            "UPDATE sessions SET guest_user_id = %s, status = 'matched' WHERE id = %s",
            (user_id, session_base["id"]),
        )
        execute(
            "UPDATE friend_invites SET status = 'accepted' WHERE id = %s",
            (invite["id"],),
        )
        session = execute(
            "SELECT * FROM sessions WHERE session_link = %s",
            (session_link,),
            fetch="one",
        )

    if session["status"] not in ("pending", "matched", "active"):
        raise HTTPException(status_code=400, detail="Session is not ready to join")

    if session["host_user_id"] == user_id:
        execute(
            "UPDATE sessions SET host_joined_lobby = TRUE WHERE session_link = %s",
            (session_link,),
        )
    else:
        execute(
            "UPDATE sessions SET guest_joined_lobby = TRUE WHERE session_link = %s",
            (session_link,),
        )

    updated = execute(
        "SELECT host_joined_lobby, guest_joined_lobby FROM sessions WHERE session_link = %s",
        (session_link,),
        fetch="one",
    )

    if updated["host_joined_lobby"] and updated["guest_joined_lobby"]:
        execute(
            """UPDATE sessions
               SET status = 'active',
                   started_at = COALESCE(started_at, NOW())
               WHERE session_link = %s""",
            (session_link,),
        )

    return {"message": "Joined lobby"}


@router.get("/link/{session_link}/lobby-status")
async def get_lobby_status(
    session_link: str,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        """SELECT s.*,
                  hu.name AS host_name,
                  gu.name AS guest_name
           FROM sessions s
           LEFT JOIN users hu ON s.host_user_id = hu.id
           LEFT JOIN users gu ON s.guest_user_id = gu.id
           WHERE s.session_link = %s AND (s.host_user_id = %s OR s.guest_user_id = %s)""",
        (session_link, user_id, user_id),
        fetch="one",
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = dict(session)
    for key, val in result.items():
        if hasattr(val, "isoformat"):
            result[key] = val.isoformat()
        elif type(val).__name__ == "UUID":
            result[key] = str(val)

    # ── Assign questions once, atomically ────────────────────────────────────
    if not result.get("question1_slug"):
        diff_map = {"beginner": "easy", "intermediate": "medium", "advanced": "hard"}
        # Default to 'intermediate' for friend sessions that have no difficulty set
        difficulty = result.get("difficulty") or "intermediate"
        mongo_diff = diff_map.get(difficulty, "medium")
        pool = list(questions_col.find({"difficulty": mongo_diff}, {"_id": 0}))
        if len(pool) >= 2:
            pair = _random.sample(pool, 2)
            # Only write if still NULL (concurrent-safe: last writer's values win but
            # both writes produce valid assignments)
            assigned = execute(
                """UPDATE sessions
                   SET question1_slug = %s, question2_slug = %s
                   WHERE session_link = %s AND question1_slug IS NULL
                   RETURNING question1_slug, question2_slug""",
                (pair[0]["slug"], pair[1]["slug"], result["session_link"]),
                fetch="one",
            )
            if assigned:
                result["question1_slug"] = assigned["question1_slug"]
                result["question2_slug"] = assigned["question2_slug"]
            else:
                # Another request already assigned — re-fetch
                fresh = execute(
                    "SELECT question1_slug, question2_slug FROM sessions WHERE session_link = %s",
                    (result["session_link"],),
                    fetch="one",
                )
                if fresh:
                    result["question1_slug"] = fresh["question1_slug"]
                    result["question2_slug"] = fresh["question2_slug"]

    # ── Load full question documents from MongoDB ─────────────────────────────
    q1 = q2 = None
    if result.get("question1_slug"):
        q1 = questions_col.find_one({"slug": result["question1_slug"]}, {"_id": 0})
    if result.get("question2_slug"):
        q2 = questions_col.find_one({"slug": result["question2_slug"]}, {"_id": 0})

    return {
        "session_link": result["session_link"],
        "status": result["status"],
        "host_name": result.get("host_name"),
        "guest_name": result.get("guest_name"),
        "host_joined": result.get("host_joined_lobby", False),
        "guest_joined": result.get("guest_joined_lobby", False),
        "both_joined": result.get("host_joined_lobby", False) and result.get("guest_joined_lobby", False),
        "scheduled_date": result["scheduled_date"],
        "scheduled_time": result["scheduled_time"],
        "track": result["track"],
        "difficulty": result["difficulty"],
        "is_host": session["host_user_id"] == user_id,
        "question1": q1,
        "question2": q2,
        "code_round1": result.get("code_round1"),
        "code_round2": result.get("code_round2"),
        "lang_round1": result.get("lang_round1", "python"),
        "lang_round2": result.get("lang_round2", "python"),
        "started_at": result.get("started_at"),
    }


@router.patch("/link/{session_link}/save-code", status_code=200)
async def save_code(
    session_link: str,
    body: SaveCodeRequest,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")

    if body.round not in (1, 2):
        raise HTTPException(status_code=400, detail="round must be 1 or 2")

    session = execute(
        "SELECT id, host_user_id, guest_user_id FROM sessions WHERE session_link = %s",
        (session_link,),
        fetch="one",
    )
    if not session or user_id not in (session["host_user_id"], session["guest_user_id"]):
        raise HTTPException(status_code=404, detail="Session not found")

    col_code = f"code_round{body.round}"
    col_lang = f"lang_round{body.round}"
    execute(
        f"UPDATE sessions SET {col_code} = %s, {col_lang} = %s WHERE session_link = %s",
        (body.code, body.lang, session_link),
    )
    return {"saved": True}


# ── Complete endpoint ──────────────────────────────────────────────────────────

@router.post("/link/{session_link}/complete", status_code=200)
async def complete_session(
    session_link: str,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")

    session = execute(
        "SELECT id, status FROM sessions WHERE session_link = %s AND (host_user_id = %s OR guest_user_id = %s)",
        (session_link, user_id, user_id),
        fetch="one",
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] in ("completed", "cancelled", "expired"):
        return {"message": "Session already finalized"}

    execute(
        "UPDATE sessions SET status = 'completed' WHERE session_link = %s",
        (session_link,),
    )
    return {"message": "Session marked as completed"}


# ── LiveKit token endpoint ────────────────────────────────────────────────────

@router.get("/link/{session_link}/livekit-token")
async def get_livekit_token(
    session_link: str,
    request: Request,
    _token=Depends(bearer_scheme),
):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET or not LIVEKIT_URL:
        raise HTTPException(status_code=503, detail="LiveKit is not configured")

    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        "SELECT host_user_id, guest_user_id FROM sessions WHERE session_link = %s",
        (session_link,),
        fetch="one",
    )
    if not session or user_id not in (session["host_user_id"], session["guest_user_id"]):
        raise HTTPException(status_code=404, detail="Session not found")

    user = execute("SELECT name FROM users WHERE id = %s", (user_id,), fetch="one")
    participant_name = user["name"] if user else user_id

    from livekit.api import AccessToken, VideoGrants  # imported here to fail gracefully if pkg missing
    token = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(user_id)
        .with_name(participant_name)
        .with_grants(VideoGrants(room_join=True, room=session_link))
        .to_jwt()
    )

    return {"token": token, "url": LIVEKIT_URL}


# ── Session CRUD ───────────────────────────────────────────────────────────────

@router.get("")
async def list_sessions(
    request: Request,
    _token=Depends(bearer_scheme),
    status: str = Query(None),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    # Auto-expire sessions whose scheduled time has passed (30-min grace window)
    overdue = execute(
        """SELECT id, scheduled_date, scheduled_time FROM sessions
           WHERE (host_user_id = %s OR guest_user_id = %s)
             AND status IN ('pending', 'matched')""",
        (user_id, user_id),
        fetch="all",
    )
    now_dt = datetime.now()
    for s in (overdue or []):
        try:
            sdt = _parse_session_dt(s["scheduled_date"], s["scheduled_time"])
            if now_dt > sdt + timedelta(minutes=30):
                execute("UPDATE sessions SET status = 'expired' WHERE id = %s", (s["id"],))
        except Exception:
            pass

    status_filter = ""
    if status == "upcoming":
        status_filter = "AND s.status IN ('pending', 'matched', 'active')"
    elif status == "completed":
        status_filter = "AND s.status IN ('completed', 'cancelled', 'expired')"

    sessions = execute(
        f"""SELECT s.*,
               CASE WHEN s.host_user_id = %s THEN gu.name ELSE hu.name END AS partner_name
           FROM sessions s
           LEFT JOIN users hu ON s.host_user_id = hu.id
           LEFT JOIN users gu ON s.guest_user_id = gu.id
           WHERE (s.host_user_id = %s OR s.guest_user_id = %s)
           {status_filter}
           ORDER BY s.scheduled_date DESC, s.scheduled_time DESC""",
        (user_id, user_id, user_id),
        fetch="all",
    )

    return [dict(s) for s in (sessions or [])]


@router.get("/{session_id}")
async def get_session(
    session_id: int,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        """SELECT s.*,
                  hu.name  AS host_name,  hu.email AS host_email,
                  gu.name  AS guest_name, gu.email AS guest_email
           FROM sessions s
           LEFT JOIN users hu ON s.host_user_id = hu.id
           LEFT JOIN users gu ON s.guest_user_id = gu.id
           WHERE s.id = %s AND (s.host_user_id = %s OR s.guest_user_id = %s)""",
        (session_id, user_id, user_id),
        fetch="one",
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = dict(session)

    # For friend sessions, attach the active invite link (if any)
    if result.get("mode") == "friend":
        invite = execute(
            """SELECT invite_code, invitee_email, status, expires_at
               FROM friend_invites
               WHERE session_id = %s
               ORDER BY created_at DESC LIMIT 1""",
            (session_id,),
            fetch="one",
        )
        if invite:
            inv = dict(invite)
            inv["invite_link"] = f"{CLIENT_ORIGIN}/lobby/{str(result['session_link'])}"
            result["invite"] = inv

    # Serialize non-JSON-native types
    for key, val in result.items():
        if hasattr(val, "isoformat"):
            result[key] = val.isoformat()
        elif hasattr(val, "__str__") and type(val).__name__ in ("UUID",):
            result[key] = str(val)

    if result.get("invite"):
        for key, val in result["invite"].items():
            if hasattr(val, "isoformat"):
                result["invite"][key] = val.isoformat()
            elif type(val).__name__ in ("UUID",):
                result["invite"][key] = str(val)

    return result


@router.patch("/{session_id}/reschedule")
async def reschedule_session(
    session_id: int,
    body: RescheduleRequest,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        "SELECT * FROM sessions WHERE id = %s AND (host_user_id = %s OR guest_user_id = %s)",
        (session_id, user_id, user_id),
        fetch="one",
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] not in ("pending", "matched"):
        raise HTTPException(status_code=400, detail="Session cannot be rescheduled")

    updated = execute(
        "UPDATE sessions SET scheduled_date = %s, scheduled_time = %s WHERE id = %s RETURNING *",
        (body.date, body.time, session_id),
        fetch="one",
    )

    return dict(updated)


@router.delete("/{session_id}", status_code=200)
async def cancel_session(
    session_id: int,
    request: Request,
    _token=Depends(bearer_scheme),
):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        "SELECT * FROM sessions WHERE id = %s AND (host_user_id = %s OR guest_user_id = %s)",
        (session_id, user_id, user_id),
        fetch="one",
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    execute(
        "UPDATE sessions SET status = 'cancelled' WHERE id = %s",
        (session_id,),
    )

    return {"message": "Session cancelled"}
