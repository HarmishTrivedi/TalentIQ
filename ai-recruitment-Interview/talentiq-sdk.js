// ═══════════════════════════════════════════════════════
// TalentIQ Portal Integration SDK
// Drop this into your existing recruitment portal
// Usage: import TalentIQ from './talentiq-sdk.js'
// ═══════════════════════════════════════════════════════

class TalentIQSDK {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.TALENTIQ_URL || '';
    this.apiKey = config.apiKey || process.env.TALENTIQ_API_KEY || '';
    this.onRoomCreated = config.onRoomCreated || null;
  }

  /**
   * Create an interview room and get back recruiter + candidate URLs
   * Call this from your scheduling / interview creation flow
   */
  async createRoom({
    interviewId,
    recruiterId,
    recruiterName,
    candidateId,
    candidateName,
    jobTitle,
    jobId,
    scheduledAt
  }) {
    const res = await fetch(`${this.baseUrl}/api/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {})
      },
      body: JSON.stringify({
        interviewId,
        recruiterId,
        recruiterName,
        candidateId,
        candidateName,
        jobTitle,
        jobId,
        scheduledAt,
        apiKey: this.apiKey
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (this.onRoomCreated) this.onRoomCreated(data);
    return data;
    // Returns: { roomId, recruiterUrl, candidateUrl, room }
  }

  /** Get room status */
  async getRoom(roomId) {
    const res = await fetch(`${this.baseUrl}/api/rooms/${roomId}`);
    if (!res.ok) throw new Error(`Room not found: ${roomId}`);
    return res.json();
  }

  /** End an interview room */
  async endRoom(roomId) {
    const res = await fetch(`${this.baseUrl}/api/rooms/${roomId}/end`, { method: 'POST' });
    return res.json();
  }

  /**
   * Open recruiter interview in current tab
   */
  openRecruiterRoom(recruiterUrl) {
    window.location.href = recruiterUrl;
  }

  /**
   * Open recruiter interview in a new tab
   */
  openRecruiterTab(recruiterUrl) {
    window.open(recruiterUrl, '_blank');
  }

  /**
   * Get the candidate invite link to send via email/SMS
   */
  getCandidateLink(candidateUrl) {
    return candidateUrl;
  }

  /**
   * Generate email body with candidate interview link
   */
  generateInviteEmail({ candidateName, recruiterName, jobTitle, candidateUrl, scheduledAt }) {
    const date = scheduledAt ? new Date(scheduledAt).toLocaleString() : 'as scheduled';
    return {
      subject: `Interview Invitation — ${jobTitle}`,
      body: `Dear ${candidateName},

You have been invited for an interview for the position of ${jobTitle}.

Your interview is scheduled for: ${date}

Please click the link below to join your interview at the scheduled time:

${candidateUrl}

The link will take you directly to the interview room. Please ensure you have a working camera and microphone before joining.

Best regards,
${recruiterName}`
    };
  }
}

// ─── React Hook (if your portal uses React) ───
// Usage: const { createRoom, loading, error } = useTalentIQ()
export function useTalentIQ(config = {}) {
  // This is a vanilla JS implementation that works with any framework
  // For React, wrap in useState/useCallback as needed
  const sdk = new TalentIQSDK(config);

  return {
    createRoom: sdk.createRoom.bind(sdk),
    getRoom: sdk.getRoom.bind(sdk),
    endRoom: sdk.endRoom.bind(sdk),
    openRecruiterRoom: sdk.openRecruiterRoom.bind(sdk),
    getCandidateLink: sdk.getCandidateLink.bind(sdk),
    generateInviteEmail: sdk.generateInviteEmail.bind(sdk),
  };
}

export default TalentIQSDK;
