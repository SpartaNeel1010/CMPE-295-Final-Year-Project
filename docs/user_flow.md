# Interview Ramp — User Flow

> **Course:** CMPE 295 — Master's Project  
> **Last Updated:** May 2026

---

## 1. Complete User Journey Overview

```
Landing Page → Sign Up/In → Dashboard → Schedule Session → Wait for Match
    → Lobby → Live Interview (Round 1 + Round 2) → Peer Feedback
    → AI Feedback → Dashboard (updated stats) → Repeat
```

---

## 2. Landing Page (Unauthenticated)

**Route:** `/`

1. User arrives at the landing page
2. Sees the marketing sections: Hero, Who It's For, How It Works, Benefits, Testimonials, FAQ, CTA
3. Clicks **"Get Started"** or **"Sign Up"** → redirected to `/signup`
4. Alternatively clicks **"Log In"** → redirected to `/login`

---

## 3. Authentication Flow

### 3.1 Sign Up

**Route:** `/signup`

1. User sees Clerk's `<SignUp>` component
2. Options: Email/password **or** Google OAuth
3. On success → Clerk issues a session token → user redirected to `/dashboard`
4. First API call to `GET /api/auth/me` triggers `get_or_create_user()`:
   - Backend fetches user profile from Clerk Management API
   - Creates a row in `users` table (PostgreSQL) with Clerk ID, name, email

### 3.2 Sign In

**Route:** `/login`

1. User enters credentials or clicks Google sign-in
2. Clerk validates and issues a JWT (RS256-signed)
3. Redirect to `/dashboard`

### 3.3 SSO Callback

**Route:** `/sso-callback`

- Handles OAuth redirects from Google
- Clerk processes the callback and establishes the session

---

## 4. Dashboard

**Route:** `/dashboard` (Protected)

1. On mount, `DashboardClient.tsx` calls `GET /api/sessions/dashboard`
2. Backend returns aggregated data in a single payload:
   - **Stats bar:** Total sessions, completed, upcoming, cancelled, average rating
   - **Next session card:** Shows the soonest upcoming session with partner name and join button
   - **Recent sessions:** Last 5 completed sessions with feedback received
   - **Track breakdown:** DSA vs Behavioral distribution (bar chart)
   - **Difficulty breakdown:** Beginner / Intermediate / Advanced
   - **Monthly activity:** Session count over the last 6 months (line chart)
   - **Category averages:** Radar/bar chart of 6 feedback categories
3. User can click:
   - **"Schedule New Session"** → `/schedule`
   - **"View All Sessions"** → `/sessions`
   - **"Join"** on next session → `/lobby/{session_link}`

---

## 5. Scheduling a Session

**Route:** `/schedule` (Protected)

### 5.1 Peer Mode Flow

```
1. Select Track: DSA or Behavioral
2. Select Difficulty: Beginner / Intermediate / Advanced
3. Pick Date from calendar
4. View available time slots (fetched from GET /api/sessions/available-slots)
   - Slots already booked by user → greyed out
   - Fully matched slots → greyed out
5. Click a slot → Confirm
6. POST /api/sessions/peer with { track, difficulty, date, time }
7. Backend checks:
   a. Does user already have a session at this time? → 409 error
   b. Is there a pending session with same params from another user?
      → YES: Auto-match (guest_user_id = current user, status = 'matched')
      → NO: Create new session (status = 'pending', waiting for match)
8. User sees confirmation:
   - "Matched!" → can go to lobby immediately
   - "Pending" → will be matched when another user books the same slot
```

### 5.2 Friend Mode Flow

```
1. Select Track: DSA or Behavioral
2. Enter friend's email address
3. Optional: Add a personal message
4. POST /api/sessions/friend with { track, email, message }
5. Backend:
   a. Creates session (status = 'pending', mode = 'friend')
   b. Creates friend_invite record (invite_code = UUID, expires in 7 days)
   c. Sends styled HTML email via Gmail SMTP with lobby link
6. User sees invite link → can share manually too
7. Friend receives email → clicks "Join the Session" button
8. Friend signs in (if needed) → hits /lobby/{session_link}
9. Lobby auto-accepts the invite → session status = 'matched'
```

