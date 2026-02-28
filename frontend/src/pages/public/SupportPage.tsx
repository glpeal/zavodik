import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Button, Input, Card, Select, Badge } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'

const ticketSchema = z.object({
  subject: z.string().min(3, 'Минимум 3 символа'),
  category: z.string().min(1, 'Выберите категорию'),
  message: z.string().min(10, 'Минимум 10 символов'),
})

type TicketForm = z.infer<typeof ticketSchema>

const categories = [
  { value: 'account', label: 'Аккаунт' },
  { value: 'payment', label: 'Платежи' },
  { value: 'betting', label: 'Ставки' },
  { value: 'casino', label: 'Казино' },
  { value: 'bonus', label: 'Бонусы' },
  { value: 'verification', label: 'Верификация' },
  { value: 'other', label: 'Другое' },
]

export function SupportPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
  })

  const { data: tickets } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: () => api.getTickets(),
    enabled: isAuthenticated,
  })

  const createMutation = useMutation({
    mutationFn: (data: TicketForm) => api.createTicket(data),
    onSuccess: () => {
      addToast({ type: 'success', title: 'Обращение создано' })
      reset()
      setShowForm(false)
    },
    onError: () => {
      addToast({ type: 'error', title: 'Ошибка при создании обращения' })
    },
  })

  const statusColors: Record<string, 'default' | 'warning' | 'success' | 'primary'> = {
    open: 'primary',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'default',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-100 mb-2">{t('support.title')}</h1>
      <p className="text-gray-400 mb-8">Мы готовы помочь вам 24/7</p>

      {/* Contact info */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[
          { icon: '📧', title: 'Email', value: 'support@betzone.com' },
          { icon: '💬', title: 'Онлайн-чат', value: 'Доступен 24/7' },
          { icon: '📱', title: 'Telegram', value: '@betzone_support' },
        ].map((c) => (
          <Card key={c.title}>
            <div className="text-center">
              <span className="text-2xl">{c.icon}</span>
              <h3 className="text-sm font-medium text-gray-200 mt-2">{c.title}</h3>
              <p className="text-sm text-gray-400">{c.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* New ticket form */}
      {isAuthenticated && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">{t('support.newTicket')}</h2>
            <Button size="sm" variant={showForm ? 'ghost' : 'primary'} onClick={() => setShowForm(!showForm)}>
              {showForm ? t('common.cancel') : t('support.newTicket')}
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <Input label={t('support.subject')} {...register('subject')} error={errors.subject?.message} />
              <Select label={t('support.category')} options={categories} placeholder="Выберите категорию" {...register('category')} error={errors.category?.message} />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">{t('support.message')}</label>
                <textarea
                  {...register('message')}
                  rows={4}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                  placeholder="Опишите вашу проблему..."
                />
                {errors.message && <p className="mt-1 text-xs text-danger-500">{errors.message.message}</p>}
              </div>
              <Button type="submit" isLoading={createMutation.isPending}>Отправить</Button>
            </form>
          )}
        </Card>
      )}

      {/* My tickets */}
      {isAuthenticated && tickets && tickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Мои обращения</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Card key={ticket.id} hover>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-100">{ticket.subject}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">#{ticket.id} · {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <Badge variant={statusColors[ticket.status]}>{ticket.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* FAQ link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-2">Возможно, ответ уже есть в нашей базе знаний</p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = '/faq'}>
          Перейти в FAQ
        </Button>
      </div>
    </div>
  )
}
