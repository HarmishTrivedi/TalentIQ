import { Link } from 'react-router-dom'
import { ArrowLeft, Shield } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="landing-prime min-h-screen bg-[#030303] text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-10">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold">Privacy Policy</h1>
        </div>
        <p className="text-white/40 text-sm mb-12">Last updated: January 1, 2026</p>

        {[
          {
            title: '1. Information We Collect',
            content: `We collect information you provide directly to us, such as when you create an account, upload resumes, or contact us for support. This includes name, email address, professional information, and any content you upload to the platform.`,
          },
          {
            title: '2. How We Use Your Information',
            content: `We use the information we collect to provide, maintain, and improve our services, process transactions, send technical notices and support messages, and respond to your comments and questions. We also use it to power AI-driven candidate matching and recruitment analytics.`,
          },
          {
            title: '3. Data Storage & Security',
            content: `Your data is stored on secure servers with industry-standard encryption. We use PostgreSQL databases with encrypted connections and implement strict access controls. All data in transit is protected using TLS 1.3.`,
          },
          {
            title: '4. Data Sharing',
            content: `We do not sell, trade, or rent your personal information to third parties. We may share data with trusted service providers who assist us in operating our platform, subject to confidentiality agreements. We may disclose information if required by law.`,
          },
          {
            title: '5. Cookies',
            content: `We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.`,
          },
          {
            title: '6. Your Rights',
            content: `You have the right to access, update, or delete your personal information at any time. You may also request a copy of the data we hold about you. To exercise these rights, contact us at privacy@talentiq.ai.`,
          },
          {
            title: '7. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.`,
          },
          {
            title: '8. Contact Us',
            content: `If you have any questions about this Privacy Policy, please contact us at privacy@talentiq.ai or write to us at TalentIQ, AI Recruitment Platform.`,
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
