"""
Quick OAuth Diagnostic Script
"""
import sys
import os

print("=" * 60)
print("OAUTH DIAGNOSTIC CHECK")
print("=" * 60)

# Check 1: .env file exists
env_path = ".env"
if os.path.exists(env_path):
    print("\n[OK] .env file found")
    with open(env_path, 'r') as f:
        content = f.read()
        
    # Check OAuth credentials
    if "GOOGLE_CLIENT_ID=your-google-client-id" in content:
        print("[ERROR] Google credentials NOT configured (still placeholder)")
    elif "GOOGLE_CLIENT_ID=" in content and len(content.split("GOOGLE_CLIENT_ID=")[1].split("\n")[0].strip()) > 10:
        print("[OK] Google Client ID configured")
    else:
        print("[ERROR] Google Client ID missing")
        
    if "MICROSOFT_CLIENT_ID=your-microsoft-client-id" in content:
        print("[ERROR] Microsoft credentials NOT configured (still placeholder)")
    elif "MICROSOFT_CLIENT_ID=" in content and len(content.split("MICROSOFT_CLIENT_ID=")[1].split("\n")[0].strip()) > 10:
        print("[OK] Microsoft Client ID configured")
    else:
        print("[ERROR] Microsoft Client ID missing")
        
    if "BACKEND_URL=" in content:
        backend_url = content.split("BACKEND_URL=")[1].split("\n")[0].strip()
        print(f"[OK] Backend URL: {backend_url}")
    else:
        print("[ERROR] BACKEND_URL missing")
        
    if "FRONTEND_URL=" in content:
        frontend_url = content.split("FRONTEND_URL=")[1].split("\n")[0].strip()
        print(f"[OK] Frontend URL: {frontend_url}")
    else:
        print("[ERROR] FRONTEND_URL missing")
else:
    print("\n[ERROR] .env file not found")

# Check 2: OAuth route file exists
oauth_route = "app/routes/oauth.py"
if os.path.exists(oauth_route):
    print(f"\n[OK] OAuth routes file exists: {oauth_route}")
else:
    print(f"\n[ERROR] OAuth routes file missing: {oauth_route}")

# Check 3: Dependencies
print("\n" + "=" * 60)
print("CHECKING DEPENDENCIES")
print("=" * 60)

try:
    import authlib
    print(f"[OK] authlib installed (version: {authlib.__version__})")
except ImportError:
    print("[ERROR] authlib NOT installed - run: pip install authlib")

try:
    import itsdangerous
    print(f"[OK] itsdangerous installed")
except ImportError:
    print("[ERROR] itsdangerous NOT installed - run: pip install itsdangerous")

try:
    import httpx
    print(f"[OK] httpx installed")
except ImportError:
    print("[ERROR] httpx NOT installed - run: pip install httpx")

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("\nTo fix OAuth:")
print("1. Get Google credentials from: https://console.cloud.google.com/apis/credentials")
print("2. Get Microsoft credentials from: https://portal.azure.com")
print("3. Update .env file with real credentials")
print("4. Restart backend server")
print("\nSee OAUTH_QUICK_SETUP.md for detailed instructions")
