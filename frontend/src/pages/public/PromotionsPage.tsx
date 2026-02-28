import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Button, Card, Badge, Skeleton } from '@/components/ui'
import type { Bonus, BonusType } from '@/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const BONUS_TYPE_VARIANT: Record<BonusType, { variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  welcome: { variant: 'success', label: 'Welcome' },
  deposit: { variant: 'primary', label: 'Deposit' },
  freespins: { variant: 'info', label: 'Free Spins' },
  cashback: { variant: 'warning', label: 'Cashback' },
  freebet: { variant: 'danger', label: 'Free Bet' },
  promo: { variant: 'default', label: 'Promo' },
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
}

/* ------------------------------------------------------------------ */
/*  Promotion card                                                    */
/* ------------------------------------------------------------------ */

function PromotionCard({ bonus, index }: { bonus: Bonus; index: number }) {
  const { t } = useTranslation()
  const typeInfo = BONUS_TYPE_VARIANT[bonus.type] ?? BONUS_TYPE_VARIANT.promo
  const isAvailable = bonus.status === 'available'

  return (
    <motion.div variants={fadeUp} custom={index}>
      <Card hover className="flex flex-col h-full overflow-hidden">
        {/* Gradient banner header */}
        <div className="relative -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-900/80 to-accent-900/60 px-6 py-10">
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary-500/15 blur-2xl" />

          <div className="relative z-10 flex flex-col items-center gap-2 text-center">
            <GiftIcon className="h-10 w-10 text-primary-300" />
            <span className="text-2xl font-extrabold text-white">
              {bonus.amount > 0 && `${bonus.amount} ${bonus.currency}`}
            </span>
          </div>

          <Badge variant={typeInfo.variant} className="absolute right-3 top-3">
            {typeInfo.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-3">
          <h3 className="text-base font-bold text-gray-100 sm:text-lg">{bonus.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-3">{bonus.description}</p>

          {/* Meta */}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {bonus.wagerRequirement > 0 && (
              <span>{t('bonuses.wager')}: x{bonus.wagerRequirement}</span>
            )}
            {bonus.expiresAt && (
              <span>{t('bonuses.expiresAt')}: {new Date(bonus.expiresAt).toLocaleDateString()}</span>
            )}
            {bonus.code && (
              <span className="font-mono text-primary-400">{bonus.code}</span>
            )}
          </div>

          {/* CTA */}
          <div className="mt-3 flex gap-2">
            {isAvailable ? (
              <Button size="sm" fullWidth>
                {t('bonuses.activate')}
              </Button>
            ) : (
              <Button variant="outline" size="sm" fullWidth>
                {t('bonuses.terms')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                  */
/* ------------------------------------------------------------------ */

function PromotionSkeleton() {
  return (
    <div className="rounded-xl bg-surface-850 border border-surface-700 overflow-hidden">
      <Skeleton height={140} className="w-full" />
      <div className="p-4 sm:p-6 space-y-3">
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="100%" />
        <Skeleton height={14} width="80%" />
        <Skeleton height={36} width="100%" className="mt-2 rounded-lg" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                               */
/* ------------------------------------------------------------------ */

export default function PromotionsPage() {
  const { t } = useTranslation()

  const {
    data: bonuses,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['bonuses'],
    queryFn: () => api.getBonuses(),
    staleTime: 2 * 60 * 1000,
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">
          {t('home.promotions')}
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          {t('home.heroSubtitle')}
        </p>
      </motion.div>

      {/* Error state */}
      {isError && (
        <Card className="flex flex-col items-center py-12 text-center">
          <p className="mb-4 text-gray-400">{t('common.error')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PromotionSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Promotions grid */}
      {!isLoading && !isError && (
        <>
          {(bonuses ?? []).length === 0 ? (
            <Card className="flex flex-col items-center py-16 text-center">
              <GiftIcon className="mb-4 h-16 w-16 text-gray-600" />
              <p className="text-gray-400">{t('common.noResults')}</p>
            </Card>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {(bonuses ?? []).map((bonus: Bonus, i: number) => (
                <PromotionCard key={bonus.id} bonus={bonus} index={i} />
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
