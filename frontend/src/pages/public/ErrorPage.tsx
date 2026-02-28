import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui'

export default function ErrorPage() {
  const { t } = useTranslation()

  function handleReload() {
    window.location.reload()
  }

  function handleGoHome() {
    window.location.href = '/'
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex max-w-md flex-col items-center text-center"
      >
        {/* Large 500 number */}
        <motion.span
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-[120px] font-extrabold leading-none tracking-tighter text-danger-500 sm:text-[160px]"
        >
          500
        </motion.span>

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-4 mt-2"
        >
          <svg className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </motion.div>

        {/* Text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-2 text-xl font-bold text-gray-100 sm:text-2xl"
        >
          {t('errors.serverError')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-8 text-sm text-gray-400"
        >
          {t('errors.serverErrorText')}
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex gap-3"
        >
          <Button size="lg" onClick={handleReload}>
            {t('common.retry')}
          </Button>
          <Button variant="outline" size="lg" onClick={handleGoHome}>
            {t('nav.home')}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
