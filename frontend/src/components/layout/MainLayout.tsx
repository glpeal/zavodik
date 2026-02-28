import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { ToastContainer } from '@/components/ui'
import { AgeGate } from '@/components/common/AgeGate'
import { CookieBanner } from '@/components/common/CookieBanner'
import { SessionTimer } from '@/components/common/SessionTimer'
import { useAuthStore } from '@/stores/authStore'

export function MainLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
      <AgeGate />
      <CookieBanner />
      {isAuthenticated && <SessionTimer />}
    </div>
  )
}
