import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  const linkGroups = [
    {
      title: 'BetZone',
      links: [
        { to: '/', label: t('nav.home') },
        { to: '/casino', label: t('nav.casino') },
        { to: '/sports', label: t('nav.sports') },
        { to: '/promotions', label: t('nav.promotions') },
      ],
    },
    {
      title: 'Информация',
      links: [
        { to: '/terms', label: t('footer.terms') },
        { to: '/privacy', label: t('footer.privacy') },
        { to: '/aml', label: t('footer.aml') },
        { to: '/cookies', label: t('footer.cookies') },
      ],
    },
    {
      title: 'Поддержка',
      links: [
        { to: '/responsible-gambling', label: t('footer.responsibleGaming') },
        { to: '/betting-rules', label: t('footer.bettingRules') },
        { to: '/bonus-terms', label: t('footer.bonusTerms') },
        { to: '/faq', label: t('footer.faq') },
        { to: '/support', label: t('nav.support') },
      ],
    },
  ]

  return (
    <footer className="bg-surface-900 border-t border-surface-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">B</div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">BetZone</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Ставки на спорт и казино онлайн. Лицензионная платформа с быстрыми выплатами.
            </p>
            <div className="flex gap-3">
              {['18+', 'SSL'].map((badge) => (
                <span key={badge} className="px-2 py-1 rounded bg-surface-800 border border-surface-700 text-xs text-gray-400 font-medium">{badge}</span>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-gray-200 mb-3">{group.title}</h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-surface-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">{t('footer.copyright', { year })}</p>
          <p className="text-xs text-gray-600 text-center">
            {t('responsible.riskWarning')}
          </p>
        </div>
      </div>
    </footer>
  )
}
