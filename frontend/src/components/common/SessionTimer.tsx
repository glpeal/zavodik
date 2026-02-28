import { useSessionTimer } from '@/hooks/useSessionTimer'

export function SessionTimer() {
  const { formatted } = useSessionTimer(60)

  return (
    <div className="fixed bottom-4 left-4 z-30 hidden lg:block">
      <div className="rounded-lg bg-surface-850/90 border border-surface-700 px-3 py-1.5 text-xs text-gray-500 backdrop-blur">
        Время в сессии: {formatted}
      </div>
    </div>
  )
}
