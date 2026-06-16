"""repair ai employee columns if missing

Revision ID: j0k1l2m3n4o
Revises: i9j0k1l2m3n
Create Date: 2026-06-11 18:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "j0k1l2m3n4o"
down_revision: Union[str, Sequence[str], None] = "i9j0k1l2m3n"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent repair for DBs stamped to head without g7h8i9j0k1l being applied.
    op.execute(
        "ALTER TABLE ai_employees ADD COLUMN IF NOT EXISTS "
        "knowledge_document_ids_json TEXT NOT NULL DEFAULT '[]'"
    )
    op.execute(
        "ALTER TABLE ai_employees ADD COLUMN IF NOT EXISTS "
        "is_deleted BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        "ALTER TABLE ai_employees ADD COLUMN IF NOT EXISTS "
        "deleted_at TIMESTAMP WITH TIME ZONE"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_ai_employees_is_deleted ON ai_employees (is_deleted)"
    )
    op.execute(
        "ALTER TABLE ai_employee_runs ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER"
    )
    op.execute(
        "ALTER TABLE ai_employee_runs ADD COLUMN IF NOT EXISTS "
        "token_usage_json TEXT NOT NULL DEFAULT '{}'"
    )


def downgrade() -> None:
    pass
