from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from app.database import execute
from app.security import verify_clerk_token, get_or_create_user
from app.config import CLIENT_ORIGIN

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
bearer_scheme          = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)

# DSA: 2-hour blocks, 9 AM–9 PM
DSA_SLOTS = [
    "9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM", "7:00 PM", "9:00 PM",
]

# Behavioral: 90-minute blocks, 9 AM–9 PM
BEHAVIORAL_SLOTS = [
    "9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM",
    "3:00 PM", "4:30 PM", "6:00 PM", "7:30 PM", "9:00 PM",
]

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
    invite_link = f"{CLIENT_ORIGIN}/join/{invite_code}"

    return {
        "session_id": session["id"],
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

    status_filter = ""
    if status == "upcoming":
        status_filter = "AND s.status IN ('pending', 'matched', 'active')"
    elif status == "completed":
        status_filter = "AND s.status IN ('completed', 'cancelled')"

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
            inv["invite_link"] = f"{CLIENT_ORIGIN}/join/{inv['invite_code']}"
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
