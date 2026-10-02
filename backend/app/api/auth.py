"""Authentication and token management routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import append_audit_entry
from app.core.database import get_db
from app.core.middleware import envelope
from app.core.security import (
    TokenData,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    Role,
    verify_password,
)
from app.models.models import User
from app.schemas.schemas import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    role = Role(user.role)
    access = create_access_token(user.id, user.username, role)
    refresh = create_refresh_token(user.id)

    append_audit_entry(
        db, "LOGIN", user.id, user.username,
        {"method": "password"},
    )

    return envelope(data=TokenResponse(
        access_token=access,
        refresh_token=refresh,
        role=user.role,
        username=user.username,
    ).model_dump())


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh access token."""
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    role = Role(user.role)
    access = create_access_token(user.id, user.username, role)
    refresh_token = create_refresh_token(user.id)

    return envelope(data=TokenResponse(
        access_token=access,
        refresh_token=refresh_token,
        role=user.role,
        username=user.username,
    ).model_dump())


@router.get("/me")
def get_me(user: TokenData = Depends(get_current_user)):
    """Get current user info."""
    return envelope(data={
        "user_id": user.user_id,
        "username": user.username,
        "role": user.role.value,
    })
