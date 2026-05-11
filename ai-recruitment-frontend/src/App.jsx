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
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const CinematicAuth = lazy(() => import('./pages/CinematicAuth'))
const RecruiterWelcome = lazy(() => import('./pages/RecruiterWelcome'))
const RecruiterPlans = lazy(() => import('./pages/RecruiterPlans'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const AdminUsage = lazy(() => import('./pages/AdminUsage'))
const AdminPricing = lazy(() => import('./pages/AdminPricing'))
const AdminSubscriptions = lazy(() => import('./pages/AdminSubscriptions'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))

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
          <Route path="/auth/callback" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />

          <Route path="/welcome" element={<PrivateRoute><RecruiterWelcome /></PrivateRoute>} />

          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/upload" element={<UploadCV />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:sessionId" element={<ChatPage />} />
            <Route path="/interview-room" element={<InterviewRoom />} />
            <Route path="/plans" element={<RecruiterPlans />} />

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
