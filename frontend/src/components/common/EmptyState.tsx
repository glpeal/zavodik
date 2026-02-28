import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-4xl mb-4 text-gray-600">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && (
        <Button className="mt-4" size="sm" onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}
