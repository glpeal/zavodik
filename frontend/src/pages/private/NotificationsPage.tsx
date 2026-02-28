import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/services/api'
import { Card, Button, Badge, Pagination, Skeleton } from '@/components/ui'
import type { Notification, NotificationType } from '@/types'

// --- Helpers ---

const NOTIFICATION_BADGE: Record<NotificationType, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
}

const NOTIFICATION_ICON: Record<NotificationType, string> = {
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
}

function formatTimeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (minutes < 1) return t('notifications.justNow')
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes })
  if (hours < 24) return t('notifications.hoursAgo', { count: hours })
  if (days < 7) return t('notifications.daysAgo', { count: days })
  return new Date(dateStr).toLocaleDateString()
}

// --- Notification Item ---

function NotificationItem({
  notification,
  onMarkRead,
  isMarking,
}: {
  notification: Notification
  onMarkRead: () => void
  isMarking: boolean
}) {
  const { t } = useTranslation()
  const iconPath = NOTIFICATION_ICON[notification.type]
  const iconColors: Record<NotificationType, string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
  }

  return (
    <div
      className={`flex gap-3 py-3 px-4 rounded-lg border transition-colors ${
        notification.read
          ? 'bg-surface-850 border-surface-700'
          : 'bg-surface-800 border-surface-600 shadow-sm'
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        notification.read ? 'bg-surface-700' : 'bg-surface-700/80'
      }`}>
        <svg
          className={`w-5 h-5 ${iconColors[notification.type]}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4
                className={`text-sm font-medium truncate ${
                  notification.read ? 'text-gray-300' : 'text-gray-100'
                }`}
              >
                {notification.title}
              </h4>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
              )}
            </div>
            <p
              className={`text-sm ${
                notification.read ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {notification.message}
            </p>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
            {formatTimeAgo(notification.createdAt, t)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant={NOTIFICATION_BADGE[notification.type]}>
            {t(`notifications.type_${notification.type}`)}
          </Badge>

          {notification.link && (
            <a
              href={notification.link}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              {t('notifications.viewDetails')}
            </a>
          )}

          {!notification.read && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onMarkRead}
              isLoading={isMarking}
              className="ml-auto text-gray-400"
            >
              {t('notifications.markRead')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function NotificationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.getNotifications(page),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setMarkingId(null)
    },
  })

  const unreadCount = data?.data.filter((n) => !n.read).length || 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-100">{t('notifications.title')}</h1>
          {unreadCount > 0 && (
            <Badge variant="primary" dot pulse>
              {t('notifications.unreadCount', { count: unreadCount })}
            </Badge>
          )}
        </div>
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-lg bg-surface-850 border border-surface-700">
              <Skeleton width={40} height={40} rounded />
              <div className="flex-1 space-y-2">
                <Skeleton height={16} width="50%" />
                <Skeleton height={14} width="80%" />
                <Skeleton height={12} width="30%" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data?.data.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => {
                  setMarkingId(notification.id)
                  markReadMutation.mutate(notification.id)
                }}
                isMarking={markingId === notification.id && markReadMutation.isPending}
              />
            ))}

            {data?.data.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400">{t('notifications.empty')}</p>
                </div>
              </Card>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}
