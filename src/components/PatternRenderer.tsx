import { motion } from 'framer-motion'
import { SelectionBox } from './SelectionBox'

export type LayoutMode = 'tile' | 'band' | 'corner' | 'center' | 'free'

interface PatternRendererProps {
  layoutMode: LayoutMode
  patternImage: string
  scale: number
  rotation: number
  positionX: number
  positionY: number
  blendMode: string
  isSelected: boolean
  onSelect: () => void
  onMouseDown: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  imageSize?: 'small' | 'medium' | 'large'
}

const layoutPresets: Record<LayoutMode, {
  icon: string
  name: string
  scale: number
  rotation: number
  positionX: number
  positionY: number
  blendMode: string
}> = {
  tile: { icon: '◇', name: '重复平铺', scale: 50, rotation: 0, positionX: 50, positionY: 50, blendMode: 'screen' },
  band: { icon: '▬', name: '腰封式', scale: 100, rotation: 0, positionX: 50, positionY: 50, blendMode: 'screen' },
  corner: { icon: '◈', name: '角落点缀', scale: 80, rotation: 0, positionX: 25, positionY: 25, blendMode: 'screen' },
  center: { icon: '◎', name: '居中放大', scale: 120, rotation: 0, positionX: 50, positionY: 50, blendMode: 'screen' },
  free: { icon: '◆', name: '自由模式', scale: 100, rotation: 0, positionX: 50, positionY: 50, blendMode: 'screen' },
}

export function PatternRenderer({
  layoutMode,
  patternImage,
  scale,
  rotation,
  positionX,
  positionY,
  blendMode,
  isSelected,
  onSelect,
  onMouseDown,
  onTouchStart,
  onTouchMove,
  imageSize = 'medium',
}: PatternRendererProps) {
  const sizeMap = {
    small: { width: 'w-32', height: 'h-32', pxWidth: 128, pxHeight: 128 },
    medium: { width: 'w-36', height: 'h-36', pxWidth: 144, pxHeight: 144 },
    large: { width: 'w-40', height: 'h-40', pxWidth: 160, pxHeight: 160 },
  }

  const currentSize = sizeMap[imageSize]

  const renderTileMode = () => (
    <>
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: `url(${patternImage})`,
          backgroundSize: `${scale / 2}%`,
          backgroundRepeat: 'repeat',
          opacity: 0.7,
          mixBlendMode: blendMode as any,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
        }}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseDown={(e) => { e.stopPropagation(); onSelect(); onMouseDown(e); }}
        onTouchStart={(e) => { onSelect(); onTouchStart(e); }}
        onTouchMove={onTouchMove}
      />
      <SelectionBox
              show={isSelected}
              className="-inset-4"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            />
    </>
  )

  const renderBandMode = () => {
    const bandHeight = `${scale / 5}%`
    const bandTop = `${positionY - scale / 10}%`
    
    return (
      <>
        <div
          className="absolute cursor-grab active:cursor-grabbing"
          style={{
            left: `${(positionX - 50) * 0.8}%`,
            right: `${(50 - positionX) * 0.8}%`,
            top: bandTop,
            height: bandHeight,
            backgroundImage: `url(${patternImage})`,
            backgroundSize: `${scale / 4}%`,
            backgroundPosition: 'center',
            backgroundRepeat: 'repeat-x',
            opacity: 0.7,
            mixBlendMode: blendMode as any,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onMouseDown={(e) => { e.stopPropagation(); onSelect(); onMouseDown(e); }}
          onTouchStart={(e) => { onSelect(); onTouchStart(e); }}
          onTouchMove={onTouchMove}
        />
        <SelectionBox
                  show={isSelected}
                  style={{
                    left: `${(positionX - 50) * 0.8}%`,
                    right: `${(50 - positionX) * 0.8}%`,
                    top: bandTop,
                    height: bandHeight,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
      </>
    )
  }

  const renderImageMode = () => (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center cursor-grab select-none active:cursor-grabbing ${isSelected ? 'z-10' : 'z-5'}`}
      animate={{
        scale: scale / 100,
        rotate: rotation,
        x: (positionX - 50) * 2,
        y: (positionY - 50) * 2,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        transformOrigin: 'center center',
        mixBlendMode: blendMode as any,
        touchAction: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); onMouseDown(e); }}
      onTouchStart={(e) => { onSelect(); onTouchStart(e); }}
      onTouchMove={onTouchMove}
      drag={false}
    >
      <img
        src={patternImage}
        alt="纹样"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className={`${currentSize.width} ${currentSize.height} object-cover`}
        style={{
          opacity: 0.7,
          userSelect: 'none',
          pointerEvents: 'none',
        } as React.CSSProperties}
      />
      <SelectionBox 
        show={isSelected} 
        className={`${currentSize.width} ${currentSize.height}`} 
      />
    </motion.div>
  )

  const renderCornerMode = () => (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center cursor-grab select-none active:cursor-grabbing ${isSelected ? 'z-10' : 'z-5'}`}
      animate={{
        scale: scale / 100,
        rotate: rotation,
        x: (positionX - 50) * 2,
        y: (positionY - 50) * 2,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        transformOrigin: 'center center',
        mixBlendMode: blendMode as any,
        touchAction: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); onMouseDown(e); }}
      onTouchStart={(e) => { onSelect(); onTouchStart(e); }}
      onTouchMove={onTouchMove}
      drag={false}
    >
      <img
        src={patternImage}
        alt="纹样"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className={`${currentSize.width} ${currentSize.height} object-cover`}
        style={{
          opacity: 0.7,
          userSelect: 'none',
          pointerEvents: 'none',
        } as React.CSSProperties}
      />
      <SelectionBox 
        show={isSelected} 
        className={`${currentSize.width} ${currentSize.height}`} 
      />
    </motion.div>
  )

  switch (layoutMode) {
    case 'tile':
      return renderTileMode()
    case 'band':
      return renderBandMode()
    case 'corner':
      return renderCornerMode()
    case 'center':
    case 'free':
    default:
      return renderImageMode()
  }
}

export { layoutPresets }