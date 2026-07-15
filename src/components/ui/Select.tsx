import { forwardRef, SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className = '', children, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block font-song text-deep-blue mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`appearance-none w-full px-4 py-2.5 bg-rice-paper-light border-2 border-deep-blue-200 rounded-sm font-song text-deep-blue focus:outline-none focus:border-palace-red focus:ring-1 focus:ring-palace-red/30 transition-all duration-300 ${className}`}
            {...props}
          >
            {children}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-deep-blue-light pointer-events-none" viewBox="0 0 20 20" fill="none">
            <path d="M5 7L10 12L15 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    )
  }
)

Select.displayName = 'Select'

interface ToggleProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function BambooToggle({ options, value, onChange, className = '' }: ToggleProps) {
  return (
    <div className={`flex bg-rice-paper-dark rounded-sm p-1 ${className}`}>
      {options.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`relative flex-1 px-4 py-2 rounded-sm font-song transition-all duration-300 ${
            value === option.value
              ? 'bg-rice-paper text-palace-red shadow-md'
              : 'text-deep-blue-light hover:text-deep-blue'
          }`}
        >
          {option.label}
          {index < options.length - 1 && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-4 bg-deep-blue-light/30" />
          )}
        </button>
      ))}
    </div>
  )
}
