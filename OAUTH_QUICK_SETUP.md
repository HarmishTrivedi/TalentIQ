# OAuth Quick Setup Guide

## Why OAuth Buttons Show Blank Page

The OAuth buttons redirect to a blank error page because **Google and Microsoft credentials are missing** from your `.env` file.

## Quick Fix (5 minutes)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Click **"Create Credentials"** → **"OAuth client ID"**
4. Choose **"Web application"**
5. Add these URLs:
   - **Authorized redirect URIs**: `http://localhost:8000/api/v1/auth/oauth/google/callback`
6. Copy the **Client ID** and **Client Secret**

### Step 2: Get Microsoft OAuth Credentials

1. Go to [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps)
2. Click **"New registration"**
3. Name: `TalentIQ`
4. Supported account types: **"Accounts in any organizational directory and personal Microsoft accounts"**
5. Redirect URI: `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`
6. Click **Register**
7. Copy the **Application (client) ID**
8. Go to **"Certificates & secrets"** → **"New client secret"**
9. Copy the **secret value** (not the ID)

### Step 3: Update .env File

Open `ai-recruitment-Backend/.env` and replace these values:

```env
# OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

MICROSOFT_CLIENT_ID=your-actual-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-actual-microsoft-client-secret

BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

### Step 4: Restart Backend

```bash
cd ai-recruitment-Backend
# Stop the server (Ctrl+C)
# Start it again
python run.py
```

## Test It

1. Go to `http://localhost:5173/auth`
2. Click **"Continue with Google"** or **"Continue with Microsoft"**
3. You should see the Google/Microsoft account selection screen
4. After selecting account, you'll be redirected back to TalentIQ dashboard

## What Happens Now

- Clicking Google button → Redirects to `accounts.google.com` → Shows your Google accounts → Select one → Redirects back with token
- Clicking Microsoft button → Redirects to `login.microsoftonline.com` → Shows your Microsoft accounts → Select one → Redirects back with token

## Troubleshooting

**Still seeing blank page?**
- Check if credentials are correctly pasted in .env (no extra spaces)
- Verify redirect URIs match exactly in Google/Microsoft consoles
- Restart backend server after changing .env

**"Redirect URI mismatch" error?**
- Make sure redirect URI in Google/Microsoft console is: `http://localhost:8000/api/v1/auth/oauth/google/callback` (for Google) or `http://localhost:8000/api/v1/auth/oauth/microsoft/callback` (for Microsoft)

**"Invalid client" error?**
- Double-check Client ID and Client Secret are correct
- Make sure you copied the secret VALUE, not the secret ID (for Microsoft)
