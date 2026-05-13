"""Add interview intelligence system tables

Revision ID: add_interview_system
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'add_interview_system'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'interviews',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('candidate_id', sa.String(36), sa.ForeignKey('candidates.id'), nullable=False, index=True),
        sa.Column('job_id', sa.String(36), sa.ForeignKey('jobs.id'), nullable=True, index=True),
        sa.Column('recruiter_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, default='scheduled'),
        sa.Column('scheduled_at', sa.DateTime, nullable=True),
        sa.Column('started_at', sa.DateTime, nullable=True),
        sa.Column('ended_at', sa.DateTime, nullable=True),
        sa.Column('duration_minutes', sa.Integer, nullable=True),
        sa.Column('recording_url', sa.String(1000), nullable=True),
        sa.Column('transcript', sa.Text, nullable=True),
        sa.Column('overall_score', sa.Float, nullable=True),
        sa.Column('technical_score', sa.Float, nullable=True),
        sa.Column('communication_score', sa.Float, nullable=True),
        sa.Column('confidence_score', sa.Float, nullable=True),
        sa.Column('coding_score', sa.Float, nullable=True),
        sa.Column('fraud_risk_level', sa.String(50), nullable=True),
        sa.Column('ai_assistance_probability', sa.Float, nullable=True),
        sa.Column('plagiarism_score', sa.Float, nullable=True),
        sa.Column('suspicious_activities', postgresql.JSON, nullable=True),
        sa.Column('strengths', postgresql.JSON, nullable=True),
        sa.Column('weaknesses', postgresql.JSON, nullable=True),
        sa.Column('hiring_recommendation', sa.String(100), nullable=True),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )

    op.create_table(
        'interview_questions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('interview_id', sa.String(36), sa.ForeignKey('interviews.id'), nullable=False, index=True),
        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('difficulty', sa.String(50), nullable=False),
        sa.Column('candidate_answer', sa.Text, nullable=True),
        sa.Column('answer_duration_seconds', sa.Integer, nullable=True),
        sa.Column('answer_quality_score', sa.Float, nullable=True),
        sa.Column('technical_depth_score', sa.Float, nullable=True),
        sa.Column('communication_quality_score', sa.Float, nullable=True),
        sa.Column('ai_evaluation', sa.Text, nullable=True),
        sa.Column('code_submitted', sa.Text, nullable=True),
        sa.Column('code_language', sa.String(50), nullable=True),
        sa.Column('code_execution_result', postgresql.JSON, nullable=True),
        sa.Column('code_quality_score', sa.Float, nullable=True),
        sa.Column('code_plagiarism_score', sa.Float, nullable=True),
        sa.Column('asked_at', sa.DateTime, nullable=True),
        sa.Column('answered_at', sa.DateTime, nullable=True),
        sa.Column('order_index', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )

    op.create_table(
        'interview_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('interview_id', sa.String(36), sa.ForeignKey('interviews.id'), nullable=False, index=True),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('event_data', postgresql.JSON, nullable=True),
        sa.Column('severity', sa.String(50), nullable=True),
        sa.Column('timestamp', sa.DateTime, server_default=sa.func.now())
    )

    op.create_table(
        'interview_analysis',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('interview_id', sa.String(36), sa.ForeignKey('interviews.id'), nullable=False, unique=True, index=True),
        sa.Column('overall_rating', sa.Float, nullable=False),
        sa.Column('technical_rating', sa.Float, default=0.0),
        sa.Column('communication_rating', sa.Float, default=0.0),
        sa.Column('coding_rating', sa.Float, default=0.0),
        sa.Column('confidence_rating', sa.Float, default=0.0),
        sa.Column('problem_solving_rating', sa.Float, default=0.0),
        sa.Column('speech_clarity', sa.Float, nullable=True),
        sa.Column('professionalism', sa.Float, nullable=True),
        sa.Column('filler_words_count', sa.Integer, nullable=True),
        sa.Column('speaking_speed_wpm', sa.Float, nullable=True),
        sa.Column('nervousness_indicators', postgresql.JSON, nullable=True),
        sa.Column('fraud_risk_level', sa.String(50), default='low'),
        sa.Column('ai_assistance_probability', sa.Float, default=0.0),
        sa.Column('plagiarism_indicators', postgresql.JSON, nullable=True),
        sa.Column('suspicious_behavior_timeline', postgresql.JSON, nullable=True),
        sa.Column('tab_switching_count', sa.Integer, default=0),
        sa.Column('copy_paste_count', sa.Integer, default=0),
        sa.Column('candidate_strengths', postgresql.JSON, nullable=True),
        sa.Column('candidate_weaknesses', postgresql.JSON, nullable=True),
        sa.Column('hiring_recommendation', sa.String(100), nullable=False),
        sa.Column('technical_fit', sa.Text, nullable=True),
        sa.Column('cultural_fit', sa.Text, nullable=True),
        sa.Column('improvement_areas', postgresql.JSON, nullable=True),
        sa.Column('next_round_suggestion', sa.Text, nullable=True),
        sa.Column('important_moments', postgresql.JSON, nullable=True),
        sa.Column('strong_answers', postgresql.JSON, nullable=True),
        sa.Column('weak_responses', postgresql.JSON, nullable=True),
        sa.Column('ai_summary', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )

    op.create_table(
        'question_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('category', sa.String(100), nullable=False, index=True),
        sa.Column('difficulty', sa.String(50), nullable=False, index=True),
        sa.Column('starter_code', sa.Text, nullable=True),
        sa.Column('test_cases', postgresql.JSON, nullable=True),
        sa.Column('expected_output', sa.Text, nullable=True),
        sa.Column('tags', postgresql.JSON, nullable=True),
        sa.Column('estimated_time_minutes', sa.Integer, nullable=True),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )


def downgrade():
    op.drop_table('question_templates')
    op.drop_table('interview_analysis')
    op.drop_table('interview_events')
    op.drop_table('interview_questions')
    op.drop_table('interviews')
