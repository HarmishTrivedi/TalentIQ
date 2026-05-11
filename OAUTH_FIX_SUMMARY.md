# 🔐 OAuth Setup - Quick Reference

## Current Issues

### ❌ Problem 1: Missing Dependencies
```
authlib - NOT installed
itsdangerous - NOT installed
```

### ✅ FIXED - Dependencies Now Installed
```bash
pip install authlib itsdangerous starlette
```

### ❌ Problem 2: Placeholder Credentials
Your `.env` file has:
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

These are **placeholders**, not real credentials!

---

## 🎯 What You Need To Do

### 1. Get Google Credentials (5 min)
- Go to: https://console.cloud.google.com/apis/credentials
- Create OAuth client ID
- Redirect URI: `http://localhost:8000/api/v1/auth/oauth/google/callback`
- Copy Client ID and Client Secret

### 2. Get Microsoft Credentials (5 min)
- Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
- Register new application
- Redirect URI: `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`
- Copy Application ID and create Client Secret

### 3. Update .env File
Replace placeholder values with real credentials:
```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz

MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_CLIENT_SECRET=abc~123.xyz-456_789
```

### 4. Restart Backend
```bash
cd ai-recruitment-Backend
# Stop server (Ctrl+C)
python run.py
```

---

## 📋 Detailed Instructions

See `OAUTH_COMPLETE_SETUP.md` for:
- Step-by-step screenshots guide
- Troubleshooting common errors
- Security best practices
- Verification checklist

---

## 🧪 Test Your Setup

Run diagnostic:
```bash
cd ai-recruitment-Backend
python test_oauth.py
```

This checks:
- ✅ Dependencies installed
- ✅ OAuth routes exist
- ❌ Credentials configured
- ✅ URLs set correctly

---

## 🎉 Expected Result

### Before Setup (Now)
Click Google button → **Blank error page** ❌

### After Setup
Click Google button → **Google account selection screen** ✅
Select account → **Redirects to TalentIQ dashboard** ✅

---

## ⏱️ Time Required
- Google setup: 5 minutes
- Microsoft setup: 5 minutes
- Update .env: 1 minute
- Restart backend: 30 seconds
- **Total: ~11 minutes**

---

## 🆘 Quick Help

**Blank page?** → Missing credentials in .env
**"Invalid client"?** → Wrong Client ID/Secret
**"Redirect URI mismatch"?** → Check redirect URI in console
**"Email not verified"?** → Use verified Google account

---

## 📞 Support Files Created

1. `OAUTH_COMPLETE_SETUP.md` - Full step-by-step guide
2. `OAUTH_QUICK_SETUP.md` - Original setup guide
3. `test_oauth.py` - Diagnostic script
4. This file - Quick reference

Run diagnostic anytime:
```bash
cd ai-recruitment-Backend
python test_oauth.py
```
