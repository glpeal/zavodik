import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/services/api'
import { Card, Button, Input, Badge, Select, Tabs } from '@/components/ui'
import { Skeleton } from '@/components/ui'
import type { UserSession } from '@/types'

// --- Schemas ---

const profileSchema = z.object({
  firstName: z.string().min(1, 'required').max(50),
  lastName: z.string().min(1, 'required').max(50),
  phone: z.string().optional(),
})
type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'required'),
    newPassword: z.string().min(8, 'minLength'),
    confirmPassword: z.string().min(1, 'required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  })
type PasswordFormData = z.infer<typeof passwordSchema>

// --- Tab Sections ---

function ProfileInfoSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone || '',
        }
      : undefined,
  })

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          <Skeleton height={20} width="40%" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">
        {t('profile.personalInfo')}
      </h3>

      <div className="mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
          {profile?.firstName?.[0]}
          {profile?.lastName?.[0]}
        </div>
        <div>
          <p className="text-gray-100 font-medium">
            {profile?.firstName} {profile?.lastName}
          </p>
          <p className="text-sm text-gray-400">{profile?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('auth.firstName')}
            error={errors.firstName?.message ? t(`validation.${errors.firstName.message}`) : undefined}
            {...register('firstName')}
          />
          <Input
            label={t('auth.lastName')}
            error={errors.lastName?.message ? t(`validation.${errors.lastName.message}`) : undefined}
            {...register('lastName')}
          />
        </div>
        <Input
          label={t('auth.phone')}
          type="tel"
          error={errors.phone?.message ? t(`validation.${errors.phone.message}`) : undefined}
          {...register('phone')}
        />
        <Input
          label={t('auth.email')}
          value={profile?.email || ''}
          disabled
          readOnly
          hint={t('profile.emailReadOnly')}
        />

        {updateMutation.isSuccess && (
          <p className="text-sm text-green-400">{t('profile.profileUpdated')}</p>
        )}
        {updateMutation.isError && (
          <p className="text-sm text-red-400">{t('common.error')}</p>
        )}

        <Button type="submit" isLoading={updateMutation.isPending} disabled={!isDirty}>
          {t('common.save')}
        </Button>
      </form>
    </Card>
  )
}

