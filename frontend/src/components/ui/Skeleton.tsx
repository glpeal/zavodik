import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
}

export function Skeleton({ className, width, height, rounded }: SkeletonProps) {
  return (
    <div
      className={clsx('animate-pulse bg-surface-700 rounded-lg', rounded && 'rounded-full', className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl bg-surface-850 border border-surface-700 p-4 space-y-3">
      <Skeleton height={160} className="w-full rounded-lg" />
      <Skeleton height={16} width="60%" />
      <Skeleton height={12} width="40%" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 px-4 rounded-lg bg-surface-850">
          <Skeleton height={16} width="20%" />
          <Skeleton height={16} width="30%" />
          <Skeleton height={16} width="25%" />
          <Skeleton height={16} width="15%" />
        </div>
      ))}
    </div>
  )
}
