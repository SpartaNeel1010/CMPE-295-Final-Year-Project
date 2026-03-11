import os
from fastapi import Request, HTTPException, status
from clerk_backend_api import Clerk
from clerk_backend_api.security import AuthenticateRequestOptions

clerk = Clerk(bearer_auth=os.environ.get("CLERK_SECRET_KEY"))

async def verify_clerk_token(request: Request) -> dict:
    """
    Verifies the Clerk JWT token from the Authorization header using the clerk-backend-api SDK.
    Returns the token payload if valid, otherwise raises a 401 HTTPException.
    """
    # Create a request-like object that Clerk SDK expects
    class Requestish:
        def __init__(self, req: Request):
            self.headers = dict(req.headers)
            self.url = str(req.url)
            self.method = req.method

    req_wrapper = Requestish(request)
    
    try:
        # We use the sync or async method. Let's try sync.
        request_state = clerk.authenticate_request(
            req_wrapper,
            AuthenticateRequestOptions()
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )
        
    if not request_state.is_signed_in:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token."
        )
        
    # request_state.payload contains the JWT claims
    return getattr(request_state, "payload", {})
