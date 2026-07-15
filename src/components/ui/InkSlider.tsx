import { useState, useRef, useEffect, useCallback } from 'react'

interface InkSliderProps {
  label: string
  leftLabel?: string
  rightLabel?: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  className?: string
}

interface InkParticle {
  x: number
  y: number
  radius: number
  opacity: number
}

export function InkSlider({ label, leftLabel, rightLabel, value, min, max, step = 1, onChange, className = '' }: InkSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<InkParticle[]>([])
  const animationRef = useRef<number>(0)
  const lastParticleFrameRef = useRef(0)

  const percentage = ((value - min) / (max - min)) * 100

  const handleMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const newPercentage = x / rect.width
    const newValue = Math.round((min + newPercentage * (max - min)) / step) * step
    onChange(Math.max(min, Math.min(max, newValue)))
  }, [min, max, step, onChange])

  const addParticle = useCallback((x: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const centerX = x * dpr
    const centerY = rect.height / 2 * dpr

    particlesRef.current.push({
      x: centerX,
      y: centerY,
      radius: 2 * dpr,
      opacity: 0.35,
    })
  }, [])

  const renderParticles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    particlesRef.current = particlesRef.current.filter(particle => {
      particle.radius += 0.8 * dpr
      particle.opacity -= 0.015

      if (particle.opacity <= 0) return false

      ctx.save()
      ctx.globalAlpha = particle.opacity
      ctx.filter = `blur(${6 * dpr}px)`
      ctx.beginPath()
      ctx.arc(particle.x / dpr, particle.y / dpr, particle.radius / dpr, 0, Math.PI * 2)
      ctx.fillStyle = '#9e2b25'
      ctx.fill()
      ctx.restore()

      return true
    })

    animationRef.current = requestAnimationFrame(renderParticles)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    handleMove(e.clientX)
    
    const rect = sliderRef.current?.getBoundingClientRect()
    if (rect) {
      addParticle(e.clientX - rect.left)
    }
  }, [handleMove, addParticle])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    handleMove(e.touches[0].clientX)
    
    const rect = sliderRef.current?.getBoundingClientRect()
    if (rect) {
      addParticle(e.touches[0].clientX - rect.left)
    }
  }, [handleMove, addParticle])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(renderParticles)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [renderParticles])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX)
        
        const frame = performance.now()
        if (frame - lastParticleFrameRef.current > 50) {
          const rect = sliderRef.current?.getBoundingClientRect()
          if (rect) {
            addParticle(e.clientX - rect.left)
          }
          lastParticleFrameRef.current = frame
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX)
        
        const frame = performance.now()
        if (frame - lastParticleFrameRef.current > 50) {
          const rect = sliderRef.current?.getBoundingClientRect()
          if (rect) {
            addParticle(e.touches[0].clientX - rect.left)
          }
          lastParticleFrameRef.current = frame
        }
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
  }, [isDragging, handleMove, addParticle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-1">
        {leftLabel || label ? (
          <span className="font-song text-sm text-deep-blue-light">{leftLabel || label}</span>
        ) : null}
        {rightLabel && <span className="font-song text-sm text-deep-blue-light">{rightLabel}</span>}
      </div>
      <div
        ref={sliderRef}
        className="relative h-10 cursor-pointer select-none touch-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="absolute top-0 transition-all duration-75"
          style={{ 
            left: `calc(${percentage}% - 14px)`,
            width: '28px',
            textAlign: 'center'
          }}
        >
          <span className="font-song font-medium text-deep-blue text-sm">{value}</span>
        </div>
        
        <div className="absolute top-5 left-0 right-0 flex items-center justify-center">
          <div 
            className="w-full h-[3px] bg-[#e5dcc8] rounded-full relative overflow-hidden"
            style={{ background: '#e5dcc8' }}
          >
            <div 
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ 
                width: `${percentage}%`,
                background: 'linear-gradient(90deg, #9e2b25, #c9a227)'
              }}
            />
          </div>
          
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>
        
        <div
          className="absolute top-5 transition-transform duration-75"
          style={{ 
            top: '20px',
            left: `calc(${percentage}% - 8px)` 
          }}
        >
          <div className={`relative w-4 h-4 transition-transform ${isDragging ? 'scale-125' : 'hover:scale-110'}`}>
            <div 
              className="absolute inset-0 rounded-full"
              style={{ 
                backgroundColor: '#9e2b25',
                boxShadow: '0 0 0 3px rgba(158,43,37,0.15)'
              }}
            />
          </div>
        </div>
        
        <div className="absolute left-0 right-0 flex justify-between px-1" style={{ top: '24px' }}>
          <span className="text-xs font-song text-deep-blue-light">{min}</span>
          <span className="text-xs font-song text-deep-blue-light">{max}</span>
        </div>
      </div>
    </div>
  )
}
