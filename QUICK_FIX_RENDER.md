# 🚨 URGENT: Fix Render Deployment - Quick Action Guide

## ❌ Problem
Your project is not running on Render because of an invalid environment variable.

**Error**: `DEBUG` variable has value `'release'` instead of boolean `false`

---

## ✅ IMMEDIATE FIX (5 Minutes)

### Step 1: Login to Render
Go to: https://dashboard.render.com

### Step 2: Fix Backend Service
1. Click on **talentiq-backend** service
2. Click **Environment** tab on the left
3. Find the `DEBUG` variable
4. **Change value from `release` to `false`** (without quotes)
5. Click **Save Changes** button

### Step 3: Add Email Variables (NEW)
Add these new environment variables:

```
SMTP_SERVER = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = noreply.talentiq@gmail.com
SMTP_PASSWORD = hskw zoha ioxq eebz
FROM_EMAIL = noreply.talentiq@gmail.com
FROM_NAME = TalentIQ
```

### Step 4: Deploy
1. Scroll to **Manual Deploy** section
2. Click **Deploy latest commit** button
3. Wait 2-3 minutes for deployment

### Step 5: Check Logs
1. Click **Logs** tab
2. Look for: `Application startup complete`
3. If you see errors, check the troubleshooting guide

---

## 📋 Environment Variables to Verify

Make sure these are set correctly on Render:

### Critical Variables:
- ✅ `DEBUG` = `false` (NOT 'release', NOT 'true')
- ✅ `DATABASE_URL` = (should be auto-set from database)
- ✅ `GROQ_API_KEY` = (your GROQ API key)
- ✅ `GOOGLE_CLIENT_ID` = (your Google OAuth client ID)
- ✅ `GOOGLE_CLIENT_SECRET` = (your Google OAuth secret)
- ✅ `BACKEND_URL` = https://talentiq-backend.onrender.com
- ✅ `FRONTEND_URL` = https://talentiq-frontend.onrender.com
- ✅ `ALLOWED_ORIGINS` = https://talentiq-frontend.onrender.com

### New Email Variables:
- ✅ `SMTP_SERVER` = smtp.gmail.com
- ✅ `SMTP_PORT` = 587
- ✅ `SMTP_USER` = noreply.talentiq@gmail.com
- ✅ `SMTP_PASSWORD` = (your Gmail app password)
- ✅ `FROM_EMAIL` = noreply.talentiq@gmail.com
- ✅ `FROM_NAME` = TalentIQ

---

## 🔍 How to Check if It's Working

### Backend Health Check:
Open in browser: `https://talentiq-backend.onrender.com/health`

Should see:
```json
{
  "status": "healthy"
}
```

### Frontend Check:
Open in browser: `https://talentiq-frontend.onrender.com`

Should see the login page.

---

## 📝 What Changed Recently

### New Features Added:
1. ✅ Email notification system for CV uploads
2. ✅ Interview reminder emails (30 min before)
3. ✅ Beautiful HTML email templates
4. ✅ Automatic email sending on interview creation

### Files Modified:
- `app/services/email_service.py` - Added new email methods
- `app/services/cv_service.py` - Added email notifications
- `app/routes/interviews.py` - Auto-send invitations
- `.env` - Added SMTP configuration

### All Changes Pushed to GitHub:
- ✅ Latest commit: `d1eacc7`
- ✅ Repository: https://github.com/HarmishTrivedi/TalentIQ

---

## 🐛 If Still Not Working

### Check These:

1. **Database Connection**
   - Is `talentiq-db` service running?
   - Is it in the same region as backend?

2. **Build Logs**
   - Go to Logs tab
   - Look for `pip install` errors
   - Check if all dependencies installed

3. **Runtime Logs**
   - Look for `ValidationError`
   - Check for `Connection refused`
   - Look for `Module not found`

4. **Environment Variables**
   - Double-check all variables are set
   - No typos in variable names
   - Values are correct format

---

## 📞 Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **GitHub Repo**: https://github.com/HarmishTrivedi/TalentIQ
- **Backend URL**: https://talentiq-backend.onrender.com
- **Frontend URL**: https://talentiq-frontend.onrender.com

---

## ✅ Success Checklist

After fixing, you should see:

- [ ] Backend service shows "Live" status (green)
- [ ] Frontend service shows "Live" status (green)
- [ ] Database service shows "Available" status
- [ ] Health check endpoint returns 200 OK
- [ ] Frontend loads without errors
- [ ] Can login successfully
- [ ] Can upload CV
- [ ] Emails are being sent

---

## 🎯 Summary

**Main Issue**: `DEBUG` variable has wrong value

**Quick Fix**: 
1. Change `DEBUG` from `release` to `false`
2. Add email SMTP variables
3. Redeploy

**Time Required**: 5 minutes

**Status**: Ready to fix ✅

---

**For detailed troubleshooting, see**: `DEPLOYMENT_TROUBLESHOOTING.md`
