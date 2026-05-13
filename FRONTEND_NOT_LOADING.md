# 🔧 FRONTEND NOT LOADING - Troubleshooting Guide

## ❌ Problem: Blank Dark Page

**Symptoms**:
- Frontend URL loads but shows blank/dark page
- No content visible
- Console might show errors

---

## 🔍 DIAGNOSIS STEPS

### Step 1: Check Frontend Service on Render

1. Go to: https://dashboard.render.com
2. Look for **talentiq-frontend** service
3. Check the status:
   - ✅ **Live** (green) = Deployed
   - ⚠️ **Building** (yellow) = Still deploying
   - ❌ **Failed** (red) = Build failed
   - ⚠️ **Not Found** = Service not created

### Step 2: Check Frontend URL

**Expected URL**: https://talentiq-frontend.onrender.com

Try opening:
- https://talentiq-frontend.onrender.com
- https://talentiq-frontend.onrender.com/login

### Step 3: Check Browser Console

1. Open the blank page
2. Press `F12` (or right-click → Inspect)
3. Go to **Console** tab
4. Look for errors:
   - ❌ `Failed to fetch` = Backend connection issue
   - ❌ `CORS error` = CORS configuration issue
   - ❌ `404 Not Found` = Frontend not deployed
   - ❌ `Chunk load error` = Build issue

---

## ✅ SOLUTIONS

### Solution 1: Frontend Not Deployed on Render

If you don't see **talentiq-frontend** service:

1. Go to Render Dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Select **talentiq-frontend** folder
5. Configure:
   - **Name**: talentiq-frontend
   - **Runtime**: Static Site
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
6. Add environment variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://talentiq-backend-pg78.onrender.com`
7. Click **Create Static Site**

### Solution 2: Frontend Build Failed

If status shows **Failed**:

1. Click on **talentiq-frontend** service
2. Go to **Logs** tab
3. Look for build errors
4. Common issues:
   - Missing dependencies
   - Build script errors
   - Memory issues

**Fix**: Check `package.json` and ensure all dependencies are listed

### Solution 3: Wrong API URL

Update frontend environment variable:

1. Go to **talentiq-frontend** service
2. Click **Environment**
3. Update `VITE_API_URL`:
   ```
   https://talentiq-backend-pg78.onrender.com
   ```
4. Save and redeploy

### Solution 4: CORS Issue

If console shows CORS error:

1. Go to **talentiq-backend** service
2. Click **Environment**
3. Update `ALLOWED_ORIGINS`:
   ```
   https://talentiq-frontend.onrender.com,http://localhost:5173
   ```
4. Save and redeploy

### Solution 5: Use Cloudflare Tunnel (Temporary)

If Render frontend is not working, use your existing Cloudflare tunnel:

**Frontend**: https://cork-impressive-librarian-mounts.trycloudflare.com

1. Start local frontend:
   ```bash
   cd ai-recruitment-frontend
   npm install
   npm run dev
   ```

2. In another terminal, start Cloudflare tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```

3. Update backend CORS to include the Cloudflare URL

---

## 🎯 QUICK FIX: Deploy Frontend Manually

### Option A: Using Render Dashboard

1. **Create New Static Site**:
   - Go to https://dashboard.render.com
   - Click **New +** → **Static Site**
   - Connect GitHub: `HarmishTrivedi/TalentIQ`
   - Root Directory: `ai-recruitment-system/ai-recruitment-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

2. **Add Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: `https://talentiq-backend-pg78.onrender.com`

3. **Deploy**

### Option B: Update render.yaml

The `render.yaml` already has frontend config. Make sure it's being used:

```yaml
- type: web
  name: talentiq-frontend
  runtime: static
  rootDir: ai-recruitment-frontend
  buildCommand: npm install && npm run build
  staticPublishPath: dist
  envVars:
    - key: VITE_API_URL
      value: https://talentiq-backend-pg78.onrender.com
```

If this exists, Render should auto-deploy frontend.

---

## 🔍 CHECK THESE URLs

### Backend (Should work):
- Health: https://talentiq-backend-pg78.onrender.com/health
- API Docs: https://talentiq-backend-pg78.onrender.com/api/docs
- Root: https://talentiq-backend-pg78.onrender.com/

### Frontend (Check if exists):
- Main: https://talentiq-frontend.onrender.com
- Login: https://talentiq-frontend.onrender.com/login

### Cloudflare Tunnels (Your existing):
- Frontend: https://cork-impressive-librarian-mounts.trycloudflare.com
- Backend: https://prize-enhancement-hunter-ambien.trycloudflare.com

---

## 📝 MOST LIKELY ISSUE

**Frontend service not created on Render!**

The `render.yaml` has frontend config, but you need to:
1. Make sure Render is reading the `render.yaml` file
2. Or manually create the frontend static site

---

## 🆘 IMMEDIATE ACTION

**Try this URL**: https://talentiq-frontend.onrender.com

**If it shows 404**: Frontend is not deployed
**If it shows blank page**: Check browser console (F12)
**If it doesn't exist**: Create frontend service on Render

---

## 📞 NEXT STEPS

1. **Check Render Dashboard** - Is frontend service there?
2. **If NO** - Create static site manually
3. **If YES** - Check logs for errors
4. **Check browser console** - Look for specific errors
5. **Share the error** - Tell me what you see in console

---

**What URL are you trying to open? Share the exact URL and any error messages from browser console (F12).**
