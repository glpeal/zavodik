import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import api from '@/services/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const mockRevenueData = [
  { date: 'Пн', revenue: 45000, users: 120 },
  { date: 'Вт', revenue: 52000, users: 145 },
  { date: 'Ср', revenue: 48000, users: 130 },
  { date: 'Чт', revenue: 61000, users: 165 },
  { date: 'Пт', revenue: 75000, users: 210 },
  { date: 'Сб', revenue: 92000, users: 280 },
  { date: 'Вс', revenue: 87000, users: 260 },
]

export function AdminDashboardPage() {
  const { t } = useTranslation()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.adminGetStats(),
  })

  const statCards = [
    { label: 'Пользователи', value: stats?.totalUsers ?? 0, sub: `+${stats?.newUsersToday ?? 0} сегодня`, color: 'text-primary-400' },
    { label: 'Активные', value: stats?.activeUsers ?? 0, sub: 'Онлайн сейчас', color: 'text-success-500' },
    { label: 'Депозиты', value: `${((stats?.totalDeposits ?? 0) / 1000).toFixed(0)}K`, sub: 'За всё время', color: 'text-accent-400' },
    { label: 'Выводы', value: `${((stats?.totalWithdrawals ?? 0) / 1000).toFixed(0)}K`, sub: 'За всё время', color: 'text-warning-500' },
    { label: 'Ставки', value: stats?.totalBets ?? 0, sub: 'Всего', color: 'text-primary-300' },
    { label: 'Доход', value: `${((stats?.revenue ?? 0) / 1000).toFixed(0)}K`, sub: 'GGR', color: 'text-success-500' },
    { label: 'KYC ожидает', value: stats?.pendingKyc ?? 0, sub: 'Проверок', color: 'text-warning-500' },
    { label: 'Вывод ожидает', value: stats?.pendingWithdrawals ?? 0, sub: 'Заявок', color: 'text-danger-500' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={100} />)}
        </div>
        <Skeleton height={300} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">{t('admin.dashboard')}</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Доход за неделю</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={mockRevenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Новые пользователи</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mockRevenueData}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="users" fill="#d946ef" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
