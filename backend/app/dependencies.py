from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import JWT_SECRET, supabase

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "mes_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_leader(current_user: dict = Depends(get_current_user)) -> dict:
    allowed = ["mes_admin", "main_leader", "assistant_leader", "floater"]
    if current_user.get("role") not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Leader access required"
        )
    return current_user

def require_main_leader(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["mes_admin", "main_leader"]:
        raise HTTPException(status_code=403, detail="Main leader or admin access required")
    return current_user

def can_remove_user(actor_role: str, target_role: str) -> bool:
    hierarchy = {
        "mes_admin": ["main_leader", "assistant_leader", "floater", "operator"],
        "main_leader": ["assistant_leader", "floater", "operator"],
        "assistant_leader": ["floater", "operator"],
        "floater": ["operator"],
    }
    return target_role in hierarchy.get(actor_role, [])