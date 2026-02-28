import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import { Button, Input, Card, Badge, Pagination, Modal } from '@/components/ui'
import { SkeletonTable } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { useUIStore } from '@/stores/uiStore'
import type { KycStatus } from '@/types'

const kycBadge: Record<KycStatus, 'default' | 'warning' | 'success' | 'danger'> = {
  not_started: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [blockModal, setBlockModal] = useState<{ userId: string; action: 'block' | 'unblock' } | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const addToast = useUIStore((s) => s.addToast)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: () => api.adminGetUsers(`search=${debouncedSearch}&page=${page}&pageSize=20`),
  })

  const blockMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => api.adminBlockUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      addToast({ type: 'success', title: 'Пользователь заблокирован' })
      setBlockModal(null)
      setBlockReason('')
    },
  })

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => api.adminUnblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      addToast({ type: 'success', title: 'Пользователь разблокирован' })
      setBlockModal(null)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Пользователи</h2>
        <span className="text-sm text-gray-500">Всего: {data?.total ?? 0}</span>
      </div>

      <Input
        placeholder="Поиск по email, имени, ID..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
      />

      {isLoading ? (
        <SkeletonTable rows={10} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Имя</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">KYC</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Роль</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((user) => (
                  <tr key={user.id} className="border-b border-surface-700/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{user.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-200">{user.firstName} {user.lastName}</td>
                    <td className="px-4 py-3 text-gray-400">{user.email}</td>
                    <td className="px-4 py-3"><Badge variant={kycBadge[user.kycStatus]}>{user.kycStatus}</Badge></td>
                    <td className="px-4 py-3"><Badge variant="info">{user.role}</Badge></td>
                    <td className="px-4 py-3">
                      {user.isBlocked
                        ? <Badge variant="danger" dot>Заблокирован</Badge>
                        : <Badge variant="success" dot>Активен</Badge>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {user.isBlocked ? (
                        <Button size="xs" variant="ghost" onClick={() => setBlockModal({ userId: user.id, action: 'unblock' })}>
                          Разблокировать
                        </Button>
                      ) : (
                        <Button size="xs" variant="ghost" onClick={() => setBlockModal({ userId: user.id, action: 'block' })}>
                          Заблокировать
                        </Button>
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

      {/* Block/Unblock modal */}
      <Modal
        isOpen={!!blockModal}
        onClose={() => { setBlockModal(null); setBlockReason('') }}
        title={blockModal?.action === 'block' ? 'Заблокировать пользователя' : 'Разблокировать пользователя'}
        size="sm"
      >
        {blockModal?.action === 'block' ? (
          <div className="space-y-4">
            <Input
              label="Причина блокировки"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Укажите причину..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setBlockModal(null)}>Отмена</Button>
              <Button variant="danger" isLoading={blockMutation.isPending} onClick={() => blockMutation.mutate({ userId: blockModal.userId, reason: blockReason })}>
                Заблокировать
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Вы уверены, что хотите разблокировать этого пользователя?</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setBlockModal(null)}>Отмена</Button>
              <Button variant="success" isLoading={unblockMutation.isPending} onClick={() => unblockMutation.mutate(blockModal!.userId)}>
                Разблокировать
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
