import json
from collections import Counter
from typing import Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from app.models.collaboration_run import CollaborationRun
from app.models.collaboration_team import CollaborationTeam
from app.models.collaboration_team_member import CollaborationTeamMember


class CollaborationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_teams(self, organization_id: int):
        return (
            self.db.query(CollaborationTeam)
            .options(
                joinedload(CollaborationTeam.members).joinedload(CollaborationTeamMember.ai_employee)
            )
            .filter(
                CollaborationTeam.organization_id == organization_id,
                CollaborationTeam.is_deleted.is_(False),
            )
            .order_by(CollaborationTeam.updated_at.desc())
            .all()
        )

    def get_team(self, organization_id: int, team_id: int):
        return (
            self.db.query(CollaborationTeam)
            .options(
                joinedload(CollaborationTeam.members).joinedload(CollaborationTeamMember.ai_employee)
            )
            .filter(
                CollaborationTeam.organization_id == organization_id,
                CollaborationTeam.id == team_id,
                CollaborationTeam.is_deleted.is_(False),
            )
            .first()
        )

    def create_team(self, organization_id: int, user_id: int, name: str, description: Optional[str], members: List[Dict]):
        team = CollaborationTeam(
            organization_id=organization_id,
            created_by_user_id=user_id,
            name=name,
            description=description,
        )
        self.db.add(team)
        self.db.flush()
        for member in members:
            self.db.add(
                CollaborationTeamMember(
                    organization_id=organization_id,
                    team_id=team.id,
                    ai_employee_id=member["ai_employee_id"],
                    position=member.get("position", 0),
                )
            )
        self.db.commit()
        return self.get_team(organization_id, team.id)

    def update_team(self, team: CollaborationTeam, name: Optional[str], description: Optional[str], members: Optional[List[Dict]]):
        if name is not None:
            team.name = name
        if description is not None:
            team.description = description
        if members is not None:
            self.db.query(CollaborationTeamMember).filter(
                CollaborationTeamMember.team_id == team.id
            ).delete()
            for member in members:
                self.db.add(
                    CollaborationTeamMember(
                        organization_id=team.organization_id,
                        team_id=team.id,
                        ai_employee_id=member["ai_employee_id"],
                        position=member.get("position", 0),
                    )
                )
        self.db.commit()
        return self.get_team(team.organization_id, team.id)

    def soft_delete_team(self, team: CollaborationTeam):
        team.is_deleted = True
        self.db.commit()

    @staticmethod
    def serialize_team(team: CollaborationTeam) -> dict:
        members = sorted(team.members or [], key=lambda m: m.position)
        return {
            "id": team.id,
            "organization_id": team.organization_id,
            "name": team.name,
            "description": team.description,
            "member_count": len(members),
            "members": [
                {
                    "id": m.id,
                    "ai_employee_id": m.ai_employee_id,
                    "position": m.position,
                    "employee_name": m.ai_employee.name if m.ai_employee else None,
                    "employee_role": m.ai_employee.role if m.ai_employee else None,
                    "employee_status": m.ai_employee.status if m.ai_employee else None,
                }
                for m in members
            ],
            "created_at": team.created_at,
            "updated_at": team.updated_at,
        }

    def create_run(
        self,
        organization_id: int,
        team_id: int,
        user_id: int,
        task: str,
        status: str,
        final_output: str,
        intermediate_outputs: List[Dict],
        participating_agents: List[Dict],
        failure_info: Optional[Dict],
        execution_time_ms: int,
        token_usage: Dict,
    ) -> CollaborationRun:
        run = CollaborationRun(
            organization_id=organization_id,
            team_id=team_id,
            user_id=user_id,
            task=task,
            status=status,
            final_output=final_output,
            intermediate_outputs_json=json.dumps(intermediate_outputs),
            participating_agents_json=json.dumps(participating_agents),
            failure_info_json=json.dumps(failure_info) if failure_info else None,
            execution_time_ms=execution_time_ms,
            token_usage_json=json.dumps(token_usage),
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def list_runs(self, organization_id: int, limit: int = 50, offset: int = 0):
        return (
            self.db.query(CollaborationRun)
            .options(joinedload(CollaborationRun.team))
            .filter(CollaborationRun.organization_id == organization_id)
            .order_by(CollaborationRun.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_run(self, organization_id: int, run_id: int):
        return (
            self.db.query(CollaborationRun)
            .options(joinedload(CollaborationRun.team))
            .filter(
                CollaborationRun.organization_id == organization_id,
                CollaborationRun.id == run_id,
            )
            .first()
        )

    @staticmethod
    def serialize_run(run: CollaborationRun) -> dict:
        return {
            "id": run.id,
            "organization_id": run.organization_id,
            "team_id": run.team_id,
            "team_name": run.team.name if run.team else None,
            "task": run.task,
            "status": run.status,
            "final_output": run.final_output,
            "intermediate_outputs": json.loads(run.intermediate_outputs_json or "[]"),
            "participating_agents": json.loads(run.participating_agents_json or "[]"),
            "failure_info": json.loads(run.failure_info_json) if run.failure_info_json else None,
            "execution_time_ms": run.execution_time_ms,
            "token_usage": json.loads(run.token_usage_json or "{}"),
            "created_at": run.created_at,
        }

    def get_metrics(self, organization_id: int) -> dict:
        runs = (
            self.db.query(CollaborationRun)
            .options(joinedload(CollaborationRun.team))
            .filter(CollaborationRun.organization_id == organization_id)
            .all()
        )
        if not runs:
            return {
                "total_runs": 0,
                "successful_runs": 0,
                "failed_runs": 0,
                "partial_runs": 0,
                "success_rate": 0.0,
                "average_execution_time_ms": None,
                "most_used_teams": [],
                "most_used_agents": [],
            }
        successful = sum(1 for r in runs if r.status == "completed")
        failed = sum(1 for r in runs if r.status == "failed")
        partial = sum(1 for r in runs if r.status == "partial")
        times = [r.execution_time_ms for r in runs if r.execution_time_ms is not None]
        team_counter: Counter = Counter()
        agent_counter: Counter = Counter()
        for run in runs:
            team_counter[run.team.name if run.team else f"Team {run.team_id}"] += 1
            for agent in json.loads(run.participating_agents_json or "[]"):
                agent_counter[agent.get("employee_name", f"Agent {agent.get('employee_id')}")] += 1
        return {
            "total_runs": len(runs),
            "successful_runs": successful,
            "failed_runs": failed,
            "partial_runs": partial,
            "success_rate": round(successful * 100 / len(runs), 1),
            "average_execution_time_ms": round(sum(times) / len(times), 1) if times else None,
            "most_used_teams": [{"team": k, "count": v} for k, v in team_counter.most_common(10)],
            "most_used_agents": [{"agent": k, "count": v} for k, v in agent_counter.most_common(10)],
        }
