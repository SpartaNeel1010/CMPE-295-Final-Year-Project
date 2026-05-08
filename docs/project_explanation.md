# Interview Ramp — Project Explanation

> **Course:** CMPE 295 — Master's Project  
> **Last Updated:** May 2026

---

## 1. What Is Interview Ramp?

**Interview Ramp** is a full-stack web application that enables software engineers to practice mock technical interviews with real peers or friends in a live, structured environment. Unlike passive LeetCode grinding, Interview Ramp replicates the *actual interview experience* — two participants, live video/audio, a shared code editor, a countdown timer, and post-session feedback from both a human partner and an AI coach.

The platform supports two interview tracks:

| Track | Focus | Session Duration |
|-------|-------|-----------------|
| **DSA (Data Structures & Algorithms)** | LeetCode-style coding problems with test cases | 2-hour blocks |
| **Behavioral** | STAR-method behavioral interview practice | 90-minute blocks |

---

## 2. Motivation & Problem Statement

Preparing for technical interviews is often a solitary activity — candidates solve problems alone on platforms like LeetCode without practicing the *communication* and *collaboration* skills that real interviews demand. Interview Ramp addresses this gap by providing:

- **Live peer-to-peer mock interviews** with real-time video, audio, and chat
- **Role rotation** — each participant takes turns as interviewer and interviewee across two rounds
- **Structured feedback** — both peer ratings (rubric-based) and AI-generated coaching (GPT-4o)
- **Automatic matchmaking** — strangers with the same track, difficulty, and time slot are paired
- **Friend invites** — invite a specific person via email to practice together

---

## 3. Core Feature Set

### 3.1 Scheduling & Matchmaking

- **Peer Mode:** Users select a track (DSA or Behavioral), difficulty level (Beginner / Intermediate / Advanced), date, and time slot. If another user has already posted a pending session with identical parameters, they are matched instantly. Otherwise, the session waits in `pending` status.
- **Friend Mode:** Users create a session and invite a specific friend by email. The system generates a unique invite link and sends a styled HTML email. The friend clicks the link, signs in, and is auto-matched to the session.

### 3.2 Pre-Session Lobby

Before the interview starts, both participants enter a **lobby** page (`/lobby/{session_link}`). The lobby:

1. Marks each participant as "joined" in the database
2. Polls for the other participant's arrival
3. Pre-assigns two coding questions from MongoDB (one per round)
4. Transitions the session to `active` once both participants have joined

### 3.3 Live Interview Session

The core interview experience (`/session/{session_link}`) features:

- **LiveKit Video/Audio:** Real-time WebRTC-based video conferencing (LiveKit Cloud) with camera and microphone controls
- **Monaco Code Editor:** The same editor that powers VS Code, supporting Python, JavaScript, TypeScript, Java, C++, and Go with syntax highlighting
- **Real-Time Code Sync:** WebSocket-powered live code broadcasting so the interviewer sees every keystroke in real time
- **In-Session Chat:** Text-based chat alongside video, with messages broadcast via WebSocket
- **Code Execution:** Run code against visible test cases ("Run") or all test cases including hidden ones ("Submit") via the Judge0 CE sandbox API
- **Round Timer:** A 60-minute countdown timer with visual urgency indicators
- **Two Rounds:** After 30 minutes, roles swap — the interviewee becomes the interviewer and vice versa, with a new question

### 3.4 Post-Session Feedback

After the session ends (either via timer expiry, manual early exit, or partner disconnection):

1. **Peer Feedback (Manual):** Each participant rates the other on 6 rubric categories (Coding, Explaining, Navigating, Follow-ups, Communication, Problem Solving) on a 1–5 scale, plus optional written comments.
2. **AI Feedback (Automated):** After submitting (or skipping) peer feedback, the interviewee automatically receives AI-generated coaching from OpenAI GPT-4o. The AI analyzes:
   - The coding question
   - The user's submitted code
   - The full conversation transcript
   
   It returns a structured JSON with an overall score (1–10), category mini-scores, strengths, improvement areas, time complexity analysis, study topic suggestions, and a pro tip.

### 3.5 Dashboard & Analytics

The user dashboard (`/dashboard`) provides:

- **At-a-Glance Stats:** Total sessions, completed, upcoming, cancelled, overall average rating
- **Next Session Card:** Quick access to the soonest upcoming interview
- **Recent Sessions:** Last 5 completed sessions with received feedback
- **Track Breakdown:** DSA vs. Behavioral session distribution
- **Difficulty Breakdown:** Beginner / Intermediate / Advanced counts
- **Monthly Activity Chart:** Session activity over the past 6 months
- **Category Averages:** Average scores across all 6 feedback categories

### 3.6 Session Management

The sessions page (`/sessions`) shows:

