import { motion } from 'framer-motion'

interface PlaceholderPatternProps {
  className?: string
}

export function PlaceholderPattern({ className = '' }: PlaceholderPatternProps) {
  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-rice-paper-dark ${className}`}>
      <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 400 400" preserveAspectRatio="none">
        <defs>
          <pattern id="rice-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#1a365d" />
            <circle cx="0" cy="0" r="0.5" fill="#1a365d" />
            <circle cx="40" cy="0" r="0.5" fill="#1a365d" />
            <circle cx="0" cy="40" r="0.5" fill="#1a365d" />
            <circle cx="40" cy="40" r="0.5" fill="#1a365d" />
          </pattern>
          <pattern id="cloud-pattern" x="0" y="0" width="100" height="60" patternUnits="userSpaceOnUse">
            <path d="M10,30 Q20,10 40,15 Q60,20 70,5 Q80,-10 90,15 Q95,25 85,35 Q75,45 60,40 Q40,35 25,45 Q10,55 5,40 Q0,25 10,30" fill="#1a365d" opacity="0.3" />
          </pattern>
          <pattern id="wave-pattern" x="0" y="0" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M0,15 Q12.5,5 25,15 Q37.5,25 50,15" stroke="#1a365d" strokeWidth="1" fill="none" opacity="0.4" />
            <path d="M0,22 Q12.5,12 25,22 Q37.5,32 50,22" stroke="#1a365d" strokeWidth="0.5" fill="none" opacity="0.2" />
          </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#rice-pattern)" />
        <rect width="100%" height="100%" fill="url(#cloud-pattern)" />
        <rect width="100%" height="100%" fill="url(#wave-pattern)" />
      </svg>
      
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative"
        >
          <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-lg">
            <defs>
              <linearGradient id="seal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>
            
            <rect
              x="5"
              y="5"
              width="110"
              height="110"
              rx="4"
              fill="url(#seal-gradient)"
              stroke="#7f1d1d"
              strokeWidth="2"
            />
            
            <rect
              x="15"
              y="15"
              width="90"
              height="90"
              rx="2"
              fill="none"
              stroke="#fef3c7"
              strokeWidth="1"
              opacity="0.3"
            />
            
            <text
              x="60"
              y="45"
              textAnchor="middle"
              fill="#fef3c7"
              fontSize="32"
              fontWeight="bold"
              fontFamily="serif"
            >
              纹
            </text>
            <text
              x="60"
              y="82"
              textAnchor="middle"
              fill="#fef3c7"
              fontSize="32"
              fontWeight="bold"
              fontFamily="serif"
            >
              韵
            </text>
            
            <circle
              cx="60"
              cy="60"
              r="8"
              fill="none"
              stroke="#fef3c7"
              strokeWidth="1"
              opacity="0.5"
            />
          </svg>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-2 -right-2 w-6 h-6"
          >
            <svg viewBox="0 0 24 24" className="w-full h-full text-palace-red opacity-60">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </motion.div>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 font-song text-deep-blue-light text-sm tracking-wider"
        >
          纹样生成中...
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-2 font-song text-deep-blue-light/60 text-xs"
        >
          请稍候片刻，精美纹样即将呈现
        </motion.p>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute top-4 left-4"
      >
        <svg width="40" height="40" viewBox="0 0 40 40" className="opacity-20">
          <path d="M5,20 Q10,10 20,10 Q30,10 35,20 Q30,30 20,30 Q10,30 5,20" fill="none" stroke="#1a365d" strokeWidth="1" />
          <circle cx="20" cy="20" r="3" fill="#1a365d" />
        </svg>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute bottom-4 right-4"
      >
        <svg width="30" height="30" viewBox="0 0 30 30" className="opacity-15">
          <path d="M0,15 Q7.5,5 15,15 Q22.5,25 30,15" stroke="#1a365d" strokeWidth="1" fill="none" />
          <path d="M0,20 Q7.5,10 15,20 Q22.5,30 30,20" stroke="#1a365d" strokeWidth="0.5" fill="none" />
        </svg>
      </motion.div>
    </div>
  )
}