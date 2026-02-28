import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card, Button } from '@/components/ui'

export function ResponsibleGamblingPage() {
  const { t } = useTranslation()

  const tools = [
    { title: t('responsible.depositLimit'), desc: 'Установите максимальную сумму пополнения за период', link: '/limits' },
    { title: t('responsible.betLimit'), desc: 'Ограничьте размер ставок за выбранный период', link: '/limits' },
    { title: t('responsible.lossLimit'), desc: 'Установите максимальный допустимый проигрыш', link: '/limits' },
    { title: t('responsible.timeout'), desc: 'Временно приостановите доступ к аккаунту', link: '/limits' },
    { title: t('responsible.selfExclusion'), desc: 'Заблокируйте аккаунт на длительный период', link: '/limits' },
  ]

  const resources = [
    { name: 'Gamblers Anonymous', url: 'https://www.gamblersanonymous.org' },
    { name: 'BeGambleAware', url: 'https://www.begambleaware.org' },
    { name: 'GamCare', url: 'https://www.gamcare.org.uk' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-100 mb-2">{t('responsible.title')}</h1>
      <p className="text-gray-400 mb-8">{t('responsible.description')}</p>

      {/* Warning banner */}
      <div className="rounded-xl bg-warning-500/10 border border-warning-500/30 p-6 mb-8">
        <div className="flex gap-4">
          <span className="text-3xl flex-shrink-0">⚠️</span>
          <div>
            <h2 className="text-lg font-semibold text-warning-500 mb-2">Важно помнить</h2>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Азартные игры могут вызывать зависимость</li>
              <li>Играйте только на те средства, которые вы готовы потерять</li>
              <li>Установите лимиты и придерживайтесь их</li>
              <li>Делайте регулярные перерывы</li>
              <li>Не пытайтесь отыграться после проигрыша</li>
              <li>Если чувствуете, что теряете контроль — обратитесь за помощью</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tools */}
      <h2 className="text-xl font-semibold text-gray-100 mb-4">Инструменты контроля</h2>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {tools.map((tool) => (
          <Card key={tool.title} hover>
            <h3 className="text-base font-medium text-gray-100 mb-1">{tool.title}</h3>
            <p className="text-sm text-gray-400 mb-3">{tool.desc}</p>
            <Link to={tool.link}>
              <Button size="sm" variant="outline">Настроить</Button>
            </Link>
          </Card>
        ))}
      </div>

      {/* Self-assessment */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Самооценка</h2>
        <p className="text-sm text-gray-400 mb-4">Ответьте честно на следующие вопросы. Если вы ответили «да» на два или более — рекомендуем обратиться за профессиональной помощью.</p>
        <ul className="space-y-3">
          {[
            'Вы когда-нибудь пропускали работу или учёбу из-за азартных игр?',
            'Приносят ли азартные игры проблемы в вашу семейную жизнь?',
            'Влияют ли азартные игры на вашу репутацию?',
            'Испытываете ли вы угрызения совести после игры?',
            'Играете ли вы для того, чтобы отвлечься от проблем?',
            'Пытались ли вы отыграть проигранные деньги?',
            'Были ли у вас мысли о самоповреждении из-за проигрышей?',
          ].map((q, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-300">
              <span className="text-gray-500 flex-shrink-0">{i + 1}.</span>
              {q}
            </li>
          ))}
        </ul>
      </Card>

      {/* External resources */}
      <h2 className="text-xl font-semibold text-gray-100 mb-4">Полезные ресурсы</h2>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {resources.map((r) => (
          <Card key={r.name} hover>
            <h3 className="text-base font-medium text-gray-100 mb-2">{r.name}</h3>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-400 hover:underline"
            >
              Перейти на сайт →
            </a>
          </Card>
        ))}
      </div>

      {/* Age restriction */}
      <div className="text-center py-6 border-t border-surface-700">
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-800 border border-surface-700 text-sm text-gray-400">
          <span className="text-2xl font-bold text-danger-500">18+</span>
          {t('responsible.ageWarning')}
        </span>
      </div>
    </div>
  )
}
