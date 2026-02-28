import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'
import { Card, Button, Input, Badge, Select, ProgressBar, Modal, Skeleton } from '@/components/ui'
import type { GamblingLimit, LimitType, LimitPeriod, TimeoutPeriod, SelfExclusionPeriod } from '@/types'

// --- Schemas ---

interface LimitFormData {
  type: string
  period: string
  amount: number
}

const limitSchema = z.object({
  type: z.string().min(1, 'required'),
  period: z.string().min(1, 'required'),
  amount: z.coerce.number().positive('positive'),
})

// --- Helpers ---

const LIMIT_TYPES: LimitType[] = ['deposit', 'bet', 'loss']
const LIMIT_PERIODS: LimitPeriod[] = ['daily', 'weekly', 'monthly']
const TIMEOUT_PERIODS: TimeoutPeriod[] = ['24h', '7d', '30d', '90d']
const SELF_EXCLUSION_PERIODS: SelfExclusionPeriod[] = ['6m', '1y', '3y', '5y', 'permanent']

function getLimitColor(used: number, amount: number): 'primary' | 'success' | 'warning' | 'danger' {
  const pct = (used / amount) * 100
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warning'
  return 'primary'
}

// --- Limit Card ---

function LimitCard({
  limit,
  onRemove,
  isRemoving,
}: {
  limit: GamblingLimit
  onRemove: () => void
  isRemoving: boolean
}) {
  const { t } = useTranslation()
  const pct = limit.amount > 0 ? (limit.used / limit.amount) * 100 : 0

  return (
    <div className="py-3 px-4 rounded-lg bg-surface-800 border border-surface-700 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="primary">{t(`responsible.limitType_${limit.type}`)}</Badge>
          <Badge variant="default">{t(`responsible.period_${limit.period}`)}</Badge>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={onRemove}
          isLoading={isRemoving}
          className="text-red-400 hover:text-red-300"
        >
          {t('common.delete')}
        </Button>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{t('responsible.used')}</span>
        <span className="text-gray-200 tabular-nums">
          {limit.used.toLocaleString(undefined, { minimumFractionDigits: 2 })} /{' '}
          {limit.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      <ProgressBar
        value={pct}
        max={100}
        showPercent
        color={getLimitColor(limit.used, limit.amount)}
        size="sm"
      />
    </div>
  )
}

// --- Set Limit Form ---

function SetLimitForm() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LimitFormData>({
    resolver: zodResolver(limitSchema) as never,
  })

  const setLimitMutation = useMutation({
    mutationFn: (data: LimitFormData) =>
      api.setLimit({
        type: data.type as LimitType,
        period: data.period as LimitPeriod,
        amount: data.amount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limits'] })
      reset()
    },
  })

  const typeOptions = LIMIT_TYPES.map((t2) => ({
    value: t2,
    label: t(`responsible.limitType_${t2}`),
  }))

  const periodOptions = LIMIT_PERIODS.map((p) => ({
    value: p,
    label: t(`responsible.period_${p}`),
  }))

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('responsible.setLimit')}</h3>

      <form onSubmit={handleSubmit((data) => setLimitMutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label={t('responsible.limitType')}
            placeholder={t('responsible.selectType')}
            options={typeOptions}
            error={errors.type?.message ? t(`validation.${errors.type.message}`) : undefined}
            {...register('type')}
          />
          <Select
            label={t('responsible.period')}
            placeholder={t('responsible.selectPeriod')}
            options={periodOptions}
            error={errors.period?.message ? t(`validation.${errors.period.message}`) : undefined}
            {...register('period')}
          />
          <Input
            label={t('wallet.amount')}
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message ? t(`validation.${errors.amount.message}`) : undefined}
            {...register('amount')}
          />
        </div>

        {setLimitMutation.isSuccess && (
          <p className="text-sm text-green-400">{t('responsible.limitSet')}</p>
        )}
        {setLimitMutation.isError && (
          <p className="text-sm text-red-400">{t('common.error')}</p>
        )}

        <Button type="submit" isLoading={setLimitMutation.isPending}>
          {t('responsible.setLimit')}
        </Button>
      </form>
    </Card>
  )
}

// --- Current Limits ---

