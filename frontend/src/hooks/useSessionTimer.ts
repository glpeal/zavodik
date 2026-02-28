import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function useSessionTimer(reminderIntervalMinutes = 60) {
  const sessionStartTime = useUIStore((s) => s.sessionStartTime)
  const addToast = useUIStore((s) => s.addToast)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime])

  useEffect(() => {
    if (elapsed > 0 && elapsed % (reminderIntervalMinutes * 60) === 0) {
      addToast({
        type: 'warning',
        title: 'Напоминание',
        message: `Вы играете уже ${formatTime(elapsed)}. Рекомендуем сделать перерыв.`,
        duration: 10000,
      })
    }
  }, [elapsed, reminderIntervalMinutes, addToast])

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}ч ${m}мин`
    return `${m}мин`
  }, [])

  return { elapsed, formatted: formatTime(elapsed) }
}
