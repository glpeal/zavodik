import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Input, Card } from '@/components/ui'
import api from '@/services/api'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'auth.validation.passwordMin')
      .regex(/[A-Z]/, 'auth.validation.passwordUppercase')
      .regex(/[a-z]/, 'auth.validation.passwordLowercase')
      .regex(/[0-9]/, 'auth.validation.passwordNumber'),
    confirmPassword: z
      .string()
      .min(1, 'auth.validation.confirmPasswordRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.validation.passwordsMismatch',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [serverError, setServerError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError('')
    try {
      await api.resetPassword(token, data.password)
      setIsSuccess(true)
    } catch (err: unknown) {
      const error = err as { message?: string }
      setServerError(error.message || t('common.error'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-100">
              {t('auth.resetPasswordTitle')}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {t('auth.resetPasswordSubtitle')}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-400">
                {t('auth.resetPasswordSuccess')}
              </div>

              <Link
                to="/login"
                className="block text-center text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
              >
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400" role="alert">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label={t('auth.newPassword')}
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                  error={errors.password?.message ? t(errors.password.message) : undefined}
                  {...register('password')}
                />

                <Input
                  label={t('auth.confirmPassword')}
                  type="password"
                  placeholder="********"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message ? t(errors.confirmPassword.message) : undefined}
                  {...register('confirmPassword')}
                />

                <Button type="submit" fullWidth isLoading={isSubmitting} size="lg">
                  {t('auth.setNewPassword')}
                </Button>
              </form>

              <Link
                to="/login"
                className="block text-center text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
              >
                {t('auth.backToLogin')}
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
