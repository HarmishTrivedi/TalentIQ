# Interview Email Notification System - Complete Guide

## ✅ IMPLEMENTATION COMPLETE!

### 📧 Email Types Implemented

#### 1. **Interview Invitation Emails** (Sent when interview is scheduled)
- **Candidate Invitation**: Beautiful invitation with interview details
- **Recruiter Confirmation**: Confirmation that interview was scheduled

#### 2. **Interview Reminder Emails** (Sent 30 minutes before interview)
- **Candidate Reminder**: Urgent reminder with checklist
- **Recruiter Reminder**: Professional reminder with candidate info

---

## 🎨 Email Templates

### 1. Candidate Interview Reminder
**Subject**: ⏰ Reminder: Interview in 30 Minutes - [Interview Title]

**Features**:
- 🚨 Urgent "30 MINUTES" alert box
- ⏰ Large time display with date
- 📋 Interview details (title, interviewer)
- 🎥 Prominent "JOIN INTERVIEW NOW" button
- ✅ Pre-interview checklist:
  - Camera working
  - Microphone tested
  - Quiet environment
  - Resume ready
  - Professional attire
  - Questions prepared
- 💡 Pro tip: Join 5 minutes early
- 🚀 Motivational message

**Design**: Orange/Red gradient (urgent feel)

---

### 2. Recruiter Interview Reminder
**Subject**: ⏰ Reminder: Interview in 30 Minutes with [Candidate Name]

**Features**:
- 🎯 "Interview starts in 30 MINUTES" alert
- ⏰ Large time display with date
- 📋 Interview details (title, candidate name, email)
- 🎥 "START INTERVIEW" button
- 📝 Interviewer preparation checklist:
  - Review candidate profile
  - Prepare questions
  - Test equipment
  - Have evaluation criteria
  - Professional environment
- 💡 Note: Candidate has been notified
- 🚀 Good luck message

**Design**: Green/Blue gradient (professional feel)

---

## 🔄 Email Flow

### When Interview is Scheduled:
```
Interview Created
    ↓
[IMMEDIATE EMAILS]
    ├─→ Candidate: Interview Invitation
    └─→ Recruiter: Interview Confirmation
```

### 30 Minutes Before Interview:
```
Scheduled Time - 30 minutes
    ↓
[REMINDER EMAILS]
    ├─→ Candidate: Urgent Reminder
    └─→ Recruiter: Professional Reminder
```

---

## 🚀 How to Use

### 1. Automatic (When Creating Interview)

When you create an interview via API, emails are sent automatically:

```python
POST /interviews
{
    "candidate_id": "uuid",
    "job_id": "uuid",
    "title": "Senior Full Stack Developer Interview",
    "scheduled_at": "2026-05-13T14:30:00Z",
    "duration_minutes": 60,
    "meeting_link": "https://meet.google.com/abc-defg-hij"
}
```

**Result**: 
- ✅ Candidate receives invitation
- ✅ Recruiter receives confirmation

---

### 2. Manual Reminder (30 min before)

To send reminders manually:

```python
POST /interviews/send-reminder/{interview_id}
```

**Result**:
- ✅ Candidate receives urgent reminder
- ✅ Recruiter receives professional reminder

---

### 3. Scheduled Reminders (Recommended)

Set up a cron job or scheduler to automatically send reminders 30 minutes before:

```python
# Example: Check every 5 minutes for interviews starting in 30 minutes
# Send reminders automatically
```

---

## 📝 API Endpoints

### Create Interview (Auto-sends invitations)
```
POST /interviews
```

**Request Body**:
```json
{
    "candidate_id": "string",
    "job_id": "string (optional)",
    "title": "string",
    "scheduled_at": "datetime",
    "duration_minutes": 60,
    "meeting_link": "string (optional)"
}
```

**Emails Sent**:
- Candidate invitation
- Recruiter confirmation

---

### Send Interview Reminder
```
POST /interviews/send-reminder/{interview_id}
```

**Response**:
```json
{
    "message": "Reminders sent",
    "candidate_sent": true,
    "recruiter_sent": true
}
```

**Emails Sent**:
- Candidate reminder (30 min before)
- Recruiter reminder (30 min before)

---

## 🧪 Testing

### Test Interview Reminder Emails:
```bash
cd ai-recruitment-Backend
python send_interview_reminder_demo.py
```

This sends demo emails to: `harmish.lumoslogic@gmail.com`

**Demo includes**:
1. Candidate reminder email
2. Recruiter reminder email

---

## 📊 Email Content Details

### Candidate Reminder Includes:
- ⏰ Interview time (large display)
- 📅 Full date
- 📋 Interview title
- 👤 Interviewer name
- 🎥 Meeting link button
- ✅ 6-point checklist
- 💡 Pro tips
- 🚀 Motivational message

