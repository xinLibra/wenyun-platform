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
  containerRef,
}: DraggableTextProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const dragOffsetStartX = useRef(0)
  const dragOffsetStartY = useRef(0)

  const fontMap: Record<string, string> = {
    shufa: 'Ma Shan Zheng, cursive',
    song: 'Noto Serif SC, serif',
    hei: 'Noto Sans SC, sans-serif',
    kai: 'KaiTi, serif',
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
    setIsDragging(true)
    const touch = e.touches[0]
    dragStartX.current = touch.clientX
    dragStartY.current = touch.clientY
    dragOffsetStartX.current = positionX
    dragOffsetStartY.current = positionY
  }, [onSelect, positionX, positionY])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const deltaX = ((touch.clientX - dragStartX.current) / rect.width) * 100
    const deltaY = ((touch.clientY - dragStartY.current) / rect.height) * 100
    const newX = Math.max(0, Math.min(100, dragOffsetStartX.current + deltaX))
    const newY = Math.max(0, Math.min(100, dragOffsetStartY.current + deltaY))
    onPositionChange(newX, newY)
  }, [isDragging, onPositionChange, containerRef])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
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