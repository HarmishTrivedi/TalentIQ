"""
Database Migration Script for Email Notification System
Adds: EmailActivityLog table and welcome_email_sent column to users table
"""

from sqlalchemy import text
from app.database import engine
import asyncio

async def run_migration():
    """Run database migration for email notification system"""
    
    async with engine.begin() as conn:
        print("🔄 Starting database migration...")
        
        # Add welcome_email_sent column to users table
        try:
            await conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT FALSE
            """))
            print("✅ Added welcome_email_sent column to users table")
        except Exception as e:
            print(f"⚠️  welcome_email_sent column might already exist: {e}")
        
        # Create email_activity_logs table
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS email_activity_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    recipient_email VARCHAR(255) NOT NULL,
                    email_type VARCHAR(100) NOT NULL,
                    subject VARCHAR(500) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    failure_reason TEXT,
                    related_entity_id VARCHAR(36),
                    sent_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("✅ Created email_activity_logs table")
            
            # Create indexes
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_email_logs_recipient 
                ON email_activity_logs(recipient_email)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_email_logs_type 
                ON email_activity_logs(email_type)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_email_logs_status 
                ON email_activity_logs(status)
            """))
            print("✅ Created indexes on email_activity_logs table")
            
        except Exception as e:
            print(f"⚠️  email_activity_logs table might already exist: {e}")
        
        print("✅ Database migration completed successfully!")

if __name__ == "__main__":
    print("=" * 60)
    print("EMAIL NOTIFICATION SYSTEM - DATABASE MIGRATION")
    print("=" * 60)
    asyncio.run(run_migration())
    print("=" * 60)
    print("Migration complete! You can now use the email notification system.")
    print("=" * 60)
