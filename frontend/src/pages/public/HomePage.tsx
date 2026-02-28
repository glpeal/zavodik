import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '@/services/api'
import { Button, Card, Badge, Skeleton, SkeletonCard } from '@/components/ui'
import type { Banner, Game, SportEvent } from '@/types'

/* ------------------------------------------------------------------ */
/*  Mock data (used as fallback / placeholders alongside API queries)  */
/* ------------------------------------------------------------------ */

const ADVANTAGES = [
  { key: 'fastPayouts', icon: FastPayoutIcon },
  { key: 'liveSupport', icon: SupportIcon },
  { key: 'bestOdds', icon: OddsIcon },
  { key: 'secure', icon: SecurityIcon },
] as const

const PARTNER_LOGOS = [
  { name: 'Visa', src: '/partners/visa.svg' },
  { name: 'Mastercard', src: '/partners/mastercard.svg' },
  { name: 'Bitcoin', src: '/partners/bitcoin.svg' },
  { name: 'Tether', src: '/partners/tether.svg' },
  { name: 'Curacao', src: '/partners/curacao.svg' },
  { name: '18+', src: '/partners/18plus.svg' },
]

/* ------------------------------------------------------------------ */
/*  Inline SVG icons for advantages                                   */
/* ------------------------------------------------------------------ */

function FastPayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  )
}

function SupportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  )
}

function OddsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
}

function SecurityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function HeroSection() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900 via-primary-800 to-accent-900">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center sm:py-24 lg:py-32">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          {t('home.heroTitle')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-xl text-base text-gray-300 sm:text-lg"
        >
          {t('home.heroSubtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/casino">
            <Button size="lg" className="shadow-glow-primary text-base">
              {t('home.heroCta')}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

function PopularGamesSection({ games, isLoading }: { games: Game[] | undefined; isLoading: boolean }) {
  const { t } = useTranslation()

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">{t('home.popularGames')}</h2>
        <Link to="/casino?category=popular">
          <Button variant="ghost" size="sm">{t('common.more')}</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          {(games ?? []).slice(0, 6).map((game, i) => (
            <motion.div key={game.id} variants={fadeUp} custom={i}>
              <Link to={`/casino/${game.slug}`}>
                <Card padding={false} hover className="group overflow-hidden">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {game.isNew && (
                      <Badge variant="success" className="absolute left-2 top-2">
                        NEW
                      </Badge>
                    )}
                    {game.jackpotAmount && (
                      <Badge variant="warning" className="absolute right-2 top-2">
                        {t('home.jackpot')}
                      </Badge>
                    )}
                    {/* play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <Button size="sm">{t('casino.play')}</Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-gray-100">{game.name}</p>
                    <p className="truncate text-xs text-gray-400">{game.provider.name}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}

function TopEventsSection({ events, isLoading }: { events: SportEvent[] | undefined; isLoading: boolean }) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-6 text-xl font-bold text-gray-100 sm:text-2xl">{t('home.topEvents')}</h2>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-surface-850 border border-surface-700 p-4">
              <Skeleton height={18} width="60%" className="mb-2" />
              <Skeleton height={14} width="40%" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">{t('home.topEvents')}</h2>
        <Link to="/sports">
          <Button variant="ghost" size="sm">{t('common.more')}</Button>
        </Link>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="space-y-3"
      >
        {(events ?? []).slice(0, 5).map((event, i) => (
          <motion.div key={event.id} variants={fadeUp} custom={i}>
            <Link to={`/sports/event/${event.id}`}>
              <Card hover className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">{event.leagueName}</span>
                  <span className="text-sm font-medium text-gray-100">
                    {event.homeTeam} &mdash; {event.awayTeam}
                  </span>
                  <div className="flex items-center gap-2">
                    {event.isLive ? (
                      <Badge variant="danger" dot pulse>LIVE</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {new Date(event.startTime).toLocaleString()}
                      </span>
                    )}
                    {event.score && (
                      <span className="font-mono text-sm font-bold text-primary-400">
                        {event.score.home} : {event.score.away}
                      </span>
                    )}
                  </div>
                </div>

                {event.topMarkets[0] && (
                  <div className="flex gap-2">
                    {event.topMarkets[0].outcomes.slice(0, 3).map((outcome) => (
                      <Button key={outcome.id} variant="odds" size="sm" className="min-w-[56px] flex-col py-2">
                        <span className="text-[10px] text-gray-400">{outcome.name}</span>
                        <span className="text-sm">{outcome.odds.toFixed(2)}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function PromotionsBannerSection({ banners, isLoading }: { banners: Banner[] | undefined; isLoading: boolean }) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <section>
        <h2 className="mb-6 text-xl font-bold text-gray-100 sm:text-2xl">{t('home.promotions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={180} className="w-full rounded-xl" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">{t('home.promotions')}</h2>
        <Link to="/promotions">
          <Button variant="ghost" size="sm">{t('common.more')}</Button>
        </Link>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {(banners ?? []).filter((b) => b.isActive).slice(0, 3).map((banner, i) => (
          <motion.div key={banner.id} variants={fadeUp} custom={i}>
            <Link to={banner.link}>
              <Card padding={false} hover className="group overflow-hidden">
                <div className="relative aspect-[16/7] overflow-hidden">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-base font-bold text-white">{banner.title}</h3>
                    {banner.subtitle && (
                      <p className="mt-1 text-sm text-gray-300">{banner.subtitle}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function AdvantagesSection() {
  const { t } = useTranslation()

  return (
    <section>
      <h2 className="mb-6 text-center text-xl font-bold text-gray-100 sm:text-2xl">
        {t('home.advantages')}
      </h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        {ADVANTAGES.map((adv, i) => (
          <motion.div key={adv.key} variants={fadeUp} custom={i}>
            <Card className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-900/50 text-primary-400">
                <adv.icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-100 sm:text-base">
                {t(`home.${adv.key}`)}
              </h3>
              <p className="text-xs text-gray-400 sm:text-sm">
                {t(`home.${adv.key}Desc`)}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

function FooterPartnersSection() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-surface-700 pt-8">
      {/* Partner logos */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-6 opacity-50 grayscale">
        {PARTNER_LOGOS.map((p) => (
          <img
            key={p.name}
            src={p.src}
            alt={p.name}
            className="h-8 w-auto object-contain"
            loading="lazy"
          />
        ))}
      </div>

      {/* Links */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400">
        <Link to="/page/terms" className="hover:text-gray-200 transition-colors">{t('footer.terms')}</Link>
        <Link to="/page/privacy" className="hover:text-gray-200 transition-colors">{t('footer.privacy')}</Link>
        <Link to="/page/aml" className="hover:text-gray-200 transition-colors">{t('footer.aml')}</Link>
        <Link to="/page/responsible-gaming" className="hover:text-gray-200 transition-colors">{t('footer.responsibleGaming')}</Link>
        <Link to="/page/bonus-terms" className="hover:text-gray-200 transition-colors">{t('footer.bonusTerms')}</Link>
        <Link to="/page/faq" className="hover:text-gray-200 transition-colors">{t('footer.faq')}</Link>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        {t('footer.copyright', { year })}
      </p>

      <p className="mt-2 text-center text-[11px] text-gray-500 max-w-2xl mx-auto">
        {t('responsible.ageWarning')} | {t('responsible.riskWarning')}
      </p>
    </footer>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: () => api.getBanners(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: popularGames, isLoading: gamesLoading } = useQuery({
    queryKey: ['games', 'popular'],
    queryFn: () => api.getGames('category=popular&pageSize=6'),
    staleTime: 2 * 60 * 1000,
  })

  const { data: topEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'top'],
    queryFn: () => api.getEvents('top=true&pageSize=5'),
    staleTime: 30 * 1000,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6 sm:px-6 lg:px-8">
      <HeroSection />
      <PopularGamesSection games={popularGames?.data} isLoading={gamesLoading} />
      <TopEventsSection events={topEvents?.data} isLoading={eventsLoading} />
      <PromotionsBannerSection banners={banners} isLoading={bannersLoading} />
      <AdvantagesSection />
      <FooterPartnersSection />
    </div>
  )
}
