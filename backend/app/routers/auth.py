from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.database import execute
from app.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer()


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest):
    # Check if email already exists
    existing = execute(
        "SELECT id FROM users WHERE email = %s",
        (body.email,),
        fetch="one",
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    hashed = hash_password(body.password)
    user = execute(
        """
        INSERT INTO users (name, email, password, role)
        VALUES (%s, %s, %s, %s)
        RETURNING id, name, email, role, created_at
        """,
        (body.name, body.email, hashed, body.role),
        fetch="one",
    )

    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return TokenResponse(
        token=token,
        user={"id": str(user["id"]), "name": user["name"], "email": user["email"], "role": user["role"]},
    )


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = execute(
        "SELECT id, name, email, password, role FROM users WHERE email = %s",
        (body.email,),
        fetch="one",
    )
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return TokenResponse(
        token=token,
        user={"id": str(user["id"]), "name": user["name"], "email": user["email"], "role": user["role"]},
    )


# ── Get current user (protected example) ─────────────────────────────────────

@router.get("/me")
def get_me(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user = execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id = %s",
        (payload["sub"],),
        fetch="one",
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return {"id": str(user["id"]), "name": user["name"], "email": user["email"], "role": user["role"]}
