# Interview Ramp — User Authentication

> **Course:** CMPE 295 — Master's Project  
> **Last Updated:** May 2026

---

## 1. Authentication Provider: Clerk

Interview Ramp delegates all identity management to **Clerk** — a third-party authentication-as-a-service provider. Clerk handles:

- User registration (email/password or Google OAuth)
- Password hashing, storage, and reset flows
- Multi-factor authentication (optional)
- Session management and token issuance
- Pre-built UI components (`<SignIn>`, `<SignUp>`, `<UserButton>`)

**Why Clerk?**  
By offloading auth to Clerk, the application never touches raw passwords. The backend only validates signed tokens, eliminating an entire class of security vulnerabilities.

---

## 2. Authentication Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Next.js)                           │
│                                                                          │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────────┐     │
│  │ ClerkProvider│    │  middleware.ts │    │    lib/api.ts            │     │
│  │ (root layout)│    │              │    │                          │     │
│  │             │    │ Protects:     │    │ authedRequest(path,      │     │
│  │ Wraps entire│    │ /dashboard    │    │   getToken, options)     │     │
│  │ app with    │    │ /lobby/*      │    │                          │     │
│  │ auth context│    │ /session/*    │    │ 1. getToken() → JWT      │     │
│  │             │    │ /schedule     │    │ 2. Authorization: Bearer │     │
│  │             │    │ /sessions     │    │ 3. fetch(backend_url)    │     │
│  └─────────────┘    └──────────────┘    └──────────────────────────┘     │
│                                                                          │
│  Auth Components:                                                        │
│  • /login  → <SignIn />     (Clerk UI)                                  │
│  • /signup → <SignUp />     (Clerk UI)                                  │
│  • /sso-callback            (OAuth redirect handler)                     │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                        Authorization: Bearer <JWT>
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (FastAPI)                            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                      security.py                                  │    │
│  │                                                                    │    │
│  │  verify_clerk_token(request):                                      │    │
│  │    1. Extract Bearer token from Authorization header               │    │
│  │    2. Decode JWT (unverified) → read `iss` and `kid`              │    │
│  │    3. Fetch JWKS from {iss}/.well-known/jwks.json (cached 1 hr)   │    │
│  │    4. Find public key matching `kid`                               │    │
│  │    5. Verify RS256 signature + expiry via PyJWT                    │    │
│  │    6. Return decoded payload { sub: "clerk_user_id", ... }        │    │
│  │                                                                    │    │
│  │  get_or_create_user(user_id, jwt_payload):                        │    │
│  │    1. Check if user exists in PostgreSQL                           │    │
│  │    2. Try Clerk Management API (name + email)                     │    │
│  │    3. Fallback to JWT payload claims                               │    │
│  │    4. Fallback to placeholder                                      │    │
│  │    5. INSERT ... ON CONFLICT DO NOTHING                           │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Route Protection: Depends(HTTPBearer()) on every protected endpoint     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Authentication

### 3.1 ClerkProvider

The entire application is wrapped in Clerk's context provider in `client/app/layout.tsx`:

```tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

This provides the `useAuth()`, `useUser()`, and `useClerk()` hooks to all client components.

### 3.2 Route Protection (Middleware)

`client/middleware.ts` uses Clerk's `clerkMiddleware` to protect authenticated routes:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/lobby(.*)",
  "/session(.*)",
  "/schedule(.*)",
  "/sessions(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();  // Redirects to /login if unauthenticated
  }
});
```

**Protected routes:** `/dashboard`, `/lobby/*`, `/session/*`, `/schedule`, `/sessions`  
**Public routes:** `/`, `/login`, `/signup`, `/sso-callback`

### 3.3 API Client with Auth

`client/lib/api.ts` provides an `authedRequest()` function that automatically injects the Clerk session token:

```typescript
export async function authedRequest<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  return request<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
```

**Usage in components:**
```typescript
const { getToken } = useAuth();  // Clerk hook
const data = await authedRequest("/api/sessions/dashboard", getToken);
```

### 3.4 Frontend Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (used client-side for auth UI) |
| `CLERK_SECRET_KEY` | Clerk secret key (used server-side for SSR auth) |

---

## 4. Backend Authentication

### 4.1 JWT Verification Flow

Every authenticated request goes through `verify_clerk_token()` in `backend/app/security.py`:

**Step 1: Extract Token**
```python
auth: str = request.headers.get("authorization", "")
if not auth.lower().startswith("bearer "):
    raise HTTPException(status_code=401, detail="Missing Authorization: Bearer header")
token = auth.split(" ", 1)[1].strip()
```

**Step 2: Read Claims (Unverified)**
```python
unverified_header  = jwt.get_unverified_header(token)   # Get `kid`
unverified_payload = jwt.decode(token, options={"verify_signature": False})  # Get `iss`
issuer = unverified_payload.get("iss")  # e.g., "https://pro-whale-0.clerk.accounts.dev"
kid    = unverified_header.get("kid")
```

**Step 3: Fetch Public Keys (JWKS)**
```python
url = f"{issuer}/.well-known/jwks.json"
# Cached per issuer for 1 hour
# On kid miss (key rotation), cache is invalidated and re-fetched
```

**Step 4: Find Matching Key**
```python
jwk = next((k for k in keys if k.get("kid") == kid), None)
# If not found: clear cache, re-fetch, try again (handles key rotation)
```

**Step 5: Verify Signature**
```python
public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
payload = jwt.decode(
    token,
    public_key,
    algorithms=["RS256"],
    options={"verify_aud": False},  # Clerk tokens don't always include aud
)
```

### 4.2 JWKS Caching

Public keys are cached to avoid a network call on every request:

```python
_jwks_cache: dict[str, dict[str, Any]] = {}
_JWKS_TTL = 3600  # 1 hour

def _load_jwks(issuer: str) -> list[dict]:
    now = time.monotonic()
    entry = _jwks_cache.get(issuer)
    if entry and (now - entry["fetched_at"]) < _JWKS_TTL:
        return entry["keys"]  # Cache hit
    # Fetch from {issuer}/.well-known/jwks.json
    # Store in cache with timestamp
```

**Key rotation handling:** If a `kid` isn't found in the cached keys, the cache is invalidated and JWKS is re-fetched once before failing.

### 4.3 User Synchronization

After JWT verification, `get_or_create_user()` ensures the user exists in PostgreSQL:

```
1. SELECT id FROM users WHERE id = %s
   └── EXISTS → return immediately (no-op)

2. TRY: Clerk Management API
   clerk.users.get(user_id=user_id)
   └── Extract first_name, last_name, primary_email

3. FALLBACK: JWT payload claims
   jwt_payload.get("first_name"), jwt_payload.get("email")

4. FALLBACK: Placeholder
   name = "User", email = "{user_id}@placeholder.local"

5. INSERT INTO users (id, name, email, role)
   VALUES (%s, %s, %s, 'Software Engineer')
   ON CONFLICT (id) DO NOTHING
```

### 4.4 Route-Level Protection

Every protected endpoint uses FastAPI's dependency injection:

```python
from fastapi.security import HTTPBearer
bearer_scheme = HTTPBearer()

@router.get("/me")
async def get_me(request: Request, _token=Depends(bearer_scheme)):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    # ... handler logic
```

Some endpoints use optional auth:

```python
optional_bearer_scheme = HTTPBearer(auto_error=False)

@router.get("/available-slots")
async def get_available_slots(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer_scheme),
):
    # If authenticated → also check user's existing bookings
    # If unauthenticated → return general availability
```

### 4.5 Backend Environment Variables

| Variable | Purpose |
|----------|---------|
| `CLERK_SECRET_KEY` | Clerk Management API secret (for user profile sync) |

---

## 5. Token Lifecycle

```
┌───────────────────────────────────────────────────┐
│                 TOKEN LIFECYCLE                     │
├───────────────────────────────────────────────────┤
│                                                    │
│  1. User signs in via Clerk UI                     │
│     └── Clerk validates credentials                │
│     └── Clerk stores session in browser cookies    │
│                                                    │
│  2. Component needs to make API call               │
│     └── const { getToken } = useAuth()             │
│     └── const token = await getToken()             │
│     └── Clerk returns fresh JWT (short-lived)      │
│                                                    │
│  3. Token sent to backend                          │
│     └── Authorization: Bearer <token>              │
│                                                    │
│  4. Backend verifies token                         │
│     └── RS256 signature check                      │
│     └── Expiry check                               │
│     └── Returns decoded payload                    │
│                                                    │
│  5. Token expired?                                 │
│     └── getToken() automatically refreshes         │
│     └── Clerk handles refresh transparently        │
│                                                    │
│  6. User signs out                                 │
│     └── Clerk clears session cookies               │
│     └── Subsequent getToken() returns null          │
│     └── Protected routes redirect to /login        │
└───────────────────────────────────────────────────┘
```

---

## 6. Authentication Error Handling

| Error | HTTP Status | Detail Message | Cause |
|-------|------------|----------------|-------|
| Missing header | 401 | "Missing Authorization: Bearer header" | No Authorization header or wrong format |
| Malformed token | 401 | "Malformed token: {error}" | Token is not valid JWT format |
| Missing issuer | 401 | "Token missing 'iss' claim" | JWT doesn't contain `iss` field |
| JWKS fetch failure | 401 | "Could not fetch JWKS: {error}" | Network error reaching Clerk's JWKS endpoint |
| Key not found | 401 | "No public key found for kid={kid}" | Key ID not in JWKS (even after refresh) |
| Token expired | 401 | "Token has expired" | JWT `exp` claim is in the past |
| Invalid signature | 401 | "Invalid token: {error}" | Token was tampered with or signed by wrong key |
| Missing subject | 401 | "Token missing subject" | JWT doesn't contain `sub` field |
| User sync failure | 500 | "Error syncing user" | Database error during user creation |

---

## 7. Security Considerations

| Aspect | Implementation |
|--------|---------------|
| **Password storage** | Handled entirely by Clerk (never touches our systems) |
| **Token algorithm** | RS256 (asymmetric) — backend only needs public keys |
| **Token lifetime** | Short-lived (Clerk default ~60 seconds); auto-refreshed by `getToken()` |
| **Key rotation** | Handled automatically via JWKS cache invalidation on `kid` miss |
| **CORS** | Backend allows all origins (`allow_origins=["*"]`) for Cloud Run flexibility |
| **Secrets management** | Backend `.env` stored in Google Secret Manager, mounted at `/secrets/.env` |
| **Route protection** | Two layers — Clerk middleware (frontend) + HTTPBearer dependency (backend) |
| **OAuth** | Google OAuth supported via Clerk (SSO callback at `/sso-callback`) |
| **Invite links** | UUID-based codes with 7-day expiry; link itself is the credential (no auth needed to view invite) |

---

## 8. Authentication Endpoints

### `GET /api/auth/me`

**Purpose:** Returns the authenticated user's profile; creates the user in PostgreSQL on first call.

**Auth:** Required (Bearer token)

**Flow:**
1. Verify Clerk JWT
2. Extract `sub` (user ID) from payload
3. Query `users` table
4. If not found → `get_or_create_user()` → query again
5. Return `{ id, name, email, role }`

**Response:**
```json
{
  "id": "user_2abc123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "Software Engineer"
}
```

**Errors:**
| Status | Reason |
|--------|--------|
| 401 | Missing, invalid, or expired token |
| 500 | User sync failed (database error) |
