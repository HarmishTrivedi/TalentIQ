import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000')

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

    fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((user) => {
        useAuthStore.setState({ token: accessToken, user })
        localStorage.setItem('user', JSON.stringify(user))
        toast.success('Welcome to TalentIQ!')
        navigate(user?.role === 'admin' ? '/admin/dashboard' : '/welcome', { replace: true })
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
