# 🔐 OAuth Setup Guide - Google & Microsoft Login

## ✅ What's Been Fixed

### Backend Updates:
1. ✅ Added session middleware (required for OAuth)
2. ✅ Email domain validation (Gmail, Outlook, Yahoo, company domains)
3. ✅ Proper OAuth callback handling
4. ✅ Email verification enforcement

### Frontend Updates:
1. ✅ OAuth buttons now redirect properly
2. ✅ Callback handling with user data fetch
3. ✅ Email domain validation on login/signup
4. ✅ Better error messages

### Security Features:
- ✅ Only verified emails allowed (Google)
- ✅ Microsoft emails verified by default
- ✅ Domain whitelist (Gmail, Outlook, Yahoo, company domains)
- ✅ Random/fake emails blocked

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd ai-recruitment-Backend
pip install authlib==1.3.1 itsdangerous==2.2.0 starlette==0.37.2
```

### Step 2: Get Google OAuth Credentials

1. Go to: https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable **Google+ API**:
   - APIs & Services → Library
   - Search "Google+ API"
   - Click Enable

4. Create OAuth 2.0 Client ID:
   - APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: `TalentIQ`
   
5. Add Authorized redirect URIs:
   ```
   http://localhost:8000/api/v1/auth/oauth/google/callback
   ```
   
6. Click "Create"
7. Copy **Client ID** and **Client Secret**

### Step 3: Get Microsoft OAuth Credentials

1. Go to: https://portal.azure.com/
2. Navigate to **Azure Active Directory**
3. Click **App registrations** → **New registration**
4. Fill in:
   - Name: `TalentIQ`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: 
     - Platform: **Web**
     - URI: `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`

5. Click "Register"
6. Copy **Application (client) ID**
7. Go to **Certificates & secrets** → **New client secret**
8. Description: `TalentIQ Secret`
9. Expires: 24 months
10. Click "Add"
11. Copy **Client secret value** (you won't see it again!)

### Step 4: Update .env File

```bash
cd ai-recruitment-Backend
nano .env  # or use any text editor
```

Add these lines:

```env
# OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Make sure SECRET_KEY is set (required for sessions)
SECRET_KEY=your-super-secret-key-min-32-characters-long
```

### Step 5: Restart Backend

```bash
cd ai-recruitment-Backend
python run.py
```

You should see:
```
✅ All systems ready. Platform is live.
```

---

## 🧪 Test OAuth Login

### Test Google Login:

1. Visit: `http://localhost:5173/auth`
2. Click **"Continue with Google"** button
3. Should redirect to Google login page
4. Select your Google account
5. Grant permissions
6. Should redirect back to TalentIQ dashboard
7. ✅ You're logged in!

### Test Microsoft Login:

1. Visit: `http://localhost:5173/auth`
2. Click **"Continue with Microsoft"** button
3. Should redirect to Microsoft login page
4. Sign in with Microsoft account
5. Grant permissions
6. Should redirect back to TalentIQ dashboard
7. ✅ You're logged in!

---

## 🔒 Email Domain Validation

### Allowed Email Domains:

**Public Providers:**
- ✅ Gmail: `@gmail.com`, `@googlemail.com`
- ✅ Outlook: `@outlook.com`, `@hotmail.com`, `@live.com`, `@msn.com`
- ✅ Yahoo: `@yahoo.com`, `@ymail.com`
- ✅ Apple: `@icloud.com`, `@me.com`
- ✅ ProtonMail: `@protonmail.com`, `@proton.me`

**Company Domains:**
- ✅ Any valid company domain (e.g., `@company.com`, `@startup.io`)

### Blocked:
- ❌ Temporary email services
- ❌ Disposable emails
- ❌ Invalid domains
- ❌ Unverified emails

---

## 🐛 Troubleshooting

### OAuth buttons not working?

**Check 1: Backend logs**
```bash
cd ai-recruitment-Backend
python run.py
```
Look for errors when clicking OAuth button.

**Check 2: Credentials in .env**
```bash
cat .env | grep GOOGLE
cat .env | grep MICROSOFT
```
Make sure they're not empty.

**Check 3: Redirect URIs**
- Google Console: Must be exactly `http://localhost:8000/api/v1/auth/oauth/google/callback`
- Azure Portal: Must be exactly `http://localhost:8000/api/v1/auth/oauth/microsoft/callback`

