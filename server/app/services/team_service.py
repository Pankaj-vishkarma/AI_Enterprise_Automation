from sqlalchemy.orm import Session

from app.core.dependencies import SUPER_ADMIN_ROLE
from app.repositories.organization_repository import OrganizationRepository
from app.repositories.team_repository import TeamRepository


class TeamService:

    def __init__(self, db: Session):
        self.db = db
        self.team_repo = TeamRepository(db)
        self.organization_repo = OrganizationRepository(db)

    def list_teams(self, current_user):
        role_name = current_user.role.name if current_user.role else None

        if role_name == SUPER_ADMIN_ROLE:
            return self.team_repo.list_all()

        return self.team_repo.list_by_organization(current_user.organization_id)

    def get_team_by_id(self, current_user, team_id: int):
        team = self.team_repo.get_by_id(team_id)

        if not team:
            return None

        role_name = current_user.role.name if current_user.role else None

        if (
            role_name != SUPER_ADMIN_ROLE
            and team.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization team access is not allowed")

        return team

    def create_team(
        self,
        current_user,
        name: str,
        description: str | None,
    ):
        organization = self.organization_repo.get_by_id(current_user.organization_id)

        if not organization:
            raise ValueError("Organization not found")

        existing = self.team_repo.get_by_name(
            current_user.organization_id,
            name,
        )

        if existing:
            raise ValueError("Team already exists")

        return self.team_repo.create(
            organization_id=current_user.organization_id,
            name=name,
            description=description,
        )

    def update_team(
        self,
        current_user,
        team_id: int,
        name: str,
        description: str | None,
    ):
        team = self.team_repo.get_by_id(team_id)

        if not team:
            return None

        role_name = current_user.role.name if current_user.role else None

        if (
            role_name != SUPER_ADMIN_ROLE
            and team.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization team management is not allowed")

        existing = self.team_repo.get_by_name(team.organization_id, name)

        if existing and existing.id != team_id:
            raise ValueError("Team already exists")

        return self.team_repo.update(
            team_id,
            name,
            description,
        )

    def disable_team(
        self,
        current_user,
        team_id: int,
    ):
        team = self.team_repo.get_by_id(team_id)

        if not team:
            return None

        role_name = current_user.role.name if current_user.role else None

        if (
            role_name != SUPER_ADMIN_ROLE
            and team.organization_id != current_user.organization_id
        ):
            raise PermissionError("Cross-organization team management is not allowed")

        return self.team_repo.update_is_active(
            team_id,
            False,
        )
