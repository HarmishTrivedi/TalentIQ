import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import AdminSidebar from './AdminSidebar'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {isAdminPath ? <AdminSidebar /> : <Sidebar />}
      <div className="flex flex-col flex-1 overflow-auto relative">
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent)' }} />
        </div>
        <main className="relative flex-1" style={{ zIndex: 1 }}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
