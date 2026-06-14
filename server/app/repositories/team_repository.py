from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.team import Team


class TeamRepository:

    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        organization_id: int,
        name: str,
        description: str | None,
    ):
        team = Team(
            organization_id=organization_id,
            name=name,
            description=description,
        )

        self.db.add(team)
        self.db.commit()
        self.db.refresh(team)

        return team

    def get_by_id(self, team_id: int):
        return self.db.query(Team).filter(Team.id == team_id).first()

    def get_by_name(
        self,
        organization_id: int,
        name: str,
    ):
        return (
            self.db.query(Team)
            .filter(
                Team.organization_id == organization_id,
                Team.name == name,
            )
            .first()
        )

    def list_all(self):
        return self.db.query(Team).order_by(Team.id.asc()).all()

    def list_by_organization(
        self,
        organization_id: int,
    ):
        return (
            self.db.query(Team)
            .filter(Team.organization_id == organization_id)
            .order_by(Team.id.asc())
            .all()
        )

    def list_paginated(
        self,
        *,
        limit: int,
        offset: int,
        organization_id: Optional[int] = None,
        team_ids: Optional[List[int]] = None,
    ) -> Tuple[list, int]:
        query = self.db.query(Team)
        if organization_id is not None:
            query = query.filter(Team.organization_id == organization_id)
        if team_ids is not None:
            if not team_ids:
                return [], 0
            query = query.filter(Team.id.in_(team_ids))

        total = query.with_entities(func.count(Team.id)).scalar() or 0
        rows = (
            query.order_by(Team.id.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return rows, int(total)

    def update(
        self,
        team_id: int,
        name: str,
        description: str | None,
    ):
        team = self.get_by_id(team_id)

        if not team:
            return None

        team.name = name
        team.description = description

        self.db.commit()
        self.db.refresh(team)

        return team

    def update_is_active(
        self,
        team_id: int,
        is_active: bool,
    ):
        team = self.get_by_id(team_id)

        if not team:
            return None

        team.is_active = is_active

        self.db.commit()
        self.db.refresh(team)

        return team
