import { create } from 'zustand'
import type { User } from '@/types'
import api from '@/services/api'
import wsService from '@/services/websocket'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ requires2FA?: boolean; userId?: string }>
  register: (data: Parameters<typeof api.register>[0]) => Promise<void>
  verify2FA: (userId: string, code: string) => Promise<void>
  logout: () => Promise<void>
  loadProfile: () => Promise<void>
  updateUser: (data: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await api.login({ email, password })
    if (response.accessToken) {
      api.setToken(response.accessToken)
      wsService.connect(response.accessToken)
      set({ user: response.user, isAuthenticated: true })
      return {}
    }
    return { requires2FA: true, userId: response.user.id }
  },

  register: async (data) => {
    const response = await api.register(data)
    api.setToken(response.accessToken)
    wsService.connect(response.accessToken)
    set({ user: response.user, isAuthenticated: true })
  },

  verify2FA: async (userId, code) => {
    const response = await api.verifyOtp({ userId, code })
    api.setToken(response.accessToken)
    wsService.connect(response.accessToken)
    set({ user: response.user, isAuthenticated: true })
  },

  logout: async () => {
    try { await api.logout() } catch { /* ignore */ }
    api.setToken(null)
    wsService.disconnect()
    set({ user: null, isAuthenticated: false })
  },

  loadProfile: async () => {
    try {
      const user = await api.getProfile()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  updateUser: (data) => set((state) => ({
    user: state.user ? { ...state.user, ...data } : null,
  })),
}))
