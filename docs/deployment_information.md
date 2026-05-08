# Interview Ramp — Deployment Information

> **Course:** CMPE 295 — Master's Project  
> **Last Updated:** May 2026

---

## 1. Deployment Overview

Interview Ramp is deployed as two independent containerized services on **Google Cloud Run**, with managed databases on **Neon.tech** (PostgreSQL) and **MongoDB Atlas** (MongoDB).

```
┌──────────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD PROJECT                          │
│                    interviewramp-495402                           │
│                    Region: us-central1                           │
│                                                                  │
│  ┌────────────────────┐      ┌────────────────────┐             │
│  │  Cloud Run:        │      │  Cloud Run:        │             │
│  │  interview-ramp-   │      │  interview-ramp-   │             │
│  │  frontend          │◄────►│  backend           │             │
│  │  Port: 3000        │      │  Port: 8080        │             │
│  └────────┬───────────┘      └────────┬───────────┘             │
│           │                           │                          │
│  ┌────────┴───────────┐      ┌────────┴───────────┐             │
│  │  Artifact Registry │      │  Artifact Registry │             │
│  │  frontend-repo     │      │  backend-repo      │             │
│  └────────────────────┘      └────────────────────┘             │
│                                                                  │
│  ┌────────────────────┐                                         │
│  │  Secret Manager    │                                         │
│  │  backend-env-file  │ ── mounted at /secrets/.env             │
│  └────────────────────┘                                         │
└──────────────────────────────────────────────────────────────────┘

External:
  ┌──────────────┐    ┌──────────────┐
  │  Neon.tech   │    │  MongoDB     │
  │  PostgreSQL  │    │  Atlas       │
  │  (Serverless)│    │  (Cloud)     │
  └──────────────┘    └──────────────┘
```

---

## 2. Google Cloud Project Details

| Property | Value |
|----------|-------|
| **Project ID** | `interviewramp-495402` |
| **Region** | `us-central1` |
| **Artifact Registry (Backend)** | `us-central1-docker.pkg.dev/interviewramp-495402/backend-repo` |
| **Artifact Registry (Frontend)** | `us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo` |
| **Cloud Run Service (Backend)** | `interview-ramp-backend` |
| **Cloud Run Service (Frontend)** | `interview-ramp-frontend` |
| **Secret Manager Secret** | `backend-env-file` |

---

## 3. Backend Deployment

### 3.1 Dockerfile

```dockerfile
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
```

**Key details:**
- Base image: `python:3.13-slim` (minimal footprint)
- Dependencies installed first for Docker layer caching
- Port 8080 (Cloud Run default)
- Uvicorn serves FastAPI without SSL (Cloud Run handles TLS termination)

### 3.2 Secrets Management

Backend secrets are stored in **Google Cloud Secret Manager** as a single file (`backend-env-file`). At deploy time, this file is mounted at `/secrets/.env` inside the container.

The backend's `app/config.py` loads environment variables with this priority:
1. `/secrets/.env` (Cloud Run secret mount)
2. `secrets/.env` (local development fallback)
3. Standard `.env` (final fallback)

```python
if os.path.exists("/secrets/.env"):
    load_dotenv("/secrets/.env")
elif os.path.exists("secrets/.env"):
    load_dotenv("secrets/.env")
else:
    load_dotenv()
```

### 3.3 Backend Deployment Commands

**Step 1: Update Secrets** (only if `secrets/.env` changed)
```bash
cd backend
gcloud secrets versions add backend-env-file --data-file="secrets/.env"
```

**Step 2: Build Docker Image** (cross-platform for Cloud Run)
```bash
docker build --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest .
```

**Step 3: Push to Artifact Registry**
```bash
docker push us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest
```

**Step 4: Deploy to Cloud Run**
```bash
gcloud run deploy interview-ramp-backend \
  --image=us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets=/secrets/.env=backend-env-file:latest
```

### 3.4 Backend Environment Variables (in `secrets/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon.tech PostgreSQL connection string |
| `MONGO_URI` | MongoDB Atlas connection string |
| `CLERK_SECRET_KEY` | Clerk Management API secret key |
| `JWT_SECRET` | Legacy JWT secret (not actively used) |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Gmail address for sending invite emails |
| `SMTP_PASSWORD` | Gmail App Password |
| `SMTP_FROM` | Sender email address |
| `CLIENT_ORIGIN` | Frontend Cloud Run URL |
| `PORT` | `8080` |

