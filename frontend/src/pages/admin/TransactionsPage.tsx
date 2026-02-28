import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Button, Card, Badge, Pagination, Select, Input, Modal } from '@/components/ui'
import { SkeletonTable } from '@/components/ui'
import { useUIStore } from '@/stores/uiStore'
import type { TransactionStatus, TransactionType } from '@/types'

const statusBadge: Record<TransactionStatus, 'default' | 'warning' | 'success' | 'danger' | 'primary'> = {
  pending: 'warning',
  processing: 'primary',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
}

const typeLabels: Record<TransactionType, string> = {
  deposit: 'Депозит',
  withdrawal: 'Вывод',
  bonus: 'Бонус',
  bet: 'Ставка',
  win: 'Выигрыш',
  refund: 'Возврат',
  commission: 'Комиссия',
}

export function AdminTransactionsPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionModal, setActionModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', '20')
  if (typeFilter) params.set('type', typeFilter)
  if (statusFilter) params.set('status', statusFilter)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', typeFilter, statusFilter, page],
    queryFn: () => api.adminGetTransactions(params.toString()),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.adminApproveWithdrawal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      addToast({ type: 'success', title: 'Транзакция одобрена' })
      setActionModal(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.adminRejectWithdrawal(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      addToast({ type: 'success', title: 'Транзакция отклонена' })
      setActionModal(null)
      setRejectReason('')
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Транзакции</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          options={[
            { value: '', label: 'Все типы' },
            ...Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })),
          ]}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="w-40"
        />
        <Select
          options={[
            { value: '', label: 'Все статусы' },
            { value: 'pending', label: 'Ожидает' },
            { value: 'processing', label: 'В обработке' },
            { value: 'completed', label: 'Завершена' },
            { value: 'failed', label: 'Ошибка' },
          ]}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="w-40"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={10} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Тип</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Сумма</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Метод</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((tx) => (
                  <tr key={tx.id} className="border-b border-surface-700/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{tx.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-200">{typeLabels[tx.type]}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-100">
                      {tx.type === 'withdrawal' || tx.type === 'bet' || tx.type === 'commission' ? '-' : '+'}
                      {tx.amount.toLocaleString()} {tx.currency}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{tx.method || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge[tx.status]}>{tx.status}</Badge></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      {tx.status === 'pending' && tx.type === 'withdrawal' && (
                        <div className="flex gap-1">
                          <Button size="xs" variant="success" onClick={() => setActionModal({ id: tx.id, action: 'approve' })}>✓</Button>
                          <Button size="xs" variant="danger" onClick={() => setActionModal({ id: tx.id, action: 'reject' })}>✕</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}

      {/* Action modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setRejectReason('') }}
        title={actionModal?.action === 'approve' ? 'Одобрить вывод' : 'Отклонить вывод'}
        size="sm"
      >
        {actionModal?.action === 'approve' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Подтвердите одобрение вывода средств.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setActionModal(null)}>Отмена</Button>
              <Button variant="success" isLoading={approveMutation.isPending} onClick={() => approveMutation.mutate(actionModal.id)}>
                Одобрить
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="Причина отклонения" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setActionModal(null)}>Отмена</Button>
              <Button variant="danger" isLoading={rejectMutation.isPending} onClick={() => rejectMutation.mutate({ id: actionModal!.id, reason: rejectReason })}>
                Отклонить
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
