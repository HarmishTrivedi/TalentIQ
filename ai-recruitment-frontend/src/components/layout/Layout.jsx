import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'
import AdminSidebar from './AdminSidebar'
import TopAppBar from './TopAppBar'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {isAdminPath ? <AdminSidebar /> : <Sidebar />}
      
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Top App Bar */}
        {!isAdminPath && <TopAppBar />}
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-surface relative" style={{ zIndex: 1 }}>
          <div className="p-8 max-w-[1440px] mx-auto w-full min-h-full flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
