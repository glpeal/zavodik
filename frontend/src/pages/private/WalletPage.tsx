import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'
import { Card, Button, Input, Badge, Tabs, Select, Pagination, Skeleton } from '@/components/ui'
import type { PaymentMethod, TransactionType, TransactionStatus } from '@/types'

// --- Balance Card ---

function BalanceCard() {
  const { t } = useTranslation()

  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: api.getBalance,
  })

  if (isLoading) {
    return (
      <Card glow className="bg-gradient-to-br from-primary-900/40 to-surface-850">
        <div className="space-y-4">
          <Skeleton height={16} width="30%" />
          <Skeleton height={40} width="50%" />
          <div className="flex gap-6">
            <Skeleton height={16} width="25%" />
            <Skeleton height={16} width="25%" />
          </div>
        </div>
      </Card>
    )
  }

  const currencySymbol = balance?.currency === 'USD' ? '$' : balance?.currency === 'EUR' ? '\u20AC' : '\u20BD'

  return (
    <Card glow className="bg-gradient-to-br from-primary-900/40 to-surface-850">
      <p className="text-sm text-gray-400 mb-1">{t('wallet.totalBalance')}</p>
      <p className="text-4xl font-bold text-gray-100 mb-4 tabular-nums">
        {currencySymbol}
        {balance?.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </p>
      <div className="flex gap-6">
        <div>
          <p className="text-xs text-gray-400">{t('wallet.realBalance')}</p>
          <p className="text-lg font-semibold text-gray-200 tabular-nums">
            {currencySymbol}
            {balance?.real.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t('wallet.bonusBalance')}</p>
          <p className="text-lg font-semibold text-yellow-400 tabular-nums">
            {currencySymbol}
            {balance?.bonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </Card>
  )
}

// --- Deposit / Withdraw Forms ---

function DepositForm() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: methods, isLoading: methodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: api.getPaymentMethods,
  })

  interface DepositFormData {
    methodId: string
    amount: number
  }

  const depositSchema = z.object({
    methodId: z.string().min(1, 'required'),
    amount: z.coerce.number().positive('positive'),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema) as never,
  })

  const selectedMethodId = watch('methodId')
  const selectedMethod = methods?.find((m) => m.id === selectedMethodId)

  const depositMutation = useMutation({
    mutationFn: (data: DepositFormData) =>
      api.deposit({
        methodId: data.methodId,
        amount: data.amount,
        transactionId: crypto.randomUUID(),
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      if (result.redirectUrl) {
        window.open(result.redirectUrl, '_blank')
      }
      reset()
    },
  })

  const onSubmit = (data: DepositFormData) => {
    depositMutation.mutate(data)
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('wallet.deposit')}</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {methodsLoading ? (
          <Skeleton height={40} className="w-full" />
        ) : (
          <Select
            label={t('wallet.paymentMethod')}
            placeholder={t('wallet.selectMethod')}
            error={errors.methodId?.message ? t(`validation.${errors.methodId.message}`) : undefined}
            options={
              methods?.map((m) => ({
                value: m.id,
                label: m.name,
              })) || []
            }
            {...register('methodId')}
          />
        )}

        {selectedMethod && <PaymentMethodInfo method={selectedMethod} type="deposit" />}

        <Input
          label={t('wallet.amount')}
          type="number"
          step="0.01"
          placeholder={
            selectedMethod
              ? `${selectedMethod.minDeposit} - ${selectedMethod.maxDeposit}`
              : '0.00'
          }
          error={errors.amount?.message ? t(`validation.${errors.amount.message}`) : undefined}
          {...register('amount')}
        />

        {depositMutation.isSuccess && (
          <p className="text-sm text-green-400">{t('wallet.depositSuccess')}</p>
        )}
        {depositMutation.isError && (
          <p className="text-sm text-red-400">{t('common.error')}</p>
        )}

        <Button type="submit" fullWidth isLoading={depositMutation.isPending}>
          {t('wallet.deposit')}
        </Button>
      </form>
    </Card>
  )
}

