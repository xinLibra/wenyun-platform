import { useState, useRef, useEffect, useCallback } from 'react'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
}

export function GuqinSlider({ label, value, min, max, step = 1, onChange, className = '' }: SliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  const percentage = ((value - min) / (max - min)) * 100

  const handleMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const newPercentage = x / rect.width
    const newValue = Math.round((min + newPercentage * (max - min)) / step) * step
    onChange(Math.max(min, Math.min(max, newValue)))
  }, [min, max, step, onChange])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleMove(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    handleMove(e.touches[0].clientX)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX)
      }
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
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-3">
        <span className="font-song text-deep-blue">{label}</span>
        <span className="font-song font-medium text-deep-blue text-lg">{value}</span>
      </div>
      <div
        ref={sliderRef}
        className="relative h-12 cursor-pointer select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
          <div className="w-full h-2 bg-rice-paper-dark rounded-sm relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="inkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1a1a2e" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#1a1a2e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#1a1a2e" stopOpacity="0.1" />
                </linearGradient>
                <filter id="inkBlur">
                  <feGaussianBlur stdDeviation="1" />
                </filter>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#inkGradient)" />
            </svg>
            
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-deep-blue/60 via-deep-blue to-deep-blue/80 rounded-sm" 
              style={{ 
                width: `${percentage}%`,
                boxShadow: '0 0 10px rgba(26, 26, 46, 0.3)'
              }} 
            />
            
            <div className="absolute inset-0 flex items-center">
              {[...Array(11)].map((_, i) => (
                <div key={i} className="flex-1 flex justify-center">
                  <div className={`w-px rounded-full ${i === 0 || i === 10 ? 'h-5 bg-deep-blue/50' : i % 2 === 0 ? 'h-4 bg-deep-blue/30' : 'h-3 bg-deep-blue/20'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-transform duration-150"
          style={{ left: `calc(${percentage}% - 16px)` }}
        >
          <div className={`relative w-8 h-8 transition-transform ${isDragging ? 'scale-110' : 'hover:scale-105'}`}>
            <svg viewBox="0 0 32 32" className="w-full h-full">
              <defs>
                <radialGradient id="brushGradient" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#f5f5dc" />
                  <stop offset="100%" stopColor="#d4d4aa" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="14" fill="url(#brushGradient)" stroke="#1a1a2e" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="8" fill="#1a1a2e" opacity="0.8" />
              <circle cx="16" cy="16" r="6" fill="#1a1a2e" opacity="0.9" />
              <circle cx="16" cy="16" r="2" fill="#f5f5dc" />
            </svg>
          </div>
        </div>
        
        <div className="absolute -top-5 left-0 right-0 flex justify-between px-1">
          <span className="text-xs font-song text-deep-blue-light">{min}</span>
          <span className="text-xs font-song text-deep-blue-light">{max}</span>
        </div>
      </div>
    </div>
  )
}

interface RangeSliderProps {
  label: string
  value: number[]
  min: number
  max: number
  onChange: (value: number[]) => void
  className?: string
}

export function BambooSlider({ label, value, min, max, onChange, className = '' }: RangeSliderProps) {
  const [isDragging, setIsDragging] = useState<'start' | 'end' | false>(false)
  const sliderRef = useRef<HTMLDivElement>(null)

  const percentageStart = ((value[0] - min) / (max - min)) * 100
  const percentageEnd = ((value[1] - min) / (max - min)) * 100

  const handleMove = (clientX: number) => {
    if (!sliderRef.current || !isDragging) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const newPercentage = x / rect.width
    const newValue = Math.round(min + newPercentage * (max - min))

    if (isDragging === 'start') {
      onChange([Math.min(newValue, value[1] - 1), value[1]])
    } else {
      onChange([value[0], Math.max(newValue, value[0] + 1)])
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-song text-deep-blue">{label}</span>
        <span className="font-song font-medium text-deep-blue">{value[0]} - {value[1]}</span>
      </div>
      <div
        ref={sliderRef}
        className="relative h-8 cursor-pointer"
      >
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="w-full h-2 bg-rice-paper-dark rounded-sm relative">
            <div className="absolute inset-0 flex">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 border-r border-deep-blue-light/20 last:border-r-0" />
              ))}
            </div>
            <div
              className="absolute inset-y-0 bg-deep-blue/40 rounded-sm"
              style={{ left: `${percentageStart}%`, right: `${100 - percentageEnd}%` }}
            />
          </div>
        </div>
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 transition-transform ${isDragging === 'start' ? 'scale-110' : 'hover:scale-105'}`}
          style={{ left: `calc(${percentageStart}% - 12px)` }}
          onMouseDown={() => setIsDragging('start')}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#f5f5dc" stroke="#1a1a2e" strokeWidth="1" />
            <circle cx="12" cy="12" r="6" fill="#1a1a2e" opacity="0.7" />
          </svg>
        </div>
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 transition-transform ${isDragging === 'end' ? 'scale-110' : 'hover:scale-105'}`}
          style={{ left: `calc(${percentageEnd}% - 12px)` }}
          onMouseDown={() => setIsDragging('end')}
        >
          <svg viewBox="0 0 24 24" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#f5f5dc" stroke="#1a1a2e" strokeWidth="1" />
            <circle cx="12" cy="12" r="6" fill="#1a1a2e" opacity="0.7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
