# Interview Ramp — Project Architecture

> **Course:** CMPE 295 — Master's Project  
> **Last Updated:** May 2026

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              END USERS (Browser)                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │  HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD RUN (Frontend)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Next.js 16 (App Router) — standalone Node.js server                 │  │
│  │  • SSR + Client Components ("use client")                            │  │
│  │  • Clerk Provider (auth UI, session tokens)                          │  │
│  │  • Middleware: route protection (/dashboard, /lobby, /session, etc.) │  │
│  │  • Monaco Editor, LiveKit React Components                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  Image: us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/     │
│         interview-ramp-frontend:latest                                     │
│  Port: 3000 │ Region: us-central1                                          │
└──────┬──────────────────┬──────────────────┬───────────────────────────────┘
       │ REST (HTTPS)     │ WebSocket (WSS)  │ LiveKit (WSS)
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD RUN (Backend)                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  FastAPI + Uvicorn — Python 3.13                                     │  │
│  │  Routers:                                                            │  │
│  │    /api/auth      — Clerk JWT verification + user sync               │  │
│  │    /api/sessions  — Scheduling, lobby, feedback, LiveKit tokens      │  │
│  │    /api/questions  — Random question selection from MongoDB           │  │
│  │    /api/execute    — Code execution via Judge0 CE                     │  │
│  │    /api/sessions/link/{id}/ai-feedback — GPT-4o feedback             │  │
│  │    /ws/session/{id} — WebSocket rooms (code sync + chat)             │  │
│  │  Secrets: mounted at /secrets/.env via Google Secret Manager          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  Image: us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/      │
│         interview-ramp-backend:latest                                      │
│  Port: 8080 │ Region: us-central1                                          │
└──────┬──────────────────┬──────────────────┬───────────────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐
│  PostgreSQL  │  │   MongoDB    │  │   External Services   │
│  (Neon.tech) │  │   (Atlas)    │  │                       │
│              │  │              │  │  • Clerk (Auth)       │
│  Tables:     │  │  Collection: │  │  • LiveKit Cloud      │
│  • users     │  │  • questions │  │  • Judge0 CE          │
│  • sessions  │  │              │  │  • OpenAI GPT-4o      │
│  • feedback  │  │              │  │  • Gmail SMTP         │
│  • invites   │  │              │  │                       │
│  • ai_feedback│ │              │  │                       │
└──────────────┘  └──────────────┘  └───────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Framework & Rendering

- **Next.js 16 with App Router** — file-based routing under `client/app/`
- **Standalone output** mode (`next.config.ts: output: "standalone"`) — produces a minimal server bundle for Docker
- **Server Components** for layout and static landing page sections
- **Client Components** (`"use client"`) for all interactive pages: Dashboard, Schedule, Sessions, Lobby, Session

### 2.2 Route Map

| Route | Component | Auth Required | Description |
|-------|-----------|--------------|-------------|
| `/` | `page.tsx` | No | Landing page (Navbar, Hero, Benefits, FAQ, etc.) |
| `/login` | Clerk `<SignIn>` | No | Sign-in page |
| `/signup` | Clerk `<SignUp>` | No | Sign-up page |
| `/sso-callback` | Clerk callback | No | OAuth redirect handler |
| `/dashboard` | `DashboardClient.tsx` | Yes | User stats, charts, recent sessions |
| `/schedule` | `SchedulerClient.tsx` | Yes | Session scheduling wizard |
| `/sessions` | `SessionsClient.tsx` | Yes | Session list (upcoming + completed) |
| `/lobby/[sessionLink]` | `LobbyClient.tsx` | Yes | Pre-session waiting room |
| `/session/[sessionLink]` | `SessionClient.tsx` | Yes | Live interview room |

### 2.3 Authentication Layer

```
ClerkProvider (root layout)
    │
    ├── middleware.ts — protects /dashboard, /lobby, /session, /schedule, /sessions
    │   Uses createRouteMatcher + auth.protect()
    │
    └── lib/api.ts — authedRequest() injects Bearer token
        Uses useAuth().getToken() from @clerk/nextjs
```

### 2.4 Key Client Components

| Component | Size | Responsibility |
|-----------|------|---------------|
| `SessionClient.tsx` | ~99 KB | Entire live interview UI: video, editor, timer, chat, feedback, AI feedback overlay |
| `DashboardClient.tsx` | ~40 KB | Dashboard stats, charts, next session card, recent sessions |
| `SessionsClient.tsx` | ~31 KB | Session list with tabs, status badges, action buttons |
| `ScheduleModals.tsx` | ~36 KB | Peer/friend scheduling wizard modals |
| `SchedulerClient.tsx` | ~21 KB | Calendar picker, slot selector, track/difficulty selection |
| `SessionDetailModal.tsx` | ~18 KB | Session detail overlay with invite info |
| `LobbyClient.tsx` | ~9 KB | Waiting room with join status polling |

---

## 3. Backend Architecture

### 3.1 Application Structure

