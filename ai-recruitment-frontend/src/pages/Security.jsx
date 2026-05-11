import { Link } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'

export default function Security() {
  return (
    <div className="landing-prime min-h-screen bg-[#030303] text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-10">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Lock size={18} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold">Security</h1>
        </div>
        <p className="text-white/40 text-sm mb-12">Last updated: January 1, 2026</p>

        {[
          {
            title: 'Infrastructure Security',
            content: `TalentIQ is hosted on enterprise-grade cloud infrastructure with multiple layers of security. Our servers are protected by firewalls, intrusion detection systems, and 24/7 monitoring. All infrastructure is isolated in private networks with strict access controls.`,
          },
          {
            title: 'Data Encryption',
            content: `All data transmitted to and from TalentIQ is encrypted using TLS 1.3. Data at rest is encrypted using AES-256 encryption. Database backups are also encrypted and stored securely in geographically separate locations.`,
          },
          {
            title: 'Authentication & Access Control',
            content: `We use JWT-based authentication with short-lived access tokens and secure refresh token rotation. OAuth 2.0 is supported for Google and Microsoft sign-in. Role-based access control (RBAC) ensures users can only access data relevant to their role.`,
          },
          {
            title: 'AI Data Handling',
            content: `Resume and candidate data processed by our AI systems is handled with strict data isolation. Each organization's data is logically separated. We do not use your recruitment data to train shared AI models without explicit consent.`,
          },
          {
            title: 'Vulnerability Management',
            content: `We conduct regular security audits and penetration testing. Dependencies are monitored for known vulnerabilities and updated promptly. Our development team follows secure coding practices and code reviews for all changes.`,
          },
          {
            title: 'Incident Response',
            content: `In the event of a security incident, we have a documented response plan. Affected users will be notified within 72 hours of discovery in accordance with applicable data protection regulations.`,
          },
          {
            title: 'Compliance',
            content: `TalentIQ is designed with GDPR and data privacy regulations in mind. We provide data export and deletion capabilities to support your compliance obligations. We do not sell personal data to third parties.`,
          },
          {
            title: 'Report a Vulnerability',
            content: `If you discover a security vulnerability, please report it responsibly to security@talentiq.ai. We take all reports seriously and will respond within 48 hours. We appreciate the security community's efforts in keeping TalentIQ safe.`,
          },
        ].map(({ title, content }) => (
          <div key={title} className="mb-8 border-b border-white/5 pb-8">
            <h2 className="font-display text-lg font-semibold text-white mb-3">{title}</h2>
            <p className="text-white/60 leading-relaxed text-sm">{content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
