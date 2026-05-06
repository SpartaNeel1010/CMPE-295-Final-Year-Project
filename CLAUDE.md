# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Interview Ramp** — a full-stack web app for practicing mock interviews with peers and AI.

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, in `/client`
- **Backend**: FastAPI + PostgreSQL, in `/backend`
- **Auth**: Clerk (frontend) + clerk-backend-api SDK (backend verification)

## Commands

### Frontend (`/client`)
```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (`/backend`)
```bash
python main.py              # Start FastAPI dev server on port 4000 (auto-reload)
pip install -r requirements.txt
```

## Architecture

### Authentication Flow
1. User signs in via Clerk on the frontend
2. Frontend gets a session token via `getToken()` from `@clerk/nextjs`
3. All API requests send `Authorization: Bearer {token}`
4. Backend verifies the token using the Clerk SDK (`app/security.py`)
5. On first request to `GET /api/auth/me`, backend syncs the user from Clerk into local PostgreSQL

Clerk middleware at `client/middleware.ts` protects `/dashboard` routes.

### API Communication
- Frontend base URL: `NEXT_PUBLIC_API_URL` env var (default `http://localhost:4000`)
- Backend CORS: accepts from `CLIENT_ORIGIN` env var
- API helper: `client/lib/api.ts` — fetch wrapper that injects the auth header

### Database
- PostgreSQL via psycopg2 with a thread-safe connection pool (1–10 connections)
- Raw SQL with `RealDictCursor` — no ORM
- Schema defined in `backend/app/schema.sql`
- `execute()` helper in `backend/app/database.py` accepts `fetch="one"/"all"/"none"`

### Backend Structure
- `main.py` — app init, CORS middleware, lifespan startup (DB pool init)
- `app/config.py` — env vars (DATABASE_URL, JWT_SECRET, PORT, CLIENT_ORIGIN, CLERK_SECRET_KEY)
- `app/security.py` — Clerk JWT verification via FastAPI `Depends()`
- `app/routers/` — feature routers (currently only `auth.py`)

### Frontend Structure
- `app/` — Next.js App Router pages; most interactive components use `"use client"`
- `components/` — reusable UI components; schedule-specific ones in `components/schedule/`
- `lib/api.ts` — API client

## Environment Variables

**Backend** (`.env`):
```
DATABASE_URL=postgresql://user:pass@localhost:5432/interviewramp
JWT_SECRET=<32+ char random string>
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
CLERK_SECRET_KEY=<from Clerk dashboard>
OPENAI_API_KEY=<from https://platform.openai.com/api-keys>
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Current State

- Only one API endpoint exists: `GET /api/auth/me`
- Schedule page uses hardcoded `SAMPLE_SESSIONS` — no real backend integration yet
- Database only has a `users` table; sessions/scheduling tables are not yet created

## AI Feedback System

- After each session, the **interviewee** receives AI-generated feedback via GPT-4o
- Triggered automatically after manual feedback submit OR skip
- Backend: `POST /api/sessions/link/{session_link}/ai-feedback`
  - Sends the question, submitted code, and conversation transcript to OpenAI GPT-4o
  - Uses `response_format: json_object` for guaranteed valid JSON output
  - Caches results in the `ai_feedback` PostgreSQL table
- Frontend: premium overlay in `SessionClient.tsx` shows:
  - Overall score + category mini-scores (code quality, problem solving, communication)
  - Strengths and areas for improvement
  - Time complexity analysis
  - Recommended study topics
  - Pro tip for next interview
- Role mapping: `host = interviewee in round 1`, `guest = interviewee in round 2`
- Transcript capture: WS `chat_message` events are accumulated in `transcriptRef`


## Commands to start run client in https
- npm run https

## Commands to start backend in https
 - cd backend 
 - source .venv/bin/activate
 - openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365 (only if .pem files are not present in backend)
 - uvicorn main:app --ssl-keyfile=./key.pem --ssl-certfile=./cert.pem --port 4000 --host 0.0.0.0 --reload
 - 