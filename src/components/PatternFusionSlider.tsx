import { useState } from 'react'

interface PatternOption {
  patternId: string
  patternName: string
  imageUrl: string
}

interface PatternFusionSliderProps {
  patternA: PatternOption
  patternB: PatternOption
  onFusionChange?: (ratioA: number, ratioB: number) => void
  onGenerate?: (ratioA: number, ratioB: number) => void
  isGenerating?: boolean
}

export function PatternFusionSlider({
  patternA,
  patternB,
  onFusionChange,
  onGenerate,
  isGenerating = false,
}: PatternFusionSliderProps) {
  // ratioA 是纹样A的权重（0-100），ratioB 自动等于 100 - ratioA
  const [ratioA, setRatioA] = useState(50)
  const ratioB = 100 - ratioA

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRatioA = Number(e.target.value)
    setRatioA(newRatioA)
    onFusionChange?.(newRatioA, 100 - newRatioA)
  }

  return (
    <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100 p-5">
      <h3 className="font-shufa text-lg text-deep-blue text-center mb-4">纹样融合</h3>

      {/* 两个纹样的预览图 */}
      <div className="flex items-center justify-center gap-6 mb-5">
        <div className="text-center">
          <div className="w-20 h-20 rounded-sm overflow-hidden border-2 border-palace-red mx-auto mb-1">
            <img src={patternA.imageUrl} alt={patternA.patternName} className="w-full h-full object-cover" />
          </div>
          <p className="font-song text-xs text-deep-blue">{patternA.patternName}</p>
        </div>

        <span className="font-shufa text-2xl text-deep-blue-light">+</span>

        <div className="text-center">
          <div className="w-20 h-20 rounded-sm overflow-hidden border-2 border-deep-blue-200 mx-auto mb-1">
            <img src={patternB.imageUrl} alt={patternB.patternName} className="w-full h-full object-cover" />
          </div>
          <p className="font-song text-xs text-deep-blue">{patternB.patternName}</p>
        </div>
      </div>

      {/* 融合比例滑块 */}
      <div className="mb-4">
        <div className="flex justify-between font-song text-sm text-deep-blue mb-2">
          <span>{patternA.patternName} {ratioA}%</span>
          <span>{patternB.patternName} {ratioB}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ratioA}
          onChange={handleSliderChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #9E1F36 0%, #9E1F36 ${ratioA}%, #1A365D ${ratioA}%, #1A365D 100%)`,
          }}
        />
      </div>

      {/* 可视化比例条（对应之前设计稿里的 ■■■■■■■■□ 效果） */}
      <div className="flex gap-0.5 mb-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-sm ${i < Math.round(ratioA / 10) ? 'bg-palace-red' : 'bg-deep-blue-200'}`}
          />
        ))}
      </div>

      <button
        onClick={() => onGenerate?.(ratioA, ratioB)}
        disabled={isGenerating}
        className="w-full py-3 bg-palace-red text-rice-paper font-song font-medium rounded-sm hover:bg-palace-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? '融合生成中...' : '重新生成融合纹样'}
      </button>
    </div>
  )
}