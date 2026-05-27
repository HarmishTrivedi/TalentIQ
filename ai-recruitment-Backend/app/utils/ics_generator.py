"""
ICS Generator Utility.
Creates .ics calendar files for email attachments.
"""
from datetime import datetime, timedelta
import uuid
import base64

def generate_interview_ics(
    title: str,
    start_time: datetime,
    duration_minutes: int,
    description: str,
    location: str,
    organizer_name: str = "TalentIQ",
    organizer_email: str = "noreply@talentiq.ai"
) -> str:
    """
    Generate an ICS file content and return it as a Base64 encoded string.
    """
    end_time = start_time + timedelta(minutes=duration_minutes)
    
    # Format dates for ICS: YYYYMMDDTHHMMSSZ (UTC)
    dt_stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dt_start = start_time.strftime("%Y%m%dT%H%M%SZ")
    dt_end = end_time.strftime("%Y%m%dT%H%M%SZ")
    
    uid = str(uuid.uuid4())
    
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TalentIQ//AI Recruitment Platform//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"DTSTAMP:{dt_stamp}",
        f"DTSTART:{dt_start}",
        f"DTEND:{dt_end}",
        f"SUMMARY:{title}",
        f"DESCRIPTION:{description.replace('\\n', '\\\\n')}",
        f"LOCATION:{location}",
        f"ORGANIZER;CN={organizer_name}:MAILTO:{organizer_email}",
        f"UID:{uid}",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    
    ics_content = "\r\n".join(ics_lines)
    return base64.b64encode(ics_content.encode("utf-8")).decode("utf-8")
