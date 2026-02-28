import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
// Virtual list placeholder - simple scroll container for large lists
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VirtualList: React.FC<{ height: number; itemCount: number; itemSize: number; width: string; itemData?: any; children: any }> = ({ height, itemCount, itemSize, itemData, children: Row }) => (
  <div style={{ height, overflow: 'auto' }}>{Array.from({ length: itemCount }).map((_, index) => <Row key={index} index={index} style={{ height: itemSize }} data={itemData} />)}</div>
)
import { clsx } from 'clsx'
import api from '@/services/api'
import { Tabs, Input, Badge, Card, Skeleton } from '@/components/ui'
import { OddsButton, useIsOutcomeSelected } from '@/components/betting/OddsButton'
import { BetSlip } from '@/components/betting/BetSlip'
import { useBetSlipStore } from '@/stores/betSlipStore'
import { useDebounce } from '@/hooks/useDebounce'
import type { Sport, SportEvent, Outcome, Market } from '@/types'

// ── Sport icon mapping ────────────────────────────────────────────
const SPORT_ICONS: Record<string, string> = {
  football: '\u26BD',
  basketball: '\uD83C\uDFC0',
  tennis: '\uD83C\uDFBE',
  hockey: '\uD83C\uDFD2',
  baseball: '\u26BE',
  volleyball: '\uD83C\uDFD0',
  boxing: '\uD83E\uDD4A',
  mma: '\uD83E\uDD4B',
  esports: '\uD83C\uDFAE',
  cricket: '\uD83C\uDFCF',
  rugby: '\uD83C\uDFC9',
  handball: '\uD83E\uDD3E',
}

function getSportIcon(sport: Sport): string {
  return SPORT_ICONS[sport.slug] || sport.icon || '\uD83C\uDFC6'
}

