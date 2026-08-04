import { useState } from 'react'
import { GeneratingPulse } from './ui/GeneratingPulse'

interface PatternOption {
  patternId: string
  patternName: string
  imageUrl: string
}

interface PatternFusionSliderProps {
  patternA: PatternOption | null
  patternB: PatternOption | null
  onFusionChange?: (ratioA: number, ratioB: number) => void
  onGenerate?: (ratioA: number, ratioB: number) => void
  isGenerating?: boolean
  resultImage?: string // 融合后的结果图，由父组件维护，与 AI 生成模式的预览图完全隔离
}

function PatternSlot({ pattern, placeholderLabel, borderClass }: { pattern: PatternOption | null; placeholderLabel: string; borderClass: string }) {
  return (
    <div className="text-center">
      <div className={`w-20 h-20 rounded-sm overflow-hidden border-2 mx-auto mb-1 ${pattern ? borderClass : 'border-dashed border-deep-blue-200 flex items-center justify-center bg-rice-paper-dark/30'}`}>
        {pattern ? (
          <img src={pattern.imageUrl} alt={pattern.patternName} className="w-full h-full object-cover" />
        ) : (
          <span className="font-song text-[10px] text-deep-blue-light px-1">{placeholderLabel}</span>
        )}
      </div>
      <p className="font-song text-xs text-deep-blue">{pattern ? pattern.patternName : placeholderLabel}</p>
    </div>
  )
}

export function PatternFusionSlider({
  patternA,
  patternB,
  onFusionChange,
  onGenerate,
  isGenerating = false,
  resultImage,
}: PatternFusionSliderProps) {
  // ratioA 是纹样A的权重（0-100），ratioB 自动等于 100 - ratioA
  const [ratioA, setRatioA] = useState(50)
  const ratioB = 100 - ratioA
  const canFuse = Boolean(patternA && patternB)

  const updateRatio = (newRatioA: number) => {
    const clamped = Math.min(100, Math.max(0, newRatioA))
    setRatioA(clamped)
    onFusionChange?.(clamped, 100 - clamped)
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateRatio(Number(e.target.value))
  }

  // 点击色块，滑块自动跳到该色块所在的整十区间（i=0 -> 10%, i=9 -> 100%）
  const handleBlockClick = (index: number) => {
    if (!canFuse) return
    updateRatio((index + 1) * 10)
  }

  const nameA = patternA?.patternName ?? '第一个纹样'
  const nameB = patternB?.patternName ?? '第二个纹样'

  return (
    <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100 p-5">
      <h3 className="font-shufa text-lg text-deep-blue text-center mb-4">纹样融合</h3>

      {/* 融合结果预览 */}
      <div className="mb-5">
        <div className="w-48 h-48 mx-auto rounded-sm overflow-hidden border border-deep-blue-100 bg-rice-paper-dark/40 flex items-center justify-center">
          {isGenerating ? (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <GeneratingPulse size={90} />
              <span className="absolute bottom-6 font-song text-deep-blue-light text-xs">融合生成中...</span>
            </div>
          ) : resultImage ? (
            <img src={resultImage} alt="融合结果预览" className="w-full h-full object-cover" />
          ) : !canFuse ? (
            <p className="font-song text-xs text-deep-blue-light px-4 text-center">请先选择两个纹样</p>
          ) : (
            <p className="font-song text-xs text-deep-blue-light px-4 text-center">
              调整下方比例后点击「重新生成融合纹样」查看效果
            </p>
          )}
        </div>
      </div>

      {/* 两个纹样的预览图 */}
      <div className="flex items-center justify-center gap-6 mb-5">
        <PatternSlot pattern={patternA} placeholderLabel="第一个纹样" borderClass="border-palace-red" />
        <span className="font-shufa text-2xl text-deep-blue-light">+</span>
        <PatternSlot pattern={patternB} placeholderLabel="第二个纹样" borderClass="border-deep-blue-400" />
      </div>

      {/* 融合比例滑块 */}
      <div className="mb-2">
        <div className="flex justify-between font-song text-sm text-deep-blue mb-2">
          <span>{nameA} {ratioA}%</span>
          <span>{nameB} {ratioB}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ratioA}
          onChange={handleSliderChange}
          disabled={!canFuse}
          className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #9E1F36 0%, #9E1F36 ${ratioA}%, #1A365D ${ratioA}%, #1A365D 100%)`,
          }}
        />
      </div>

      {/* 可视化比例条：点击色块，滑块自动跳到对应的整十区间 */}
      <div className="flex gap-0.5 mb-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`将比例设为 ${(i + 1) * 10}%`}
            onClick={() => handleBlockClick(i)}
            disabled={!canFuse}
            className={`h-2 flex-1 rounded-sm transition-colors ${canFuse ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
              i < Math.round(ratioA / 10) ? 'bg-palace-red hover:bg-palace-red-dark' : 'bg-deep-blue-200 hover:bg-deep-blue-300'
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => onGenerate?.(ratioA, ratioB)}
        disabled={isGenerating || !canFuse}
        className="w-full py-3 bg-palace-red text-rice-paper font-song font-medium rounded-sm hover:bg-palace-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? '融合生成中...' : canFuse ? '重新生成融合纹样' : '请先选择两个纹样'}
      </button>
    </div>
  )
}
