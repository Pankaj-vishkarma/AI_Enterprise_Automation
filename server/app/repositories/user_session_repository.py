from sqlalchemy.orm import Session

from app.models.user_session import UserSession


class UserSessionRepository:

    def __init__(self, db: Session):
        self.db = db

    def create_session(
        self,
        user_id: int,
        refresh_token: str,
    ):
        session = UserSession(
            user_id=user_id,
            refresh_token=refresh_token,
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def get_by_refresh_token(
        self,
        refresh_token: str,
    ):
        return (
            self.db.query(UserSession)
            .filter(UserSession.refresh_token == refresh_token)
            .first()
        )

    def delete_by_refresh_token(
        self,
        refresh_token: str,
    ):
        session = (
            self.db.query(UserSession)
            .filter(UserSession.refresh_token == refresh_token)
            .first()
        )

        if session:
            self.db.delete(session)
            self.db.commit()

    def delete_by_user_id(
        self,
        user_id: int,
    ):
        (self.db.query(UserSession).filter(UserSession.user_id == user_id).delete())

        self.db.commit()
