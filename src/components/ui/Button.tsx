import { forwardRef, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, className = '', children, ...props }, ref) => {
    const baseStyles = 'relative font-song font-medium transition-all duration-300 inline-flex items-center justify-center rounded-sm'
    
    const variantStyles = {
      primary: 'bg-palace-red text-rice-paper hover:bg-palace-red-dark shadow-md hover:shadow-lg active:scale-95',
      secondary: 'bg-deep-blue text-rice-paper hover:bg-deep-blue-dark shadow-md hover:shadow-lg active:scale-95',
      outline: 'border-2 border-palace-red text-palace-red hover:bg-palace-red hover:text-rice-paper',
      ghost: 'text-deep-blue hover:bg-deep-blue-100',
    }
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-8 py-3.5 text-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
        <span className="absolute inset-0 rounded-sm border border-current opacity-0 hover:opacity-20 transition-opacity" />
      </button>
    )
  }
)

Button.displayName = 'Button'

export function StampButton({ children, className = '', ...props }: { children: React.ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`relative px-6 py-3 bg-palace-red text-rice-paper font-song font-medium text-lg rounded-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0.5 ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-1 border border-rice-paper opacity-30 rounded-sm" />
      <span className="absolute -inset-1 border-2 border-palace-red-dark opacity-50 rounded-sm" />
    </button>
  )
}

export function ScrollButton({ children, className = '', ...props }: { children: React.ReactNode; className?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`relative px-6 py-3 bg-gradient-to-r from-deep-blue to-deep-blue-light text-rice-paper font-song text-base rounded-sm shadow-md hover:shadow-lg transition-all duration-300 ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ming-yellow-transparent" />
      <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-ming-yellow-transparent" />
    </button>
  )
}
