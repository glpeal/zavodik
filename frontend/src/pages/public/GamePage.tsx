import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Button, Card, Badge, Skeleton, SkeletonCard } from '@/components/ui'
import type { Game } from '@/types'

/* ------------------------------------------------------------------ */
/*  Icons                                                             */
/* ------------------------------------------------------------------ */

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  ) : (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  )
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Volatility visual helper                                          */
/* ------------------------------------------------------------------ */

function VolatilityBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
    low: { variant: 'success', label: 'Low' },
    medium: { variant: 'warning', label: 'Medium' },
    high: { variant: 'danger', label: 'High' },
  }
  const { variant, label } = map[level]
  return <Badge variant={variant}>{label}</Badge>
}

/* ------------------------------------------------------------------ */
/*  Main page component                                               */
/* ------------------------------------------------------------------ */

export default function GamePage() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const startInDemo = searchParams.get('demo') === 'true'
  const [isDemo, setIsDemo] = useState(startInDemo)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  /* ---- game data ---- */
  const {
    data: game,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['game', slug],
    queryFn: () => api.getGameBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })

  /* ---- launch URL ---- */
  const {
    data: launchData,
    isLoading: launchLoading,
  } = useQuery({
    queryKey: ['gameLaunch', game?.id, isDemo],
    queryFn: () => api.launchGame(game!.id, isDemo),
    enabled: !!game?.id,
    staleTime: 10 * 60 * 1000,
  })

  /* ---- similar games ---- */
  const { data: similarGames, isLoading: similarLoading } = useQuery({
    queryKey: ['games', 'similar', game?.provider.slug],
    queryFn: () => api.getGames(`provider=${game!.provider.slug}&pageSize=6`),
    enabled: !!game?.provider.slug,
    staleTime: 5 * 60 * 1000,
  })

  /* ---- favorite toggle ---- */
  const favoriteMutation = useMutation({
    mutationFn: () => api.toggleFavoriteGame(game!.id),
    onSuccess: () => {
      setIsFavorite((prev) => !prev)
      queryClient.invalidateQueries({ queryKey: ['favoriteGames'] })
    },
  })

  /* ---- loading state ---- */
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton height={20} width={120} className="mb-4" />
        <Skeleton height={500} className="w-full rounded-xl mb-6" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton height={80} className="rounded-xl" />
          <Skeleton height={80} className="rounded-xl" />
          <Skeleton height={80} className="rounded-xl" />
        </div>
      </div>
    )
  }

  /* ---- error / not found ---- */
  if (isError || !game) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Card className="inline-block">
          <p className="text-gray-400 mb-4">{t('common.error')}</p>
          <Link to="/casino">
            <Button variant="outline">{t('common.back')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back + title row */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-4 flex items-center gap-3"
      >
        <Link to="/casino">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-100 sm:text-2xl">{game.name}</h1>
      </motion.div>

      {/* Game iframe area */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative mb-6 overflow-hidden rounded-xl border border-surface-700 bg-surface-900 ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-none'
            : 'aspect-video'
        }`}
      >
        {launchLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg className="h-8 w-8 animate-spin text-primary-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-gray-400">{t('common.loading')}</span>
            </div>
          </div>
        ) : launchData?.url ? (
          <iframe
            src={launchData.url}
            title={game.name}
            className="h-full w-full border-0"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <img
              src={game.thumbnail}
              alt={game.name}
              className="max-h-full max-w-full object-contain opacity-30"
            />
          </div>
        )}

        {/* Floating controls */}
        <div className="absolute right-3 top-3 flex gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => setIsFullscreen((v) => !v)}
            className="opacity-70 hover:opacity-100"
            aria-label="Toggle fullscreen"
          >
            <ExpandIcon className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Controls bar: demo/real toggle + favorite */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-surface-900 p-1">
          <button
            onClick={() => setIsDemo(false)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              !isDemo
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t('casino.play')}
          </button>
          {game.hasDemo && (
            <button
              onClick={() => setIsDemo(true)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isDemo
                  ? 'bg-surface-700 text-gray-100'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('casino.demo')}
            </button>
          )}
        </div>

        <Button
          variant={isFavorite ? 'primary' : 'outline'}
          size="sm"
          onClick={() => favoriteMutation.mutate()}
          disabled={favoriteMutation.isPending}
        >
          <HeartIcon filled={isFavorite} className="h-4 w-4" />
          {t('casino.favorite')}
        </Button>

        {isDemo && (
          <Badge variant="info">{t('casino.demo')}</Badge>
        )}
      </div>

      {/* Game info cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 grid gap-4 grid-cols-2 sm:grid-cols-4"
      >
        {/* Provider */}
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t('casino.providers')}</span>
          <span className="text-sm font-medium text-gray-100">{game.provider.name}</span>
        </Card>

        {/* RTP */}
        {game.rtp != null && (
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">{t('casino.rtp')}</span>
            <span className="text-sm font-medium text-gray-100">{game.rtp}%</span>
          </Card>
        )}

        {/* Volatility */}
        {game.volatility && (
          <Card className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">{t('casino.volatility')}</span>
            <VolatilityBadge level={game.volatility} />
          </Card>
        )}

        {/* Categories */}
        <Card className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">{t('common.filter')}</span>
          <div className="flex flex-wrap gap-1">
            {game.categories.map((cat) => (
              <Badge key={cat} variant="default">{cat}</Badge>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Similar games */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-100 sm:text-xl">{t('casino.similar')}</h2>

        {similarLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(similarGames?.data ?? [])
              .filter((g: Game) => g.id !== game.id)
              .slice(0, 6)
              .map((g: Game, i: number) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link to={`/casino/${g.slug}`}>
                    <Card padding={false} hover className="group overflow-hidden">
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={g.thumbnail}
                          alt={g.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <Button size="sm">{t('casino.play')}</Button>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium text-gray-100">{g.name}</p>
                        <p className="truncate text-xs text-gray-400">{g.provider.name}</p>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
