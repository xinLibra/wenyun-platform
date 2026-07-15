import { ReactNode } from 'react'
import { CornerDecoration } from '../decorations/CornerDecorations'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  bordered?: boolean
  onClick?: () => void  // 新增
}

export function Card({ children, className = '', hover = false, bordered = true, onClick }: CardProps) {
  return (
    <div
      className={`relative bg-rice-paper-light rounded-sm ${bordered ? 'border-2 border-palace-red' : ''} ${hover ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''} transition-all duration-300 ${className}`}
      onClick={onClick}
    >
      {bordered && (
        <>
          <CornerDecoration position="top-left" type="cloud" />
          <CornerDecoration position="top-right" type="cloud" />
          <CornerDecoration position="bottom-left" type="cloud" />
          <CornerDecoration position="bottom-right" type="cloud" />
        </>
      )}
      <div className="relative z-10 p-4">
        {children}
      </div>
    </div>
  )
}

export function PatternCard({ image, title, style, className = '' }: { image: string; title: string; style: string; className?: string }) {
  return (
    <div className={`relative group cursor-pointer ${className}`}>
      <div className="absolute -inset-2 border-2 border-palace-red opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-sm" />
      <div className="relative bg-rice-paper rounded-sm overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300">
        <div className="aspect-square bg-rice-paper-dark">
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-rice-paper translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="font-shufa text-xl mb-1">{title}</h3>
          <p className="text-sm opacity-80">{style}</p>
        </div>
      </div>
    </div>
  )
}

// ===== 修改的重点在这里：添加了 onClick 属性 =====
export function ProductCard({ 
  image, 
  name, 
  price, 
  className = '',
  onClick 
}: { 
  image: string
  name: string
  price: string
  className?: string
  onClick?: () => void
}) {
  return (
    <div 
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
    >
      <div className="relative bg-rice-paper-light rounded-sm p-4 shadow-md group-hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-palace-red" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-palace-red" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-palace-red" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-palace-red" />
        
        <div className="aspect-[3/4] bg-rice-paper-dark mb-3 flex items-center justify-center">
          <img src={image} alt={name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" />
        </div>
        
        <div className="text-center">
          <h4 className="font-song text-base text-deep-blue mb-1">{name}</h4>
          <p className="font-song font-medium text-palace-red">¥{price}</p>
        </div>
      </div>
    </div>
  )
}