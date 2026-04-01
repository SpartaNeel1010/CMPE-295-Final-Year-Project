from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer
from app.database import execute
from app.security import verify_clerk_token, get_or_create_user

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
        get_or_create_user(user_id, jwt_payload=payload)
        user = execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = %s",
            (user_id,),
            fetch="one",
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error syncing user"
            )

    return {"id": str(user["id"]), "name": user["name"], "email": user["email"], "role": user["role"]}
