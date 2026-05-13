"""
Run database migrations
"""
import subprocess
import sys

def run_migrations():
    print("Running database migrations...")
    try:
        # Run alembic upgrade
        result = subprocess.run(
            [sys.executable, "-c", "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); command.upgrade(cfg, 'head')"],
            cwd=".",
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Migrations completed successfully!")
            print(result.stdout)
        else:
            print("❌ Migration failed!")
            print(result.stderr)
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error running migrations: {e}")
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
