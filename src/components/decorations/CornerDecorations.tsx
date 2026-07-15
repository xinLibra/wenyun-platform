interface CornerDecorationProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  type?: 'cloud' | 'lotus' | 'scroll' | 'geometric'
  className?: string
}

export function CornerDecoration({ position, type = 'cloud', className = '' }: CornerDecorationProps) {
  const transforms = {
    'top-left': 'rotate(0)',
    'top-right': 'rotate(90)',
    'bottom-left': 'rotate(-90)',
    'bottom-right': 'rotate(180)',
  }

  const getPath = () => {
    switch (type) {
      case 'lotus':
        return (
          <g transform="translate(0, 20)">
            <path d="M10,0 Q20,-15 30,0 Q20,-5 10,0" fill="#9E1F36" opacity="0.8" />
            <path d="M0,10 Q15,-5 30,10" fill="none" stroke="#9E1F36" strokeWidth="1" />
            <path d="M5,15 Q15,5 25,15" fill="none" stroke="#9E1F36" strokeWidth="0.5" />
            <circle cx="15" cy="12" r="2" fill="#F4C430" />
          </g>
        )
      case 'scroll':
        return (
          <g>
            <rect x="0" y="0" width="25" height="6" rx="3" fill="#D4A825" />
            <rect x="2" y="2" width="21" height="2" rx="1" fill="#1A365D" />
            <path d="M0,6 Q0,15 10,20 Q20,15 25,6" fill="none" stroke="#9E1F36" strokeWidth="1" />
          </g>
        )
      case 'geometric':
        return (
          <g>
            <path d="M0,0 L15,0 L15,15" stroke="#1A365D" strokeWidth="1" />
            <path d="M0,0 L0,15" stroke="#9E1F36" strokeWidth="1" />
            <path d="M5,5 L10,5 L10,10" stroke="#F4C430" strokeWidth="0.5" />
            <path d="M0,5 L5,5" stroke="#9E1F36" strokeWidth="0.5" />
            <path d="M5,0 L5,5" stroke="#9E1F36" strokeWidth="0.5" />
          </g>
        )
      default:
        return (
          <g>
            <path d="M0,10 Q5,0 15,5 Q20,0 25,10 Q20,5 15,10 Q10,5 5,10 Q5,15 10,15" fill="#9E1F36" opacity="0.6" />
            <path d="M0,15 L20,15" stroke="#9E1F36" strokeWidth="1" />
            <circle cx="12" cy="8" r="1.5" fill="#F4C430" />
          </g>
        )
    }
  }

  return (
    <svg
      className={`absolute w-10 h-10 ${position === 'top-left' ? 'top-2 left-2' : position === 'top-right' ? 'top-2 right-2' : position === 'bottom-left' ? 'bottom-2 left-2' : 'bottom-2 right-2'} ${className}`}
      viewBox="0 0 30 25"
    >
      <g transform={`translate(30, 0) ${transforms[position]}`}>
        {getPath()}
      </g>
    </svg>
  )
}

export function FrameDecorations({ 
  className = '', 
  children 
}: { 
  className?: string
  children?: React.ReactNode 
}) {
  return (
    <div className={`relative ${className}`}>
      <CornerDecoration position="top-left" type="cloud" />
      <CornerDecoration position="top-right" type="cloud" />
      <CornerDecoration position="bottom-left" type="cloud" />
      <CornerDecoration position="bottom-right" type="cloud" />
      {/* 在四个角落装饰的中间渲染传入的内容 */}
      {children}
    </div>
  )
}
