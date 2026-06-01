import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import { useAuthStore } from './store'
import { Spinner } from './components/ui'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const UploadCV = lazy(() => import('./pages/UploadCV'))
const Candidates = lazy(() => import('./pages/Candidates'))
const CandidateDetail = lazy(() => import('./pages/CandidateDetail'))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const Matching = lazy(() => import('./pages/Matching'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const InterviewRoom = lazy(() => import('./pages/InterviewRoom'))
const InterviewPreJoin = lazy(() => import('./pages/InterviewPreJoin'))
const ScheduleInterview = lazy(() => import('./pages/ScheduleInterview'))
const InterviewSchedule = lazy(() => import('./pages/InterviewSchedule'))
const AIInterviews = lazy(() => import('./pages/AIInterviews'))
const CandidateJoin = lazy(() => import('./pages/CandidateJoin'))
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const CinematicAuth = lazy(() => import('./pages/CinematicAuth'))
const RecruiterPlans = lazy(() => import('./pages/RecruiterPlans'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const AdminUsage = lazy(() => import('./pages/AdminUsage'))
const AdminPricing = lazy(() => import('./pages/AdminPricing'))
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Security = lazy(() => import('./pages/Security'))
const AccountSettings = lazy(() => import('./pages/AccountSettings'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Interviews = lazy(() => import('./pages/Interviews'))
const LiveInterview = lazy(() => import('./pages/LiveInterview'))
const InterviewAnalysis = lazy(() => import('./pages/InterviewAnalysis'))
const InterviewRecordings = lazy(() => import('./pages/InterviewRecordings'))
const QuestionGenerator = lazy(() => import('./pages/QuestionGenerator'))
const Calendar = lazy(() => import('./pages/Calendar'))
const ThankYou = lazy(() => import('./pages/ThankYou'))

function AdminRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function PrivateRoute({ children }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return children
}

const toastOpts = {
  style: {
    background: '#020617',
    color: '#f8fafc',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
  },
  success: { iconTheme: { primary: '#67e8f9', secondary: '#020617' } },
  error: { iconTheme: { primary: '#f87171', secondary: '#020617' } },
}

function RouteFallback() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner size={34} /></div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={toastOpts} />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<CinematicAuth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/security" element={<Security />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          
          {/* Candidate Join - No Auth Required */}
          <Route path="/join/:interviewId" element={<CandidateJoin />} />
          <Route path="/interview-prejoin/:interviewId" element={<InterviewPreJoin />} />
          <Route path="/interview-room/:interviewId" element={<InterviewRoom />} />
          <Route path="/thanks" element={<ThankYou />} />

          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/upload" element={<UploadCV />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/ai-sourcing" element={<ChatPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            <Route path="/interview-room" element={<InterviewRoom />} />
            <Route path="/plans" element={<RecruiterPlans />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/interview-schedule" element={<InterviewSchedule />} />
            <Route path="/ai-interviews" element={<AIInterviews />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/interviews/schedule" element={<ScheduleInterview />} />
            <Route path="/interviews/recordings" element={<InterviewRecordings />} />
            <Route path="/interviews/:interviewId" element={<LiveInterview />} />
            <Route path="/interviews/:interviewId/analysis" element={<InterviewAnalysis />} />
            <Route path="/questions/generate" element={<QuestionGenerator />} />
            <Route path="/calendar" element={<Calendar />} />

            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
            <Route path="/admin/usage" element={<AdminRoute><AdminUsage /></AdminRoute>} />
            <Route path="/admin/pricing" element={<AdminRoute><AdminPricing /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