function CurrentLimits() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const { data: limits, isLoading } = useQuery({
    queryKey: ['limits'],
    queryFn: api.getLimits,
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeLimit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limits'] })
      setRemovingId(null)
    },
  })

  const activeLimits = limits?.filter((l) => l.isActive) || []

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('responsible.currentLimits')}</h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={80} className="w-full rounded-lg" />
          ))}
        </div>
      ) : activeLimits.length > 0 ? (
        <div className="space-y-3">
          {activeLimits.map((limit) => (
            <LimitCard
              key={limit.id}
              limit={limit}
              onRemove={() => {
                setRemovingId(limit.id)
                removeMutation.mutate(limit.id)
              }}
              isRemoving={removingId === limit.id && removeMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">{t('responsible.noLimits')}</p>
      )}
    </Card>
  )
}

// --- Timeout Section ---

function TimeoutSection() {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<TimeoutPeriod | ''>('')

  const timeoutMutation = useMutation({
    mutationFn: (period: string) => api.setTimeout(period),
    onSuccess: () => {
      setShowConfirm(false)
      setSelectedPeriod('')
    },
  })

  const periodOptions = TIMEOUT_PERIODS.map((p) => ({
    value: p,
    label: t(`responsible.timeout_${p}`),
  }))

  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">{t('responsible.timeout')}</h3>
        <p className="text-sm text-gray-400 mb-4">{t('responsible.timeoutDescription')}</p>

        <div className="flex gap-3 flex-wrap">
          <div className="w-48">
            <Select
              options={periodOptions}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as TimeoutPeriod)}
              placeholder={t('responsible.selectPeriod')}
            />
          </div>
          <Button
            variant="outline"
            disabled={!selectedPeriod}
            onClick={() => setShowConfirm(true)}
          >
            {t('responsible.activateTimeout')}
          </Button>
        </div>

        {timeoutMutation.isSuccess && (
          <p className="text-sm text-green-400 mt-3">{t('responsible.timeoutActivated')}</p>
        )}
      </Card>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={t('responsible.confirmTimeout')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            {t('responsible.timeoutConfirmText', {
              period: selectedPeriod ? t(`responsible.timeout_${selectedPeriod}`) : '',
            })}
          </p>
          <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 p-3">
            <p className="text-sm text-yellow-300">{t('responsible.timeoutWarning')}</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => timeoutMutation.mutate(selectedPeriod)}
              isLoading={timeoutMutation.isPending}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// --- Self-Exclusion Section ---

function SelfExclusionSection() {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<SelfExclusionPeriod | ''>('')
  const [confirmText, setConfirmText] = useState('')

  const selfExcludeMutation = useMutation({
    mutationFn: (period: string) => api.selfExclude(period),
    onSuccess: () => {
      setShowModal(false)
      setSelectedPeriod('')
      setConfirmText('')
    },
  })

  const periodOptions = SELF_EXCLUSION_PERIODS.map((p) => ({
    value: p,
    label: t(`responsible.exclusion_${p}`),
  }))

  const CONFIRM_KEYWORD = 'EXCLUDE'

  return (
    <>
      <Card className="border-red-900/50">
        <h3 className="text-lg font-semibold text-red-400 mb-2">{t('responsible.selfExclusion')}</h3>
        <p className="text-sm text-gray-400 mb-4">{t('responsible.selfExclusionDescription')}</p>

        <div className="rounded-lg bg-red-900/20 border border-red-800/50 p-4 mb-4 space-y-2">
          <p className="text-sm text-red-300 font-medium">{t('responsible.selfExclusionWarningTitle')}</p>
          <ul className="text-sm text-red-400/80 list-disc list-inside space-y-1">
            <li>{t('responsible.selfExclusionWarning1')}</li>
            <li>{t('responsible.selfExclusionWarning2')}</li>
            <li>{t('responsible.selfExclusionWarning3')}</li>
          </ul>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="w-48">
            <Select
              options={periodOptions}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as SelfExclusionPeriod)}
              placeholder={t('responsible.selectPeriod')}
            />
          </div>
          <Button
            variant="danger"
            disabled={!selectedPeriod}
            onClick={() => setShowModal(true)}
          >
            {t('responsible.selfExclude')}
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setConfirmText('')
        }}
        title={t('responsible.confirmSelfExclusion')}
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-900/30 border border-red-700/50 p-4">
            <p className="text-sm text-red-300 font-medium mb-2">
              {t('responsible.selfExclusionFinalWarning')}
            </p>
            <p className="text-sm text-red-400/80">
              {t('responsible.selfExclusionConfirmText', {
                period: selectedPeriod ? t(`responsible.exclusion_${selectedPeriod}`) : '',
              })}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-300 mb-2">
              {t('responsible.typeToConfirm', { keyword: CONFIRM_KEYWORD })}
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_KEYWORD}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false)
                setConfirmText('')
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => selfExcludeMutation.mutate(selectedPeriod)}
              isLoading={selfExcludeMutation.isPending}
              disabled={confirmText !== CONFIRM_KEYWORD}
            >
              {t('responsible.confirmSelfExclusion')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// --- Main Page ---

export default function LimitsPage() {
  const { t } = useTranslation()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">{t('responsible.title')}</h1>

      {/* Warning Banner */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-surface-850 border-blue-800/50">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-200 font-medium mb-1">{t('responsible.infoTitle')}</p>
            <p className="text-sm text-gray-400">{t('responsible.description')}</p>
          </div>
        </div>
      </Card>

      {/* Set New Limit */}
      <SetLimitForm />

      {/* Current Limits */}
      <CurrentLimits />

      {/* Timeout */}
      <TimeoutSection />

      {/* Self-Exclusion */}
      <SelfExclusionSection />

      {/* Responsible Gambling Info */}
      <Card>
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">{t('responsible.riskWarning')}</p>
          <p className="text-sm text-gray-500">{t('responsible.ageWarning')}</p>
        </div>
      </Card>
    </div>
  )
}