**Check 4: Session middleware**
Open `app/main.py` and verify:
```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    ...
)
```

### "Failed to get user info" error?

**For Google:**
- Make sure Google+ API is enabled
- Check Client ID and Secret are correct
- Verify redirect URI matches exactly

**For Microsoft:**
- Check Application ID is correct
- Verify Client Secret hasn't expired
- Make sure redirect URI matches exactly

### Email domain rejected?

**Error:** "Please use a valid email from Gmail, Outlook, Yahoo, or your company domain"

**Solution:**
- Use Gmail, Outlook, Yahoo, or iCloud
- OR use your company email (e.g., `you@company.com`)
- Temporary/disposable emails are blocked for security

### Callback not working?

**Check frontend .env:**
```bash
cd ai-recruitment-frontend
cat .env
```

Should have:
```env
VITE_API_URL=http://localhost:8000
```

**Check browser console:**
- Open DevTools (F12)
- Look for errors in Console tab
- Check Network tab for failed requests

---

## 📊 How OAuth Flow Works

### Google OAuth Flow:

```
1. User clicks "Continue with Google"
   ↓
2. Frontend redirects to: /api/v1/auth/oauth/google/login
   ↓
3. Backend redirects to: Google login page
   ↓
4. User logs in with Google
   ↓
5. Google redirects to: /api/v1/auth/oauth/google/callback
   ↓
6. Backend:
   - Gets user info from Google
   - Verifies email is verified
   - Creates/finds user in database
   - Generates JWT tokens
   ↓
7. Backend redirects to: /auth/callback?access_token=...&refresh_token=...
   ↓
8. Frontend:
   - Extracts tokens from URL
   - Stores in localStorage
   - Fetches user data
   - Redirects to /dashboard
   ↓
9. ✅ User is logged in!
```

### Microsoft OAuth Flow:

Same as Google, but uses Microsoft Graph API.

---

## 🔐 Security Features

### 1. Email Verification
- Google: Only verified emails allowed
- Microsoft: Verified by default through OAuth

### 2. Domain Whitelist
- Public providers: Gmail, Outlook, Yahoo, etc.
- Company domains: Any valid corporate email
- Blocked: Temporary/disposable emails

### 3. JWT Tokens
- Access token: 60 minutes
- Refresh token: 7 days
- Secure HTTP-only cookies (production)

### 4. Session Security
- Session middleware for OAuth state
- CSRF protection
- Secure cookies in production

---

## 📝 Production Checklist

Before deploying to production:

- [ ] Set `HTTPS_ONLY=True` in session middleware
- [ ] Update redirect URIs to production domain
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for production domain
- [ ] Set secure cookie flags
- [ ] Use HTTPS for all OAuth redirects
- [ ] Rotate client secrets regularly
- [ ] Monitor OAuth logs for suspicious activity

---

## ✅ Verification Steps

### 1. Check Backend is Running
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"healthy",...}`

### 2. Check OAuth Endpoints
```bash
curl http://localhost:8000/api/v1/auth/oauth/google/login
```
Should redirect to Google.

### 3. Check Frontend
Visit: `http://localhost:5173/auth`
- Should see OAuth buttons
- Clicking should redirect to provider

### 4. Test Full Flow
1. Click "Continue with Google"
2. Log in with Google
3. Should redirect to dashboard
4. Check localStorage has tokens:
   - Open DevTools → Application → Local Storage
   - Should see `access_token` and `refresh_token`

---

## 🎯 Current Status

**Backend:**
- ✅ OAuth routes configured
- ✅ Session middleware added
- ✅ Email domain validation
- ✅ Callback handling

**Frontend:**
- ✅ OAuth buttons working
- ✅ Callback page handling
- ✅ Token storage
- ✅ User data fetch

**Security:**
- ✅ Email verification
- ✅ Domain whitelist
- ✅ JWT tokens
- ✅ Session security

---

## 🚀 Next Steps

1. **Get OAuth credentials** (5 min)
   - Google Cloud Console
   - Azure Portal

2. **Update .env** (1 min)
   - Add Client IDs
   - Add Client Secrets

3. **Restart backend** (1 min)
   ```bash
   python run.py
   ```

4. **Test login** (1 min)
   - Visit `/auth`
   - Click OAuth button
   - Should work!

---

**Total setup time: ~10 minutes**

**Need help?** Check the troubleshooting section above.
