# 🚨 URGENT: Fix Database on Render NOW

## Your backend is LIVE but database needs fixing!

**Backend URL**: https://talentiq-backend-pg78.onrender.com  
**Status**: ✅ Running but ❌ Database error

---

## 🔧 FIX IN 3 MINUTES

### **Step 1: Get Database Connection String**

1. Go to: https://dashboard.render.com
2. Click on **talentiq-db** (your database)
3. Scroll down to **Connections** section
4. Click **External Connection**
5. Copy the **External Database URL** (looks like):
   ```
   postgresql://user:password@dpg-xxxxx.oregon-postgres.render.com/dbname
   ```

---

### **Step 2: Connect to Database**

#### **Option A: Using Online Tool (Easiest - No Install)**

1. Go to: https://sqliteonline.com/ or https://www.db-fiddle.com/
2. Select **PostgreSQL**
3. Click **Connect to Database**
4. Paste your connection string
5. Skip to Step 3

#### **Option B: Using psql (Command Line)**

```bash
psql "postgresql://user:password@dpg-xxxxx.oregon-postgres.render.com/dbname"
```

#### **Option C: Using DBeaver/pgAdmin (GUI)**

1. Download DBeaver: https://dbeaver.io/download/
2. Create new PostgreSQL connection
3. Paste connection details from Render
4. Connect

---

### **Step 3: Run This SQL**

Copy and paste this EXACT SQL:

```sql
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100);
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON;
CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token ON interviews(candidate_access_token);
```

Press **Execute** or **Run**

---

### **Step 4: Verify**

Run this to check:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'interviews' 
AND column_name IN ('candidate_access_token', 'interview_types');
```

You should see:
```
       column_name        
--------------------------
 candidate_access_token
 interview_types
```

---

### **Step 5: Restart Backend (Optional)**

1. Go back to Render Dashboard
2. Click **talentiq-backend**
3. Click **Manual Deploy** → **Clear build cache & deploy**
4. Wait 2 minutes

---

## ✅ SUCCESS CHECK

After fixing, the error should disappear. Check logs:

1. Go to **talentiq-backend** on Render
2. Click **Logs** tab
3. You should see:
   ```
   ✅ Interview reminder scheduler started
   ```
   
Instead of:
   ```
   ❌ Reminder scheduler error: column interviews.candidate_access_token does not exist
   ```

---

## 🎯 ALTERNATIVE: Use Render Shell (If Available)

If your Render plan has Shell access:

1. Go to **talentiq-backend** service
2. Click **Shell** tab
3. Run:
```bash
python -c "
import asyncio
from sqlalchemy import text
from app.database import get_db

async def fix():
    async for db in get_db():
        await db.execute(text('ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_access_token VARCHAR(100)'))
        await db.execute(text('ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interview_types JSON'))
        await db.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_interviews_candidate_access_token ON interviews(candidate_access_token)'))
        await db.commit()
        print('✅ Fixed!')
        break

asyncio.run(fix())
"
```

---

## 📋 Quick Reference

**What's Wrong**: Database missing 2 columns  
**Columns Needed**: `candidate_access_token`, `interview_types`  
**Fix Time**: 3 minutes  
**SQL File**: `fix_database.sql` (in backend folder)

---

## 🆘 If You Can't Access Database

Contact me with:
1. Screenshot of Render database page
2. Your Render account email
3. I'll help you get access

---

## 📞 Connection String Format

```
postgresql://[username]:[password]@[host]:[port]/[database]
```

Example:
```
postgresql://talentiq_user:abc123xyz@dpg-abc123.oregon-postgres.render.com/talentiq_db
```

---

**Your backend is running! Just need to fix the database and you're good to go!** 🚀

**Time Required**: 3 minutes  
**Difficulty**: Easy  
**Risk**: None (safe SQL, won't delete data)
