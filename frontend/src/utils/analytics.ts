type EventName =
  | 'page_view'
  | 'registration'
  | 'login'
  | 'deposit'
  | 'withdrawal'
  | 'bet_placed'
  | 'game_view'
  | 'game_launch'
  | 'event_view'
  | 'bonus_activated'
  | 'payment_error'
  | 'kyc_upload'
  | 'limit_set'

interface AnalyticsEvent {
  name: EventName
  properties?: Record<string, string | number | boolean>
}

class Analytics {
  private enabled: boolean
  private gaId?: string

  constructor() {
    this.enabled = !localStorage.getItem('tracking_disabled')
    this.gaId = import.meta.env.VITE_GA_ID
  }

  track({ name, properties }: AnalyticsEvent) {
    if (!this.enabled) return

    // Google Analytics
    if (this.gaId && typeof window !== 'undefined' && 'gtag' in window) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', name, properties)
    }

    // Console in dev
    if (import.meta.env.DEV) {
      console.log('[Analytics]', name, properties)
    }
  }

  pageView(path: string) {
    this.track({ name: 'page_view', properties: { path } })
  }

  disable() {
    this.enabled = false
    localStorage.setItem('tracking_disabled', 'true')
  }

  enable() {
    this.enabled = true
    localStorage.removeItem('tracking_disabled')
  }
}

export const analytics = new Analytics()