```
backend/
├── main.py                 # FastAPI app init, CORS, lifespan, router registration
└── app/
    ├── config.py           # Env var loading (Cloud Run secrets → local .env fallback)
    ├── database.py         # PostgreSQL ThreadedConnectionPool (1-10 conns) + execute()
    ├── schema.sql          # Idempotent DDL (CREATE TABLE IF NOT EXISTS + ALTER)
    ├── security.py         # Clerk JWT RS256 verification with JWKS caching
    ├── mongo.py            # PyMongo client → interviewramp.questions collection
    ├── email_utils.py      # SMTP HTML email for friend invites
    ├── ws.py               # WebSocket SessionRoom manager
    └── routers/
        ├── auth.py         # 1 endpoint   (GET /api/auth/me)
        ├── sessions.py     # 15+ endpoints (full session lifecycle)
        ├── questions.py    # 2 endpoints   (random question selection)
        ├── execute.py      # 1 endpoint   (POST /api/execute)
        └── ai_feedback.py  # 2 endpoints   (POST + GET ai-feedback)
```

### 3.2 Database Connection Strategy

```python
# Thread-safe connection pool — borrows/returns connections per request
_pool = ThreadedConnectionPool(1, 10, dsn=DATABASE_URL)

def execute(query, params=(), *, fetch="none"):
    conn = _pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            # fetch="one" → fetchone(), "all" → fetchall(), "none" → None
        conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
```

- **No ORM** — all queries are raw SQL with parameterized inputs
- **`RealDictCursor`** — returns rows as Python dicts
- **Connection pool** — 1 to 10 connections, thread-safe for concurrent requests

### 3.3 Authentication Pipeline

```
Request → Authorization: Bearer <JWT>
    │
    ├── 1. Extract token from header
    ├── 2. Decode (unverified) to read `iss` (issuer) and `kid` (key ID)
    ├── 3. Fetch JWKS from {iss}/.well-known/jwks.json (cached 1 hour)
    ├── 4. Find matching public key by `kid`
    ├── 5. Verify RS256 signature + expiry with PyJWT
    ├── 6. Return decoded payload → { sub: "clerk_user_id", ... }
    │
    └── get_or_create_user(user_id):
        ├── Check if user exists in PostgreSQL
        ├── Try Clerk Management API for name + email
        ├── Fallback to JWT claims
        ├── Fallback to placeholder
        └── INSERT ... ON CONFLICT DO NOTHING
```

### 3.4 WebSocket Architecture

```
Client A ────WebSocket───► /ws/session/{session_link}
                                    │
                              SessionRoom
                             ┌──────────────┐
                             │ connections[] │
                             │ last_code_state │
                             └──────────────┘
                                    │
Client B ────WebSocket───► /ws/session/{session_link}

Message types:
  • code_update  — broadcast to all except sender; cached for late joiners
  • chat_message — broadcast to all except sender
  • participant_left — broadcast to ALL when someone disconnects
```

---

## 4. Database Architecture

### 4.1 PostgreSQL Schema (Neon.tech)

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   users      │     │    sessions       │     │  session_feedback   │
├─────────────┤     ├──────────────────┤     ├────────────────────┤
│ id (PK)     │◄────│ host_user_id (FK)│     │ session_id (FK)    │
│ name        │◄────│ guest_user_id(FK)│     │ reviewer_id (FK)   │
│ email (UQ)  │     │ track            │     │ reviewee_id (FK)   │
│ role        │     │ mode             │     │ rating_coding      │
│ created_at  │     │ difficulty       │     │ rating_explaining  │
└─────────────┘     │ scheduled_date   │     │ rating_navigating  │
                    │ scheduled_time   │     │ rating_followups   │
                    │ status           │     │ rating_communication│
                    │ session_link(UUID)│     │ rating_problem_solving│
                    │ host_joined_lobby│     │ comments           │
                    │ guest_joined_lobby│    └────────────────────┘
                    │ question1_slug   │
                    │ question2_slug   │     ┌────────────────────┐
                    │ code_round1      │     │  friend_invites     │
                    │ code_round2      │     ├────────────────────┤
                    │ lang_round1      │     │ session_id (FK)    │
                    │ lang_round2      │     │ inviter_user_id(FK)│
                    │ started_at       │     │ invitee_email      │
                    └──────────────────┘     │ invite_code (UUID) │
                                            │ message            │
                    ┌──────────────────┐    │ expires_at         │
                    │  ai_feedback      │    │ status             │
                    ├──────────────────┤    └────────────────────┘
                    │ session_id (FK)  │
                    │ user_id (FK)     │
                    │ round (1 or 2)   │
                    │ feedback_json    │
                    │ UQ(session,user, │
                    │    round)        │
                    └──────────────────┘
