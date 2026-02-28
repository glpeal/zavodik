import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Card, Button, Badge, Select, Pagination, Skeleton } from '@/components/ui'
import { Input } from '@/components/ui'
import type { Bet, BetStatus, BetType } from '@/types'

// --- Status / Type Maps ---

const BET_STATUS_BADGE: Record<BetStatus, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  won: 'success',
  lost: 'danger',
  cashout: 'info',
  void: 'default',
  refunded: 'default',
}

const BET_TYPE_BADGE: Record<BetType, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  single: 'default',
  express: 'primary',
  system: 'info',
}

// --- Bet Card ---

function BetCard({ bet }: { bet: Bet }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showCashoutConfirm, setShowCashoutConfirm] = useState(false)

  const cashoutMutation = useMutation({
    mutationFn: () => api.cashout(bet.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['betHistory'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      setShowCashoutConfirm(false)
    },
  })

  return (
    <Card className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={BET_TYPE_BADGE[bet.type]}>
            {t(`betHistory.type_${bet.type}`)}
          </Badge>
          <Badge variant={BET_STATUS_BADGE[bet.status]}>
            {t(`betHistory.status_${bet.status}`)}
          </Badge>
        </div>
        <p className="text-xs text-gray-400">
          {new Date(bet.createdAt).toLocaleString()}
        </p>
      </div>

      {/* Selections */}
      <div className="space-y-2">
        {bet.selections.map((sel, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-800 border border-surface-700"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-100 truncate">{sel.eventName}</p>
              <p className="text-xs text-gray-400">
                {sel.marketName}: <span className="text-gray-300">{sel.outcomeName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <span className="text-sm font-mono text-primary-400">{sel.odds.toFixed(2)}</span>
              {sel.result && (
                <Badge
                  variant={
                    sel.result === 'won'
                      ? 'success'
                      : sel.result === 'lost'
                        ? 'danger'
                        : 'default'
                  }
                >
                  {t(`betHistory.result_${sel.result}`)}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-surface-700">
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-400">{t('betHistory.totalOdds')}: </span>
            <span className="font-mono text-gray-100">{bet.totalOdds.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">{t('betting.stake')}: </span>
            <span className="font-semibold text-gray-100 tabular-nums">
              {bet.stake.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {bet.status === 'pending' && (
            <div className="text-sm">
              <span className="text-gray-400">{t('betHistory.potentialWin')}: </span>
              <span className="font-semibold text-green-400 tabular-nums">
                {bet.potentialWin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {(bet.status === 'won' || bet.status === 'cashout') && bet.actualWin !== undefined && (
            <div className="text-sm">
              <span className="text-gray-400">{t('betHistory.actualWin')}: </span>
              <span className="font-semibold text-green-400 tabular-nums">
                {bet.actualWin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {bet.status === 'pending' && bet.cashoutAmount !== undefined && bet.cashoutAmount > 0 && (
            <>
              {showCashoutConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-yellow-400 tabular-nums">
                    {bet.cashoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => cashoutMutation.mutate()}
                    isLoading={cashoutMutation.isPending}
                  >
                    {t('common.confirm')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCashoutConfirm(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCashoutConfirm(true)}
                  className="text-yellow-400 border-yellow-600 hover:bg-yellow-900/30"
                >
                  {t('betHistory.cashout')} {bet.cashoutAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {bet.settledAt && (
        <p className="text-xs text-gray-500">
          {t('betHistory.settledAt')}: {new Date(bet.settledAt).toLocaleString()}
        </p>
      )}
    </Card>
  )
}

// --- Main Page ---

export default function BetHistoryPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [sportFilter, setSportFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: sports } = useQuery({
    queryKey: ['sports'],
    queryFn: api.getSports,
  })

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    if (statusFilter) p.set('status', statusFilter)
    if (sportFilter) p.set('sportId', sportFilter)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    return p.toString()
  }, [page, statusFilter, sportFilter, dateFrom, dateTo])

  const { data, isLoading } = useQuery({
    queryKey: ['betHistory', params],
    queryFn: () => api.getBetHistory(params),
  })

  const statusOptions = [
    { value: '', label: t('common.all') },
    { value: 'pending', label: t('betHistory.status_pending') },
    { value: 'won', label: t('betHistory.status_won') },
    { value: 'lost', label: t('betHistory.status_lost') },
    { value: 'cashout', label: t('betHistory.status_cashout') },
    { value: 'void', label: t('betHistory.status_void') },
    { value: 'refunded', label: t('betHistory.status_refunded') },
  ]

  const sportOptions = [
    { value: '', label: t('common.all') },
    ...(sports?.map((s) => ({ value: s.id, label: s.name })) || []),
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">{t('betHistory.title')}</h1>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select
            label={t('wallet.status')}
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
          />
          <Select
            label={t('betHistory.sport')}
            options={sportOptions}
            value={sportFilter}
            onChange={(e) => {
              setSportFilter(e.target.value)
              setPage(1)
            }}
          />
          <Input
            label={t('wallet.dateFrom')}
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
          />
          <Input
            label={t('wallet.dateTo')}
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </Card>

      {/* Bet List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton height={20} width={60} />
                  <Skeleton height={20} width={80} />
                </div>
                <Skeleton height={52} className="w-full rounded-lg" />
                <Skeleton height={52} className="w-full rounded-lg" />
                <div className="flex justify-between">
                  <Skeleton height={16} width="30%" />
                  <Skeleton height={16} width="20%" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data?.data.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}

            {data?.data.length === 0 && (
              <Card>
                <p className="text-gray-400 text-center py-8">
                  {t('common.noResults')}
                </p>
              </Card>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
