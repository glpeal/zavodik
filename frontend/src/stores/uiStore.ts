import { create } from 'zustand'
import type { NotificationType } from '@/types'

export interface Toast {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
}

interface UIState {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  betSlipOpen: boolean
  mobileMenuOpen: boolean
  ageGateAccepted: boolean
  cookiesAccepted: boolean
  sessionStartTime: number
  toasts: Toast[]

  setTheme: (theme: 'dark' | 'light') => void
  toggleSidebar: () => void
  toggleBetSlip: () => void
  toggleMobileMenu: () => void
  acceptAgeGate: () => void
  acceptCookies: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',
  sidebarOpen: true,
  betSlipOpen: false,
  mobileMenuOpen: false,
  ageGateAccepted: localStorage.getItem('ageGateAccepted') === 'true',
  cookiesAccepted: localStorage.getItem('cookiesAccepted') === 'true',
  sessionStartTime: Date.now(),
  toasts: [],

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    document.documentElement.classList.toggle('light', theme === 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleBetSlip: () => set((s) => ({ betSlipOpen: !s.betSlipOpen })),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),

  acceptAgeGate: () => {
    localStorage.setItem('ageGateAccepted', 'true')
    set({ ageGateAccepted: true })
  },

  acceptCookies: () => {
    localStorage.setItem('cookiesAccepted', 'true')
    set({ cookiesAccepted: true })
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, toast.duration || 5000)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
