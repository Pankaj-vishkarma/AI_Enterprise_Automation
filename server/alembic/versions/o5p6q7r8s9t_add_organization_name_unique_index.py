"""add organization name case-insensitive unique index

Revision ID: o5p6q7r8s9t
Revises: n4o5p6q7r8s
Create Date: 2026-06-11 23:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "o5p6q7r8s9t"
down_revision: Union[str, Sequence[str], None] = "n4o5p6q7r8s"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    conn.execute(sa.text("UPDATE organizations SET name = TRIM(name) WHERE name != TRIM(name)"))

    duplicates = conn.execute(
        sa.text(
            """
            SELECT lower(trim(name)) AS normalized_name, COUNT(*) AS cnt
            FROM organizations
            GROUP BY lower(trim(name))
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    if not duplicates:
        op.execute(
            """
            CREATE UNIQUE INDEX uq_organizations_name_normalized
            ON organizations (lower(trim(name)))
            """
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_organizations_name_normalized")