function WithdrawForm() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: methods, isLoading: methodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: api.getPaymentMethods,
  })

  interface WithdrawFormData {
    methodId: string
    amount: number
  }

  const withdrawSchema = z.object({
    methodId: z.string().min(1, 'required'),
    amount: z.coerce.number().positive('positive'),
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema) as never,
  })

  const selectedMethodId = watch('methodId')
  const selectedMethod = methods?.find((m) => m.id === selectedMethodId)

  const withdrawMutation = useMutation({
    mutationFn: (data: WithdrawFormData) =>
      api.withdraw({
        methodId: data.methodId,
        amount: data.amount,
        transactionId: crypto.randomUUID(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      reset()
    },
  })

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{t('wallet.withdraw')}</h3>

      <form onSubmit={handleSubmit((data) => withdrawMutation.mutate(data))} className="space-y-4">
        {methodsLoading ? (
          <Skeleton height={40} className="w-full" />
        ) : (
          <Select
            label={t('wallet.paymentMethod')}
            placeholder={t('wallet.selectMethod')}
            error={errors.methodId?.message ? t(`validation.${errors.methodId.message}`) : undefined}
            options={
              methods?.map((m) => ({
                value: m.id,
                label: m.name,
              })) || []
            }
            {...register('methodId')}
          />
        )}

        {selectedMethod && <PaymentMethodInfo method={selectedMethod} type="withdraw" />}

        <Input
          label={t('wallet.amount')}
          type="number"
          step="0.01"
          placeholder={
            selectedMethod
              ? `${selectedMethod.minWithdraw} - ${selectedMethod.maxWithdraw}`
              : '0.00'
          }
          error={errors.amount?.message ? t(`validation.${errors.amount.message}`) : undefined}
          {...register('amount')}
        />

        {withdrawMutation.isSuccess && (
          <p className="text-sm text-green-400">{t('wallet.withdrawSuccess')}</p>
        )}
        {withdrawMutation.isError && (
          <p className="text-sm text-red-400">{t('common.error')}</p>
        )}

        <Button type="submit" fullWidth isLoading={withdrawMutation.isPending}>
          {t('wallet.withdraw')}
        </Button>
      </form>
    </Card>
  )
}

function PaymentMethodInfo({
  method,
  type,
}: {
  method: PaymentMethod
  type: 'deposit' | 'withdraw'
}) {
  const { t } = useTranslation()

  const min = type === 'deposit' ? method.minDeposit : method.minWithdraw
  const max = type === 'deposit' ? method.maxDeposit : method.maxWithdraw

  return (
    <div className="rounded-lg bg-surface-800 border border-surface-700 p-3 text-sm">
      <div className="flex justify-between text-gray-400">
        <span>{t('wallet.min')}</span>
        <span className="text-gray-200">{min.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-gray-400 mt-1">
        <span>{t('wallet.max')}</span>
        <span className="text-gray-200">{max.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-gray-400 mt-1">
        <span>{t('wallet.fee')}</span>
        <span className="text-gray-200">{method.fee}%</span>
      </div>
      <div className="flex justify-between text-gray-400 mt-1">
        <span>{t('wallet.processingTime')}</span>
        <span className="text-gray-200">{method.processingTime}</span>
      </div>
    </div>
  )
}

// --- Transaction History ---

const STATUS_BADGE_MAP: Record<TransactionStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
}

const TYPE_BADGE_MAP: Record<TransactionType, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  deposit: 'success',
  withdrawal: 'info',
  bonus: 'warning',
  bet: 'primary',
  win: 'success',
  refund: 'default',
  commission: 'danger',
}

function TransactionHistory() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    if (typeFilter) p.set('type', typeFilter)
    if (statusFilter) p.set('status', statusFilter)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    return p.toString()
  }, [page, typeFilter, statusFilter, dateFrom, dateTo])

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => api.getTransactions(params),
  })

  const typeOptions = [
    { value: '', label: t('common.all') },
    { value: 'deposit', label: t('wallet.deposit') },
    { value: 'withdrawal', label: t('wallet.withdraw') },
    { value: 'bonus', label: t('wallet.typeBonus') },
    { value: 'bet', label: t('wallet.typeBet') },
    { value: 'win', label: t('wallet.typeWin') },
    { value: 'refund', label: t('wallet.typeRefund') },
  ]

  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'pending', label: t('wallet.pending') },
    { value: 'processing', label: t('wallet.processing') },
    { value: 'completed', label: t('wallet.completed') },
    { value: 'failed', label: t('wallet.failed') },
    { value: 'cancelled', label: t('wallet.cancelled') },
  ]

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">
        {t('wallet.transactions')}
      </h3>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Select
          options={typeOptions}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          placeholder={t('wallet.filterType')}
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          placeholder={t('wallet.filterStatus')}
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            setPage(1)
          }}
          placeholder={t('wallet.dateFrom')}
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            setPage(1)
          }}
          placeholder={t('wallet.dateTo')}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={48} className="w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Mobile-friendly list */}
          <div className="space-y-2">
            {data?.data.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-800 border border-surface-700"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={TYPE_BADGE_MAP[tx.type]}>{t(`wallet.type_${tx.type}`)}</Badge>
                    <Badge variant={STATUS_BADGE_MAP[tx.status]}>{t(`wallet.status_${tx.status}`)}</Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                  {tx.description && (
                    <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                  )}
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund' || tx.type === 'bonus'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund' || tx.type === 'bonus'
                    ? '+'
                    : '-'}
                  {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
                </p>
              </div>
            ))}

            {data?.data.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-8">
                {t('common.noResults')}
              </p>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// --- Main Page ---

export default function WalletPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('deposit')

  const tabs = [
    { id: 'deposit', label: t('wallet.deposit') },
    { id: 'withdraw', label: t('wallet.withdraw') },
    { id: 'transactions', label: t('wallet.transactions') },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">{t('wallet.title')}</h1>

      <BalanceCard />

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === 'deposit' && <DepositForm />}
        {activeTab === 'withdraw' && <WithdrawForm />}
        {activeTab === 'transactions' && <TransactionHistory />}
      </div>
    </div>
  )
}
