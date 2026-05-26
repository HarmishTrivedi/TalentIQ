"""
Quick fix: Remove Unicode from email service print statements
"""
import re

# Read the file
with open('app/services/email_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Unicode emojis in print statements
replacements = {
    '📧': '[EMAIL]',
    '✅': '[OK]',
    '❌': '[ERROR]',
    '⚠️': '[WARNING]',
    '⏳': '[WAIT]',
}

for emoji, text in replacements.items():
    content = content.replace(f'print(f"{emoji}', f'print(f"{text}')
    content = content.replace(f'print(f\'{emoji}', f'print(f\'{text}')

# Write back
with open('app/services/email_service.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Unicode characters in email_service.py")