---

## 4. Frontend Deployment

### 4.1 Dockerfile (Multi-Stage Build)

```dockerfile
FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD HOSTNAME="0.0.0.0" node server.js
```

**Key details:**
- **3-stage build** for minimal image size:
  - `deps`: Install node_modules
  - `builder`: Build Next.js (inlines `NEXT_PUBLIC_*` env vars at build time)
  - `runner`: Production-only files
- **Standalone output**: `next.config.ts` has `output: "standalone"`, producing a self-contained Node.js server
- Runs as non-root user (`nextjs`)
- Port 3000

### 4.2 Build-Time Environment Variables

Next.js inlines `NEXT_PUBLIC_*` variables during `npm run build`. The `.env.local` file must be present when building the Docker image:

```
NEXT_PUBLIC_API_URL=https://interview-ramp-backend-491472438767.us-central1.run.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_LIVEKIT_URL=wss://interview-ramp-hbexa4kv.livekit.cloud
```

**Important:** These are baked into the static JS bundle at build time. Changing them requires a full rebuild and redeploy.

### 4.3 Frontend Deployment Commands

**Step 1: Build Docker Image**
```bash
cd client
docker build --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest .
```

**Step 2: Push to Artifact Registry**
```bash
docker push us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest
```

**Step 3: Deploy to Cloud Run**
```bash
gcloud run deploy interview-ramp-frontend \
  --image=us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="CLERK_SECRET_KEY=sk_test_..."
```

**Note:** `CLERK_SECRET_KEY` is passed as a runtime env var (not baked into the build) because it's used server-side by Next.js for SSR authentication.

---

## 5. Database Deployments

### 5.1 PostgreSQL — Neon.tech

