# Auth & Scheduling API Reference

## 1. How Clerk Authentication Works

### Overview

Clerk is the identity provider. It handles sign-up, sign-in, and session management on the frontend. The backend never sees passwords — it only validates a short-lived **JWT (JSON Web Token)** that Clerk issues.

### End-to-End Flow

```
User signs in via Clerk UI
        │
        ▼
Clerk issues a session token (JWT, RS256-signed)
        │
        ▼
Frontend calls getToken() → gets the JWT string
        │
        ▼
Frontend adds header:  Authorization: Bearer <token>
        │
        ▼
Backend receives request
        │
        ▼
security.py: verify_clerk_token()
  1. Extracts Bearer token from header
  2. Decodes token (unverified) to read `iss` (issuer URL) and `kid` (key ID)
  3. Fetches Clerk's public JWKS from {iss}/.well-known/jwks.json  ← cached 1 hr
  4. Finds the matching public key by kid
  5. Verifies signature + expiry with PyJWT (RS256)
  6. Returns decoded payload → { sub: "clerk_user_id", ... }
        │
        ▼
Route handler reads payload["sub"] = the Clerk user ID
        │
        ▼
get_or_create_user() syncs the user into local PostgreSQL users table
  - Tries Clerk Management API first (gets full name + email)
  - Falls back to JWT payload claims
  - Falls back to placeholder so the FK constraint is always satisfied
```

### JWKS Caching

Public keys are cached per issuer for **1 hour** to avoid a network call on every request. On a `kid` miss (key rotation), the cache is invalidated and the JWKS is re-fetched once.

### Frontend API Helper (`client/lib/api.ts`)

```ts
// Unauthenticated request
request<T>(path, options)

// Authenticated request — injects Clerk token automatically
authedRequest<T>(path, getToken, options)
// Usage in a component:
const { getToken } = useAuth();
authedRequest("/api/sessions", getToken);
```

`getToken` comes from Clerk's `useAuth()` hook. The helper fetches the current token and adds `Authorization: Bearer <token>` to every request.

---

## 2. Auth API

**Base prefix:** `/api/auth`

### `GET /api/auth/me`

Returns the currently authenticated user's profile. On first call, syncs the Clerk user into the local database.

**Auth required:** Yes (Bearer token)

**Response:**
```json
{
  "id": "clerk_user_id",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "Software Engineer"
}
```

**Errors:**
| Status | Reason |
|--------|--------|
| 401 | Missing/invalid/expired token |
| 500 | User sync failed |

---

## 3. Sessions (Scheduling) API

**Base prefix:** `/api/sessions`

All endpoints except `GET /available-slots` and `GET /invite/{invite_code}` require a valid Bearer token.

### Database Tables

**`sessions`**
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| host_user_id | VARCHAR | FK → users |
| guest_user_id | VARCHAR (nullable) | FK → users, null until matched |
| track | VARCHAR | `dsa` or `behavioral` |
| mode | VARCHAR | `peer` or `friend` |
| difficulty | VARCHAR | `beginner`, `intermediate`, `advanced` |
| scheduled_date | DATE | |
| scheduled_time | VARCHAR | e.g. `"9:00 AM"` |
| status | VARCHAR | `pending` → `matched` → `active` → `completed` / `cancelled` |
| session_link | UUID | auto-generated |

**`friend_invites`**
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| session_id | INTEGER | FK → sessions |
| inviter_user_id | VARCHAR | FK → users |
| invitee_email | VARCHAR | |
| invite_code | UUID | unique, auto-generated |
| message | TEXT (nullable) | |
| expires_at | TIMESTAMP | default: 7 days from creation |
| status | VARCHAR | `pending`, `accepted`, `expired` |

---

### Available Time Slots

**DSA track** — 2-hour blocks:
`9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, 5:00 PM, 7:00 PM, 9:00 PM`

**Behavioral track** — 90-minute blocks:
`9:00 AM, 10:30 AM, 12:00 PM, 1:30 PM, 3:00 PM, 4:30 PM, 6:00 PM, 7:30 PM, 9:00 PM`

---

### `GET /api/sessions/available-slots`

Returns available time slots for a given date and track. Optionally filters by difficulty. If authenticated, also marks slots already booked by the requesting user as unavailable.

