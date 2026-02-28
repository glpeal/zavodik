import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
  dot?: boolean
  pulse?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-surface-700 text-gray-300',
  primary: 'bg-primary-900/50 text-primary-300 border border-primary-700/50',
  success: 'bg-green-900/50 text-green-300 border border-green-700/50',
  warning: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  danger: 'bg-red-900/50 text-red-300 border border-red-700/50',
  info: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
}

export function Badge({ variant = 'default', children, className, dot, pulse }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