```

### 4.2 MongoDB Schema (Atlas)

```json
// Collection: interviewramp.questions
{
  "slug": "two-sum",
  "title": "Two Sum",
  "difficulty": "easy",
  "description": "Given an array of integers...",
  "examples": [...],
  "constraints": [...],
  "starter_code": {
    "python": "class Solution:\n    def twoSum(self, nums, target)...",
    "javascript": "function twoSum(nums, target) {...}",
    "typescript": "function twoSum(nums: number[], target: number)..."
  },
  "judge": {
    "py_fn": "twoSum",
    "js_fn": "twoSum",
    "cmp": "sorted_1d",
    "tests": [
      { "l": "Example 1", "a": [[[2,7,11,15], 9]], "e": [0,1] },
      { "l": "Example 2", "a": [[[3,2,4], 6]], "e": [1,2] }
    ],
    "hidden": [
      { "l": "Edge case", "a": [[[1,1], 2]], "e": [0,1], "h": true }
    ]
  }
}
```

---

## 5. API Architecture

### 5.1 REST API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `GET` | `/api/auth/me` | Yes | Get/sync current user |
| `GET` | `/api/sessions/available-slots` | Optional | Available time slots for a date/track |
| `POST` | `/api/sessions/peer` | Yes | Create peer session (auto-match) |
| `POST` | `/api/sessions/friend` | Yes | Create friend session + send invite email |
| `GET` | `/api/sessions/invite/{code}` | No | Get invite details |
| `POST` | `/api/sessions/invite/{code}/accept` | Yes | Accept friend invite |
| `POST` | `/api/sessions/link/{link}/join-lobby` | Yes | Mark participant as joined |
| `GET` | `/api/sessions/link/{link}/lobby-status` | Yes | Poll lobby + assign questions |
| `PATCH` | `/api/sessions/link/{link}/save-code` | Yes | Persist code per round |
| `POST` | `/api/sessions/link/{link}/complete` | Yes | Mark session completed |
| `POST` | `/api/sessions/link/{link}/early-exit` | Yes | Early exit → completed |
| `POST` | `/api/sessions/link/{link}/feedback` | Yes | Submit peer feedback |
| `GET` | `/api/sessions/link/{link}/feedback` | Yes | Get given/received feedback |
| `GET` | `/api/sessions/link/{link}/livekit-token` | Yes | Generate LiveKit room token |
| `POST` | `/api/sessions/link/{link}/ai-feedback` | Yes | Generate AI feedback (GPT-4o) |
| `GET` | `/api/sessions/link/{link}/ai-feedback` | Yes | Get cached AI feedback |
| `GET` | `/api/sessions/dashboard` | Yes | Aggregated dashboard data |
| `GET` | `/api/sessions` | Yes | List user's sessions |
| `GET` | `/api/sessions/{id}` | Yes | Session detail |
| `PATCH` | `/api/sessions/{id}/reschedule` | Yes | Reschedule session |
| `DELETE` | `/api/sessions/{id}` | Yes | Cancel session |
| `GET` | `/api/questions/random` | No | Random question by difficulty |
| `GET` | `/api/questions/random-pair` | No | Two random questions |
| `POST` | `/api/execute` | Yes | Execute code via Judge0 |

### 5.2 WebSocket Endpoint

| Path | Description |
|------|-------------|
| `ws/session/{session_link}` | Bidirectional JSON messages for code sync, chat, and disconnect notifications |

---

## 6. Security Architecture

| Layer | Mechanism |
|-------|-----------|
| **Identity** | Clerk (managed auth provider) — handles passwords, MFA, OAuth |
| **Session Tokens** | RS256-signed JWTs issued by Clerk (short-lived) |
| **Backend Verification** | JWKS-based RS256 verification (public keys cached 1 hour) |
| **Route Protection** | Clerk middleware on frontend; `Depends(bearer_scheme)` on backend |
| **Secrets** | Google Secret Manager → mounted as file at `/secrets/.env` |
| **CORS** | `allow_origins=["*"]` (permissive for Cloud Run) |
| **Code Execution** | Sandboxed via Judge0 CE (isolated containers, not on backend) |
| **Invite Links** | UUID-based invite codes with 7-day expiry |

---

## 7. Data Flow Summary

### Request Flow (Authenticated)

```
Browser → Clerk getToken() → JWT
Browser → HTTPS Request + Authorization: Bearer <JWT>
    → Cloud Run Frontend (if SSR) or directly to:
    → Cloud Run Backend
        → verify_clerk_token() → JWKS verification
        → get_or_create_user() → PostgreSQL upsert
        → Route handler → PostgreSQL/MongoDB queries
        → JSON response
```

### Real-Time Flow (Interview Session)

```
Participant A                                    Participant B
     │                                                │
     ├──── WebSocket connect ──► SessionRoom ◄── WebSocket connect ────┤
     │                              │                                  │
     ├── code_update ──────────► broadcast ──────────────────────────► │
     │                              │                                  │
     │ ◄──────────────────────── broadcast ◄────── chat_message ──────┤
     │                              │                                  │
     ├── LiveKit video/audio ◄──► LiveKit Cloud SFU ◄──► LiveKit ─────┤
```
