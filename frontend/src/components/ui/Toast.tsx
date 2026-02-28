import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/uiStore'
import { clsx } from 'clsx'

const icons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const colors: Record<string, string> = {
  success: 'border-green-500 bg-green-900/30',
  error: 'border-red-500 bg-red-900/30',
  warning: 'border-yellow-500 bg-yellow-900/30',
  info: 'border-blue-500 bg-blue-900/30',
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={clsx(
              'pointer-events-auto rounded-lg border-l-4 bg-surface-850 p-4 shadow-elevated',
              colors[toast.type],
            )}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{icons[toast.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100">{toast.title}</p>
                {toast.message && <p className="text-xs text-gray-400 mt-0.5">{toast.message}</p>}
              </div>
              <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
