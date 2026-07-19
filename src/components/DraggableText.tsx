import { useState, useRef, useEffect, useCallback } from 'react'
import { SelectionBox } from './SelectionBox'

interface DraggableTextProps {
  text: string
  font: 'shufa' | 'song' | 'hei' | 'kai'
  fontSize: number
  positionX: number
  positionY: number
  rotation: number
  isSelected: boolean
  onSelect: () => void
  onPositionChange: (x: number, y: number) => void
  onSizeChange: (size: number) => void
  onRotationChange: (rotation: number) => void
  containerRef: React.RefObject<HTMLDivElement>
}

export function DraggableText({
  text,
  font,
  fontSize,
  positionX,
  positionY,
  rotation,
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  containerRef,
}: DraggableTextProps) {
const [isDragging, setIsDragging] = useState(false)
  const [isPinching, setIsPinching] = useState(false)
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const dragOffsetStartX = useRef(0)
  const dragOffsetStartY = useRef(0)
  const pinchStartDistance = useRef(0)
  const pinchStartAngle = useRef(0)
  const pinchStartFontSize = useRef(0)
  const pinchStartRotation = useRef(0)

  const fontMap: Record<string, string> = {
    shufa: 'Ma Shan Zheng, cursive',
    song: 'Noto Serif SC, serif',
    hei: 'Noto Sans SC, sans-serif',
    kai: 'KaiTi, serif',
  }

  const getTouchDistance = (touches: React.TouchList | TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const getTouchAngle = (touches: React.TouchList | TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    return (Math.atan2(dy, dx) * 180) / Math.PI
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartY.current = e.clientY
    dragOffsetStartX.current = positionX
    dragOffsetStartY.current = positionY
  }, [onSelect, positionX, positionY])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const deltaX = ((e.clientX - dragStartX.current) / rect.width) * 100
    const deltaY = ((e.clientY - dragStartY.current) / rect.height) * 100
    const newX = Math.max(0, Math.min(100, dragOffsetStartX.current + deltaX))
    const newY = Math.max(0, Math.min(100, dragOffsetStartY.current + deltaY))
    onPositionChange(newX, newY)
  }, [isDragging, onPositionChange, containerRef])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation()
    onSelect()

    if (e.touches.length === 2) {
      setIsDragging(false)
      setIsPinching(true)
      pinchStartDistance.current = getTouchDistance(e.touches)
      pinchStartAngle.current = getTouchAngle(e.touches)
      pinchStartFontSize.current = fontSize
      pinchStartRotation.current = rotation
      return
    }

    setIsPinching(false)
    setIsDragging(true)
    const touch = e.touches[0]
    dragStartX.current = touch.clientX
    dragStartY.current = touch.clientY
    dragOffsetStartX.current = positionX
    dragOffsetStartY.current = positionY
  }, [onSelect, positionX, positionY, fontSize, rotation])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault()

      const currentDistance = getTouchDistance(e.touches)
      const currentAngle = getTouchAngle(e.touches)

      const scaleFactor = currentDistance / pinchStartDistance.current
      const newFontSize = Math.max(8, Math.min(120, pinchStartFontSize.current * scaleFactor))
      onSizeChange(Math.round(newFontSize))

      let angleDelta = currentAngle - pinchStartAngle.current
      let newRotation = pinchStartRotation.current + angleDelta
      newRotation = Math.max(-180, Math.min(180, newRotation))
      onRotationChange(Math.round(newRotation))
      return
    }

    if (!isDragging || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const deltaX = ((touch.clientX - dragStartX.current) / rect.width) * 100
    const deltaY = ((touch.clientY - dragStartY.current) / rect.height) * 100
    const newX = Math.max(0, Math.min(100, dragOffsetStartX.current + deltaX))
    const newY = Math.max(0, Math.min(100, dragOffsetStartY.current + deltaY))
    onPositionChange(newX, newY)
  }, [isDragging, isPinching, onPositionChange, onSizeChange, onRotationChange, containerRef])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setIsDragging(false)
    if (e.touches.length < 2) {
      setIsPinching(false)
    }
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('mouseleave', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('mouseleave', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      className={`absolute cursor-move select-none ${isSelected ? 'z-30' : 'z-20'}`}
      style={{
        left: `${positionX}%`,
        top: `${positionY}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        fontFamily: fontMap[font],
        fontSize: `${fontSize}px`,
        color: '#1a1a2e',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 2px rgba(255,255,255,0.8)',
        padding: '4px 8px',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <span>{text}</span>
      <SelectionBox
        show={isSelected}
        className="-inset-2"
        style={{
          transform: 'none',
          left: '-8px',
          top: '-8px',
          right: '-8px',
          bottom: '-8px',
        }}
      />
    </div>
  )
}