import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'
import { Card, Button, Input, Badge, Tabs, ProgressBar, Skeleton } from '@/components/ui'
import type { Bonus, BonusType, BonusStatus } from '@/types'

// --- Helpers ---

const BONUS_TYPE_BADGE: Record<BonusType, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  welcome: 'success',
  deposit: 'primary',
  freespins: 'info',
  cashback: 'warning',
  freebet: 'success',
  promo: 'primary',
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// --- Bonus Card Component ---

function BonusCard({ bonus, onActivate, isActivating }: {
  bonus: Bonus
  onActivate?: () => void
  isActivating?: boolean
}) {
  const { t } = useTranslation()
  const [showTerms, setShowTerms] = useState(false)
  const days = daysUntil(bonus.expiresAt)

  return (
    <Card className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-100 truncate">{bonus.name}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 mt-1">{bonus.description}</p>
        </div>
        <Badge variant={BONUS_TYPE_BADGE[bonus.type]} className="shrink-0">
          {t(`bonuses.type_${bonus.type}`)}
        </Badge>
      </div>

      {/* Amount */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-primary-400 tabular-nums">
          {bonus.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
        <span className="text-sm text-gray-400">{bonus.currency}</span>
      </div>

      {/* Wager Progress (for active bonuses) */}
      {bonus.status === 'active' && bonus.wagerRequirement > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{t('bonuses.wager')}: x{bonus.wagerRequirement}</span>
            <span>
              {bonus.wagerCompleted.toLocaleString()} / {(bonus.amount * bonus.wagerRequirement).toLocaleString()}
            </span>
          </div>
          <ProgressBar
            value={bonus.wagerProgress}
            max={100}
            showPercent
            color={bonus.wagerProgress >= 100 ? 'success' : 'primary'}
          />
        </div>
      )}

      {/* Expiry */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{t('bonuses.expiresAt')}</span>
        <span className={days <= 3 ? 'text-red-400' : 'text-gray-300'}>
          {new Date(bonus.expiresAt).toLocaleDateString()}
          {days > 0 && (
            <span className="text-xs text-gray-500 ml-1">
              ({t('bonuses.daysLeft', { count: days })})
            </span>
          )}
          {isExpired(bonus.expiresAt) && (
            <Badge variant="danger" className="ml-2">{t('bonuses.expired')}</Badge>
          )}
        </span>
      </div>

      {/* Activated date */}
      {bonus.activatedAt && (
        <p className="text-xs text-gray-500">
          {t('bonuses.activatedAt')}: {new Date(bonus.activatedAt).toLocaleString()}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-surface-700">
        {bonus.status === 'available' && onActivate && (
          <Button
            size="sm"
            onClick={onActivate}
            isLoading={isActivating}
          >
            {t('bonuses.activate')}
          </Button>
        )}

        {bonus.status === 'completed' && (
          <Badge variant="success">{t('bonuses.statusCompleted')}</Badge>
        )}

        {bonus.status === 'expired' && (
          <Badge variant="danger">{t('bonuses.statusExpired')}</Badge>
        )}

        {bonus.status === 'cancelled' && (
          <Badge variant="default">{t('bonuses.statusCancelled')}</Badge>
        )}

        <button
          onClick={() => setShowTerms(!showTerms)}
          className="text-xs text-primary-400 hover:text-primary-300 ml-auto"
        >
          {showTerms ? t('bonuses.hideTerms') : t('bonuses.terms')}
        </button>
      </div>

      {/* Terms */}
      {showTerms && (
        <div className="text-xs text-gray-400 bg-surface-800 rounded-lg p-3 border border-surface-700">
          {bonus.terms}
        </div>
      )}
    </Card>
  )
}

// --- Promo Code Section ---

const promoSchema = z.object({
  code: z.string().min(1, 'required').max(50),
})
type PromoFormData = z.infer<typeof promoSchema>

function PromoCodeSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const promoMutation = useMutation({
    mutationFn: (code: string) => api.activatePromoCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] })
      reset()
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PromoFormData>({
    resolver: zodResolver(promoSchema),
  })

  const onSubmit = (data: PromoFormData) => {
    promoMutation.mutate(data.code)
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-3">{t('bonuses.promoCode')}</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder={t('bonuses.enterPromoCode')}
            error={errors.code?.message ? t(`validation.${errors.code.message}`) : undefined}
            {...register('code')}
          />
        </div>
        <Button type="submit" isLoading={promoMutation.isPending} className="shrink-0">
          {t('bonuses.activate')}
        </Button>
      </form>
      {promoMutation.isSuccess && (
        <p className="text-sm text-green-400 mt-2">{t('bonuses.promoActivated')}</p>
      )}
      {promoMutation.isError && (
        <p className="text-sm text-red-400 mt-2">{t('bonuses.promoError')}</p>
      )}
    </Card>
  )
}

// --- Main Page ---

type BonusTab = 'available' | 'active' | 'completed'

export default function BonusesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<BonusTab>('available')
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['bonuses'],
    queryFn: api.getBonuses,
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.activateBonus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] })
      setActivatingId(null)
    },
    onError: () => {
      setActivatingId(null)
    },
  })

  const filteredBonuses = useMemo(() => {
    if (!bonuses) return []

    const statusMap: Record<BonusTab, BonusStatus[]> = {
      available: ['available'],
      active: ['active'],
      completed: ['completed', 'expired', 'cancelled'],
    }

    return bonuses.filter((b) => statusMap[activeTab].includes(b.status))
  }, [bonuses, activeTab])

  const counts = useMemo(() => {
    if (!bonuses) return { available: 0, active: 0, completed: 0 }
    return {
      available: bonuses.filter((b) => b.status === 'available').length,
      active: bonuses.filter((b) => b.status === 'active').length,
      completed: bonuses.filter((b) => ['completed', 'expired', 'cancelled'].includes(b.status)).length,
    }
  }, [bonuses])

  const tabs = [
    { id: 'available', label: t('bonuses.available'), count: counts.available },
    { id: 'active', label: t('bonuses.active'), count: counts.active },
    { id: 'completed', label: t('bonuses.completed'), count: counts.completed },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">{t('bonuses.title')}</h1>

      <PromoCodeSection />

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as BonusTab)}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <Skeleton height={20} width="60%" />
                <Skeleton height={14} width="80%" />
                <Skeleton height={32} width="40%" />
                <Skeleton height={8} className="w-full" />
                <div className="flex justify-between">
                  <Skeleton height={14} width="30%" />
                  <Skeleton height={14} width="25%" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {filteredBonuses.length === 0 ? (
            <Card>
              <p className="text-gray-400 text-center py-8">{t('common.noResults')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBonuses.map((bonus) => (
                <BonusCard
                  key={bonus.id}
                  bonus={bonus}
                  onActivate={
                    bonus.status === 'available'
                      ? () => {
                          setActivatingId(bonus.id)
                          activateMutation.mutate(bonus.id)
                        }
                      : undefined
                  }
                  isActivating={activatingId === bonus.id && activateMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