| Property | Details |
|----------|---------|
| **Provider** | [Neon.tech](https://neon.tech) — Serverless PostgreSQL |
| **Connection** | Standard PostgreSQL connection string in `DATABASE_URL` |
| **Schema Init** | `backend/app/schema.sql` runs on app startup via `init_db()` |
| **Tables** | `users`, `sessions`, `friend_invites`, `session_feedback`, `ai_feedback` |
| **Extensions** | `pgcrypto` (for `gen_random_uuid()`) |
| **Connection Pool** | `psycopg2.pool.ThreadedConnectionPool` (1–10 connections) |

**Schema is idempotent:** All table creation uses `CREATE TABLE IF NOT EXISTS` and column additions use `ALTER TABLE ADD COLUMN IF NOT EXISTS`, so the app can safely restart without migration scripts.

### 5.2 MongoDB — Atlas

| Property | Details |
|----------|---------|
| **Provider** | [MongoDB Atlas](https://www.mongodb.com/atlas) — Managed MongoDB |
| **Connection** | MongoDB connection string in `MONGO_URI` |
| **Database** | `interviewramp` |
| **Collection** | `questions` |
| **Driver** | PyMongo |

**Data population:**
- `backend/seed_questions.py` — Seeds the questions collection with LeetCode-style problems
- `backend/add_judge_data.py` — Adds Judge0 test harness metadata to existing questions

---

## 6. External Service Configurations

### 6.1 Clerk (Authentication)

| Setting | Value |
|---------|-------|
| **Dashboard** | [clerk.com/dashboard](https://clerk.com) |
| **Publishable Key** | `pk_test_...` (used in frontend) |
| **Secret Key** | `sk_test_...` (used in backend + frontend SSR) |
| **OAuth Providers** | Google |
| **JWKS Endpoint** | `https://{clerk-domain}/.well-known/jwks.json` |

### 6.2 LiveKit Cloud (Video/Audio)

| Setting | Value |
|---------|-------|
| **URL** | `wss://interview-ramp-hbexa4kv.livekit.cloud` |
| **API Key** | Set in backend `secrets/.env` |
| **API Secret** | Set in backend `secrets/.env` |
| **Usage** | One room per session (room name = session_link UUID) |

### 6.3 Judge0 CE (Code Execution)

| Setting | Value |
|---------|-------|
| **Endpoint** | `https://ce.judge0.com/submissions?base64_encoded=true&wait=true` |
| **Auth** | None required (public instance) |
| **Supported Languages** | Python 3.8, Node.js 12, TypeScript 3.7, Java 13, C++ (GCC 9.2), Go 1.13 |

### 6.4 OpenAI (AI Feedback)

| Setting | Value |
|---------|-------|
| **Model** | `gpt-4o` |
| **API Key** | Set in backend `secrets/.env` as `OPENAI_API_KEY` |
| **Response Format** | `json_object` (guaranteed valid JSON) |
| **Max Tokens** | 2048 |

### 6.5 Gmail SMTP (Email)

| Setting | Value |
|---------|-------|
| **Host** | `smtp.gmail.com` |
| **Port** | `587` (STARTTLS) |
| **Auth** | Gmail App Password |

---

## 7. Local Development Setup

### 7.1 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create .env or secrets/.env with all required variables
python main.py  # Starts on http://localhost:4000
```

### 7.2 Frontend

```bash
cd client
npm install

# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_LIVEKIT_URL=wss://...

npm run dev     # Starts on http://localhost:3000
npm run https   # Starts with HTTPS (required for camera/mic in some browsers)
```

### 7.3 HTTPS for Local Development

Some features (camera, microphone) require HTTPS. For local HTTPS:

**Frontend:**
```bash
npm run https  # Uses Next.js experimental HTTPS
```

**Backend:**
```bash
cd backend
source .venv/bin/activate
# Generate self-signed certs (one-time)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
# Run with SSL
uvicorn main:app --ssl-keyfile=./key.pem --ssl-certfile=./cert.pem --port 4000 --host 0.0.0.0 --reload
```

---

## 8. Debugging & Monitoring

### Cloud Run Logs

```bash
# Backend logs
gcloud run services logs read interview-ramp-backend --region=us-central1 --limit=100

# Frontend logs
gcloud run services logs read interview-ramp-frontend --region=us-central1 --limit=100
```

### Health Check

```bash
curl https://interview-ramp-backend-491472438767.us-central1.run.app/health
# Expected: {"status": "ok"}
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Container crashes on startup | Missing env vars | Check Secret Manager secret has all required variables |
| `exec format error` | Built on ARM (Mac M1/M2/M3) | Rebuild with `--platform linux/amd64` |
| CORS errors | `CLIENT_ORIGIN` mismatch | Update `CLIENT_ORIGIN` in backend secrets to match frontend URL |
| Clerk auth failures | Wrong keys | Verify `CLERK_SECRET_KEY` matches Clerk dashboard |
| DB connection errors | IP not whitelisted | Check Neon.tech/Atlas network access settings |
| `NEXT_PUBLIC_*` wrong values | Build-time bake | Values are baked at build time; must rebuild to change |

---

## 9. Deployment Checklist

### First-Time Setup

- [ ] Create GCP project (`interviewramp-495402`)
- [ ] Enable Cloud Run, Artifact Registry, Secret Manager APIs
- [ ] Create Artifact Registry repos (`backend-repo`, `frontend-repo`)
- [ ] Configure Docker auth: `gcloud auth configure-docker us-central1-docker.pkg.dev`
- [ ] Create Neon.tech PostgreSQL database
- [ ] Create MongoDB Atlas cluster and database
- [ ] Set up Clerk application with Google OAuth
- [ ] Create LiveKit Cloud project
- [ ] Create Google Secret Manager secret (`backend-env-file`)
- [ ] Seed MongoDB questions: `python seed_questions.py && python add_judge_data.py`

### Updating the Backend

1. *(If env vars changed)* `gcloud secrets versions add backend-env-file --data-file="secrets/.env"`
2. `docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest .`
3. `docker push us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest`
4. `gcloud run deploy interview-ramp-backend --image=... --region=us-central1 --allow-unauthenticated --set-secrets=/secrets/.env=backend-env-file:latest`

### Updating the Frontend

1. *(If NEXT_PUBLIC_* vars changed)* Update `.env.local` before building
2. `docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest .`
3. `docker push us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest`
4. `gcloud run deploy interview-ramp-frontend --image=... --region=us-central1 --allow-unauthenticated --set-env-vars="CLERK_SECRET_KEY=..."`
