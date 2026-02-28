import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/services/api'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  SkeletonCard,
  Tabs,
  Pagination,
} from '@/components/ui'
import type { Game, GameProvider } from '@/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CATEGORY_TABS: { id: string; labelKey: string }[] = [
  { id: 'all', labelKey: 'casino.allGames' },
  { id: 'slots', labelKey: 'casino.slots' },
  { id: 'live', labelKey: 'casino.live' },
  { id: 'table', labelKey: 'casino.table' },
  { id: 'jackpot', labelKey: 'casino.jackpot' },
  { id: 'new', labelKey: 'casino.new' },
  { id: 'popular', labelKey: 'casino.popular' },
  { id: 'freespins', labelKey: 'casino.freespins' },
]

const PAGE_SIZE = 24

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                 */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.03, duration: 0.3, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

/* ------------------------------------------------------------------ */
/*  Search icon                                                       */
/* ------------------------------------------------------------------ */

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Game card                                                         */
/* ------------------------------------------------------------------ */

function GameCard({ game, index }: { game: Game; index: number }) {
  const { t } = useTranslation()

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      layout
    >
      <Card padding={false} hover className="group overflow-hidden h-full flex flex-col">
        {/* Thumbnail */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={game.thumbnail}
            alt={game.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {game.isNew && <Badge variant="success">NEW</Badge>}
            {game.isPopular && <Badge variant="primary">HOT</Badge>}
          </div>
          {game.jackpotAmount != null && (
            <Badge variant="warning" className="absolute right-2 top-2">
              ${game.jackpotAmount.toLocaleString()}
            </Badge>
          )}

          {/* Hover overlay with action buttons */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Link to={`/casino/${game.slug}`}>
              <Button size="sm">{t('casino.play')}</Button>
            </Link>
            {game.hasDemo && (
              <Link to={`/casino/${game.slug}?demo=true`}>
                <Button variant="outline" size="xs">{t('casino.demo')}</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between p-3">
          <p className="truncate text-sm font-medium text-gray-100">{game.name}</p>
          <div className="mt-1 flex items-center justify-between">
            <Badge variant="default" className="truncate max-w-[80%]">{game.provider.name}</Badge>
            {game.rtp != null && (
              <span className="text-[11px] text-gray-500">{game.rtp}%</span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                               */
/* ------------------------------------------------------------------ */

export default function CasinoPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  // State from URL params for shareability
  const activeCategory = searchParams.get('category') || 'all'
  const currentPage = Number(searchParams.get('page')) || 1
  const selectedProvider = searchParams.get('provider') || ''
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const debouncedSearch = useDebounce(searchTerm, 350)

  /* ---- build query params string ---- */
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(currentPage))
    params.set('pageSize', String(PAGE_SIZE))
    if (activeCategory !== 'all') params.set('category', activeCategory)
    if (selectedProvider) params.set('provider', selectedProvider)
    if (debouncedSearch) params.set('search', debouncedSearch)
    return params.toString()
  }, [currentPage, activeCategory, selectedProvider, debouncedSearch])

  /* ---- queries ---- */
  const {
    data: gamesData,
    isLoading: gamesLoading,
    isFetching: gamesFetching,
  } = useQuery({
    queryKey: ['games', queryParams],
    queryFn: () => api.getGames(queryParams),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: providers } = useQuery({
    queryKey: ['gameProviders'],
    queryFn: () => api.getGameProviders(),
    staleTime: 10 * 60 * 1000,
  })

  /* ---- handlers ---- */
  function updateParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === '') next.delete(key)
      else next.set(key, val)
    })
    // Reset to page 1 when filters change
    if (!('page' in updates)) next.set('page', '1')
    setSearchParams(next, { replace: true })
  }

  function handleCategoryChange(id: string) {
    updateParams({ category: id === 'all' ? null : id, page: '1' })
  }

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateParams({ provider: e.target.value || null, page: '1' })
  }

  function handlePageChange(page: number) {
    updateParams({ page: String(page) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ---- translated tabs ---- */
  const tabs = CATEGORY_TABS.map((tab) => ({
    id: tab.id,
    label: t(tab.labelKey),
  }))

  /* ---- provider options ---- */
  const providerOptions = (providers ?? []).map((p: GameProvider) => ({
    value: p.slug,
    label: `${p.name} (${p.gamesCount})`,
  }))

  const games = gamesData?.data ?? []
  const totalPages = gamesData?.totalPages ?? 1

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-2xl font-bold text-gray-100 sm:text-3xl"
      >
        {t('casino.title')}
      </motion.h1>

      {/* Category tabs (horizontally scrollable on mobile) */}
      <div className="mb-6 overflow-x-auto scrollbar-none">
        <Tabs
          tabs={tabs}
          activeTab={activeCategory}
          onTabChange={handleCategoryChange}
          className="min-w-max"
        />
      </div>

      {/* Search + provider filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            placeholder={t('casino.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              updateParams({ q: e.target.value || null, page: '1' })
            }}
            leftIcon={<SearchIcon />}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={providerOptions}
            placeholder={t('casino.providers')}
            value={selectedProvider}
            onChange={handleProviderChange}
          />
        </div>
      </div>

      {/* Games grid */}
      <div className="relative">
        {/* subtle fetching overlay */}
        {gamesFetching && !gamesLoading && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-surface-900/30 rounded-xl" />
        )}

        {gamesLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <svg className="mb-4 h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-400">{t('common.noResults')}</p>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={queryParams}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {games.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}
