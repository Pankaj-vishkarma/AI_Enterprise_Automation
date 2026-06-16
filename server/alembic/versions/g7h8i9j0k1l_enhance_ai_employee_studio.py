"""enhance ai employee studio

Revision ID: g7h8i9j0k1l
Revises: f6g7h8i9j0k
Create Date: 2026-06-11 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "g7h8i9j0k1l"
down_revision: Union[str, Sequence[str], None] = "f6g7h8i9j0k"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ai_employees",
        sa.Column("knowledge_document_ids_json", sa.Text(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "ai_employees",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "ai_employees",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_ai_employees_is_deleted", "ai_employees", ["is_deleted"])

    op.add_column(
        "ai_employee_runs",
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
    )
    op.add_column(
        "ai_employee_runs",
        sa.Column("token_usage_json", sa.Text(), nullable=False, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("ai_employee_runs", "token_usage_json")
    op.drop_column("ai_employee_runs", "execution_time_ms")
    op.drop_index("ix_ai_employees_is_deleted", table_name="ai_employees")
    op.drop_column("ai_employees", "deleted_at")
    op.drop_column("ai_employees", "is_deleted")
    op.drop_column("ai_employees", "knowledge_document_ids_json")
