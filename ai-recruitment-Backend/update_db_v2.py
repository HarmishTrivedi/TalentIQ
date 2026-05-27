import asyncio
import sys
import os
from sqlalchemy import text
from app.database.session import engine

async def update_database():
    print("Updating database schema...")
    async with engine.begin() as conn:
        # Add domain to jobs
        try:
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN domain VARCHAR(100)"))
            print("Added 'domain' column to 'jobs' table.")
        except Exception as e:
            print(f"Column 'domain' in 'jobs' probably exists: {e}")

        # Add domain to candidates
        try:
            await conn.execute(text("ALTER TABLE candidates ADD COLUMN domain VARCHAR(100)"))
            print("Added 'domain' column to 'candidates' table.")
        except Exception as e:
            print(f"Column 'domain' in 'candidates' probably exists: {e}")

        # Add projects to candidates
        try:
            await conn.execute(text("ALTER TABLE candidates ADD COLUMN projects JSON"))
            print("Added 'projects' column to 'candidates' table.")
        except Exception as e:
            print(f"Column 'projects' in 'candidates' probably exists: {e}")

    print("Database update complete.")

if __name__ == "__main__":
    # Add project root to sys.path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(update_database())
