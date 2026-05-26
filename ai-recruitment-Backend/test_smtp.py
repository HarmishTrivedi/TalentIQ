"""
Test SMTP Configuration and Send Welcome Email
Run this to verify email setup is working
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.email_service import get_email_service

def test_smtp_connection():
    """Test SMTP connection and configuration"""
    print("=" * 60)
    print("TESTING SMTP CONFIGURATION")
    print("=" * 60)
    
    # Check environment variables
    smtp_server = os.getenv('SMTP_SERVER', 'NOT SET')
    smtp_port = os.getenv('SMTP_PORT', 'NOT SET')
    smtp_user = os.getenv('SMTP_USER', 'NOT SET')
    smtp_password = os.getenv('SMTP_PASSWORD', 'NOT SET')
    from_email = os.getenv('FROM_EMAIL', 'NOT SET')
    
    print(f"\n📧 SMTP Configuration:")
    print(f"   Server: {smtp_server}")
    print(f"   Port: {smtp_port}")
    print(f"   User: {smtp_user}")
    print(f"   Password: {'*' * 10 if smtp_password != 'NOT SET' else 'NOT SET'}")
    print(f"   From Email: {from_email}")
    
    if smtp_password == 'NOT SET' or smtp_user == 'NOT SET':
        print("\n❌ ERROR: SMTP credentials not configured!")
        print("\nPlease set these environment variables:")
        print("   SMTP_SERVER=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USER=your-email@gmail.com")
        print("   SMTP_PASSWORD=your-app-password")
        print("   FROM_EMAIL=noreply@talentiq.ai")
        print("   FROM_NAME=TalentIQ")
        return False
    
    print("\n✅ SMTP credentials are configured")
    return True

def send_test_welcome_email():
    """Send a test welcome email"""
    print("\n" + "=" * 60)
    print("SENDING TEST WELCOME EMAIL")
    print("=" * 60)
    
    test_email = input("\nEnter your email address to receive test: ").strip()
    if not test_email or '@' not in test_email:
        print("❌ Invalid email address")
        return
    
    test_name = input("Enter your name: ").strip() or "Test User"
    
    print(f"\n📤 Sending welcome email to: {test_email}")
    print(f"   Name: {test_name}")
    
    try:
        email_service = get_email_service()
        success = email_service.send_welcome_email(
            recruiter_email=test_email,
            recruiter_name=test_name,
            company_name="Test Company"
        )
        
        if success:
            print("\n✅ SUCCESS! Welcome email sent successfully!")
            print(f"   Check your inbox: {test_email}")
            print("   (Also check spam/junk folder)")
        else:
            print("\n❌ FAILED! Email was not sent")
            print("   Check SMTP credentials and try again")
            
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        print("\nFull error details:")
        traceback.print_exc()

def main():
    """Main test function"""
    print("\n🚀 TalentIQ Email System Test\n")
    
    # Test SMTP configuration
    if not test_smtp_connection():
        return
    
    # Ask if user wants to send test email
    print("\n" + "=" * 60)
    choice = input("\nDo you want to send a test welcome email? (y/n): ").strip().lower()
    
    if choice == 'y':
        send_test_welcome_email()
    else:
        print("\n✅ SMTP configuration verified. Skipping test email.")
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
    print("\nIf emails are not working:")
    print("1. Verify Gmail App Password is correct")
    print("2. Check spam/junk folder")
    print("3. Ensure 2-Step Verification is enabled on Gmail")
    print("4. Try generating a new App Password")
    print("\n")

if __name__ == "__main__":
    main()
