interface SelectionBoxProps {
  show: boolean
  className?: string
  style?: React.CSSProperties
}

export function SelectionBox({ show, className = '', style = {} }: SelectionBoxProps) {
  if (!show) return null
  
  return (
    <div
      className={`absolute border-2 border-dashed border-cyan-400 rounded-sm pointer-events-none ${className}`}
      style={{
        mixBlendMode: 'normal',
        isolation: 'isolate',
        ...style,
      }}
    />
  )
}