---

## 6. Pre-Session Lobby

**Route:** `/lobby/[sessionLink]` (Protected)

```
1. User navigates to /lobby/{session_link}
2. LobbyClient.tsx calls POST /api/sessions/link/{link}/join-lobby
   - Backend marks host_joined_lobby=TRUE or guest_joined_lobby=TRUE
   - If friend invite exists and user isn't a participant → auto-accept invite
3. Frontend polls GET /api/sessions/link/{link}/lobby-status every 3 seconds
4. Lobby status response includes:
   - host_joined / guest_joined booleans
   - host_name / guest_name
   - question1 / question2 (full question documents from MongoDB)
   - Session metadata (track, difficulty, date, time)
5. Display states:
   - "Waiting for partner..." (only one participant joined)
   - "Both joined! Starting session..." (both participants present)
6. When both_joined = true:
   - Backend sets status = 'active' and started_at = NOW()
   - Frontend redirects to /session/{session_link}
```

**Question Assignment (happens in lobby-status):**
- On first lobby-status call, if `question1_slug` is NULL:
  - Backend queries MongoDB for questions matching the session's difficulty
  - Randomly selects 2 questions (one per round)
  - Atomically writes slugs to the sessions table (`UPDATE ... WHERE question1_slug IS NULL`)
  - Subsequent calls return the already-assigned questions

---

## 7. Live Interview Session

**Route:** `/session/[sessionLink]` (Protected)

### 7.1 Session Initialization

```
1. SessionClient.tsx mounts
2. Fetches lobby-status for session metadata, questions, role (is_host)
3. Connects to WebSocket /ws/session/{session_link}
4. Fetches LiveKit token from GET /api/sessions/link/{link}/livekit-token
5. Connects to LiveKit room for video/audio
6. Loads Monaco Editor with question 1's starter code
7. Starts 60-minute countdown timer
```

### 7.2 Round Structure

```
┌────────────────────────────────────────────────────┐
│                    ROUND 1 (30 min)                │
│                                                    │
│  Host = Interviewee     Guest = Interviewer        │
│  • Host sees Question 1 + code editor              │
│  • Host writes code, runs tests, submits           │
│  • Guest sees question + real-time code (read-only)│
│  • Both have video/audio + text chat               │
├────────────────────────────────────────────────────┤
│                    ROUND 2 (30 min)                │
│                                                    │
│  Guest = Interviewee    Host = Interviewer          │
│  • Roles swap                                       │
│  • Question 2 loaded                                │
│  • Guest writes code, Host observes                 │
└────────────────────────────────────────────────────┘
```

### 7.3 During the Session

**Code Editing:**
- Interviewee types in Monaco Editor
- Every keystroke sends a `code_update` WebSocket message
- Interviewer's editor updates in real-time (read-only)
- Code auto-saved to backend: `PATCH /api/sessions/link/{link}/save-code`

**Code Execution:**
- Interviewee clicks "Run" → `POST /api/execute` with visible test cases only
- Interviewee clicks "Submit" → `POST /api/execute` with all test cases (visible + hidden)
- Results appear inline: ✅ passed / ❌ failed for each test case
- Supported languages: Python, JavaScript, TypeScript, Java, C++, Go

**Chat:**
- Text messages sent via WebSocket `chat_message` events
- Displayed in a chat panel alongside the video feed
- All messages accumulated in `transcriptRef` for AI feedback

**Video/Audio:**
- LiveKit provides peer-to-peer (or SFU-relayed) video/audio
- Camera and microphone toggle buttons
- Connection status indicators

### 7.4 Session End

