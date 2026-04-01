"""
Clerk JWT verification via OIDC JWKS (RS256).

Flow:
  1. Extract Bearer token from Authorization header.
  2. Decode (unverified) to read the `iss` (issuer) claim.
  3. Fetch the public JWKS from {iss}/.well-known/jwks.json  ← no auth needed.
  4. Verify the token signature + expiry with PyJWT.
  5. Return the claims dict (contains `sub` = Clerk user ID).

JWKS keys are cached per issuer for 1 hour to avoid a network call on every request.
"""

import json
import logging
import os
import ssl
import time
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

import certifi
import jwt
from fastapi import HTTPException, Request, status

# Keep the Clerk SDK object available for other SDK calls (e.g. clerk.users.get)
from clerk_backend_api import Clerk

_SECRET_KEY: str = os.environ.get("CLERK_SECRET_KEY", "")
clerk = Clerk(bearer_auth=_SECRET_KEY)


def get_or_create_user(user_id: str, jwt_payload: dict | None = None) -> None:
    """Ensure the Clerk user exists in the local `users` table.

    Tries the Clerk Management API first; falls back to JWT payload claims
    (or a placeholder) if that call fails, so the FK constraint is always
    satisfied and the request never 500s due to a profile-sync issue.
    """
    from app.database import execute  # local import avoids circular dependency

    if execute("SELECT id FROM users WHERE id = %s", (user_id,), fetch="one"):
        return

    name  = ""
    email = ""

    # Attempt 1 – Clerk Management API
    try:
        clerk_user = clerk.users.get(user_id=user_id)

        # Name: prefer first+last, then username, then email prefix
        first = clerk_user.first_name or ""
        last  = clerk_user.last_name  or ""
        name  = f"{first} {last}".strip()

        # Email: match against primary_email_address_id, not just index 0
        primary_id = getattr(clerk_user, "primary_email_address_id", None)
        email_obj = next(
            (e for e in (clerk_user.email_addresses or []) if e.id == primary_id),
            (clerk_user.email_addresses or [None])[0] if clerk_user.email_addresses else None,
        )
        email = email_obj.email_address if email_obj else ""

        # If still no name, try username then derive from email
        if not name:
            name = getattr(clerk_user, "username", None) or ""
        if not name and email:
            name = email.split("@")[0]
    except Exception as exc:
        logger.warning("Clerk Management API call failed for user %s: %s", user_id, exc)

    # Attempt 2 – JWT payload claims (present when Clerk JWT templates include them)
    # Check name and email independently so a missing email isn't skipped
    if jwt_payload:
        if not name:
            first = jwt_payload.get("first_name", "") or ""
            last  = jwt_payload.get("last_name",  "") or ""
            name  = f"{first} {last}".strip() or jwt_payload.get("username", "") or ""
        if not email:
            email = jwt_payload.get("email", "") or ""

    # Final fallback – placeholder so FK constraint is satisfied
    if not name:
        name = "User"
    if not email:
        # Keep the local profile insertable even when Clerk/JWT omit email.
        email = f"{user_id}@placeholder.local"

    execute(
        """INSERT INTO users (id, name, email, role)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (id) DO NOTHING""",
        (user_id, name, email, "Software Engineer"),
    )

# ── JWKS cache (keyed by issuer URL) ─────────────────────────────────────────

_jwks_cache: dict[str, dict[str, Any]] = {}
_JWKS_TTL = 3600          # seconds before re-fetching
_SSL_CTX  = ssl.create_default_context(cafile=certifi.where())


def _load_jwks(issuer: str) -> list[dict]:
    """Return the list of JWK dicts from {issuer}/.well-known/jwks.json.

    Results are cached per issuer for _JWKS_TTL seconds.
    """
    now   = time.monotonic()
    entry = _jwks_cache.get(issuer)
    if entry and (now - entry["fetched_at"]) < _JWKS_TTL:
        return entry["keys"]

    url = f"{issuer}/.well-known/jwks.json"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10, context=_SSL_CTX) as resp:
        data = json.loads(resp.read())

    keys = data.get("keys", [])
    _jwks_cache[issuer] = {"keys": keys, "fetched_at": now}
    return keys


# ── Token verification ────────────────────────────────────────────────────────

async def verify_clerk_token(request: Request) -> dict:
    """Verify the Clerk JWT in the Authorization: Bearer header.

    Returns the decoded payload dict on success.
    Raises HTTP 401 on any failure.
    """
    # 1. Extract raw token
    auth: str = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization: Bearer header",
        )
    token = auth.split(" ", 1)[1].strip()

    # 2. Decode header + claims WITHOUT signature verification to get iss + kid
    try:
        unverified_header  = jwt.get_unverified_header(token)
        unverified_payload = jwt.decode(
            token,
            options={"verify_signature": False},
        )
    except jwt.DecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed token: {exc}",
        )

    issuer: str | None = unverified_payload.get("iss")
    kid:    str | None = unverified_header.get("kid")

    if not issuer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'iss' claim",
        )

    # 3. Fetch JWKS from the issuer (public endpoint, cached)
    try:
        keys = _load_jwks(issuer)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not fetch JWKS: {exc}",
        )

    # 4. Find the matching key (retry once on kid miss to handle rotation)
    def _find(ks: list[dict]) -> dict | None:
        return next((k for k in ks if k.get("kid") == kid), None)

    jwk = _find(keys)
    if jwk is None:
        # Force cache refresh and try once more
        _jwks_cache.pop(issuer, None)
        try:
            keys = _load_jwks(issuer)
        except Exception:
            pass
        jwk = _find(keys)

    if jwk is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"No public key found for kid={kid!r}",
        )

    # 5. Verify signature + expiry
    try:
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(jwk))
        payload: dict = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},  # Clerk tokens don't always include aud
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )
