import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Card, Badge, SkeletonTable } from '@/components/ui'

export function AdminContentPage() {
  const { data: banners, isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => api.getBanners(),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Управление контентом</h2>

      <h3 className="text-lg font-semibold text-gray-200">Баннеры</h3>
      {isLoading ? (
        <SkeletonTable rows={3} />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Порядок</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Заголовок</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ссылка</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
                </tr>
              </thead>
              <tbody>
                {banners?.map((banner) => (
                  <tr key={banner.id} className="border-b border-surface-700/50 hover:bg-surface-800/50">
                    <td className="px-4 py-3 text-gray-400">{banner.order}</td>
                    <td className="px-4 py-3 text-gray-200">{banner.title}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{banner.link}</td>
                    <td className="px-4 py-3">
                      <Badge variant={banner.isActive ? 'success' : 'default'}>
                        {banner.isActive ? 'Активен' : 'Отключен'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h3 className="text-lg font-semibold text-gray-200 mt-8">Страницы CMS</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {['terms', 'privacy', 'aml', 'cookies', 'faq', 'betting-rules', 'bonus-terms'].map((slug) => (
          <Card key={slug} hover>
            <h4 className="text-sm font-medium text-gray-200 capitalize">{slug.replace('-', ' ')}</h4>
            <p className="text-xs text-gray-500 mt-1">/{slug}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