The session ends when any of these occur:
1. **Timer expires** (60 minutes) → auto-complete
2. **User clicks "End Session"** → `POST /api/sessions/link/{link}/early-exit`
3. **Partner disconnects** → WebSocket `participant_left` event → prompt to end

---

## 8. Post-Session Feedback Flow

### 8.1 Peer Feedback

```
1. Session ends → feedback overlay appears
2. User rates their partner on 6 categories (1–5 stars each):
   - Coding Skills
   - Explaining Approach
   - Navigating Edge Cases
   - Follow-up Questions
   - Communication
   - Problem Solving
3. Optional: Write comments
4. Submit → POST /api/sessions/link/{link}/feedback
5. Or Skip → move to AI feedback
```

### 8.2 AI Feedback (Interviewee Only)

```
1. After peer feedback submit/skip
2. If user was the interviewee in a round:
   - Frontend calls POST /api/sessions/link/{link}/ai-feedback
     Body: { round: 1 or 2, transcript: "..." }
3. Backend:
   a. Determines which question/code applies to this user as interviewee
   b. Checks cache (ai_feedback table) → returns instantly if cached
   c. Builds prompt with question, code, transcript
   d. Calls OpenAI GPT-4o (response_format: json_object)
   e. Persists result in ai_feedback table
   f. Returns structured JSON
4. Frontend shows premium AI Feedback overlay:
   - Overall score (1–10) with circular progress
   - Category mini-scores (Code Quality, Problem Solving, Communication)
   - Strengths (green bullets)
   - Areas for Improvement (amber bullets)
   - Time Complexity analysis
   - Suggested Study Topics
   - Pro Tip for next interview
```

---

## 9. Session Management

**Route:** `/sessions` (Protected)

### 9.1 Upcoming Sessions Tab

```
1. Lists all sessions with status: pending, matched, active
2. Auto-expires sessions 30 minutes past scheduled time
3. For each session shows: track, difficulty, date/time, partner name, status badge
4. Actions:
   - "Join" → /lobby/{session_link} (for matched/active sessions)
   - "Reschedule" → PATCH /api/sessions/{id}/reschedule
   - "Cancel" → DELETE /api/sessions/{id}
   - "View Details" → modal with full info + invite link (friend mode)
```

### 9.2 Completed Sessions Tab

```
1. Lists all sessions with status: completed, cancelled, expired
2. For each session shows: track, difficulty, date/time, partner name, status badge
3. Actions:
   - "View Feedback" → shows received peer feedback in a modal
   - "View AI Feedback" → shows AI-generated feedback overlay
```

---

## 10. Friend Invite Flow (Recipient's Perspective)

```
1. Receive email with "Join the Session" button
2. Click link → opens /lobby/{session_link}
3. If not signed in → Clerk middleware redirects to /login
4. After sign-in → redirect back to /lobby/{session_link}
5. LobbyClient calls POST /api/sessions/link/{link}/join-lobby
6. Backend detects user is not a participant:
   a. Finds pending friend_invite for this session
   b. Auto-accepts: sets guest_user_id, status = 'matched'
7. User enters lobby → waits for host (or host is already there)
8. Both joined → redirect to /session/{session_link}
```

---

## 11. Error & Edge Case Flows

| Scenario | Behavior |
|----------|----------|
| User books a slot they already have | 409 Conflict — "You already have a session at this time" |
| Invalid track or difficulty | 400 Bad Request |
| Invite already accepted | 410 Gone — "Invite already accepted" |
| Invite expired (7 days) | 410 Gone — "Invite has expired" |
| Session past scheduled time + 30 min | Auto-expired on next list fetch |
| Partner disconnects mid-session | `participant_left` WS event → prompt to end session |
| Duplicate feedback submission | 409 Conflict — "Feedback already submitted" |
| No questions in MongoDB for difficulty | 404 — "Not enough questions for this difficulty" |
| Judge0 timeout | 504 Gateway Timeout |
| OpenAI API failure | 502 Bad Gateway |
| SMTP not configured | Email silently skipped (logged) |