- All upcoming sessions (pending, matched, active) with the ability to cancel or reschedule
- All completed/cancelled/expired sessions with links to view feedback
- Session detail modals with full information including invite links for friend sessions

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.1.6 | React framework with App Router, SSR, and file-based routing |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Clerk** | `@clerk/nextjs` 7.x | Authentication UI (sign-in, sign-up, session management) |
| **Monaco Editor** | `@monaco-editor/react` 4.7 | In-browser code editor (VS Code engine) |
| **LiveKit** | `@livekit/components-react` 2.7.3 + `livekit-client` 2.9.6 | Real-time video/audio conferencing |
| **Inter** | Google Font | Primary typeface |

### 4.2 Backend

| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Python async web framework for REST API and WebSocket endpoints |
| **Uvicorn** | ASGI server for running FastAPI |
| **psycopg2-binary** | PostgreSQL driver with connection pooling |
| **PyJWT** | JWT verification (RS256) for Clerk tokens |
| **clerk-backend-api** | Clerk Management API SDK for syncing user profiles |
| **pymongo** | MongoDB driver for question storage |
| **livekit-api** | LiveKit server SDK for generating video room tokens |
| **httpx** | Async HTTP client for Judge0 API calls |
| **openai** | OpenAI Python SDK for GPT-4o AI feedback |
| **python-dotenv** | Environment variable loading |

### 4.3 Databases

| Database | Provider | Purpose |
|----------|----------|---------|
| **PostgreSQL** | Neon.tech (serverless) | Primary relational database — users, sessions, feedback, invites, AI feedback |
| **MongoDB** | MongoDB Atlas (cloud) | Document store for coding questions with test cases and judge metadata |

### 4.4 External Services

| Service | Purpose |
|---------|---------|
| **Clerk** | Identity provider — sign-up, sign-in, Google OAuth, session token issuance |
| **LiveKit Cloud** | WebRTC infrastructure — video/audio rooms, SFU relay |
| **Judge0 CE** | Code execution sandbox — runs user code in isolated containers (Python, JS, TS, Java, C++, Go) |
| **OpenAI GPT-4o** | AI interview feedback generation |
| **Gmail SMTP** | Friend invite email delivery |
| **Google Cloud Run** | Container hosting for both frontend and backend |
| **Google Artifact Registry** | Docker image storage |
| **Google Secret Manager** | Backend secrets (`.env` file) mounted at `/secrets/.env` |

---

## 5. Project Structure

```
CMPE-295-Final-Year-Project/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # App entry point, CORS, router registration
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Production container (Python 3.13-slim)
│   ├── seed.py                 # Database seeder (dev)
│   ├── seed_questions.py       # MongoDB question seeder
│   ├── add_judge_data.py       # Adds Judge0 test harness data to questions
│   ├── secrets/                # Mounted .env for Cloud Run
│   └── app/
│       ├── config.py           # Environment variable loading
│       ├── database.py         # PostgreSQL connection pool + execute() helper
│       ├── schema.sql          # DDL for all tables (idempotent)
│       ├── security.py         # Clerk JWT verification + user sync
│       ├── mongo.py            # MongoDB client + questions collection
│       ├── email_utils.py      # SMTP friend invite email
│       ├── ws.py               # WebSocket room manager (code sync + chat)
│       └── routers/
│           ├── auth.py         # GET /api/auth/me
│           ├── sessions.py     # Full session lifecycle (scheduling → feedback)
│           ├── questions.py    # Random question selection from MongoDB
│           ├── execute.py      # Code execution via Judge0
│           └── ai_feedback.py  # AI feedback generation via GPT-4o
├── client/                     # Next.js 16 frontend
│   ├── app/
│   │   ├── layout.tsx          # Root layout (ClerkProvider, Inter font)
│   │   ├── page.tsx            # Landing page
│   │   ├── globals.css         # Global styles
│   │   ├── login/              # Clerk sign-in page
│   │   ├── signup/             # Clerk sign-up page
│   │   ├── sso-callback/       # OAuth callback handler
│   │   ├── dashboard/          # User dashboard with stats & charts
│   │   ├── schedule/           # Session scheduling wizard
│   │   ├── sessions/           # Session list (upcoming + completed)
│   │   ├── lobby/[sessionLink]/ # Pre-session waiting room
│   │   └── session/[sessionLink]/ # Live interview room
│   ├── components/
│   │   ├── Navbar.tsx          # Top navigation
│   │   ├── HeroSection.tsx     # Landing page hero
│   │   ├── schedule/           # Schedule-specific modals and components
│   │   └── ...                 # Landing page sections
│   ├── lib/
│   │   └── api.ts              # API client (authed + unauthed requests)
│   ├── middleware.ts           # Clerk route protection
│   ├── Dockerfile              # Multi-stage Next.js production build
│   └── package.json            # Node.js dependencies
└── docs/                       # Project documentation
```

---

## 6. Database Schema Overview

