import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Card, Badge, SkeletonTable } from '@/components/ui'
import type { BonusType } from '@/types'

const typeBadge: Record<BonusType, 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'default'> = {
  welcome: 'primary',
  deposit: 'success',
  freespins: 'info',
  cashback: 'warning',
  freebet: 'primary',
  promo: 'default',
}

export function BonusesAdminPage() {
  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['admin-bonuses'],
    queryFn: () => api.getBonuses(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Управление бонусами</h2>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Название</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Вейджер</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Истекает</th>
                </tr>
              </thead>
              <tbody>
                {bonuses?.map((bonus) => (
                  <tr key={bonus.id} className="border-b border-surface-700/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-gray-200">{bonus.name}</td>
                    <td className="px-4 py-3"><Badge variant={typeBadge[bonus.type]}>{bonus.type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-gray-100">{bonus.amount} {bonus.currency}</td>
                    <td className="px-4 py-3 text-gray-400">x{bonus.wagerRequirement}</td>
                    <td className="px-4 py-3"><Badge variant={bonus.status === 'active' ? 'success' : 'default'}>{bonus.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(bonus.expiresAt).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
