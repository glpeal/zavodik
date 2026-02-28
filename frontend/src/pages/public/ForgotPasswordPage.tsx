import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Input, Card } from '@/components/ui'
import api from '@/services/api'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.validation.emailRequired')
    .email('auth.validation.emailInvalid'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const { t } = useTranslation()

  const [serverError, setServerError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError('')
    try {
      await api.forgotPassword(data.email)
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
              {t('auth.forgotPasswordTitle')}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {t('auth.forgotPasswordSubtitle')}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-400">
                {t('auth.forgotPasswordSuccess')}
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
                  label={t('auth.email')}
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  error={errors.email?.message ? t(errors.email.message) : undefined}
                  {...register('email')}
                />

                <Button type="submit" fullWidth isLoading={isSubmitting} size="lg">
                  {t('auth.sendResetLink')}
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
