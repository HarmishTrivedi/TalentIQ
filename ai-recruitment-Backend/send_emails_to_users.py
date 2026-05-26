"""
Send welcome emails to all registered users via API
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import requests

load_dotenv()

# Email config
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT'))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
FROM_EMAIL = os.getenv('FROM_EMAIL')
FROM_NAME = os.getenv('FROM_NAME')
FRONTEND_URL = os.getenv('FRONTEND_URL')
BACKEND_URL = os.getenv('BACKEND_URL')

# Hardcoded list of known users (since we can't access DB)
USERS = [
    {'email': 'harmishtrivedi919@gmail.com', 'name': 'Harmish Trivedi', 'company': 'TalentIQ'},
    {'email': 'harmish@gmail.com', 'name': 'Harmish', 'company': None},
    {'email': 'jonathan@talentiq.ai', 'name': 'Jonathan Byers', 'company': 'TalentIQ'},
]

def send_welcome_email(email, name, company):
    """Send welcome email"""
    subject = "Welcome to TalentIQ - Your AI-Powered Recruitment Journey Begins!"
    
    company_text = f' from {company}' if company else ''
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); padding: 50px 20px; }}
        .card {{ background: white; border-radius: 24px; padding: 50px 40px; }}
        .logo-text {{ font-size: 48px; font-weight: 900; text-align: center; margin-bottom: 20px; color: #6366f1; }}
        h1 {{ color: #1e293b; font-size: 32px; margin-bottom: 15px; }}
        .subtitle {{ color: #64748b; font-size: 18px; margin-bottom: 30px; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 18px 45px; text-decoration: none; border-radius: 14px; font-weight: 700; margin: 20px 0; }}
        .features {{ margin: 30px 0; }}
        .feature {{ margin: 15px 0; padding: 15px; background: #f8fafc; border-left: 4px solid #6366f1; border-radius: 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo-text">✨ TalentIQ</div>
            <h1>Welcome to the Future of Hiring{company_text}! 🚀</h1>
            <p class="subtitle">Hi <strong>{name}</strong>, we're thrilled to have you on board!</p>
            
            <p>Your AI-powered recruitment platform is ready to revolutionize your hiring process.</p>
            
            <div class="features">
                <div class="feature">
                    <strong>📄 Smart CV Analysis</strong><br>
                    Upload CVs and let AI extract skills and insights instantly
                </div>
                <div class="feature">
                    <strong>🎯 AI Matching</strong><br>
                    Match candidates to jobs with 95%+ accuracy
                </div>
                <div class="feature">
                    <strong>🎥 Live AI Interviews</strong><br>
                    Conduct interviews with real-time AI analysis
                </div>
                <div class="feature">
                    <strong>💬 AI Assistant</strong><br>
                    Chat with AI for insights and decisions
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{FRONTEND_URL}/dashboard" class="button">🚀 Go to Dashboard</a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 40px;">
                © 2024 TalentIQ - AI-Powered Recruitment Platform<br>
                You're receiving this email because you created an account on TalentIQ
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
    print(f'Sending welcome emails to {len(USERS)} registered users\n')
    print('=' * 80)
    
    sent = 0
    failed = 0
    
    for user in USERS:
        email = user['email']
        name = user['name']
        company = user.get('company')
        
        print(f'\nSending to: {email} ({name})')
        success = send_welcome_email(email, name, company)
        
        if success:
            sent += 1
            print(f'  [OK] Email sent successfully')
        else:
            failed += 1
            print(f'  [FAILED] Email not sent')
    
    print('\n' + '=' * 80)
    print(f'\nSummary:')
    print(f'  Total users: {len(USERS)}')
    print(f'  Sent: {sent}')
    print(f'  Failed: {failed}')
    print('=' * 80)

if __name__ == '__main__':
    main()
