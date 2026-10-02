"""JWT authentication and RBAC security."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()


class Role(str, Enum):
    """User roles with increasing privilege levels."""
    AUDITOR = "auditor"
    ANALYST = "analyst"
    LEAD = "lead"
    COMPLIANCE = "compliance"
    ADMIN = "admin"


# Role hierarchy: higher can do everything lower can
ROLE_HIERARCHY: dict[Role, int] = {
    Role.AUDITOR: 0,
    Role.ANALYST: 1,
    Role.LEAD: 2,
    Role.COMPLIANCE: 3,
    Role.ADMIN: 4,
}


class TokenData(BaseModel):
    """JWT token payload."""
    user_id: str
    username: str
    role: Role
    exp: datetime


def hash_password(password: str) -> str:
    """Hash a password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, username: str, role: Role) -> str:
    """Create a JWT access token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": user_id,
        "username": username,
        "role": role.value,
        "exp": expire,
        "type": "access",
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    """Create a JWT refresh token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
        "jti": secrets.token_hex(16),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> TokenData:
    """Dependency: extract and validate current user from JWT."""
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return TokenData(
        user_id=payload["sub"],
        username=payload["username"],
        role=Role(payload["role"]),
        exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
    )


def require_role(min_role: Role):
    """Dependency factory: require minimum role level."""
    def checker(user: Annotated[TokenData, Depends(get_current_user)]) -> TokenData:
        if ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {min_role.value} role or higher",
            )
        return user
    return checker


def hash_for_audit(data: str) -> str:
    """Create SHA-256 hash for audit chain."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