function SecuritySection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      api.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      resetPassword()
    },
  })

  const enable2FAMutation = useMutation({
    mutationFn: api.enable2FA,
  })

  const [twoFACode, setTwoFACode] = useState('')
  const confirm2FAMutation = useMutation({
    mutationFn: () => api.confirm2FA(twoFACode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setTwoFACode('')
    },
  })

  const disable2FAMutation = useMutation({
    mutationFn: () => api.disable2FA(twoFACode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setTwoFACode('')
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          {t('profile.changePassword')}
        </h3>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <Input
            label={t('profile.currentPassword')}
            type="password"
            error={
              passwordErrors.currentPassword?.message
                ? t(`validation.${passwordErrors.currentPassword.message}`)
                : undefined
            }
            {...registerPassword('currentPassword')}
          />
          <Input
            label={t('profile.newPassword')}
            type="password"
            error={
              passwordErrors.newPassword?.message
                ? t(`validation.${passwordErrors.newPassword.message}`)
                : undefined
            }
            {...registerPassword('newPassword')}
          />
          <Input
            label={t('auth.confirmPassword')}
            type="password"
            error={
              passwordErrors.confirmPassword?.message
                ? t(`validation.${passwordErrors.confirmPassword.message}`)
                : undefined
            }
            {...registerPassword('confirmPassword')}
          />

          {changePasswordMutation.isSuccess && (
            <p className="text-sm text-green-400">{t('profile.passwordChanged')}</p>
          )}
          {changePasswordMutation.isError && (
            <p className="text-sm text-red-400">{t('common.error')}</p>
          )}

          <Button type="submit" isLoading={changePasswordMutation.isPending}>
            {t('profile.changePassword')}
          </Button>
        </form>
      </Card>

      {/* 2FA */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          {t('profile.twoFactor')}
        </h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-gray-300">{t('profile.twoFactorStatus')}</span>
          <Badge variant={profile?.twoFactorEnabled ? 'success' : 'default'}>
            {profile?.twoFactorEnabled ? t('profile.enabled') : t('profile.disabled')}
          </Badge>
        </div>

        {!profile?.twoFactorEnabled ? (
          <div className="space-y-4">
            {enable2FAMutation.data ? (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
                  <img
                    src={enable2FAMutation.data.qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-gray-400 text-center break-all">
                  {t('profile.twoFactorSecret')}: {enable2FAMutation.data.secret}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('auth.enterCode')}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                    maxLength={6}
                  />
                  <Button
                    onClick={() => confirm2FAMutation.mutate()}
                    isLoading={confirm2FAMutation.isPending}
                    disabled={twoFACode.length !== 6}
                  >
                    {t('common.confirm')}
                  </Button>
                </div>
              </>
            ) : (
              <Button
                onClick={() => enable2FAMutation.mutate()}
                isLoading={enable2FAMutation.isPending}
              >
                {t('profile.enableTwoFactor')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{t('profile.disableTwoFactorHint')}</p>
            <div className="flex gap-2">
              <Input
                placeholder={t('auth.enterCode')}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                maxLength={6}
              />
              <Button
                variant="danger"
                onClick={() => disable2FAMutation.mutate()}
                isLoading={disable2FAMutation.isPending}
                disabled={twoFACode.length !== 6}
              >
                {t('profile.disableTwoFactor')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function SessionItem({
  session,
  onTerminate,
  isTerminating,
}: {
  session: UserSession
  onTerminate: () => void
  isTerminating: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-surface-800 border border-surface-700">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center text-gray-400 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-100 font-medium truncate">{session.device}</p>
            {session.current && (
              <Badge variant="primary" dot pulse>
                {t('profile.currentSession')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {session.ip}
            {session.location && ` - ${session.location}`}
          </p>
          <p className="text-xs text-gray-500">
            {t('profile.lastActive')}: {new Date(session.lastActive).toLocaleString()}
          </p>
        </div>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onTerminate}
          isLoading={isTerminating}
          className="text-red-400 hover:text-red-300 shrink-0"
        >
          {t('profile.terminateSession')}
        </Button>
      )}
    </div>
  )
}

function SessionsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [terminatingId, setTerminatingId] = useState<string | null>(null)

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: api.getSessions,
  })

  const terminateMutation = useMutation({
    mutationFn: (id: string) => api.terminateSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setTerminatingId(null)
    },
  })

  const terminateAllMutation = useMutation({
    mutationFn: api.terminateAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={72} className="w-full rounded-lg" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">{t('profile.sessions')}</h3>
        {sessions && sessions.length > 1 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => terminateAllMutation.mutate()}
            isLoading={terminateAllMutation.isPending}
          >
            {t('profile.logoutAll')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {sessions?.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            onTerminate={() => {
              setTerminatingId(session.id)
              terminateMutation.mutate(session.id)
            }}
            isTerminating={terminatingId === session.id && terminateMutation.isPending}
          />
        ))}
        {sessions?.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">
            {t('common.noResults')}
          </p>
        )}
      </div>
    </Card>
  )
}

function PreferencesSection() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    updateMutation.mutate({ locale: lang })
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          {t('profile.notificationPreferences')}
        </h3>
        <div className="space-y-3">
          <ToggleRow
            label={t('profile.emailNotifications')}
            description={t('profile.emailNotificationsDesc')}
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <ToggleRow
            label={t('profile.smsNotifications')}
            description={t('profile.smsNotificationsDesc')}
            checked={smsNotifications}
            onChange={setSmsNotifications}
          />
          <ToggleRow
            label={t('profile.pushNotifications')}
            description={t('profile.pushNotificationsDesc')}
            checked={pushNotifications}
            onChange={setPushNotifications}
          />
        </div>
      </Card>

      {/* Language / Theme */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          {t('profile.appearance')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('profile.language')}
            value={profile?.locale || i18n.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            options={[
              { value: 'ru', label: 'Русский' },
              { value: 'en', label: 'English' },
            ]}
          />
          <Select
            label={t('profile.theme')}
            value="dark"
            options={[
              { value: 'dark', label: t('profile.dark') },
              { value: 'light', label: t('profile.light') },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-surface-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// --- Main Page ---

export default function ProfilePage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('info')

  const tabs = [
    { id: 'info', label: t('profile.personalInfo') },
    { id: 'security', label: t('profile.security') },
    { id: 'sessions', label: t('profile.sessions') },
    { id: 'preferences', label: t('profile.preferences') },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">{t('profile.title')}</h1>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div>
        {activeTab === 'info' && <ProfileInfoSection />}
        {activeTab === 'security' && <SecuritySection />}
        {activeTab === 'sessions' && <SessionsSection />}
        {activeTab === 'preferences' && <PreferencesSection />}
      </div>
    </div>
  )
}
