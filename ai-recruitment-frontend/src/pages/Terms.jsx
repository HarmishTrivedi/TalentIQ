import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'

export default function Terms() {
  return (
    <div className="landing-prime min-h-screen bg-[#030303] text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-10">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold">Terms of Service</h1>
        </div>
        <p className="text-white/40 text-sm mb-12">Last updated: January 1, 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            content: `By accessing or using TalentIQ, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. These terms apply to all users, including recruiters, administrators, and candidates.`,
          },
          {
            title: '2. Use of the Platform',
            content: `TalentIQ grants you a limited, non-exclusive, non-transferable license to use the platform for your internal recruitment purposes. You agree not to misuse the platform, attempt to gain unauthorized access, or use it for any unlawful purpose.`,
          },
          {
            title: '3. User Accounts',
            content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.`,
          },
          {
            title: '4. Content & Data',
            content: `You retain ownership of all content you upload to TalentIQ, including resumes and job descriptions. By uploading content, you grant TalentIQ a license to process and analyze it solely for the purpose of providing our services.`,
          },
          {
            title: '5. AI Features',
            content: `Our AI-powered features including candidate matching, resume parsing, and interview assistance are provided as tools to assist your recruitment process. TalentIQ does not guarantee the accuracy of AI-generated results and they should not be the sole basis for hiring decisions.`,
          },
          {
            title: '6. Subscription & Billing',
            content: `Paid plans are billed in advance on a monthly or annual basis. Refunds are provided at our discretion. You may cancel your subscription at any time, and access will continue until the end of the billing period.`,
          },
          {
            title: '7. Termination',
            content: `We reserve the right to suspend or terminate your account if you violate these terms. Upon termination, your right to use the platform will immediately cease and we may delete your data after a 30-day grace period.`,
          },
          {
            title: '8. Limitation of Liability',
            content: `TalentIQ shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.`,
          },
          {
            title: '9. Contact',
            content: `For questions about these Terms, contact us at legal@talentiq.ai.`,
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
