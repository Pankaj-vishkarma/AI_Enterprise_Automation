from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.workflow import Notification


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        organization_id: int,
        user_id: int,
        notification_type: str,
        title: str,
        body: str,
        link_entity_type: Optional[str] = None,
        link_entity_id: Optional[int] = None,
    ) -> Notification:
        notification = Notification(
            organization_id=organization_id,
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            body=body,
            link_entity_type=link_entity_type,
            link_entity_id=link_entity_id,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def list_for_user(self, organization_id: int, user_id: int, unread_only: bool = False) -> List[dict]:
        query = self.db.query(Notification).filter(
            Notification.organization_id == organization_id,
            Notification.user_id == user_id,
        )
        if unread_only:
            query = query.filter(Notification.is_read.is_(False))
        notifications = query.order_by(Notification.id.desc()).limit(100).all()
        return [
            {
                "id": n.id,
                "notification_type": n.notification_type,
                "title": n.title,
                "body": n.body,
                "link_entity_type": n.link_entity_type,
                "link_entity_id": n.link_entity_id,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ]

    def mark_read(self, organization_id: int, user_id: int, notification_id: int) -> bool:
        notification = (
            self.db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.organization_id == organization_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if not notification:
            return False
        notification.is_read = True
        self.db.commit()
        return True
