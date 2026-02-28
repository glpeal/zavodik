import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui'
import { Link } from 'react-router-dom'

export function CookieBanner() {
  const { cookiesAccepted, acceptCookies } = useUIStore()

  return (
    <AnimatePresence>
      {!cookiesAccepted && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-surface-850 border-t border-surface-700 px-4 py-4 shadow-elevated"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 text-center sm:text-left">
              Мы используем cookies для улучшения работы сайта.{' '}
              <Link to="/cookies" className="text-primary-400 hover:underline">Подробнее</Link>
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" variant="primary" onClick={acceptCookies}>Принять</Button>
              <Button size="sm" variant="ghost" onClick={acceptCookies}>Только необходимые</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
