#!/usr/bin/env python3
"""
OAuth Configuration Checker
Verifies that OAuth is properly configured
"""
import os
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists and has OAuth credentials"""
    env_path = Path('.env')
    if not env_path.exists():
        print("❌ .env file not found!")
        print("   Create it from .env.example")
        return False
    
    with open(env_path) as f:
        content = f.read()
    
    checks = {
        'GOOGLE_CLIENT_ID': 'Google Client ID',
        'GOOGLE_CLIENT_SECRET': 'Google Client Secret',
        'MICROSOFT_CLIENT_ID': 'Microsoft Client ID',
        'MICROSOFT_CLIENT_SECRET': 'Microsoft Client Secret',
        'SECRET_KEY': 'Secret Key (for sessions)',
        'BACKEND_URL': 'Backend URL',
        'FRONTEND_URL': 'Frontend URL',
    }
    
    all_good = True
    for key, name in checks.items():
        if key not in content or f'{key}=' in content and not content.split(f'{key}=')[1].split('\n')[0].strip():
            print(f"❌ {name} not set in .env")
            all_good = False
        else:
            value = content.split(f'{key}=')[1].split('\n')[0].strip()
            if value and not value.startswith('your-'):
                print(f"✅ {name} configured")
            else:
                print(f"⚠️  {name} has placeholder value")
                all_good = False
    
    return all_good

def check_dependencies():
    """Check if required packages are installed"""
    try:
        import authlib
        print("✅ authlib installed")
    except ImportError:
        print("❌ authlib not installed")
        print("   Run: pip install authlib==1.3.1")
        return False
    
    try:
        import itsdangerous
        print("✅ itsdangerous installed")
    except ImportError:
        print("❌ itsdangerous not installed")
        print("   Run: pip install itsdangerous==2.2.0")
        return False
    
    try:
        from starlette.middleware.sessions import SessionMiddleware
        print("✅ starlette session middleware available")
    except ImportError:
        print("❌ starlette not installed or outdated")
        print("   Run: pip install starlette==0.37.2")
        return False
    
    return True

def check_oauth_routes():
    """Check if OAuth routes file exists"""
    oauth_file = Path('app/routes/oauth.py')
    if not oauth_file.exists():
        print("❌ OAuth routes file not found!")
        print("   Expected: app/routes/oauth.py")
        return False
    
    print("✅ OAuth routes file exists")
    return True

def check_main_py():
    """Check if main.py has session middleware"""
    main_file = Path('app/main.py')
    if not main_file.exists():
        print("❌ main.py not found!")
        return False
    
    with open(main_file) as f:
        content = f.read()
    
    if 'SessionMiddleware' in content:
        print("✅ SessionMiddleware configured in main.py")
        return True
    else:
        print("❌ SessionMiddleware not found in main.py")
        print("   Add session middleware for OAuth to work")
        return False

def main():
    print("=" * 60)
    print("🔐 TalentIQ OAuth Configuration Checker")
    print("=" * 60)
    print()
    
    print("📦 Checking Dependencies...")
    deps_ok = check_dependencies()
    print()
    
    print("📁 Checking Files...")
    routes_ok = check_oauth_routes()
    main_ok = check_main_py()
    print()
    
    print("⚙️  Checking Configuration...")
    env_ok = check_env_file()
    print()
    
    print("=" * 60)
    if deps_ok and routes_ok and main_ok and env_ok:
        print("✅ All checks passed! OAuth should work.")
        print()
        print("🚀 Next steps:")
        print("   1. Start backend: python run.py")
        print("   2. Visit: http://localhost:5173/auth")
        print("   3. Click 'Continue with Google' or 'Continue with Microsoft'")
        print("   4. Should redirect to provider login page")
    else:
        print("❌ Some checks failed. Fix the issues above.")
        print()
        print("📖 See OAUTH_SETUP_GUIDE.md for detailed instructions")
    print("=" * 60)

if __name__ == '__main__':
    main()
