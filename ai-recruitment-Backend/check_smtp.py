"""
SMTP Configuration Checker
Run this to diagnose email issues
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def check_smtp_config():
    """Check if SMTP is configured"""
    print("\n" + "="*60)
    print("SMTP CONFIGURATION CHECK")
    print("="*60 + "\n")
    
    # Check environment variables
    config = {
        'SMTP_SERVER': os.getenv('SMTP_SERVER', 'NOT SET'),
        'SMTP_PORT': os.getenv('SMTP_PORT', 'NOT SET'),
        'SMTP_USER': os.getenv('SMTP_USER', 'NOT SET'),
        'SMTP_PASSWORD': os.getenv('SMTP_PASSWORD', 'NOT SET'),
        'FROM_EMAIL': os.getenv('FROM_EMAIL', 'NOT SET'),
        'FROM_NAME': os.getenv('FROM_NAME', 'NOT SET'),
    }
    
    print("📧 Current Configuration:")
    for key, value in config.items():
        if key == 'SMTP_PASSWORD':
            display = '***HIDDEN***' if value != 'NOT SET' else 'NOT SET'
        else:
            display = value
        
        status = "✅" if value != 'NOT SET' else "❌"
        print(f"   {status} {key}: {display}")
    
    # Check if all required fields are set
    missing = [k for k, v in config.items() if v == 'NOT SET']
    
    if missing:
        print(f"\n❌ MISSING CONFIGURATION: {', '.join(missing)}")
        print("\n🔧 TO FIX:")
        print("   1. Go to Render.com dashboard")
        print("   2. Select your backend service")
        print("   3. Go to Environment tab")
        print("   4. Add these variables:")
        print("\n   SMTP_SERVER=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USER=your-email@gmail.com")
        print("   SMTP_PASSWORD=your-gmail-app-password")
        print("   FROM_EMAIL=noreply@talentiq.ai")
        print("   FROM_NAME=TalentIQ")
        print("\n   5. Save and redeploy")
        return False
    else:
        print("\n✅ All SMTP variables are configured!")
        return True

def test_smtp_connection():
    """Test SMTP connection"""
    print("\n" + "="*60)
    print("TESTING SMTP CONNECTION")
    print("="*60 + "\n")
    
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    
    if not smtp_user or not smtp_password:
        print("❌ Cannot test: SMTP_USER or SMTP_PASSWORD not set")
        return False
    
    try:
        print(f"🔌 Connecting to {smtp_server}:{smtp_port}...")
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        print("✅ Connected!")
        
        print("🔐 Starting TLS...")
        server.starttls()
        print("✅ TLS started!")
        
        print(f"🔑 Logging in as {smtp_user}...")
        server.login(smtp_user, smtp_password)
        print("✅ Login successful!")
        
        server.quit()
        print("\n✅ SMTP CONNECTION TEST PASSED!")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print(f"\n❌ AUTHENTICATION FAILED: {e}")
        print("\n🔧 POSSIBLE FIXES:")
        print("   1. Use Gmail App Password (not regular password)")
        print("   2. Enable 2-Step Verification on Gmail")
        print("   3. Generate new App Password:")
        print("      https://myaccount.google.com/apppasswords")
        return False
        
    except smtplib.SMTPException as e:
        print(f"\n❌ SMTP ERROR: {e}")
        return False
        
    except Exception as e:
        print(f"\n❌ CONNECTION ERROR: {e}")
        print("\n🔧 CHECK:")
        print("   1. SMTP_SERVER is correct (smtp.gmail.com)")
        print("   2. SMTP_PORT is correct (587)")
        print("   3. Internet connection is working")
        return False

def send_test_email(to_email):
    """Send a test email"""
    print("\n" + "="*60)
    print("SENDING TEST EMAIL")
    print("="*60 + "\n")
    
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    from_email = os.getenv('FROM_EMAIL', 'noreply@talentiq.ai')
    from_name = os.getenv('FROM_NAME', 'TalentIQ')
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🧪 TalentIQ Email Test"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        
        html = """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #6366f1;">✅ Email System Working!</h2>
            <p>This is a test email from TalentIQ.</p>
            <p>If you received this, your SMTP configuration is correct!</p>
            <hr>
            <p style="color: #64748b; font-size: 12px;">
                TalentIQ AI Recruitment Platform<br>
                Email System Test
            </p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html, 'html'))
        
        print(f"📤 Sending test email to: {to_email}")
        
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        print(f"\n✅ TEST EMAIL SENT SUCCESSFULLY!")
        print(f"   Check inbox: {to_email}")
        print("   (Also check spam/junk folder)")
        return True
        
    except Exception as e:
        print(f"\n❌ FAILED TO SEND: {e}")
        return False

def main():
    print("\n🚀 TalentIQ Email System Diagnostic Tool\n")
    
    # Step 1: Check configuration
    config_ok = check_smtp_config()
    
    if not config_ok:
        print("\n" + "="*60)
        print("⚠️  CONFIGURATION INCOMPLETE")
        print("="*60)
        print("\nPlease configure SMTP settings and try again.")
        return
    
    # Step 2: Test connection
    connection_ok = test_smtp_connection()
    
    if not connection_ok:
        print("\n" + "="*60)
        print("⚠️  CONNECTION FAILED")
        print("="*60)
        print("\nPlease fix SMTP credentials and try again.")
        return
    
    # Step 3: Send test email
    print("\n" + "="*60)
    test_email = input("\nEnter email to send test (or press Enter to skip): ").strip()
    
    if test_email and '@' in test_email:
        send_test_email(test_email)
    else:
        print("\nSkipping test email.")
    
    print("\n" + "="*60)
    print("✅ DIAGNOSTIC COMPLETE")
    print("="*60)
    print("\nIf all tests passed, email system is working!")
    print("If welcome emails still not arriving:")
    print("  1. Check spam/junk folder")
    print("  2. Wait 1-2 minutes for delivery")
    print("  3. Check backend logs on Render")
    print("\n")

if __name__ == "__main__":
    main()
