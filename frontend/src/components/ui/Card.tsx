import { clsx } from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: boolean
  hover?: boolean
  glow?: boolean
}

export function Card({ children, padding = true, hover, glow, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-surface-850 border border-surface-700',
        padding && 'p-4 sm:p-6',
        hover && 'transition-all duration-200 hover:border-surface-200/20 hover:shadow-card cursor-pointer',
        glow && 'shadow-glow-primary',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