### PostgreSQL (Neon.tech) — 5 Tables

1. **`users`** — Clerk-synced user profiles (id from Clerk, name, email, role)
2. **`sessions`** — Interview sessions with full lifecycle state (pending → matched → active → completed/cancelled/expired)
3. **`friend_invites`** — Invite codes for friend-mode sessions (7-day expiry)
4. **`session_feedback`** — Peer-to-peer rubric ratings (6 categories, 1–5 scale)
5. **`ai_feedback`** — Cached AI-generated feedback (per user, per round, GPT-4o JSON)

### MongoDB (Atlas) — 1 Collection

- **`questions`** — Coding problems with title, description, difficulty, starter code templates, test cases, hidden test cases, and Judge0 harness metadata (`judge` field with `py_fn`, `js_fn`, `cmp`, `tests`, `hidden`)

---

## 7. Real-Time Communication

### WebSocket (Custom)

The backend hosts a WebSocket endpoint at `/ws/session/{session_link}` for:

- **`code_update`** events — real-time code synchronization between participants
- **`chat_message`** events — in-session text chat
- **`participant_left`** events — notifies the remaining participant when the other disconnects

Each session link maps to a `SessionRoom` that maintains a list of connections and caches the last code state for late-joining participants.

### LiveKit (WebRTC)

LiveKit Cloud provides the video/audio layer:

- The backend generates a LiveKit access token (`/api/sessions/link/{session_link}/livekit-token`) with room-join grants scoped to the session link
- The frontend connects using `@livekit/components-react` to display local + remote video tracks
- Supports camera toggle, microphone toggle, and connection status indicators

---

## 8. Code Execution Pipeline

The code execution system uses **Judge0 Community Edition** (free public sandbox):

1. **Frontend** sends the user's code, selected language, question slug, and mode (run/submit) to `POST /api/execute`
2. **Backend** fetches the question's Judge0 metadata from MongoDB
3. **Backend** wraps the user's code in a language-specific **test harness** that:
   - Redirects stdout to capture only test results
   - Calls the user's function with each test case
   - Normalizes output for comparison (supports sorted arrays, 2D arrays, linked lists, void-inplace mutations)
   - Produces a JSON array of `{label, passed, got, expected, hidden}` results
4. **Backend** submits the harness to Judge0 CE (base64-encoded, `wait=true`)
5. **Judge0** executes in an isolated container and returns stdout/stderr
6. **Backend** parses the JSON results and returns them to the frontend

Supported languages: Python, JavaScript, TypeScript, Java, C++, Go (with full test harness for Python/JS/TS).

---

## 9. Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      SESSION LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User schedules session (peer or friend)                        │
│         │                                                       │
│         ▼                                                       │
│      PENDING  ─── match found / invite accepted ──► MATCHED     │
│         │                                              │        │
│         │ (30 min past scheduled time → auto-expire)   │        │
│         ▼                                              │        │
│      EXPIRED                                           │        │
│                                                        │        │
│                      Both join lobby ──────────────► ACTIVE      │
│                                                        │        │
│                                          Timer ends / early exit │
│                                                        │        │
│                                                     COMPLETED   │
│                                                                 │
│  (Any stage) ── user cancels ──────────────────► CANCELLED      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **No ORM — raw SQL** | Maximum control over queries, simpler debugging, fewer dependencies |
| **Clerk for auth** | Offloads identity management; integrates with Google OAuth; provides pre-built UI components |
| **MongoDB for questions** | Flexible schema for questions with varying structures (different test case formats, starter code per language, judge metadata) |
| **PostgreSQL for everything else** | Relational integrity for sessions, users, feedback, invites with FK constraints |
| **WebSocket for code sync** | Sub-second latency; simpler than full CRDT for single-editor scenarios |
| **Judge0 CE for execution** | Free, sandboxed, supports 60+ languages; eliminates the risk of executing untrusted code on the backend |
| **GPT-4o with `json_object` mode** | Guarantees valid JSON output; consistent structured feedback without post-processing |
| **Standalone Next.js output** | Required for the Docker multi-stage build; produces a minimal Node.js server without a full Next.js install |

---

## 11. Environment Variables Summary

### Backend (`secrets/.env` or `.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon.tech) |
| `MONGO_URI` | MongoDB connection string (Atlas) |
| `CLERK_SECRET_KEY` | Clerk Management API secret |
| `JWT_SECRET` | (Legacy) Not actively used; Clerk JWTs use RS256 with public JWKS |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password (Gmail app password) |
| `SMTP_FROM` | Sender email address |
| `CLIENT_ORIGIN` | Frontend URL (for CORS and invite links) |
| `PORT` | Backend server port (4000 local, 8080 Cloud Run) |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend) |
| `CLERK_SECRET_KEY` | Clerk secret key (SSR) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Cloud WebSocket URL (frontend) |
