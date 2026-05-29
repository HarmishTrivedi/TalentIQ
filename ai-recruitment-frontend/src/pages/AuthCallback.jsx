import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store'
import { BASE_URL, API_BASE } from '../services/api'
import toast from 'react-hot-toast'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const error = searchParams.get('error')

    if (error || !accessToken) {
      toast.error('Authentication failed. Please try again.')
      navigate('/login')
      return
    }

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((user) => {
        useAuthStore.setState({ token: accessToken, user })
        localStorage.setItem('user', JSON.stringify(user))
        toast.success('Welcome to TalentIQ!')
        navigate(user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
      })
      .catch(() => {
        toast.error('Failed to fetch user data')
        navigate('/login')
      })
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p className="text-slate-400">Signing you in...</p>
    </div>
  )
}
