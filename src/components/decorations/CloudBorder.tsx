interface CloudBorderProps {
  className?: string
}

export function CloudBorder({ className = '' }: CloudBorderProps) {
  return (
    <svg className={`absolute inset-0 pointer-events-none ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9E1F36" />
          <stop offset="50%" stopColor="#F4C430" />
          <stop offset="100%" stopColor="#9E1F36" />
        </linearGradient>
      </defs>
      <path
        d="M2,50 Q2,10 20,10 Q30,10 35,20 Q40,10 50,10 Q60,10 65,20 Q70,10 80,10 Q98,10 98,50 Q98,90 80,90 Q70,90 65,80 Q60,90 50,90 Q40,90 35,80 Q30,90 20,90 Q2,90 2,50"
        fill="none"
        stroke="url(#cloudGradient)"
        strokeWidth="0.5"
      />
      <path
        d="M5,50 Q5,15 22,15 Q30,15 34,23 Q38,15 48,15 Q58,15 62,23 Q66,15 78,15 Q95,15 95,50 Q95,85 78,85 Q66,85 62,77 Q58,85 48,85 Q38,85 34,77 Q30,85 22,85 Q5,85 5,50"
        fill="none"
        stroke="#9E1F36"
        strokeWidth="0.3"
        strokeDasharray="1,1"
      />
    </svg>
  )
}

export function CloudCorner({ position = 'top-left', className = '' }: { position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; className?: string }) {
  const transforms = {
    'top-left': 'rotate(0)',
    'top-right': 'rotate(90)',
    'bottom-left': 'rotate(-90)',
    'bottom-right': 'rotate(180)',
  }
  
  return (
    <svg className={`absolute w-8 h-8 ${position === 'top-left' ? 'top-0 left-0' : position === 'top-right' ? 'top-0 right-0' : position === 'bottom-left' ? 'bottom-0 left-0' : 'bottom-0 right-0'} ${className}`} viewBox="0 0 40 40">
      <g transform={`translate(40, 0) ${transforms[position]}`}>
        <path d="M35,5 Q30,0 25,5 Q20,0 15,5 Q10,0 5,5 Q0,5 0,10 Q0,15 5,15 Q0,20 0,25 Q0,30 5,30 Q5,35 10,35 Q15,35 15,30 Q20,35 20,35" fill="none" stroke="#9E1F36" strokeWidth="1" />
        <circle cx="32" cy="8" r="2" fill="#F4C430" />
      </g>
    </svg>
  )
}
