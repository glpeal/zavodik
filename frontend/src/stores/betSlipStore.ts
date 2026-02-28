import { create } from 'zustand'
import type { BetSlipItem, BetType, Outcome, Market, SportEvent } from '@/types'
import api from '@/services/api'

interface BetSlipState {
  items: BetSlipItem[]
  betType: BetType
  totalStake: number
  acceptOddsChanges: boolean
  isSubmitting: boolean
  error: string | null

  addSelection: (outcome: Outcome, market: Market, event: SportEvent) => void
  removeSelection: (outcomeId: string) => void
  clearSlip: () => void
  setStake: (outcomeId: string, stake: number) => void
  setTotalStake: (stake: number) => void
  setBetType: (type: BetType) => void
  setAcceptOddsChanges: (accept: boolean) => void
  updateOdds: (outcomeId: string, newOdds: number) => void
  placeBet: () => Promise<boolean>

  // Computed
  totalOdds: () => number
  potentialWin: () => number
  hasConflicts: () => boolean
}

const generateTransactionId = () =>
  `bet_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

export const useBetSlipStore = create<BetSlipState>((set, get) => ({
  items: [],
  betType: 'single',
  totalStake: 0,
  acceptOddsChanges: false,
  isSubmitting: false,
  error: null,

  addSelection: (outcome, market, event) => {
    const state = get()
    // Don't add if already exists
    if (state.items.some(i => i.outcomeId === outcome.id)) return
    // Don't add if same event + same market type
    if (state.items.some(i => i.event.id === event.id && i.market.id === market.id)) return

    set({
      items: [...state.items, { outcomeId: outcome.id, outcome, market, event }],
      error: null,
    })
  },

  removeSelection: (outcomeId) => {
    set((state) => ({
      items: state.items.filter(i => i.outcomeId !== outcomeId),
      error: null,
    }))
  },

  clearSlip: () => {
    set({ items: [], totalStake: 0, error: null, betType: 'single' })
  },

  setStake: (outcomeId, stake) => {
    set((state) => ({
      items: state.items.map(i =>
        i.outcomeId === outcomeId ? { ...i, stake } : i
      ),
    }))
  },

  setTotalStake: (stake) => set({ totalStake: stake }),
  setBetType: (type) => set({ betType: type }),
  setAcceptOddsChanges: (accept) => set({ acceptOddsChanges: accept }),

  updateOdds: (outcomeId, newOdds) => {
    set((state) => ({
      items: state.items.map(i =>
        i.outcomeId === outcomeId
          ? {
              ...i,
              outcome: {
                ...i.outcome,
                previousOdds: i.outcome.odds,
                odds: newOdds,
                oddsChange: newOdds > i.outcome.odds ? 'up' : newOdds < i.outcome.odds ? 'down' : 'none',
              },
            }
          : i
      ),
    }))
  },

  placeBet: async () => {
    const state = get()
    if (state.items.length === 0) return false

    set({ isSubmitting: true, error: null })
    try {
      const stakes = state.items.map(i => ({
        outcomeId: i.outcomeId,
        stake: state.betType === 'single' ? (i.stake || 0) : state.totalStake,
      }))

      await api.placeBet({
        type: state.betType,
        stakes,
        totalStake: state.betType === 'single'
          ? stakes.reduce((s, i) => s + i.stake, 0)
          : state.totalStake,
        acceptOddsChanges: state.acceptOddsChanges,
        transactionId: generateTransactionId(),
      })

      set({ items: [], totalStake: 0, isSubmitting: false })
      return true
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Ошибка при размещении ставки'
      set({ error: message, isSubmitting: false })
      return false
    }
  },

  totalOdds: () => {
    const state = get()
    if (state.betType === 'single') return 0
    return state.items.reduce((acc, i) => acc * i.outcome.odds, 1)
  },

  potentialWin: () => {
    const state = get()
    if (state.betType === 'single') {
      return state.items.reduce((acc, i) => acc + (i.stake || 0) * i.outcome.odds, 0)
    }
    return state.totalStake * get().totalOdds()
  },

  hasConflicts: () => {
    const state = get()
    const eventIds = state.items.map(i => i.event.id)
    return new Set(eventIds).size !== eventIds.length
  },
}))
