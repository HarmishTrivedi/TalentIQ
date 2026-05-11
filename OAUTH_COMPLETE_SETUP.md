# 🔐 OAuth Setup - Complete Guide

## Current Status
✅ Dependencies installed (authlib, itsdangerous)
✅ OAuth routes configured
✅ Backend/Frontend URLs set
❌ Google credentials needed
❌ Microsoft credentials needed

## Why OAuth Buttons Show Blank Page

The OAuth buttons redirect to a blank error page because you're using **placeholder credentials** instead of real Google/Microsoft OAuth credentials.

---

## 🚀 Quick Setup (10 minutes)

### STEP 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Create a Project** (if you don't have one)
   - Click "Select a project" → "New Project"
   - Name: `TalentIQ` or any name
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - If prompted, configure OAuth consent screen:
     - User Type: External
     - App name: TalentIQ
     - User support email: your email
     - Developer contact: your email
     - Click "Save and Continue" through all steps

5. **Configure OAuth Client**
   - Application type: **Web application**
   - Name: `TalentIQ Web Client`
   - Authorized redirect URIs: Add this EXACT URL:
     ```
     http://localhost:8000/api/v1/auth/oauth/google/callback
     ```
   - Click "Create"

6. **Copy Credentials**
   - You'll see a popup with:
     - **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abc123xyz`)
   - Keep this window open or download JSON

---

### STEP 2: Get Microsoft OAuth Credentials

1. **Go to Azure Portal**
   - Visit: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps
   - Sign in with your Microsoft account

2. **Register New Application**
   - Click "New registration"
   - Name: `TalentIQ`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI:
     - Platform: **Web**
     - URL: `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`
   - Click "Register"

3. **Copy Application (client) ID**
   - On the Overview page, copy the **Application (client) ID**
   - It looks like: `12345678-1234-1234-1234-123456789abc`

4. **Create Client Secret**
   - Go to "Certificates & secrets" (left sidebar)
   - Click "New client secret"
   - Description: `TalentIQ Secret`
   - Expires: 24 months (or your preference)
   - Click "Add"
   - **IMPORTANT**: Copy the **Value** immediately (not the Secret ID)
   - It looks like: `abc~123.xyz-456_789`
   - You can't see it again after leaving this page!

---

### STEP 3: Update .env File

Open `ai-recruitment-Backend/.env` and replace these lines:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_ACTUAL_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_GOOGLE_CLIENT_SECRET_HERE

MICROSOFT_CLIENT_ID=YOUR_ACTUAL_MICROSOFT_CLIENT_ID_HERE
MICROSOFT_CLIENT_SECRET=YOUR_ACTUAL_MICROSOFT_CLIENT_SECRET_HERE
```

**Example** (with fake credentials):
```env
GOOGLE_CLIENT_ID=123456789-abc123xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz456

MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_CLIENT_SECRET=abc~123.xyz-456_789
```

---

### STEP 4: Restart Backend Server

1. **Stop the backend** (press Ctrl+C in the terminal running the server)

2. **Start it again**:
   ```bash
   cd ai-recruitment-Backend
   python run.py
   ```

3. **Verify it's running**:
   - You should see: "✅ All systems ready. Platform is live."
   - No errors about OAuth

---

### STEP 5: Test OAuth Login

1. **Open frontend**: http://localhost:5173/auth

2. **Click "Continue with Google"**
   - Should redirect to Google account selection page
   - Select your Google account
   - Grant permissions
   - Redirects back to TalentIQ dashboard

3. **Click "Continue with Microsoft"**
   - Should redirect to Microsoft login page
   - Enter your Microsoft email/password
   - Grant permissions
   - Redirects back to TalentIQ dashboard

---

## 🎯 What Should Happen

### Before Setup (Current State)
- Click Google button → Blank error page ❌
- Click Microsoft button → Blank error page ❌

### After Setup (Expected)
- Click Google button → Google account selection screen ✅
- Click Microsoft button → Microsoft login screen ✅
- After login → Redirects to TalentIQ dashboard ✅

---

## 🔧 Troubleshooting

### "Redirect URI mismatch" Error
**Problem**: The redirect URI in Google/Microsoft console doesn't match exactly.

**Solution**: Make sure the redirect URI is EXACTLY:
- Google: `http://localhost:8000/api/v1/auth/oauth/google/callback`
- Microsoft: `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`

No trailing slash, no extra spaces, exact match.

---

### "Invalid client" Error
**Problem**: Client ID or Client Secret is wrong.

**Solution**:
1. Double-check you copied the correct values
2. For Microsoft, make sure you copied the secret **Value**, not the Secret ID
3. Check for extra spaces or line breaks in .env file
4. Restart backend after changing .env

---

### Still Shows Blank Page
**Problem**: Backend not loading OAuth credentials.

**Solution**:
1. Verify .env file has real credentials (not placeholders)
2. Restart backend server
3. Check backend logs for errors
4. Run diagnostic: `cd ai-recruitment-Backend && python test_oauth.py`

---

### "Email not verified" Error
**Problem**: Google account email is not verified.

**Solution**: Use a Google account with verified email, or verify your email in Google account settings.

---

## 📝 Security Notes

- OAuth credentials are sensitive - don't commit .env to git
- For production, use environment variables instead of .env file
- Enable HTTPS in production (set `https_only=True` in SessionMiddleware)
- Restrict OAuth redirect URIs to your actual domain

---

## ✅ Verification Checklist

- [ ] Dependencies installed (authlib, itsdangerous)
- [ ] Google OAuth credentials obtained
- [ ] Microsoft OAuth credentials obtained
- [ ] .env file updated with real credentials
- [ ] Backend server restarted
- [ ] Google login works (shows account selection)
- [ ] Microsoft login works (shows login screen)
- [ ] Successfully redirects to dashboard after login

---

## 🆘 Need Help?

Run the diagnostic script:
```bash
cd ai-recruitment-Backend
python test_oauth.py
```

This will check:
- If .env file exists
- If credentials are configured
- If dependencies are installed
- What's missing

---

## 🎉 Success!

Once setup is complete, users can:
- Sign in with Google (one click)
- Sign in with Microsoft (one click)
- No need to remember passwords
- Secure, verified email authentication
