export function formatCurrency(amount: number, currency = 'RUB', locale = 'ru-RU'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2)
}

export function formatDate(date: string, locale = 'ru-RU'): string {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string, locale = 'ru-RU'): string {
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date: string, locale = 'ru-RU'): string {
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  const masked = user.length > 2
    ? user[0] + '*'.repeat(user.length - 2) + user[user.length - 1]
    : '*'.repeat(user.length)
  return `${masked}@${domain}`
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone
  return phone.slice(0, 3) + '*'.repeat(phone.length - 5) + phone.slice(-2)
}
