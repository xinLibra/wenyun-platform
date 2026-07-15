import { motion } from 'framer-motion'

interface InkIconProps {
  children: React.ReactNode
  className?: string
  delay?: number
  variant?: 'seal' | 'ink' | 'brush' | 'scroll'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function InkIcon({ 
  children, 
  className = '', 
  delay = 0, 
  variant = 'seal',
  size = 'md' 
}: InkIconProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }

  const iconClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  }

  const baseVariants = {
    seal: {
      initial: { scale: 0, opacity: 0, rotate: -180 },
      animate: { scale: 1, opacity: 1, rotate: 0 },
      transition: { duration: 0.8, type: 'spring', stiffness: 200, damping: 15 },
    },
    ink: {
      initial: { opacity: 0, filter: 'blur(10px)', scale: 0.8 },
      animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
      transition: { duration: 1, ease: 'easeOut' },
    },
    brush: {
      initial: { opacity: 0, x: -20, skewX: -15 },
      animate: { opacity: 1, x: 0, skewX: 0 },
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
    scroll: {
      initial: { opacity: 0, y: 50, scaleY: 0 },
      animate: { opacity: 1, y: 0, scaleY: 1 },
      transition: { duration: 1, ease: 'easeOut' },
    },
  }

  const bgVariants = {
    seal: 'bg-palace-red shadow-lg',
    ink: 'bg-deep-blue/10',
    brush: 'bg-ink-black/5',
    scroll: 'bg-rice-paper-dark/20',
  }

  const textVariants = {
    seal: 'text-ming-yellow',
    ink: 'text-deep-blue',
    brush: 'text-ink-black',
    scroll: 'text-deep-blue',
  }

  return (
    <motion.div
      {...baseVariants[variant]}
      transition={{ ...baseVariants[variant].transition, delay }}
      className={`relative inline-block ${sizeClasses[size]} ${bgVariants[variant]} rounded-sm flex items-center justify-center ${className}`}
    >
      {variant === 'ink' && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 1.5, delay }}
            className="absolute inset-0 bg-deep-blue rounded-sm blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 0.2, scale: 1 }}
            transition={{ duration: 1.2, delay: delay + 0.3 }}
            className="absolute inset-1 bg-deep-blue-light rounded-sm blur-sm"
          />
        </>
      )}
      
      {variant === 'seal' && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.5 }}
            className="absolute inset-0.5 border border-ming-yellow/30 rounded-sm"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: delay + 0.6 }}
            className="absolute inset-1 border border-palace-red-dark/50 rounded-sm"
          />
        </>
      )}

      {variant === 'brush' && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 0.1, width: '100%' }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
          className="absolute bottom-0 h-1 bg-gradient-to-r from-transparent via-deep-blue to-transparent"
        />
      )}

      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.3 }}
        className={`font-shufa ${iconClasses[size]} ${textVariants[variant]} relative z-10`}
      >
        {children}
      </motion.span>
    </motion.div>
  )
}

export function InkCard({ 
  children, 
  className = '', 
  delay = 0,
}: { 
  children: React.ReactNode 
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, clipPath: 'inset(0 100% 0 0)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0 0)' }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      className={`relative ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-palace-red/30 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-deep-blue/20 to-transparent" />
      
      {children}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.03 }}
        transition={{ duration: 1, delay: delay + 0.5 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </motion.div>
  )
}

export function InkReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const directionVariants = {
    up: { initial: { y: 50 }, animate: { y: 0 } },
    down: { initial: { y: -50 }, animate: { y: 0 } },
    left: { initial: { x: 50 }, animate: { x: 0 } },
    right: { initial: { x: -50 }, animate: { x: 0 } },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionVariants[direction].initial }}
      animate={{ opacity: 1, ...directionVariants[direction].animate }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.div
        initial={{ opacity: 0.5, scale: 1.5 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 1.2, delay }}
        className={`absolute ${direction === 'up' ? 'bottom-0' : direction === 'down' ? 'top-0' : direction === 'left' ? 'right-0' : 'left-0'} w-full h-full bg-gradient-to-${direction === 'up' ? 't' : direction === 'down' ? 'b' : direction === 'left' ? 'r' : 'l'} from-palace-red/20 to-transparent pointer-events-none`}
      />
      
      {children}
    </motion.div>
  )
}