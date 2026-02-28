import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { ToastContainer } from '@/components/ui'
import { clsx } from 'clsx'

const navItems = [
  { to: '/admin', icon: '📊', labelKey: 'admin.dashboard', exact: true },
  { to: '/admin/users', icon: '👥', labelKey: 'admin.users' },
  { to: '/admin/transactions', icon: '💳', labelKey: 'admin.transactions' },
  { to: '/admin/bonuses', icon: '🎁', labelKey: 'admin.bonuses' },
  { to: '/admin/content', icon: '📝', labelKey: 'admin.content' },
  { to: '/admin/settings', icon: '⚙️', labelKey: 'admin.settings' },
  { to: '/admin/logs', icon: '📋', labelKey: 'admin.logs' },
]

export function AdminLayout() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user || !['admin', 'support', 'finance'].includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen flex bg-surface-950">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 border-r border-surface-700 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-surface-700">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">B</div>
            <span className="text-lg font-bold text-gray-100">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1" role="navigation" aria-label="Админ навигация">
          {navItems.map((item) => {
            const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-600/20 text-primary-400' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800',
                )}
              >
                <span>{item.icon}</span>
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-surface-700">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            На сайт
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface-900/80 backdrop-blur border-b border-surface-700 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-gray-100">{t('admin.title')}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{user.email}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-primary-900/50 text-primary-300 border border-primary-700/50">{user.role}</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
