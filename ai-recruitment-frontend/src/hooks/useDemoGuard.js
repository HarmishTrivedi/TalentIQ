import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore, useAppStore } from '../store'

const SERVICE_ROUTES = ['/candidates', '/upload', '/jobs', '/matching', '/chat']

export function useDemoGuard() {
  const location = useLocation()
  const { isDemo, getDemoCount, incrementDemoCount } = useAuthStore()
  const { setShowUpgradePopup } = useAppStore()

  useEffect(() => {
    if (!isDemo()) return

    const isService = SERVICE_ROUTES.some(r => location.pathname.startsWith(r))
    if (!isService) return

    const count = getDemoCount()

    if (count >= 1) {
      // Already used 1 service — always show popup, no exceptions
      setShowUpgradePopup(true)
    } else {
      // First service — allow and mark as used
      incrementDemoCount()
    }
  }, [location.pathname])
}
