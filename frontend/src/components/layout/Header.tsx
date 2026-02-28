import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useBetSlipStore } from '@/stores/betSlipStore'
import { Button } from '@/components/ui'
import { useState } from 'react'

export function Header() {
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { toggleMobileMenu, mobileMenuOpen } = useUIStore()
  const betSlipItems = useBetSlipStore((s) => s.items)
  const toggleBetSlip = useUIStore((s) => s.toggleBetSlip)
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-surface-900/95 backdrop-blur-md border-b border-surface-700">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">B</div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent hidden sm:block">BetZone</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Основная навигация">
          {[
            { to: '/', label: t('nav.home') },
            { to: '/casino', label: t('nav.casino') },
            { to: '/sports', label: t('nav.sports') },
            { to: '/sports/live', label: t('nav.live'), badge: true },
            { to: '/promotions', label: t('nav.promotions') },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="relative px-3 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-surface-800"
            >
              {link.label}
              {link.badge && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Bet Slip toggle (mobile) */}
          <button
            onClick={toggleBetSlip}
            className="relative md:hidden p-2 text-gray-300 hover:text-white"
            aria-label="Купон"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            {betSlipItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white font-bold">
                {betSlipItems.length}
              </span>
            )}
          </button>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg bg-surface-800 px-3 py-2 text-sm text-gray-200 hover:bg-surface-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs text-white font-bold">
                  {user.firstName[0]}
                </div>
                <span className="hidden sm:block max-w-[100px] truncate">{user.firstName}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-surface-850 border border-surface-700 shadow-elevated z-50 py-1" role="menu">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-surface-700 hover:text-white" onClick={() => setUserMenuOpen(false)}>{t('nav.profile')}</Link>
                    <Link to="/wallet" className="block px-4 py-2 text-sm text-gray-300 hover:bg-surface-700 hover:text-white" onClick={() => setUserMenuOpen(false)}>{t('nav.wallet')}</Link>
                    <Link to="/bets" className="block px-4 py-2 text-sm text-gray-300 hover:bg-surface-700 hover:text-white" onClick={() => setUserMenuOpen(false)}>Мои ставки</Link>
                    <Link to="/bonuses" className="block px-4 py-2 text-sm text-gray-300 hover:bg-surface-700 hover:text-white" onClick={() => setUserMenuOpen(false)}>{t('bonuses.title')}</Link>
                    <hr className="my-1 border-surface-700" />
                    <button onClick={() => { setUserMenuOpen(false); logout(); navigate('/') }} className="w-full text-left px-4 py-2 text-sm text-danger-500 hover:bg-surface-700">{t('auth.logout')}</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>{t('auth.login')}</Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/register')}>{t('auth.register')}</Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-300 hover:text-white"
            aria-label="Меню"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-surface-700 bg-surface-900 px-4 py-3 space-y-1" role="navigation" aria-label="Мобильное меню">
          {[
            { to: '/', label: t('nav.home') },
            { to: '/casino', label: t('nav.casino') },
            { to: '/sports', label: t('nav.sports') },
            { to: '/sports/live', label: t('nav.live') },
            { to: '/promotions', label: t('nav.promotions') },
            { to: '/support', label: t('nav.support') },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={toggleMobileMenu}
              className="block px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg hover:bg-surface-800"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
