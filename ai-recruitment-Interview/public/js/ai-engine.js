// ═══════════════════════════════════════════════════════
// TalentIQ — AI Analysis Engine
// Continuously analyzes transcript for skills, contradictions,
// communication quality, and generates follow-up questions
// ═══════════════════════════════════════════════════════

export class AIAnalysisEngine {
  constructor(onAnalysisUpdate) {
    this.onAnalysisUpdate = onAnalysisUpdate;
    this.transcriptBuffer = [];
    this.analysisInterval = null;
    this.lastAnalysisLength = 0;
    this.analysisState = {
      skills: [],
      topics: [],
      claims: [],
      contradictions: [],
      commScores: { clarity: 0, structure: 0, technical: 0, completeness: 0, conciseness: 0 },
      suggestedQuestions: [],
      timeline: [],
      overallScore: 0,
      strengths: [],
      concerns: [],
      summary: ''
    };
    this.isAnalyzing = false;
    this.sessionStart = Date.now();
  }

  addTranscriptEntry(speaker, text, timestamp) {
    this.transcriptBuffer.push({ speaker, text, timestamp: timestamp || new Date().toISOString() });
    // Trigger analysis after sufficient new content
    if (this.transcriptBuffer.length - this.lastAnalysisLength >= 3) {
      this.runAnalysis();
    }
  }

  startContinuousAnalysis(intervalMs = 15000) {
    this.analysisInterval = setInterval(() => {
      if (this.transcriptBuffer.length > this.lastAnalysisLength) {
        this.runAnalysis();
      }
    }, intervalMs);
  }

  stopAnalysis() {
    if (this.analysisInterval) clearInterval(this.analysisInterval);
  }

