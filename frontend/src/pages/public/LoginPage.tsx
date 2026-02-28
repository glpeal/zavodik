import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.validation.emailRequired')
    .email('auth.validation.emailInvalid'),
  password: z
    .string()
    .min(1, 'auth.validation.passwordRequired'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

const twoFASchema = z.object({
  code: z
    .string()
    .min(1, 'auth.validation.codeRequired')
    .length(6, 'auth.validation.codeLength'),
})

type TwoFAFormData = z.infer<typeof twoFASchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const verify2FA = useAuthStore((s) => s.verify2FA)

  const [serverError, setServerError] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [userId, setUserId] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const {
    register: register2FA,
    handleSubmit: handleSubmit2FA,
    formState: { errors: errors2FA, isSubmitting: isSubmitting2FA },
  } = useForm<TwoFAFormData>({
    resolver: zodResolver(twoFASchema),
    defaultValues: {
      code: '',
    },
  })

  const onLogin = async (data: LoginFormData) => {
    setServerError('')
    try {
      const result = await login(data.email, data.password)
      if (result.requires2FA && result.userId) {
        setRequires2FA(true)
        setUserId(result.userId)
      } else {
        navigate('/')
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      setServerError(error.message || t('common.error'))
    }
  }

  const onVerify2FA = async (data: TwoFAFormData) => {
    setServerError('')
    try {
      await verify2FA(userId, data.code)
      navigate('/')
    } catch (err: unknown) {
      const error = err as { message?: string }
      setServerError(error.message || t('common.error'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="space-y-6">
          {!requires2FA ? (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-100">
                  {t('auth.loginTitle')}
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  {t('auth.loginSubtitle')}
                </p>
              </div>

              {serverError && (
                <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400" role="alert">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
                <Input
                  label={t('auth.email')}
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  error={errors.email?.message ? t(errors.email.message) : undefined}
                  {...register('email')}
                />

                <Input
                  label={t('auth.password')}
                  type="password"
                  placeholder="********"
                  autoComplete="current-password"
                  error={errors.password?.message ? t(errors.password.message) : undefined}
                  {...register('password')}
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                      {...register('rememberMe')}
                    />
                    {t('auth.rememberMe')}
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>

                <Button type="submit" fullWidth isLoading={isSubmitting} size="lg">
                  {t('auth.login')}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400">
                {t('auth.noAccount')}{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {t('auth.register')}
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-100">
                  {t('auth.twoFactorTitle')}
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  {t('auth.twoFactorSubtitle')}
                </p>
              </div>

              {serverError && (
                <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400" role="alert">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit2FA(onVerify2FA)} className="space-y-4">
                <Input
                  label={t('auth.enterCode')}
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  autoComplete="one-time-code"
                  maxLength={6}
                  error={errors2FA.code?.message ? t(errors2FA.code.message) : undefined}
                  {...register2FA('code')}
                />

                <Button type="submit" fullWidth isLoading={isSubmitting2FA} size="lg">
                  {t('auth.verify')}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false)
                  setServerError('')
                }}
                className="block w-full text-center text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                {t('auth.backToLogin')}
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