// ── Event card with odds ──────────────────────────────────────────
function EventCard({ event }: { event: SportEvent }) {
  const { t } = useTranslation()
  const addSelection = useBetSlipStore((s) => s.addSelection)

  const topMarket = event.topMarkets?.[0]

  const handleOddsClick = useCallback(
    (outcome: Outcome, market: Market) => {
      addSelection(outcome, market, event)
    },
    [addSelection, event],
  )

  const startTime = new Date(event.startTime)
  const timeStr = event.isLive
    ? event.timer || event.period || t('betting.live')
    : startTime.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <Card padding={false} hover className="!p-0">
      <Link
        to={`/sports/event/${event.id}`}
        className="block px-4 pt-3 pb-2"
      >
        {/* Time / live badge */}
        <div className="flex items-center gap-2 mb-1.5">
          {event.isLive ? (
            <Badge variant="danger" dot pulse className="text-[10px]">
              {timeStr}
            </Badge>
          ) : (
            <span className="text-[11px] text-gray-500">{timeStr}</span>
          )}
          <span className="text-[11px] text-gray-600 ml-auto">
            +{event.marketsCount} {t('betting.markets').toLowerCase()}
          </span>
        </div>

        {/* Teams */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-100 truncate">{event.homeTeam}</span>
            {event.isLive && event.score && (
              <span className="text-sm font-bold text-gray-100 font-mono ml-2">
                {event.score.home}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-100 truncate">{event.awayTeam}</span>
            {event.isLive && event.score && (
              <span className="text-sm font-bold text-gray-100 font-mono ml-2">
                {event.score.away}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Odds row */}
      {topMarket && topMarket.outcomes.length > 0 && (
        <div className="flex gap-1.5 px-3 pb-3">
          {topMarket.outcomes.slice(0, 3).map((outcome) => (
            <EventOddsButton
              key={outcome.id}
              outcome={outcome}
              market={topMarket}
              event={event}
              onClick={handleOddsClick}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

/** Wraps OddsButton with selection-awareness at the individual outcome level. */
function EventOddsButton({
  outcome,
  market,
  event: _event,
  onClick,
}: {
  outcome: Outcome
  market: Market
  event: SportEvent
  onClick: (outcome: Outcome, market: Market) => void
}) {
  const isSelected = useIsOutcomeSelected(outcome.id)

  return (
    <OddsButton
      outcome={outcome}
      isSelected={isSelected}
      disabled={market.status === 'suspended'}
      onClick={() => onClick(outcome, market)}
      className="flex-1"
    />
  )
}

// ── Skeleton loaders ──────────────────────────────────────────────
function SportsSidebarSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <Skeleton width={24} height={24} rounded />
          <Skeleton width="60%" height={14} />
          <Skeleton width={24} height={14} className="ml-auto" />
        </div>
      ))}
    </div>
  )
}

function EventsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="40%" height={16} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="rounded-xl bg-surface-850 border border-surface-700 p-4 space-y-2">
                <Skeleton width="30%" height={10} />
                <Skeleton width="70%" height={14} />
                <Skeleton width="50%" height={14} />
                <div className="flex gap-2 pt-1">
                  <Skeleton width="33%" height={36} />
                  <Skeleton width="33%" height={36} />
                  <Skeleton width="33%" height={36} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Virtual list row for events ───────────────────────────────────
interface VirtualRowData {
  items: Array<{ type: 'header'; league: string } | { type: 'event'; event: SportEvent }>
}

function VirtualRow({ index, style, data }: { index: number; style: React.CSSProperties; data: VirtualRowData }) {
  const item = data.items[index]

  return (
    <div style={style} className="px-1">
      {item.type === 'header' ? (
        <div className="flex items-center gap-2 py-2 px-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.league}</span>
          <div className="flex-1 h-px bg-surface-700" />
        </div>
      ) : (
        <div className="pb-2">
          <EventCard event={item.event} />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function SportsPage() {
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState<'prematch' | 'live'>('prematch')
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebounce(searchValue, 300)

  // ── Data fetching ──
  const { data: sports, isLoading: sportsLoading } = useQuery({
    queryKey: ['sports'],
    queryFn: () => api.getSports(),
    staleTime: 60_000,
  })

  const eventsParams = useMemo(() => {
    const params = new URLSearchParams()
    if (activeTab === 'live') params.set('live', 'true')
    if (activeTab === 'prematch') params.set('live', 'false')
    if (selectedSportId) params.set('sportId', selectedSportId)
    if (debouncedSearch) params.set('search', debouncedSearch)
    params.set('pageSize', '100')
    return params.toString()
  }, [activeTab, selectedSportId, debouncedSearch])

  const { data: eventsResponse, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', eventsParams],
    queryFn: () => api.getEvents(eventsParams),
    staleTime: activeTab === 'live' ? 5_000 : 30_000,
    refetchInterval: activeTab === 'live' ? 10_000 : undefined,
  })

  const events = eventsResponse?.data || []

  // ── Group events by league ──
  const groupedByLeague = useMemo(() => {
    const groups: Record<string, SportEvent[]> = {}
    for (const event of events) {
      const key = event.leagueName || event.leagueId
      if (!groups[key]) groups[key] = []
      groups[key].push(event)
    }
    return groups
  }, [events])

  // ── Build flat list for virtual scrolling ──
  const virtualItems = useMemo(() => {
    const items: VirtualRowData['items'] = []
    for (const [league, leagueEvents] of Object.entries(groupedByLeague)) {
      items.push({ type: 'header', league })
      for (const event of leagueEvents) {
        items.push({ type: 'event', event })
      }
    }
    return items
  }, [groupedByLeague])

  const useVirtualList = virtualItems.length > 30

  // ── Tabs config ──
  const modeTabs = useMemo(
    () => [
      { id: 'prematch', label: t('betting.prematch') },
      { id: 'live', label: t('betting.live') },
    ],
    [t],
  )

  return (
    <div className="flex h-full min-h-0">
      {/* ── LEFT SIDEBAR: Sports list (desktop) ── */}
      <aside className="hidden lg:block w-[220px] flex-shrink-0 border-r border-surface-700 overflow-y-auto bg-surface-900">
        <div className="p-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
            {t('nav.sports')}
          </h2>
          {sportsLoading ? (
            <SportsSidebarSkeleton />
          ) : (
            <nav className="space-y-0.5">
              {/* All sports */}
              <button
                type="button"
                onClick={() => setSelectedSportId(null)}
                className={clsx(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  selectedSportId === null
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-700/30'
                    : 'text-gray-300 hover:bg-surface-800',
                )}
              >
                <span className="text-base">{'\uD83C\uDFC6'}</span>
                <span className="flex-1 truncate">{t('common.all')}</span>
              </button>

              {sports?.map((sport) => (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSportId(sport.id)}
                  className={clsx(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    selectedSportId === sport.id
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-700/30'
                      : 'text-gray-300 hover:bg-surface-800',
                  )}
                >
                  <span className="text-base">{getSportIcon(sport)}</span>
                  <span className="flex-1 truncate">{sport.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{sport.eventsCount}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile sports chips */}
        <div className="lg:hidden overflow-x-auto border-b border-surface-700 bg-surface-900">
          <div className="flex gap-2 px-4 py-3 min-w-max">
            <button
              type="button"
              onClick={() => setSelectedSportId(null)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedSportId === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-800 text-gray-300 border border-surface-700',
              )}
            >
              <span>{'\uD83C\uDFC6'}</span>
              {t('common.all')}
            </button>
            {!sportsLoading &&
              sports?.map((sport) => (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSportId(sport.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    selectedSportId === sport.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-800 text-gray-300 border border-surface-700',
                  )}
                >
                  <span>{getSportIcon(sport)}</span>
                  {sport.name}
                  <span className="text-xs opacity-60">{sport.eventsCount}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="p-4 lg:p-6 space-y-4">
          {/* Top bar: tabs + search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Tabs
              tabs={modeTabs}
              activeTab={activeTab}
              onTabChange={(id) => setActiveTab(id as 'prematch' | 'live')}
            />
            <div className="w-full sm:w-64 sm:ml-auto">
              <Input
                placeholder={t('betting.searchEvents')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Events list */}
          {eventsLoading ? (
            <EventsSkeleton />
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-gray-400 font-medium">{t('common.noResults')}</p>
            </div>
          ) : useVirtualList ? (
            /* Virtual list for large datasets */
            <VirtualList
              height={800}
              itemCount={virtualItems.length}
              itemSize={140}
              width="100%"
              itemData={{ items: virtualItems }}
            >
              {VirtualRow}
            </VirtualList>
          ) : (
            /* Normal rendering for smaller lists */
            <div className="space-y-6">
              {Object.entries(groupedByLeague).map(([league, leagueEvents]) => (
                <section key={league}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {league}
                    </h3>
                    <div className="flex-1 h-px bg-surface-700" />
                    <span className="text-[11px] text-gray-600">
                      {leagueEvents.length} {t('betting.events')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {leagueEvents.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT: Bet Slip ── */}
      <BetSlip />
    </div>
  )
}
