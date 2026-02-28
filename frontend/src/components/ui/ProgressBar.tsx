import { clsx } from 'clsx'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercent?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const sizeMap = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
const colorMap = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
}

export function ProgressBar({ value, max = 100, label, showPercent, size = 'md', color = 'primary', className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="flex justify-between mb-1 text-xs text-gray-400">
          {label && <span>{label}</span>}
          {showPercent && <span>{Math.round(percent)}%</span>}
        </div>
      )}
      <div className={clsx('w-full rounded-full bg-surface-700 overflow-hidden', sizeMap[size])} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', colorMap[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
