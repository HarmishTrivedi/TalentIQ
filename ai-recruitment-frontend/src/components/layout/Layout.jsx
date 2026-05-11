import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import AdminSidebar from './AdminSidebar'

export default function Layout() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {isAdminPath ? <AdminSidebar /> : <Sidebar />}
      <main className="flex-1 overflow-auto relative">
        {/* Subtle ambient background */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent)' }} />
        </div>
        <div className="relative min-h-full" style={{ zIndex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
