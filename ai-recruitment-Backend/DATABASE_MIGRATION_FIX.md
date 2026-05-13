# 🔧 DATABASE MIGRATION FIX - Interview Columns Missing

## ❌ Problem

**Error**: `column interviews.candidate_access_token does not exist`

**Root Cause**: The database schema is outdated. The code expects columns that don't exist in the database.

**Missing Columns**:
- `candidate_access_token` (String, unique, indexed)
- `interview_types` (JSON array)

---

## ✅ SOLUTION: Run Database Migration

### Option 1: Manual SQL (Quickest - 2 minutes)

#### For Local Database:
```sql
-- Connect to your database
psql -U postgres -d ai_recruitment

-- Add missing columns
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON;

-- Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token 
ON interviews(candidate_access_token);

-- Verify
\d interviews
```

#### For Render Database:
1. Go to Render Dashboard
2. Click on **talentiq-db** database
3. Click **Connect** → **External Connection**
4. Copy the connection string
5. Use a database client (DBeaver, pgAdmin, or psql):

```bash
psql "postgresql://user:password@host:port/database"
```

Then run:
```sql
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON;
CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token 
ON interviews(candidate_access_token);
```

---

### Option 2: Using Alembic Migration (Proper way)

#### Step 1: Install Dependencies
```bash
cd ai-recruitment-Backend
pip install alembic
```

#### Step 2: Run Migration
```bash
# Using alembic directly
alembic upgrade head

# OR using Python
python run_migrations.py
```

---

### Option 3: Drop and Recreate (Development Only - LOSES DATA)

**⚠️ WARNING: This will delete all data!**

```sql
-- Drop interviews table and related tables
DROP TABLE IF EXISTS interview_analysis CASCADE;
DROP TABLE IF EXISTS interview_events CASCADE;
DROP TABLE IF EXISTS interview_questions CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
```

Then restart the backend - it will recreate tables with correct schema.

---

## 📋 Verification Steps

### 1. Check if columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('candidate_access_token', 'interview_types');
```

Expected output:
```
       column_name        | data_type
--------------------------+-----------
 candidate_access_token   | character varying
 interview_types          | json
```

### 2. Check indexes:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'interviews' 
AND indexname = 'ix_interviews_candidate_access_token';
```

### 3. Test backend:
```bash
cd ai-recruitment-Backend
python run.py
```

Should start without errors.

---

## 🚀 For Render Deployment

### Method 1: Add Migration to Startup (Recommended)

Update `render.yaml`:
```yaml
services:
  - type: web
    name: talentiq-backend
    runtime: python
    rootDir: ai-recruitment-Backend
    buildCommand: pip install -r requirements.txt
    startCommand: |
      python -c "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); command.upgrade(cfg, 'head')" && 
      uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Method 2: Run SQL via Render Dashboard

1. Go to Render Dashboard
2. Click **talentiq-db**
3. Click **Connect** → **External Connection**
4. Use connection string with psql or database client
5. Run the ALTER TABLE commands above

### Method 3: Use Render Shell

1. Go to **talentiq-backend** service
2. Click **Shell** tab
3. Run:
```bash
python -c "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); command.upgrade(cfg, 'head')"
```

---

## 📝 Migration File Created

**File**: `alembic/versions/add_interview_access_token.py`

**What it does**:
- Adds `candidate_access_token` column (VARCHAR(100), unique, indexed)
- Adds `interview_types` column (JSON)

**Revision ID**: `add_interview_access_token`
**Previous**: `add_interview_system`

---

## 🔍 Why This Happened

The Interview model was updated to include:
1. **candidate_access_token**: For secure candidate access to interviews
2. **interview_types**: To store interview type categories (Technical, HR, Coding, etc.)

But the database wasn't migrated to include these columns.

---

## ⚠️ Important Notes

### For Local Development:
- Run migrations before starting the server
- Keep database schema in sync with models

### For Production (Render):
- Always run migrations before deploying new code
- Use Alembic for schema changes
- Never drop tables in production

### Data Safety:
- Migrations are additive (ADD COLUMN)
- No data loss
- Columns are nullable
- Safe to run multiple times (IF NOT EXISTS)

---

## 🎯 Quick Fix Commands

### Local Database:
```bash
# Option 1: SQL
psql -U postgres -d ai_recruitment -c "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100); ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON; CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token ON interviews(candidate_access_token);"

# Option 2: Python
cd ai-recruitment-Backend
python run_migrations.py
```

### Render Database:
```bash
# Get connection string from Render Dashboard
# Then run:
psql "YOUR_DATABASE_URL" -c "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100); ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON; CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token ON interviews(candidate_access_token);"
```

---

## ✅ Success Indicators

After fixing, you should see:
- ✅ No more "column does not exist" errors
- ✅ Backend starts successfully
- ✅ Interview scheduler runs without errors
- ✅ Can create interviews
- ✅ Reminder emails work

---

## 📞 Next Steps

1. **Fix Local Database** (if testing locally)
2. **Fix Render Database** (for production)
3. **Update render.yaml** to run migrations on deploy
4. **Test interview creation**
5. **Test reminder scheduler**

---

## 🆘 If Still Having Issues

### Check Alembic Version Table:
```sql
SELECT * FROM alembic_version;
```

Should show: `add_interview_access_token`

### Reset Alembic (if needed):
```sql
DELETE FROM alembic_version;
INSERT INTO alembic_version VALUES ('add_interview_access_token');
```

### Check All Interview Columns:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'interviews' 
ORDER BY ordinal_position;
```

---

**Status**: Migration file created ✅  
**Action Required**: Run migration on database 🔧
