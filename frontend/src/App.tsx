import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Skeleton } from '@/components/ui'

// Lazy-loaded pages - Public (default exports)
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const CasinoPage = lazy(() => import('@/pages/public/CasinoPage'))
const GamePage = lazy(() => import('@/pages/public/GamePage'))
const SportsPage = lazy(() => import('@/pages/public/SportsPage'))
const EventPage = lazy(() => import('@/pages/public/EventPage'))
const PromotionsPage = lazy(() => import('@/pages/public/PromotionsPage'))
const LoginPage = lazy(() => import('@/pages/public/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/public/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/public/ResetPasswordPage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
// Named exports
const ResponsibleGamblingPage = lazy(() => import('@/pages/public/ResponsibleGamblingPage').then(m => ({ default: m.ResponsibleGamblingPage })))
const LegalPage = lazy(() => import('@/pages/public/LegalPage').then(m => ({ default: m.LegalPage })))
const SupportPage = lazy(() => import('@/pages/public/SupportPage').then(m => ({ default: m.SupportPage })))

// Lazy-loaded pages - Private (default exports)
const ProfilePage = lazy(() => import('@/pages/private/ProfilePage'))
const WalletPage = lazy(() => import('@/pages/private/WalletPage'))
const BetHistoryPage = lazy(() => import('@/pages/private/BetHistoryPage'))
const BonusesPage = lazy(() => import('@/pages/private/BonusesPage'))
const KycPage = lazy(() => import('@/pages/private/KycPage'))
const LimitsPage = lazy(() => import('@/pages/private/LimitsPage'))
const NotificationsPage = lazy(() => import('@/pages/private/NotificationsPage'))

// Lazy-loaded pages - Admin (named exports)
const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/UsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminTransactionsPage = lazy(() => import('@/pages/admin/TransactionsPage').then(m => ({ default: m.AdminTransactionsPage })))
const BonusesAdminPage = lazy(() => import('@/pages/admin/BonusesAdminPage').then(m => ({ default: m.BonusesAdminPage })))
const AdminContentPage = lazy(() => import('@/pages/admin/ContentPage').then(m => ({ default: m.AdminContentPage })))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then(m => ({ default: m.AdminSettingsPage })))
const AdminLogsPage = lazy(() => import('@/pages/admin/LogsPage').then(m => ({ default: m.AdminLogsPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
      <Skeleton height={48} width="40%" />
      <Skeleton height={300} />
    </div>
  )
}

function AppRoutes() {
  const loadProfile = useAuthStore((s) => s.loadProfile)

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const handleLogout = () => {
      useAuthStore.getState().logout()
    }
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [])

  return (
    <Routes>
      {/* Main layout routes */}
      <Route element={<MainLayout />}>
        {/* Public */}
        <Route index element={<HomePage />} />
        <Route path="casino" element={<CasinoPage />} />
        <Route path="casino/:slug" element={<GamePage />} />
        <Route path="sports" element={<SportsPage />} />
        <Route path="sports/live" element={<SportsPage />} />
        <Route path="sports/event/:eventId" element={<EventPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="responsible-gambling" element={<ResponsibleGamblingPage />} />
        <Route path="support" element={<SupportPage />} />

        {/* Private */}
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="bets" element={<ProtectedRoute><BetHistoryPage /></ProtectedRoute>} />
        <Route path="bonuses" element={<ProtectedRoute><BonusesPage /></ProtectedRoute>} />
        <Route path="kyc" element={<ProtectedRoute><KycPage /></ProtectedRoute>} />
        <Route path="limits" element={<ProtectedRoute><LimitsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Legal pages - must be last in main layout due to :slug */}
        <Route path=":slug" element={<LegalPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin layout routes */}
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="transactions" element={<AdminTransactionsPage />} />
        <Route path="bonuses" element={<BonusesAdminPage />} />
        <Route path="content" element={<AdminContentPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
