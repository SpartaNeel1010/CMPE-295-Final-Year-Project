from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer
from app.database import execute
from app.security import verify_clerk_token, clerk

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer_scheme = HTTPBearer()

@router.get("/me")
async def get_me(request: Request, _token=Depends(bearer_scheme)):
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject"
        )
        
    user = execute(
        "SELECT id, name, email, role, created_at FROM users WHERE id = %s",
        (user_id,),
        fetch="one",
    )
    
    if not user:
        # User not in local database, fetch from Clerk and insert
        try:
            clerk_user = clerk.users.get(user_id)
            first_name = clerk_user.first_name or ""
            last_name = clerk_user.last_name or ""
            name = f"{first_name} {last_name}".strip() or "User"
            email = clerk_user.email_addresses[0].email_address if clerk_user.email_addresses else ""
            
            user = execute(
                """
                INSERT INTO users (id, name, email, role)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, email, role, created_at
                """,
                (user_id, name, email, "Software Engineer"),
                fetch="one",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error syncing user: {str(e)}"
            )

    return {"id": str(user["id"]), "name": user["name"], "email": user["email"], "role": user["role"]}
