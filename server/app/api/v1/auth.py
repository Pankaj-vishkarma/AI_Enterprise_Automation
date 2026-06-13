from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user

from app.services.auth_service import AuthService
from app.utils.organization_name import ORGANIZATION_EXISTS_MESSAGE

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
    LogoutRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserProfileResponse,
    MessageResponse,
)

from app.core.dependencies import (
    require_super_admin,
    require_org_admin,
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["auth"],
)


@router.post(
    "/register",
    response_model=TokenResponse,
)
def register(
    user_in: RegisterRequest,
    db: Session = Depends(get_db),
):

    service = AuthService(db)

    existing = service.user_repo.get_by_email(user_in.email)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        service.register_user(
            organization_name=user_in.organization_name,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            email=user_in.email,
            password=user_in.password,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            status.HTTP_400_BAD_REQUEST
            if detail == ORGANIZATION_EXISTS_MESSAGE
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from exc

    token = service.authenticate(
        user_in.email,
        user_in.password,
    )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed",
        )

    return token


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    form_data: LoginRequest,
    db: Session = Depends(get_db),
):

    service = AuthService(db)

    token = service.authenticate(
        form_data.email,
        form_data.password,
    )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    return token


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):

    service = AuthService(db)

    token = service.refresh_access_token(request.refresh_token)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    return token


@router.post(
    "/logout-all",
)
def logout_all(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):

    service = AuthService(db)

    service.logout_all_sessions(current_user.id)

    return {"message": "Logged out from all sessions successfully"}


@router.post(
    "/logout",
)
def logout(
    request: LogoutRequest,
    db: Session = Depends(get_db),
):

    service = AuthService(db)

    service.logout(request.refresh_token)

    return {"message": "Logged out successfully"}


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    service.request_password_reset(payload.email)
    return {
        "message": "If an account exists for that email, a password reset link has been sent.",
    }


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    success = service.reset_password(payload.token, payload.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return {"message": "Password reset successfully"}


@router.get(
    "/me",
    response_model=UserProfileResponse,
)
def me(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    service = AuthService(db)
    return service.get_user_profile(current_user)


@router.get("/super-admin-test")
def super_admin_test(
    current_user=Depends(require_super_admin),
):
    return {"message": "SUPER_ADMIN access granted"}


@router.get("/org-admin-test")
def org_admin_test(
    current_user=Depends(require_org_admin),
):

    return {"message": "ORG_ADMIN access granted"}


@router.get("/debug-role")
def debug_role(
    current_user=Depends(get_current_active_user),
):
    return {
        "email": current_user.email,
        "role": current_user.role.name if current_user.role else None,
    }