  async runAnalysis() {
    if (this.isAnalyzing || this.transcriptBuffer.length === 0) return;
    this.isAnalyzing = true;

    const transcript = this.transcriptBuffer
      .map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.speaker}: ${e.text}`)
      .join('\n');

    const elapsedMin = Math.floor((Date.now() - this.sessionStart) / 60000);

    const prompt = `You are an expert technical recruiter AI analyzing a live interview. Analyze the following interview transcript and return ONLY a valid JSON object (no markdown, no explanation).

Interview transcript (${elapsedMin} minutes elapsed):
${transcript}

Previous analysis state:
${JSON.stringify(this.analysisState, null, 2)}

Return a JSON object with exactly these fields:
{
  "skills": [
    {"name": "string", "level": "beginner|intermediate|expert", "status": "mentioned|confirmed|demonstrated", "evidence": "string"}
  ],
  "topics": [
    {"name": "string", "covered": boolean, "depth": "surface|moderate|deep"}
  ],
  "claims": [
    {"claim": "string", "confidence": 0-100, "evidence": "string", "timestamp": "string"}
  ],
  "contradictions": [
    {"statement_a": "string", "statement_b": "string", "time_a": "string", "time_b": "string", "severity": "low|medium|high"}
  ],
  "commScores": {
    "clarity": 0-100,
    "structure": 0-100,
    "technical": 0-100,
    "completeness": 0-100,
    "conciseness": 0-100
  },
  "suggestedQuestions": [
    {"question": "string", "category": "technical|behavioral|followup|deepdive", "reason": "string"}
  ],
  "timeline": [
    {"time": "string", "topic": "string", "notes": "string"}
  ],
  "overallScore": 0-100,
  "strengths": ["string"],
  "concerns": ["string"],
  "summary": "string (2-3 sentences max)"
}

Rules:
- Base ALL analysis only on what was actually said in the transcript
- Skills: only include skills actually mentioned or demonstrated
- Topics: suggest 6-8 relevant topics based on the job discussion
- Contradictions: only flag real factual contradictions with timestamps
- Questions: suggest 4-6 highly relevant follow-up questions
- Communication scores: evaluate based on actual response quality
- Overall score: weighted average of technical depth, communication, and consistency
- Be specific and evidence-based, never make up information`;

    // Use server-side proxy (protects API key)
    const aiEndpoint = window.location.origin + '/api/ai/analyze';

    try {
      const response = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '';

      let analysis;
      try {
        // More robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in AI response');
        
        analysis = JSON.parse(jsonMatch[0]);
        this.analysisState = { ...this.analysisState, ...analysis };
        this.lastAnalysisLength = this.transcriptBuffer.length;
        this.onAnalysisUpdate(this.analysisState);
      } catch (parseErr) {
        console.warn('AI response parse error:', parseErr);
        console.log('Raw text:', text);
      }

    } catch (err) {
      console.warn('AI analysis error:', err);
      // Fallback: run local heuristic analysis
      this.runHeuristicAnalysis();
    }

    this.isAnalyzing = false;
  }

  // Fallback heuristic analysis when API is unavailable
  runHeuristicAnalysis() {
    const text = this.transcriptBuffer.map(e => e.text.toLowerCase()).join(' ');

    const techSkills = [
      { name: 'Python', keywords: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'] },
      { name: 'JavaScript', keywords: ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'typescript'] },
      { name: 'AWS', keywords: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'] },
      { name: 'Docker', keywords: ['docker', 'container', 'containerization', 'dockerfile'] },
      { name: 'Kubernetes', keywords: ['kubernetes', 'k8s', 'kubectl', 'helm', 'pod'] },
      { name: 'PostgreSQL', keywords: ['postgresql', 'postgres', 'sql', 'relational database'] },
      { name: 'MongoDB', keywords: ['mongodb', 'nosql', 'document database', 'mongoose'] },
      { name: 'React', keywords: ['react', 'hooks', 'redux', 'jsx', 'component'] },
      { name: 'System Design', keywords: ['microservices', 'architecture', 'scalability', 'distributed', 'load balancer'] },
      { name: 'CI/CD', keywords: ['ci/cd', 'jenkins', 'github actions', 'gitlab ci', 'pipeline'] },
    ];

    const detectedSkills = techSkills
      .filter(s => s.keywords.some(k => text.includes(k)))
      .map(s => ({ name: s.name, level: 'mentioned', status: 'mentioned', evidence: 'Mentioned in conversation' }));

    const candidate = this.transcriptBuffer.filter(e => e.speaker !== 'Recruiter');
    const wordCounts = candidate.map(e => e.text.split(' ').length);
    const avgWords = wordCounts.length ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length : 0;

    this.analysisState.skills = detectedSkills;
    this.analysisState.commScores = {
      clarity: Math.min(100, 50 + (avgWords > 30 ? 30 : avgWords)),
      structure: Math.min(100, 40 + candidate.length * 5),
      technical: Math.min(100, detectedSkills.length * 12),
      completeness: Math.min(100, 30 + candidate.length * 8),
      conciseness: avgWords > 100 ? 40 : avgWords > 50 ? 70 : 85
    };
    this.analysisState.overallScore = Math.round(
      Object.values(this.analysisState.commScores).reduce((a, b) => a + b, 0) / 5
    );

    this.lastAnalysisLength = this.transcriptBuffer.length;
    this.onAnalysisUpdate(this.analysisState);
  }

  async generatePostInterviewReport(roomInfo) {
    const transcript = this.transcriptBuffer
      .map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.speaker}: ${e.text}`)
      .join('\n');

    const prompt = `Generate a comprehensive post-interview report as JSON. 

Interview Details:
- Candidate: ${roomInfo.candidateName || 'Candidate'}
- Job: ${roomInfo.jobTitle || 'Software Engineer'}
- Duration: ${Math.floor((Date.now() - this.sessionStart) / 60000)} minutes

Full Transcript:
${transcript}

Analysis State:
${JSON.stringify(this.analysisState, null, 2)}

Return ONLY valid JSON:
{
  "executiveSummary": "string",
  "hiringRecommendation": "strong_yes|yes|maybe|no|strong_no",
  "hiringConfidence": 0-100,
  "skillMatrix": [{"skill": "string", "level": "string", "score": 0-100, "evidence": "string"}],
  "communicationAssessment": {"summary": "string", "scores": {"clarity": 0-100, "structure": 0-100, "technical": 0-100}},
  "technicalAssessment": {"summary": "string", "strengths": ["string"], "gaps": ["string"]},
  "leadershipAssessment": {"summary": "string", "indicators": ["string"]},
  "strengths": ["string"],
  "weaknesses": ["string"],
  "areasOfConcern": ["string"],
  "keyHighlights": ["string"],
  "riskFactors": ["string"],
  "nextSteps": ["string"]
}`;

    try {
      const response = await fetch(window.location.origin + '/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      const data = await response.json();
      const text = data.content?.find(b => b.type === 'text')?.text || '';
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(clean);
    } catch (e) {
      return {
        executiveSummary: 'Report generation requires API connectivity.',
        hiringRecommendation: 'maybe',
        hiringConfidence: 50,
        skillMatrix: this.analysisState.skills.map(s => ({ skill: s.name, level: s.level, score: 60, evidence: s.evidence })),
        strengths: this.analysisState.strengths,
        weaknesses: this.analysisState.concerns,
        areasOfConcern: [],
        keyHighlights: [],
        riskFactors: [],
        nextSteps: ['Schedule technical round', 'Reference check']
      };
    }
  }
}
