# TalentIQ Transactional Email Setup

TalentIQ sends mail through the Resend HTTPS API. The application does not
require SMTP credentials.

## Required Configuration

1. Create a Resend account and verify a sending domain.
2. Create an API key in Resend.
3. Set these backend environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=interviews@your-verified-domain.com
FROM_NAME=TalentIQ
FRONTEND_URL=https://your-frontend-domain.example
REMINDER_CRON_SECRET=use-a-long-random-value
```

`RESEND_FROM_EMAIL` must belong to a verified Resend sending domain when
sending invitations to real recruiter and candidate addresses.

## Automated Emails

- A new recruiter receives one welcome email after password registration or
  Google OAuth creation. Failed deliveries remain pending and are retried.
- Scheduling an interview sends a confirmation to the recruiter and an
  invitation to the candidate.
- The candidate invitation contains a tokenized join link in this form:
  `/join/{interview_id}?token={candidate_access_token}`.
- Thirty minutes before the interview, both participants receive one reminder.
  The candidate reminder reuses the exact stored candidate join link.

## Reliable Reminder Trigger

The backend runs reminder checks while it is awake. For deployments that can
sleep, configure a scheduled HTTP request every five minutes:

```http
POST https://your-backend-domain.example/api/v1/interviews/reminders/process
X-Reminder-Secret: <REMINDER_CRON_SECRET>
```

The endpoint is secret-protected. Reminder state is saved per interview and
per recipient, and Resend idempotency keys protect provider retries from
creating duplicate emails.
