"""Add candidate_access_token and interview_types to interviews

Revision ID: add_interview_access_token
Revises: add_interview_system
Create Date: 2026-05-13 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'add_interview_access_token'
down_revision = 'add_interview_system'
branch_labels = None
depends_on = None


def upgrade():
    # Add candidate_access_token column
    op.add_column('interviews', sa.Column('candidate_access_token', sa.String(100), nullable=True))
    op.create_index('ix_interviews_candidate_access_token', 'interviews', ['candidate_access_token'], unique=True)
    
    # Add interview_types column
    op.add_column('interviews', sa.Column('interview_types', postgresql.JSON, nullable=True))


def downgrade():
    op.drop_index('ix_interviews_candidate_access_token', table_name='interviews')
    op.drop_column('interviews', 'candidate_access_token')
    op.drop_column('interviews', 'interview_types')