**Auth:** Optional

**Query params:**
| Param | Required | Example |
|-------|----------|---------|
| date | Yes | `2026-04-01` |
| track | Yes | `dsa` or `behavioral` |
| difficulty | No | `beginner` |

**Response:**
```json
[
  { "label": "9:00 AM", "period": "morning", "available": true },
  { "label": "11:00 AM", "period": "morning", "available": false }
]
```

A slot is unavailable if:
- The user already has a session at that time (if authenticated), OR
- That slot has a session with status `matched`, `active`, or `completed`

---

### `POST /api/sessions/peer`

Schedules a peer-to-peer session. If another user already posted a pending session with the same track, difficulty, date, and time, they are matched immediately. Otherwise, the session waits as `pending`.

**Auth:** Required

**Request body:**
```json
{
  "track": "dsa",
  "difficulty": "intermediate",
  "date": "2026-04-01",
  "time": "11:00 AM"
}
```

**Response (matched):**
```json
{ "session": { ...session fields }, "status": "matched" }
```

**Response (waiting):**
```json
{ "session": { ...session fields }, "status": "pending" }
```

**Errors:**
| Status | Reason |
|--------|--------|
| 400 | Invalid track or difficulty |
| 409 | User already has a session at this time |

---

### `POST /api/sessions/friend`

Creates a friend-invite session. Generates a unique invite link that can be shared with a specific person by email.

**Auth:** Required

**Request body:**
```json
{
  "track": "behavioral",
  "email": "friend@example.com",
  "message": "Let's practice together!"
}
```

**Response:**
```json
{
  "session_id": 42,
  "invite_code": "uuid-string",
  "invite_link": "http://localhost:3000/join/uuid-string"
}
```

---

### `GET /api/sessions/invite/{invite_code}`

Fetches invite details for the join page. No auth required — the link itself is the credential.

**Response:** Invite record + session track/mode/date/time + inviter name/email

**Errors:**
| Status | Reason |
|--------|--------|
| 404 | Invite not found |
| 410 | Already accepted or expired |

---

### `POST /api/sessions/invite/{invite_code}/accept`

Accepts a friend invite. Sets the accepting user as `guest_user_id` and moves the session status to `matched`.

**Auth:** Required

**Errors:**
| Status | Reason |
|--------|--------|
| 404 | Invite not found |
| 410 | Invite no longer valid or expired |

---

### `GET /api/sessions`

Lists all sessions for the authenticated user.

**Auth:** Required

**Query params:**
| Param | Values | Effect |
|-------|--------|--------|
| status | `upcoming` | Returns `pending`, `matched`, `active` sessions |
| status | `completed` | Returns `completed`, `cancelled` sessions |
| _(omit)_ | | Returns all sessions |

**Response:** Array of session objects, each with a `partner_name` field (the other participant's name).

---

### `GET /api/sessions/{session_id}`

Returns full details for a single session. Only accessible to session participants.

For `friend` mode sessions, also returns the latest invite info (code, link, status, expiry).

**Auth:** Required

**Errors:**
| Status | Reason |
|--------|--------|
| 404 | Not found or not a participant |

---

### `PATCH /api/sessions/{session_id}/reschedule`

Reschedules a session. Only works for `pending` or `matched` sessions.

**Auth:** Required

**Request body:**
```json
{
  "date": "2026-04-05",
  "time": "3:00 PM"
}
```

**Errors:**
| Status | Reason |
|--------|--------|
| 404 | Not found or not a participant |
| 400 | Session is active/completed/cancelled |

---

### `DELETE /api/sessions/{session_id}`

Cancels a session (sets status to `cancelled`). Both host and guest can cancel.

**Auth:** Required

**Response:**
```json
{ "message": "Session cancelled" }
```

---

## 4. Session Status Lifecycle

```
POST /peer (no match found)
        │
        ▼
     pending  ──── another user books same slot ────▶  matched
        │                                                  │
        │ POST /friend                                      │
        ▼                                                  ▼
     pending  ──── /invite/{code}/accept ──────────▶  matched
                                                          │
                                                     (future) active
                                                          │
                                                     completed
                                          (any stage)
                                               cancelled
```
