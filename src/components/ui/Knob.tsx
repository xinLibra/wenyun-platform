import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  step?: number
  className?: string
}

export function Knob({ label, value, min, max, onChange, step = 1, className = '' }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<HTMLDivElement>(null)
  const startValueRef = useRef(0)

  const range = max - min
  const percentage = ((value - min) / range) * 100
  const angle = (percentage / 100) * 270 - 135

  const handleMove = useCallback((clientY: number) => {
    if (!knobRef.current || !isDragging) return
    
    const rect = knobRef.current.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const deltaY = centerY - clientY
    
    const sensitivity = 0.5
    const deltaValue = Math.round(deltaY * sensitivity / step) * step
    const newValue = Math.max(min, Math.min(max, startValueRef.current + deltaValue))
    
    onChange(newValue)
  }, [isDragging, min, max, step, onChange])

  const handleMouseDown = (_e: React.MouseEvent) => {
    setIsDragging(true)
    startValueRef.current = value
  }

  const handleTouchStart = (_e: React.TouchEvent) => {
    setIsDragging(true)
    startValueRef.current = value
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientY)
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleMove])

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="font-song text-deep-blue mb-2">{label}</span>
      
      <div
        ref={knobRef}
        className={`relative w-20 h-20 rounded-full bg-gradient-to-b from-rice-paper to-rice-paper-dark border-4 border-deep-blue-200 cursor-pointer select-none touch-none shadow-lg ${isDragging ? 'shadow-xl scale-105' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute inset-2 rounded-full bg-rice-paper-light border border-deep-blue-100" />
        
        <motion.div
          className="absolute inset-3 rounded-full bg-gradient-to-br from-white to-rice-paper-dark flex items-center justify-center"
          style={{ rotate: angle }}
        >
          <div className="absolute top-2 w-1.5 h-4 bg-palace-red rounded-full" />
          
          <div className="relative" style={{ transform: `rotate(${-angle}deg)` }}>
            <span className="font-song font-medium text-deep-blue text-sm">{value}°</span>
          </div>
        </motion.div>
        
        <div className="absolute inset-0 rounded-full border border-palace-red/20" />
        
        {[...Array(12)].map((_, i) => {
          const tickAngle = (i / 12) * 270 - 135
          const tickLength = i % 3 === 0 ? 4 : 2
          return (
            <div
              key={i}
              className="absolute w-0.5 bg-deep-blue-light/40"
              style={{
                height: tickLength,
                left: '50%',
                top: '4px',
                transformOrigin: '50% 36px',
                transform: `translateX(-50%) rotate(${tickAngle}deg)`,
              }}
            />
          )
        })}
      </div>
      
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onChange(Math.max(min, value - step * 15))}
          className="px-2 py-1 bg-deep-blue/10 rounded-sm hover:bg-deep-blue/20 transition-colors font-song text-sm"
        >
          -
        </button>
        <span className="font-song text-sm text-deep-blue-light">{min}° - {max}°</span>
        <button
          onClick={() => onChange(Math.min(max, value + step * 15))}
          className="px-2 py-1 bg-deep-blue/10 rounded-sm hover:bg-deep-blue/20 transition-colors font-song text-sm"
        >
          +
        </button>
      </div>
    </div>
  )
}