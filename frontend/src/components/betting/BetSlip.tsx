import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import { Button, Input, Tabs, Badge } from '@/components/ui'
import { useBetSlipStore } from '@/stores/betSlipStore'
import type { BetType } from '@/types'

const MIN_STAKE = 1
const MAX_STAKE = 100000

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Single bet-slip selection row ──────────────────────────────────
interface SelectionRowProps {
  item: ReturnType<typeof useBetSlipStore.getState>['items'][number]
  betType: BetType
  currencySymbol: string
  onRemove: (id: string) => void
  onStakeChange: (id: string, stake: number) => void
}

function SelectionRow({ item, betType, currencySymbol, onRemove, onStakeChange }: SelectionRowProps) {
  const { t } = useTranslation()

  return (
    <div className="group rounded-lg border border-surface-700 bg-surface-900 p-3 transition-colors hover:border-surface-200/20">
      {/* Header row – event + remove */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">
            {item.event.homeTeam} &mdash; {item.event.awayTeam}
          </p>
          <p className="text-sm text-gray-200 truncate">{item.market.name}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.outcomeId)}
          className="flex-shrink-0 rounded p-1 text-gray-500 hover:bg-surface-800 hover:text-gray-300 transition-colors"
          aria-label={t('betting.removeSelection')}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Outcome + Odds */}
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-100">{item.outcome.name}</span>
        <div className="flex items-center gap-1">
          {/* Odds change indicator */}
          {item.outcome.oddsChange === 'up' && (
            <svg className="h-3 w-3 text-odds-up" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 2l4 5H2z" />
            </svg>
          )}
          {item.outcome.oddsChange === 'down' && (
            <svg className="h-3 w-3 text-odds-down" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 10L2 5h8z" />
            </svg>
          )}
          <span
            className={clsx(
              'font-mono tabular-nums text-sm font-semibold',
              item.outcome.oddsChange === 'up' && 'text-odds-up',
              item.outcome.oddsChange === 'down' && 'text-odds-down',
              item.outcome.oddsChange === 'none' && 'text-primary-400',
            )}
          >
            {item.outcome.odds.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Previous odds if changed */}
      {item.outcome.previousOdds !== undefined && item.outcome.oddsChange !== 'none' && (
        <p className="mt-0.5 text-[11px] text-gray-500 line-through">
          {item.outcome.previousOdds.toFixed(2)}
        </p>
      )}

      {/* Stake input for single mode */}
      {betType === 'single' && (
        <div className="mt-2">
          <Input
            type="number"
            placeholder={t('betting.stake')}
            value={item.stake || ''}
            min={MIN_STAKE}
            max={MAX_STAKE}
            step={1}
            onChange={(e) => onStakeChange(item.outcomeId, Number(e.target.value))}
            className="!py-1.5 text-sm"
          />
          {item.stake !== undefined && item.stake > 0 && (
            <p className="mt-1 text-[11px] text-gray-500">
              {t('betting.potentialWin')}: {formatCurrency(item.stake * item.outcome.odds, currencySymbol)}
            </p>
          )}
          {item.stake !== undefined && item.stake > 0 && item.stake < MIN_STAKE && (
            <p className="mt-0.5 text-[11px] text-danger-500">
              {t('betting.minStake')}: {formatCurrency(MIN_STAKE, currencySymbol)}
            </p>
          )}
          {item.stake !== undefined && item.stake > MAX_STAKE && (
            <p className="mt-0.5 text-[11px] text-danger-500">
              {t('betting.maxStake')}: {formatCurrency(MAX_STAKE, currencySymbol)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main BetSlip component ─────────────────────────────────────────
export function BetSlip() {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = useBetSlipStore((s) => s.items)
  const betType = useBetSlipStore((s) => s.betType)
  const totalStake = useBetSlipStore((s) => s.totalStake)
  const acceptOddsChanges = useBetSlipStore((s) => s.acceptOddsChanges)
  const isSubmitting = useBetSlipStore((s) => s.isSubmitting)
  const error = useBetSlipStore((s) => s.error)

  const removeSelection = useBetSlipStore((s) => s.removeSelection)
  const clearSlip = useBetSlipStore((s) => s.clearSlip)
  const setStake = useBetSlipStore((s) => s.setStake)
  const setTotalStake = useBetSlipStore((s) => s.setTotalStake)
  const setBetType = useBetSlipStore((s) => s.setBetType)
  const setAcceptOddsChanges = useBetSlipStore((s) => s.setAcceptOddsChanges)
  const placeBet = useBetSlipStore((s) => s.placeBet)
  const computedTotalOdds = useBetSlipStore((s) => s.totalOdds)
  const computedPotentialWin = useBetSlipStore((s) => s.potentialWin)

  const totalOdds = computedTotalOdds()
  const potentialWin = computedPotentialWin()

  const currencySymbol = t('common.currency')

  const hasOddsChanges = useMemo(
    () => items.some((i) => i.outcome.oddsChange !== 'none'),
    [items],
  )

  const isStakeValid = useMemo(() => {
    if (betType === 'single') {
      return items.every((i) => (i.stake || 0) >= MIN_STAKE && (i.stake || 0) <= MAX_STAKE)
    }
    return totalStake >= MIN_STAKE && totalStake <= MAX_STAKE
  }, [betType, items, totalStake])

  const canPlaceBet = items.length > 0 && isStakeValid && (!hasOddsChanges || acceptOddsChanges)

  const handlePlaceBet = useCallback(async () => {
    await placeBet()
  }, [placeBet])

  const handleRemove = useCallback(
    (outcomeId: string) => removeSelection(outcomeId),
    [removeSelection],
  )

  const handleStakeChange = useCallback(
    (outcomeId: string, stake: number) => setStake(outcomeId, stake),
    [setStake],
  )

  const betTypeTabs = useMemo(
    () => [
      { id: 'single' as const, label: t('betting.single') },
      { id: 'express' as const, label: t('betting.express') },
      { id: 'system' as const, label: t('betting.system') },
    ],
    [t],
  )

  // ── Empty state ──
  const emptyContent = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <svg className="h-12 w-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
      <p className="text-sm font-medium text-gray-400">{t('betting.noSelections')}</p>
      <p className="mt-1 text-xs text-gray-500">{t('betting.noSelectionsDesc')}</p>
    </div>
  )

  // ── Slip content (shared between desktop & mobile) ──
  const slipContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-100">{t('betting.betSlip')}</h3>
          {items.length > 0 && (
            <Badge variant="primary" className="text-[10px]">
              {items.length}
            </Badge>
          )}
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearSlip}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {t('betting.clearAll')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        emptyContent
      ) : (
        <>
          {/* Bet type tabs */}
          <div className="px-4 pt-3">
            <Tabs
              tabs={betTypeTabs}
              activeTab={betType}
              onTabChange={(id) => setBetType(id as BetType)}
            />
          </div>

          {/* Selections list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {items.map((item) => (
              <SelectionRow
                key={item.outcomeId}
                item={item}
                betType={betType}
                currencySymbol={currencySymbol}
                onRemove={handleRemove}
                onStakeChange={handleStakeChange}
              />
            ))}
          </div>

          {/* Footer: totals & submit */}
          <div className="border-t border-surface-700 p-4 space-y-3">
            {/* Express / System totals */}
            {betType !== 'single' && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('betting.totalOdds')}</span>
                  <span className="font-mono font-semibold text-primary-400">
                    {totalOdds.toFixed(2)}
                  </span>
                </div>
                <Input
                  type="number"
                  placeholder={t('betting.stake')}
                  value={totalStake || ''}
                  min={MIN_STAKE}
                  max={MAX_STAKE}
                  step={1}
                  onChange={(e) => setTotalStake(Number(e.target.value))}
                  className="!py-1.5 text-sm"
                />
                {totalStake > 0 && totalStake < MIN_STAKE && (
                  <p className="text-[11px] text-danger-500">
                    {t('betting.minStake')}: {formatCurrency(MIN_STAKE, currencySymbol)}
                  </p>
                )}
                {totalStake > MAX_STAKE && (
                  <p className="text-[11px] text-danger-500">
                    {t('betting.maxStake')}: {formatCurrency(MAX_STAKE, currencySymbol)}
                  </p>
                )}
              </>
            )}

            {/* Potential win */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{t('betting.potentialWin')}</span>
              <span className="font-mono font-bold text-success-500">
                {formatCurrency(potentialWin, currencySymbol)}
              </span>
            </div>

            {/* Accept odds changes */}
            {hasOddsChanges && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptOddsChanges}
                  onChange={(e) => setAcceptOddsChanges(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-warning-500">{t('betting.acceptChanges')}</span>
              </label>
            )}

            {/* Auto accept toggle (always visible) */}
            {!hasOddsChanges && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptOddsChanges}
                  onChange={(e) => setAcceptOddsChanges(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-400">{t('betting.autoAccept')}</span>
              </label>
            )}

            {/* Error */}
            {error && (
              <p className="text-xs text-danger-500 text-center">{error}</p>
            )}

            {/* Place bet button */}
            <Button
              variant="success"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              disabled={!canPlaceBet}
              onClick={handlePlaceBet}
            >
              {t('betting.placeBet')}
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* ── Desktop: fixed right panel ── */}
      <aside className="hidden lg:flex flex-col w-[320px] flex-shrink-0 bg-surface-850 border-l border-surface-700 h-full overflow-hidden">
        {slipContent}
      </aside>

      {/* ── Mobile: bottom bar trigger + sheet ── */}
      <div className="lg:hidden">
        {/* Floating trigger */}
        {items.length > 0 && !mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between rounded-xl bg-primary-600 px-4 py-3 text-white shadow-elevated"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <span className="font-semibold">{t('betting.betSlip')}</span>
              <Badge variant="default" className="bg-white/20 text-white">{items.length}</Badge>
            </div>
            <span className="font-mono font-semibold text-sm">
              {formatCurrency(potentialWin, currencySymbol)}
            </span>
          </button>
        )}

        {/* Bottom sheet overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex flex-col">
            {/* Backdrop */}
            <div
              className="flex-1 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            {/* Sheet */}
            <div className="bg-surface-850 border-t border-surface-700 rounded-t-2xl max-h-[85vh] flex flex-col animate-[slide-up_0.2s_ease-out]">
              {/* Drag handle */}
              <div className="flex justify-center py-2">
                <div className="h-1 w-10 rounded-full bg-surface-700" />
              </div>
              {slipContent}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
