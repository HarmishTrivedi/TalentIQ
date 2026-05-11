import React from 'react'

export default function Footer() {
  return (
    <footer className="w-full border-t py-3 px-6 flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--sidebar-bg)' }}>
      <p className="text-xs font-sans text-center" style={{ color: 'var(--text-muted)' }}>
        © 2026 All Rights Reserved · TalentIQ
      </p>
    </footer>
  )
}
