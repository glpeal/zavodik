import { useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import api from '@/services/api'
import { Badge, Skeleton } from '@/components/ui'
import { OddsButton, useIsOutcomeSelected } from '@/components/betting/OddsButton'
import { BetSlip } from '@/components/betting/BetSlip'
import { useBetSlipStore } from '@/stores/betSlipStore'
import type { Market, Outcome, SportEvent } from '@/types'

// ── Collapsible market section ────────────────────────────────────
function MarketSection({
  market,
  event,
}: {
  market: Market
  event: SportEvent
}) {
  const [isOpen, setIsOpen] = useState(true)
  const { t } = useTranslation()
  const addSelection = useBetSlipStore((s) => s.addSelection)

  const handleOddsClick = useCallback(
    (outcome: Outcome) => {
      addSelection(outcome, market, event)
    },
    [addSelection, market, event],
  )

  const isSuspended = market.status === 'suspended'

  return (
    <div className="rounded-xl border border-surface-700 bg-surface-850 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-surface-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-200">{market.name}</h3>
          {isSuspended && (
            <Badge variant="warning" className="text-[10px]">
              {t('betting.suspended')}
            </Badge>
          )}
        </div>
        <svg
          className={clsx(
            'h-4 w-4 text-gray-500 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Outcomes grid */}
      {isOpen && (
        <div className="px-4 pb-4">
          <div
            className={clsx(
              'grid gap-2',
              market.outcomes.length === 2 && 'grid-cols-2',
              market.outcomes.length === 3 && 'grid-cols-3',
              market.outcomes.length > 3 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
            )}
          >
            {market.outcomes.map((outcome) => (
              <MarketOddsButton
                key={outcome.id}
                outcome={outcome}
                disabled={isSuspended}
                onClick={handleOddsClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Wraps OddsButton with per-outcome selection awareness. */
function MarketOddsButton({
  outcome,
  disabled,
  onClick,
}: {
  outcome: Outcome
  disabled: boolean
  onClick: (outcome: Outcome) => void
}) {
  const isSelected = useIsOutcomeSelected(outcome.id)

  return (
    <OddsButton
      outcome={outcome}
      isSelected={isSelected}
      disabled={disabled}
      onClick={() => onClick(outcome)}
      className="w-full"
    />
  )
}

// ── Skeleton loader ───────────────────────────────────────────────
function EventSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="rounded-xl bg-surface-850 border border-surface-700 p-6 space-y-4">
        <Skeleton width="30%" height={12} />
        <div className="flex items-center justify-between">
          <Skeleton width="40%" height={24} />
          <Skeleton width={60} height={32} />
          <Skeleton width="40%" height={24} />
        </div>
        <div className="flex justify-center">
          <Skeleton width={120} height={14} />
        </div>
      </div>
      {/* Markets skeleton */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-surface-850 border border-surface-700 p-4 space-y-3">
          <Skeleton width="30%" height={16} />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Market type grouping ──────────────────────────────────────────
const MARKET_GROUP_ORDER = ['result', 'total', 'handicap', 'special'] as const
type MarketGroup = (typeof MARKET_GROUP_ORDER)[number]

function classifyMarket(market: Market): MarketGroup {
  const t = market.type.toLowerCase()
  if (t.includes('total') || t.includes('over') || t.includes('under')) return 'total'
  if (t.includes('handicap') || t.includes('spread') || t.includes('asian')) return 'handicap'
  if (t.includes('winner') || t.includes('result') || t.includes('1x2') || t.includes('moneyline')) return 'result'
  return 'special'
}

// ── Main page ─────────────────────────────────────────────────────
export default function EventPage() {
  const { t } = useTranslation()
  const { eventId } = useParams<{ eventId: string }>()
  const [activeGroup, setActiveGroup] = useState<MarketGroup | 'all'>('all')

  // ── Data fetching ──
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.getEvent(eventId!),
    enabled: !!eventId,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const ev = query.state.data
      return ev?.isLive ? 10_000 : undefined
    },
  })

  const { data: markets, isLoading: marketsLoading } = useQuery({
    queryKey: ['markets', eventId],
    queryFn: () => api.getMarkets(eventId!),
    enabled: !!eventId,
    staleTime: 10_000,
    refetchInterval: () => {
      return event?.isLive ? 10_000 : undefined
    },
  })

  // ── Group markets ──
  const groupedMarkets = useMemo(() => {
    if (!markets) return {}
    const groups: Record<string, Market[]> = {}
    for (const market of markets) {
      const group = classifyMarket(market)
      if (!groups[group]) groups[group] = []
      groups[group].push(market)
    }
    return groups
  }, [markets])

  const filteredMarkets = useMemo(() => {
    if (!markets) return []
    if (activeGroup === 'all') return markets
    return markets.filter((m) => classifyMarket(m) === activeGroup)
  }, [markets, activeGroup])

  const marketGroupTabs = useMemo(() => {
    const tabs = [{ id: 'all', label: t('betting.allMarkets') }]
    for (const group of MARKET_GROUP_ORDER) {
      if (groupedMarkets[group]?.length) {
        const key = `betting.${group}` as const
        tabs.push({
          id: group,
          label: t(key),
        })
      }
    }
    return tabs
  }, [groupedMarkets, t])

  const isLoading = eventLoading || marketsLoading

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
          <EventSkeleton />
        </main>
        <BetSlip />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex h-full min-h-0">
        <main className="flex-1 min-w-0 flex items-center justify-center">
          <div className="text-center">
            <svg className="h-16 w-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-400 font-medium">{t('betting.eventNotFound')}</p>
            <Link to="/sports" className="text-primary-400 text-sm mt-2 hover:underline inline-block">
              {t('common.back')}
            </Link>
          </div>
        </main>
        <BetSlip />
      </div>
    )
  }

  const startTime = new Date(event.startTime)
  const timeDisplay = event.isLive
    ? event.timer || event.period || t('betting.live')
    : startTime.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

  return (
    <div className="flex h-full min-h-0">
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/sports" className="hover:text-gray-300 transition-colors">
              {t('nav.sports')}
            </Link>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-400 truncate">{event.leagueName}</span>
          </nav>

          {/* ── Event header ── */}
          <div className="rounded-xl border border-surface-700 bg-surface-850 p-4 sm:p-6">
            {/* Time / Live badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {event.isLive ? (
                <Badge variant="danger" dot pulse>
                  {timeDisplay}
                </Badge>
              ) : (
                <span className="text-sm text-gray-400">{timeDisplay}</span>
              )}
            </div>

            {/* Teams + Score */}
            <div className="flex items-center justify-center gap-4 sm:gap-8">
              {/* Home team */}
              <div className="flex-1 text-right">
                <h1 className="text-lg sm:text-xl font-bold text-gray-100">{event.homeTeam}</h1>
              </div>

              {/* Score or VS */}
              <div className="flex-shrink-0">
                {event.isLive && event.score ? (
                  <div className="flex items-center gap-2 bg-surface-900 rounded-lg px-4 py-2 border border-surface-700">
                    <span className="text-2xl font-bold text-gray-100 font-mono">{event.score.home}</span>
                    <span className="text-gray-600">:</span>
                    <span className="text-2xl font-bold text-gray-100 font-mono">{event.score.away}</span>
                  </div>
                ) : (
                  <span className="text-lg font-semibold text-gray-600">VS</span>
                )}
              </div>

              {/* Away team */}
              <div className="flex-1 text-left">
                <h1 className="text-lg sm:text-xl font-bold text-gray-100">{event.awayTeam}</h1>
              </div>
            </div>

            {/* Period */}
            {event.isLive && event.period && (
              <p className="text-center text-xs text-gray-500 mt-2">{event.period}</p>
            )}
          </div>

          {/* ── Market group tabs ── */}
          {marketGroupTabs.length > 1 && (
            <div className="overflow-x-auto">
              <div className="flex gap-1 rounded-lg bg-surface-900 p-1 min-w-max" role="tablist">
                {marketGroupTabs.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={tab.id === activeGroup}
                    onClick={() => setActiveGroup(tab.id as MarketGroup | 'all')}
                    className={clsx(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                      tab.id === activeGroup
                        ? 'bg-surface-700 text-gray-100'
                        : 'text-gray-400 hover:text-gray-200',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Markets list ── */}
          {filteredMarkets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-400 font-medium">{t('common.noResults')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMarkets.map((market) => (
                <MarketSection key={market.id} market={market} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Bet Slip ── */}
      <BetSlip />
    </div>
  )
}
