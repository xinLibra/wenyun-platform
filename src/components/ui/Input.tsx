import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, className = '', ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block font-song text-deep-blue mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-deep-blue-light">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full px-4 py-2.5 pl-${icon ? '10' : '4'} bg-rice-paper-light border-2 border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red focus:ring-1 focus:ring-palace-red/30 transition-all duration-300 ${className}`}
            {...props}
          />
          <span className="absolute inset-0 border border-deep-blue/10 rounded-sm pointer-events-none" />
        </div>
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block font-song text-deep-blue mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-4 py-3 bg-rice-paper-light border-2 border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red focus:ring-1 focus:ring-palace-red/30 transition-all duration-300 resize-none ${className}`}
          {...props}
        />
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
