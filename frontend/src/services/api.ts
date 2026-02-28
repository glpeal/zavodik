import type {
  AuthResponse, LoginRequest, RegisterRequest, OtpRequest,
  User, UserSession, WalletBalance, Transaction, PaymentMethod,
  DepositRequest, WithdrawRequest, Game, GameProvider, GameLaunchResponse,
  Sport, League, SportEvent, Market, PlaceBetRequest, Bet,
  Bonus, KycDocument, GamblingLimit, SupportTicket, Banner, CmsPage,
  Notification, AdminUser, AdminStats, AuditLog, PaginatedResponse,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiClient {
  private accessToken: string | null = null

  setToken(token: string | null) {
    this.accessToken = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (response.status === 401) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`
        const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        })
        if (!retryResponse.ok) throw await this.parseError(retryResponse)
        return retryResponse.json()
      }
      window.dispatchEvent(new Event('auth:logout'))
      throw new Error('Session expired')
    }

    if (!response.ok) throw await this.parseError(response)
    if (response.status === 204) return undefined as T
    return response.json()
  }

  private async parseError(response: Response) {
    try {
      const body = await response.json()
      return { status: response.status, ...body }
    } catch {
      return { status: response.status, message: response.statusText }
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data: AuthResponse = await res.json()
      this.accessToken = data.accessToken
      return true
    } catch {
      return false
    }
  }

  // Auth
  login = (data: LoginRequest) => this.request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) })
  register = (data: RegisterRequest) => this.request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) })
  logout = () => this.request<void>('/auth/logout', { method: 'POST' })
  verifyOtp = (data: OtpRequest) => this.request<AuthResponse>('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) })
  forgotPassword = (email: string) => this.request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
  resetPassword = (token: string, password: string) => this.request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })

  // User
  getProfile = () => this.request<User>('/user/profile')
  updateProfile = (data: Partial<User>) => this.request<User>('/user/profile', { method: 'PATCH', body: JSON.stringify(data) })
  changePassword = (current: string, newPassword: string) => this.request<void>('/user/change-password', { method: 'POST', body: JSON.stringify({ current, newPassword }) })
  getSessions = () => this.request<UserSession[]>('/user/sessions')
  terminateSession = (id: string) => this.request<void>(`/user/sessions/${id}`, { method: 'DELETE' })
  terminateAllSessions = () => this.request<void>('/user/sessions', { method: 'DELETE' })
  enable2FA = () => this.request<{ secret: string; qrCode: string }>('/user/2fa/enable', { method: 'POST' })
  confirm2FA = (code: string) => this.request<void>('/user/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) })
  disable2FA = (code: string) => this.request<void>('/user/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) })
  getNotifications = (page?: number) => this.request<PaginatedResponse<Notification>>(`/user/notifications?page=${page || 1}`)
  markNotificationRead = (id: string) => this.request<void>(`/user/notifications/${id}/read`, { method: 'POST' })

  // Wallet
  getBalance = () => this.request<WalletBalance>('/wallet/balance')
  getTransactions = (params?: string) => this.request<PaginatedResponse<Transaction>>(`/wallet/transactions?${params || ''}`)
  getPaymentMethods = () => this.request<PaymentMethod[]>('/wallet/methods')
  deposit = (data: DepositRequest) => this.request<{ redirectUrl?: string; status: string }>('/wallet/deposit', { method: 'POST', body: JSON.stringify(data) })
  withdraw = (data: WithdrawRequest) => this.request<{ status: string }>('/wallet/withdraw', { method: 'POST', body: JSON.stringify(data) })

  // KYC
  getKycDocuments = () => this.request<KycDocument[]>('/kyc/documents')
  uploadKycDocument = (formData: FormData) => this.request<KycDocument>('/kyc/upload', { method: 'POST', body: formData, headers: {} })

  // Casino
  getGames = (params?: string) => this.request<PaginatedResponse<Game>>(`/casino/games?${params || ''}`)
  getGameBySlug = (slug: string) => this.request<Game>(`/casino/games/${slug}`)
  getGameProviders = () => this.request<GameProvider[]>('/casino/providers')
  launchGame = (id: string, demo?: boolean) => this.request<GameLaunchResponse>(`/casino/games/${id}/launch`, { method: 'POST', body: JSON.stringify({ demo }) })
  getFavoriteGames = () => this.request<Game[]>('/casino/favorites')
  toggleFavoriteGame = (id: string) => this.request<void>(`/casino/favorites/${id}`, { method: 'POST' })

  // Betting
  getSports = () => this.request<Sport[]>('/betting/sports')
  getLeagues = (sportId: string) => this.request<League[]>(`/betting/sports/${sportId}/leagues`)
  getEvents = (params?: string) => this.request<PaginatedResponse<SportEvent>>(`/betting/events?${params || ''}`)
  getEvent = (id: string) => this.request<SportEvent>(`/betting/events/${id}`)
  getMarkets = (eventId: string) => this.request<Market[]>(`/betting/events/${eventId}/markets`)
  placeBet = (data: PlaceBetRequest) => this.request<Bet>('/betting/bets', { method: 'POST', body: JSON.stringify(data) })
  getBetHistory = (params?: string) => this.request<PaginatedResponse<Bet>>(`/betting/bets?${params || ''}`)
  cashout = (betId: string) => this.request<{ amount: number }>(`/betting/bets/${betId}/cashout`, { method: 'POST' })

  // Bonuses
  getBonuses = () => this.request<Bonus[]>('/bonuses')
  activateBonus = (id: string) => this.request<Bonus>(`/bonuses/${id}/activate`, { method: 'POST' })
  activatePromoCode = (code: string) => this.request<Bonus>('/bonuses/promo', { method: 'POST', body: JSON.stringify({ code }) })

  // Responsible Gambling
  getLimits = () => this.request<GamblingLimit[]>('/responsible/limits')
  setLimit = (data: Partial<GamblingLimit>) => this.request<GamblingLimit>('/responsible/limits', { method: 'POST', body: JSON.stringify(data) })
  removeLimit = (id: string) => this.request<void>(`/responsible/limits/${id}`, { method: 'DELETE' })
  setTimeout = (period: string) => this.request<void>('/responsible/timeout', { method: 'POST', body: JSON.stringify({ period }) })
  selfExclude = (period: string) => this.request<void>('/responsible/self-exclude', { method: 'POST', body: JSON.stringify({ period }) })

  // Support
  getTickets = () => this.request<SupportTicket[]>('/support/tickets')
  createTicket = (data: { subject: string; category: string; message: string }) => this.request<SupportTicket>('/support/tickets', { method: 'POST', body: JSON.stringify(data) })
  replyToTicket = (id: string, message: string) => this.request<void>(`/support/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) })

  // CMS
  getBanners = () => this.request<Banner[]>('/cms/banners')
  getPage = (slug: string) => this.request<CmsPage>(`/cms/pages/${slug}`)

  // Admin
  adminGetUsers = (params?: string) => this.request<PaginatedResponse<AdminUser>>(`/admin/users?${params || ''}`)
  adminGetUser = (id: string) => this.request<AdminUser>(`/admin/users/${id}`)
  adminBlockUser = (id: string, reason: string) => this.request<void>(`/admin/users/${id}/block`, { method: 'POST', body: JSON.stringify({ reason }) })
  adminUnblockUser = (id: string) => this.request<void>(`/admin/users/${id}/unblock`, { method: 'POST' })
  adminGetStats = () => this.request<AdminStats>('/admin/stats')
  adminGetTransactions = (params?: string) => this.request<PaginatedResponse<Transaction>>(`/admin/transactions?${params || ''}`)
  adminApproveWithdrawal = (id: string) => this.request<void>(`/admin/transactions/${id}/approve`, { method: 'POST' })
  adminRejectWithdrawal = (id: string, reason: string) => this.request<void>(`/admin/transactions/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
  adminGetAuditLogs = (params?: string) => this.request<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${params || ''}`)
}

export const api = new ApiClient()
export default api
