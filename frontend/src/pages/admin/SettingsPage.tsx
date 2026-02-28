import { Card } from '@/components/ui'

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Настройки</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-gray-200 mb-4">Общие</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Название сайта</span><span className="text-gray-200">BetZone</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Валюта по умолчанию</span><span className="text-gray-200">RUB</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Язык по умолчанию</span><span className="text-gray-200">Русский</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Версия API</span><span className="text-gray-200 font-mono">v1.0.0</span></div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-200 mb-4">Фичи</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Live-ставки</span><span className="text-success-500">Включены</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Казино</span><span className="text-success-500">Включено</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Бонусы</span><span className="text-success-500">Включены</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Чат поддержки</span><span className="text-gray-500">Отключен</span></div>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-200 mb-4">Провайдеры казино</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>Управление провайдерами осуществляется через API.</p>
          </div>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-200 mb-4">Лимиты</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Мин. депозит</span><span className="text-gray-200">100 RUB</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Макс. депозит</span><span className="text-gray-200">500 000 RUB</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Мин. ставка</span><span className="text-gray-200">10 RUB</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Макс. ставка</span><span className="text-gray-200">100 000 RUB</span></div>
          </div>
        </Card>
      </div>
    </div>
  )
}
