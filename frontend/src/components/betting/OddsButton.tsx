import { useEffect, useRef, useState, memo } from 'react'
import { clsx } from 'clsx'
import type { Outcome } from '@/types'
import { useBetSlipStore } from '@/stores/betSlipStore'

interface OddsButtonProps {
  outcome: Outcome
  isSelected?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export const OddsButton = memo(function OddsButton({
  outcome,
  isSelected = false,
  disabled = false,
  className,
  onClick,
}: OddsButtonProps) {
  const [flashDirection, setFlashDirection] = useState<'up' | 'down' | null>(null)
  const prevOddsRef = useRef(outcome.odds)

  useEffect(() => {
    if (prevOddsRef.current !== outcome.odds) {
      const direction = outcome.odds > prevOddsRef.current ? 'up' : 'down'
      setFlashDirection(direction)
      prevOddsRef.current = outcome.odds

      const timer = setTimeout(() => setFlashDirection(null), 1500)
      return () => clearTimeout(timer)
    }
  }, [outcome.odds])

  const isSuspended = disabled || !outcome.isActive

  return (
    <button
      type="button"
      disabled={isSuspended}
      onClick={onClick}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none',
        'min-w-[64px] select-none',
        isSuspended && 'opacity-40 cursor-not-allowed bg-surface-900 border-surface-700 text-gray-600',
        !isSuspended && !isSelected && [
          'bg-surface-800 border-surface-700 text-gray-100 cursor-pointer',
          'hover:bg-primary-700 hover:border-primary-600',
        ],
        !isSuspended && isSelected && [
          'bg-primary-600 border-primary-500 text-white cursor-pointer shadow-glow-primary',
        ],
        flashDirection === 'up' && 'animate-[odds-flash-green_1.5s_ease-out]',
        flashDirection === 'down' && 'animate-[odds-flash-red_1.5s_ease-out]',
        className,
      )}
    >
      {/* Outcome name */}
      <span className={clsx(
        'text-[11px] leading-tight truncate max-w-full',
        isSelected ? 'text-primary-100' : 'text-gray-400',
        isSuspended && 'text-gray-600',
      )}>
        {outcome.name}
      </span>

      {/* Odds value + change indicator */}
      <span className="flex items-center gap-1 font-mono tabular-nums">
        {isSuspended ? (
          <svg className="h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ) : (
          <>
            {/* Change direction arrow */}
            {outcome.oddsChange === 'up' && (
              <svg className="h-3 w-3 text-odds-up flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 2l4 5H2z" />
              </svg>
            )}
            {outcome.oddsChange === 'down' && (
              <svg className="h-3 w-3 text-odds-down flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 10L2 5h8z" />
              </svg>
            )}
            <span className={clsx(
              'text-sm font-semibold',
              outcome.oddsChange === 'up' && 'text-odds-up',
              outcome.oddsChange === 'down' && 'text-odds-down',
            )}>
              {outcome.odds.toFixed(2)}
            </span>
          </>
        )}
      </span>
    </button>
  )
})

/**
 * Hook to check if an outcome is currently selected in the bet slip.
 */
export function useIsOutcomeSelected(outcomeId: string): boolean {
  return useBetSlipStore((state) => state.items.some((item) => item.outcomeId === outcomeId))
}
