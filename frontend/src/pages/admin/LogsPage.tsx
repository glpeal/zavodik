import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Card, Pagination } from '@/components/ui'
import { SkeletonTable } from '@/components/ui'

export function AdminLogsPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page],
    queryFn: () => api.adminGetAuditLogs(`page=${page}&pageSize=30`),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Аудит логи</h2>

      {isLoading ? (
        <SkeletonTable rows={15} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Время</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">User ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Действие</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Детали</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((log) => (
                  <tr key={log.id} className="border-b border-surface-700/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.userId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-200 font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{log.details}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