### Recruiter Reminder Includes:
- ⏰ Interview time (large display)
- 📅 Full date
- 📋 Interview title
- 👤 Candidate name
- 📧 Candidate email
- 🎥 Meeting link button
- 📝 5-point preparation checklist
- 💡 Candidate notification status
- 🚀 Good luck message

---

## 🎯 Key Features

✅ **Beautiful HTML Templates**
- Responsive design
- Professional gradients
- Clear call-to-action buttons
- Mobile-friendly

✅ **Urgent Design for Reminders**
- Orange/Red for candidate (urgent)
- Green/Blue for recruiter (professional)
- Large time displays
- Prominent buttons

✅ **Comprehensive Checklists**
- Pre-interview preparation
- Equipment testing
- Professional tips

✅ **Automatic Sending**
- Invitations sent on interview creation
- Reminders can be scheduled

✅ **Error Handling**
- Graceful failures
- Logs errors
- Doesn't break interview creation

---

## 🔧 Configuration

### Environment Variables (.env):
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply.talentiq@gmail.com
SMTP_PASSWORD=hskw zoha ioxq eebz
FROM_EMAIL=noreply.talentiq@gmail.com
FROM_NAME=TalentIQ
FRONTEND_URL=https://your-frontend-url.com
```

---

## 📅 Scheduling Reminders (Recommended Setup)

### Option 1: Celery Beat (Recommended)
```python
# Install: pip install celery redis

# tasks.py
from celery import Celery
from datetime import datetime, timedelta

@celery.task
def send_interview_reminders():
    # Find interviews starting in 30 minutes
    target_time = datetime.now() + timedelta(minutes=30)
    interviews = get_interviews_at_time(target_time)
    
    for interview in interviews:
        send_reminder(interview.id)
```

### Option 2: APScheduler
```python
# Install: pip install apscheduler

from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job('interval', minutes=5)
async def check_and_send_reminders():
    # Check for interviews in 30 minutes
    # Send reminders
    pass

scheduler.start()
```

### Option 3: Cron Job
```bash
# Run every 5 minutes
*/5 * * * * cd /path/to/backend && python send_reminders_cron.py
```

---

## 🎨 Email Design Highlights

### Candidate Reminder:
- **Color Scheme**: Orange (#f59e0b) to Red (#ef4444)
- **Mood**: Urgent, Action-oriented
- **CTA**: "JOIN INTERVIEW NOW" (large, prominent)
- **Icons**: ⏰ 🚨 🎥 ✅ 💡 🚀

### Recruiter Reminder:
- **Color Scheme**: Green (#10b981) to Blue (#3b82f6)
- **Mood**: Professional, Prepared
- **CTA**: "START INTERVIEW" (clear, professional)
- **Icons**: ⏰ 🎯 🎥 📝 💡 🚀

---

## 📧 Sample Email Subjects

### Invitations:
- "Interview Invitation: Senior Full Stack Developer Position"
- "Interview Scheduled: John Doe - Backend Engineer"

### Reminders:
- "⏰ Reminder: Interview in 30 Minutes - Senior Developer"
- "⏰ Reminder: Interview in 30 Minutes with John Doe"

---

## ✅ Testing Checklist

- [x] SMTP configuration working
- [x] Candidate invitation email template
- [x] Recruiter confirmation email template
- [x] Candidate reminder email template
- [x] Recruiter reminder email template
- [x] Auto-send on interview creation
- [x] Manual reminder endpoint
- [x] Meeting link included
- [x] Responsive design
- [x] Error handling
- [x] Demo script working

---

## 🚀 Production Deployment

### 1. Set up email scheduler
Choose one of the scheduling options above

### 2. Configure environment
Ensure all SMTP settings are correct

### 3. Test thoroughly
Send test emails before going live

### 4. Monitor logs
Check for email sending errors

### 5. Set up alerts
Get notified if emails fail

---

## 📞 Support

### If emails aren't sending:
1. Check SMTP credentials in `.env`
2. Verify Gmail App Password is active
3. Check backend logs for errors
4. Test with demo script
5. Check spam folder

### If reminders aren't automatic:
1. Set up scheduler (Celery/APScheduler/Cron)
2. Ensure scheduler is running
3. Check scheduler logs
4. Test manually first

---

## 🎉 Summary

✅ **4 Email Templates Created**:
1. Candidate Invitation
2. Recruiter Confirmation
3. Candidate Reminder (30 min)
4. Recruiter Reminder (30 min)

✅ **Automatic Sending**:
- Invitations sent on interview creation
- Reminders via API endpoint

✅ **Beautiful Design**:
- Professional gradients
- Responsive layout
- Clear CTAs
- Helpful checklists

✅ **Production Ready**:
- Error handling
- Logging
- Tested and working

---

**Status: READY FOR PRODUCTION** 🚀

**Demo Emails Sent To**: harmish.lumoslogic@gmail.com ✅
