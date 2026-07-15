import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

interface ColorWheelProps {
  hue: number
  brightness: number
  onChangeHue: (hue: number) => void
  onChangeBrightness: (brightness: number) => void
}

export function ColorWheel({ hue, brightness, onChangeHue, onChangeBrightness }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isBrightnessDragging, setIsBrightnessDragging] = useState(false)

  const drawColorWheel = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = canvas.width
    const center = size / 2
    const radius = size / 2 - 10

    ctx.clearRect(0, 0, size, size)

    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius)
    for (let i = 0; i <= 360; i += 10) {
      const stop = i / 360
      gradient.addColorStop(stop, `hsl(${i}, 100%, 50%)`)
    }

    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.arc(center, center, radius - 25, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(${hue}, 70%, ${brightness}%)`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(center, center, radius - 30, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    const indicatorAngle = ((hue - 90) * Math.PI) / 180
    const indicatorX = center + Math.cos(indicatorAngle) * (radius - 12)
    const indicatorY = center + Math.sin(indicatorAngle) * (radius - 12)

    ctx.beginPath()
    ctx.arc(indicatorX, indicatorY, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#333333'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
  }, [hue, brightness])

  useEffect(() => {
    drawColorWheel()
  }, [drawColorWheel])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const center = canvas.width / 2
    const radius = canvas.width / 2 - 10

    const dx = x - center
    const dy = y - center
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance <= radius && distance >= radius - 25) {
      setIsDragging(true)
      updateHue(x, y, center)
    } else if (distance <= radius - 25) {
      setIsBrightnessDragging(true)
      updateBrightness(x, y, center, radius)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && !isBrightnessDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const center = canvas.width / 2
    const radius = canvas.width / 2 - 10

    if (isDragging) {
      updateHue(x, y, center)
    } else if (isBrightnessDragging) {
      updateBrightness(x, y, center, radius)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsBrightnessDragging(false)
  }

  const updateHue = (x: number, y: number, center: number) => {
    let angle = Math.atan2(y - center, x - center)
    angle = (angle * 180) / Math.PI + 90
    if (angle < 0) angle += 360
    onChangeHue(Math.round(angle))
  }

  const updateBrightness = (x: number, y: number, center: number, radius: number) => {
    const dx = x - center
    const dy = y - center
    const distance = Math.sqrt(dx * dx + dy * dy)
    const normalizedDistance = Math.min(distance, radius - 25) / (radius - 25)
    const newBrightness = Math.round(100 - normalizedDistance * 60)
    onChangeBrightness(Math.max(20, Math.min(100, newBrightness)))
  }

  const colorPreview = `hsl(${hue}, 70%, ${brightness}%)`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-pointer rounded-full shadow-lg"
        />
        <p className="font-song text-xs text-deep-blue-light mt-2">
          外圈拖动调整色相 · 内圈拖动调整明度
        </p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div
          className="w-16 h-16 rounded-sm shadow-lg border-2 border-deep-blue-200"
          style={{ background: colorPreview }}
        />
        <div className="text-left">
          <div className="font-song text-sm text-deep-blue-light">
            <span className="text-deep-blue">色相：</span>{hue}°
          </div>
          <div className="font-song text-sm text-deep-blue-light">
            <span className="text-deep-blue">明度：</span>{brightness}%
          </div>
        </div>
      </div>
    </motion.div>
  )
}