"""
Send welcome emails to all registered users - Simplified version
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# Email config
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
FROM_EMAIL = os.getenv('FROM_EMAIL')
FROM_NAME = os.getenv('FROM_NAME')
FRONTEND_URL = os.getenv('FRONTEND_URL')

# Database config
DB_URL = os.getenv('DATABASE_URL', 'postgresql+asyncpg://postgres:password@localhost:5432/ai_recruitment')
# Convert asyncpg to psycopg2 format
DB_URL = DB_URL.replace('postgresql+asyncpg://', 'postgresql://')

def send_welcome_email(email, name, company):
    """Send welcome email"""
    subject = "Welcome to TalentIQ - Your AI-Powered Recruitment Journey Begins!"
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); padding: 50px 20px; }}
        .card {{ background: white; border-radius: 24px; padding: 50px 40px; }}
        .logo-text {{ font-size: 48px; font-weight: 900; text-align: center; margin-bottom: 20px; }}
        h1 {{ color: #1e293b; font-size: 32px; margin-bottom: 15px; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 18px 45px; text-decoration: none; border-radius: 14px; font-weight: 700; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo-text">TalentIQ</div>
            <h1>Welcome to the Future of Hiring{' from ' + company if company else ''}!</h1>
            <p>Hi <strong>{name}</strong>, we're thrilled to have you on board!</p>
            <p>Your AI-powered recruitment platform is ready to use.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">
                © 2024 TalentIQ - AI-Powered Recruitment Platform
            </p>
        </div>
    </div>
</body>
</html>
"""
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = email
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False

def main():
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # Get all recruiters
        cursor.execute("SELECT email, full_name, company_name FROM users WHERE role = 'recruiter' AND email IS NOT NULL")
        users = cursor.fetchall()
        
        print(f'Found {len(users)} registered recruiters\n')
        print('=' * 80)
        
        sent = 0
        failed = 0
        
        for email, name, company in users:
            print(f'\nSending to: {email} ({name})')
            success = send_welcome_email(email, name, company)
            
            if success:
                sent += 1
                print(f'  [OK] Email sent successfully')
            else:
                failed += 1
                print(f'  [FAILED] Email not sent')
        
        cursor.close()
        conn.close()
        
        print('\n' + '=' * 80)
        print(f'\nSummary:')
        print(f'  Total users: {len(users)}')
        print(f'  Sent: {sent}')
        print(f'  Failed: {failed}')
        print('=' * 80)
        
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == '__main__':
    main()
