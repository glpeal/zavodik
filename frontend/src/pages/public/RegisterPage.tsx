import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Select, Card } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'RUB', label: 'RUB (\u20BD)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'UAH', label: 'UAH (\u20B4)' },
  { value: 'KZT', label: 'KZT (\u20B8)' },
]

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'auth.validation.firstNameRequired'),
    lastName: z
      .string()
      .min(1, 'auth.validation.lastNameRequired'),
    email: z
      .string()
      .min(1, 'auth.validation.emailRequired')
      .email('auth.validation.emailInvalid'),
    phone: z
      .string()
      .regex(/^\+?[0-9\s\-()]*$/, 'auth.validation.phoneInvalid')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'auth.validation.passwordMin')
      .regex(/[A-Z]/, 'auth.validation.passwordUppercase')
      .regex(/[a-z]/, 'auth.validation.passwordLowercase')
      .regex(/[0-9]/, 'auth.validation.passwordNumber'),
    confirmPassword: z
      .string()
      .min(1, 'auth.validation.confirmPasswordRequired'),
    dateOfBirth: z
      .string()
      .min(1, 'auth.validation.dateOfBirthRequired'),
    currency: z
      .string()
      .min(1, 'auth.validation.currencyRequired'),
    agreeTerms: z
      .boolean()
      .refine((val) => val === true, { message: 'auth.validation.agreeTermsRequired' }),
    agreeAge: z
      .boolean()
      .refine((val) => val === true, { message: 'auth.validation.agreeAgeRequired' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.validation.passwordsMismatch',
    path: ['confirmPassword'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const registerUser = useAuthStore((s) => s.register)

  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      dateOfBirth: '',
      currency: '',
      agreeTerms: false,
      agreeAge: false,
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('')
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth,
        currency: data.currency,
        agreeTerms: data.agreeTerms,
        agreeAge: data.agreeAge,
      })
      navigate('/')
    } catch (err: unknown) {
      const error = err as { message?: string }
      setServerError(error.message || t('common.error'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-100">
              {t('auth.registerTitle')}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {t('auth.registerSubtitle')}
            </p>
          </div>

          {serverError && (
            <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('auth.firstName')}
                type="text"
                autoComplete="given-name"
                error={errors.firstName?.message ? t(errors.firstName.message) : undefined}
                {...register('firstName')}
              />

              <Input
                label={t('auth.lastName')}
                type="text"
                autoComplete="family-name"
                error={errors.lastName?.message ? t(errors.lastName.message) : undefined}
                {...register('lastName')}
              />
            </div>

            <Input
              label={t('auth.email')}
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              error={errors.email?.message ? t(errors.email.message) : undefined}
              {...register('email')}
            />

            <Input
              label={t('auth.phone')}
              type="tel"
              placeholder="+7 (999) 123-45-67"
              autoComplete="tel"
              error={errors.phone?.message ? t(errors.phone.message) : undefined}
              {...register('phone')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('auth.password')}
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('auth.dateOfBirth')}
                type="date"
                autoComplete="bday"
                error={errors.dateOfBirth?.message ? t(errors.dateOfBirth.message) : undefined}
                {...register('dateOfBirth')}
              />

              <Select
                label={t('auth.currency')}
                placeholder={t('auth.selectCurrency')}
                options={CURRENCY_OPTIONS}
                error={errors.currency?.message ? t(errors.currency.message) : undefined}
                {...register('currency')}
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-surface-700 bg-surface-800 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                  {...register('agreeTerms')}
                />
                <span className="text-sm text-gray-300">
                  {t('auth.agreeTerms')}
                </span>
              </label>
              {errors.agreeTerms?.message && (
                <p className="ml-7 text-xs text-danger-500" role="alert">
                  {t(errors.agreeTerms.message)}
                </p>
              )}

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-surface-700 bg-surface-800 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                  {...register('agreeAge')}
                />
                <span className="text-sm text-gray-300">
                  {t('auth.agreeAge')}
                </span>
              </label>
              {errors.agreeAge?.message && (
                <p className="ml-7 text-xs text-danger-500" role="alert">
                  {t(errors.agreeAge.message)}
                </p>
              )}
            </div>

            <Button type="submit" fullWidth isLoading={isSubmitting} size="lg">
              {t('auth.register')}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400">
            {t('auth.haveAccount')}{' '}
            <Link
              to="/login"
              className="font-medium text-primary-400 hover:text-primary-300 transition-colors"
            >
              {t('auth.login')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
