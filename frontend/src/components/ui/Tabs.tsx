import { clsx } from 'clsx'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={clsx('flex gap-1 rounded-lg bg-surface-900 p-1', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTab}
          onClick={() => onTabChange(tab.id)}
          className={clsx(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            tab.id === activeTab
              ? 'bg-surface-700 text-gray-100'
              : 'text-gray-400 hover:text-gray-200',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx(
              'rounded-full px-1.5 py-0.5 text-xs',
              tab.id === activeTab ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
