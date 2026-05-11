import { create } from 'zustand'

const stored = localStorage.getItem('talentiq-theme') || 'dark'
document.documentElement.setAttribute('data-theme', stored)

export const useThemeStore = create((set) => ({
  theme: stored,
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('talentiq-theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return { theme: next }
    }),
  setTheme: (theme) => {
    localStorage.setItem('talentiq-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    set({ theme })
  },
}))
