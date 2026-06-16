import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.services.omnichannel.provider_registry import get_provider
from app.services.omnichannel_service import OmnichannelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/omnichannel/webhooks", tags=["omnichannel-webhooks"])


def _webhook_actor(db: Session):
    org_id = settings.OMNICHANNEL_WEBHOOK_ORG_ID
    if not org_id:
        return None
    return (
        db.query(User)
        .filter(User.organization_id == org_id, User.is_active.is_(True))
        .order_by(User.id.asc())
        .first()
    )


@router.post("/slack")
async def slack_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    provider = get_provider("Slack")

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from None

    if not provider.verify_webhook(dict(request.headers), body):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Slack signature")

    parsed = provider.parse_webhook(payload)
    if parsed and parsed.get("challenge"):
        return {"challenge": parsed["challenge"]}
    if not parsed:
        return {"ok": True}

    actor = _webhook_actor(db)
    if not actor:
        logger.warning("OMNICHANNEL_WEBHOOK_ORG_ID not set; Slack event ignored")
        return {"ok": True, "ignored": True}

    try:
        OmnichannelService(db).ingest_inbound(actor, {
            "channel": "Slack",
            "thread_id": parsed.get("thread_id"),
            "sender_name": parsed.get("sender_name", "Slack User"),
            "sender_email": parsed.get("sender_email"),
            "content": parsed.get("content", ""),
        })
    except Exception as exc:
        logger.warning("Slack webhook ingest failed: %s", exc)
    return {"ok": True}


@router.post("/telegram")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    provider = get_provider("Telegram")

    if not provider.verify_webhook(dict(request.headers)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram webhook secret")

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from None

    parsed = provider.parse_webhook(payload)
    if not parsed:
        return {"ok": True}

    actor = _webhook_actor(db)
    if not actor:
        logger.warning("OMNICHANNEL_WEBHOOK_ORG_ID not set; Telegram update ignored")
        return {"ok": True, "ignored": True}

    try:
        OmnichannelService(db).ingest_inbound(actor, {
            "channel": "Telegram",
            "thread_id": parsed.get("thread_id"),
            "sender_name": parsed.get("sender_name", "Telegram User"),
            "sender_email": parsed.get("sender_email"),
            "content": parsed.get("content", ""),
        })
    except Exception as exc:
        logger.warning("Telegram webhook ingest failed: %s", exc)
    return {"ok": True}
