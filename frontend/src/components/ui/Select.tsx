import { type SelectHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-lg border bg-surface-800 px-3 py-2.5 text-sm text-gray-100 transition-colors',
            'focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none',
            error ? 'border-danger-500' : 'border-surface-700',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-danger-500" role="alert">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
