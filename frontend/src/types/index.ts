// ============ Common ============
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

// ============ Auth ============
export interface LoginRequest {
  email: string
  password: string
  captchaToken?: string
}

export interface RegisterRequest {
  email: string
  password: string
  phone?: string
  firstName: string
  lastName: string
  dateOfBirth: string
  currency: string
  agreeTerms: boolean
  agreeAge: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface OtpRequest {
  userId: string
  code: string
}

// ============ User ============
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected'
export type UserRole = 'user' | 'support' | 'finance' | 'admin'

export interface User {
  id: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  avatar?: string
  kycStatus: KycStatus
  role: UserRole
  currency: string
  locale: string
  twoFactorEnabled: boolean
  createdAt: string
}

export interface UserSession {
  id: string
  device: string
  ip: string
  location?: string
  lastActive: string
  current: boolean
}

// ============ Wallet ============
export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win' | 'refund' | 'commission'
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface WalletBalance {
  real: number
  bonus: number
  total: number
  currency: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  status: TransactionStatus
  method?: string
  description?: string
  createdAt: string
  completedAt?: string
}

export interface PaymentMethod {
  id: string
  type: string
  name: string
  icon: string
  minDeposit: number
  maxDeposit: number
  minWithdraw: number
  maxWithdraw: number
  fee: number
  processingTime: string
}

export interface DepositRequest {
  methodId: string
  amount: number
  transactionId: string
}

export interface WithdrawRequest {
  methodId: string
  amount: number
  transactionId: string
}

// ============ Casino ============
export type GameCategory = 'slots' | 'live' | 'table' | 'jackpot' | 'new' | 'popular' | 'freespins'

export interface GameProvider {
  id: string
  name: string
  slug: string
  logo: string
  gamesCount: number
}

export interface Game {
  id: string
  name: string
  slug: string
  provider: GameProvider
  thumbnail: string
  categories: GameCategory[]
  rtp?: number
  volatility?: 'low' | 'medium' | 'high'
  hasDemo: boolean
  isNew: boolean
  isPopular: boolean
  jackpotAmount?: number
}

export interface GameLaunchResponse {
  url: string
  token: string
}

// ============ Betting ============
export type BetStatus = 'pending' | 'won' | 'lost' | 'cashout' | 'void' | 'refunded'
export type BetType = 'single' | 'express' | 'system'
export type MarketStatus = 'open' | 'suspended' | 'closed' | 'settled'
export type OddsChange = 'up' | 'down' | 'none'

export interface Sport {
  id: string
  name: string
  slug: string
  icon: string
  leaguesCount: number
  eventsCount: number
}

export interface League {
  id: string
  name: string
  slug: string
  sportId: string
  country: string
  countryCode: string
  eventsCount: number
}

export interface SportEvent {
  id: string
  sportId: string
  leagueId: string
  leagueName: string
  homeTeam: string
  awayTeam: string
  startTime: string
  isLive: boolean
  score?: { home: number; away: number }
  timer?: string
  period?: string
  marketsCount: number
  topMarkets: Market[]
}

export interface Market {
  id: string
  eventId: string
  name: string
  type: string
  status: MarketStatus
  outcomes: Outcome[]
}

export interface Outcome {
  id: string
  marketId: string
  name: string
  odds: number
  previousOdds?: number
  oddsChange: OddsChange
  isActive: boolean
}

export interface BetSlipItem {
  outcomeId: string
  outcome: Outcome
  market: Market
  event: SportEvent
  stake?: number
}

export interface PlaceBetRequest {
  type: BetType
  stakes: { outcomeId: string; stake: number }[]
  totalStake: number
  acceptOddsChanges: boolean
  transactionId: string
}

export interface Bet {
  id: string
  type: BetType
  status: BetStatus
  selections: {
    eventName: string
    marketName: string
    outcomeName: string
    odds: number
    result?: 'won' | 'lost' | 'void'
  }[]
  totalOdds: number
  stake: number
  potentialWin: number
  actualWin?: number
  cashoutAmount?: number
  createdAt: string
  settledAt?: string
}

// ============ Bonuses ============
export type BonusStatus = 'available' | 'active' | 'completed' | 'expired' | 'cancelled'
export type BonusType = 'welcome' | 'deposit' | 'freespins' | 'cashback' | 'freebet' | 'promo'

export interface Bonus {
  id: string
  name: string
  description: string
  type: BonusType
  status: BonusStatus
  amount: number
  currency: string
  wagerRequirement: number
  wagerProgress: number
  wagerCompleted: number
  expiresAt: string
  activatedAt?: string
  code?: string
  terms: string
}

// ============ KYC ============
export type KycDocumentType = 'passport' | 'id_card' | 'drivers_license' | 'utility_bill' | 'selfie'

export interface KycDocument {
  id: string
  type: KycDocumentType
  status: KycStatus
  uploadedAt: string
  reviewedAt?: string
  rejectionReason?: string
}

// ============ Responsible Gambling ============
export type LimitType = 'deposit' | 'bet' | 'loss'
export type LimitPeriod = 'daily' | 'weekly' | 'monthly'
export type TimeoutPeriod = '24h' | '7d' | '30d' | '90d'
export type SelfExclusionPeriod = '6m' | '1y' | '3y' | '5y' | 'permanent'

export interface GamblingLimit {
  id: string
  type: LimitType
  period: LimitPeriod
  amount: number
  used: number
  isActive: boolean
}

export interface Timeout {
  isActive: boolean
  endsAt?: string
}

export interface SelfExclusion {
  isActive: boolean
  period?: SelfExclusionPeriod
  endsAt?: string
}

// ============ Support ============
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface SupportTicket {
  id: string
  subject: string
  status: TicketStatus
  category: string
  createdAt: string
  updatedAt: string
  messages: TicketMessage[]
}

export interface TicketMessage {
  id: string
  content: string
  isStaff: boolean
  createdAt: string
}

// ============ CMS ============
export interface Banner {
  id: string
  title: string
  subtitle?: string
  image: string
  link: string
  order: number
  isActive: boolean
}

export interface CmsPage {
  slug: string
  title: string
  content: string
  updatedAt: string
}

// ============ Notifications ============
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  link?: string
}

// ============ Admin ============
export interface AdminUser extends User {
  lastLogin?: string
  isBlocked: boolean
  blockReason?: string
  totalDeposits: number
  totalWithdrawals: number
  totalBets: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalDeposits: number
  totalWithdrawals: number
  totalBets: number
  revenue: number
  newUsersToday: number
  pendingKyc: number
  pendingWithdrawals: number
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  details: string
  ip: string
  createdAt: string
}
