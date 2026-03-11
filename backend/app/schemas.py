from pydantic import BaseModel, EmailStr, field_validator



class TokenResponse(BaseModel):
    token: str
    user: dict
