import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo)
    // TODO: Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-100 mb-2">Что-то пошло не так</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу.
          </p>
          <Button onClick={() => window.location.reload()}>Обновить страницу</Button>
        </div>
      )
    }

    return this.props.children
  }
}
