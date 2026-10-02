import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { InkSlider } from '../ui/InkSlider'
import { BambooToggle } from '../ui/Select'
import { ColorPalette } from '../ui/ColorPalette'
import { GenerationParams as GenerationParamsType, ARRANGEMENT_OPTIONS, SYMMETRY_OPTIONS, ColorSchemeParams } from '../../types/pattern'
import { SUBCATEGORY_PANTONE_MAP, getPantoneForSubcategory, getFangshengLayoutPreset } from '../../config/generationPresets'
import { findPantoneEntry, normalizePantoneCode } from '../../config/pantoneMap'
import { getLoraEntry } from '../../config/loraMap'

interface GenerationParamsProps {
  value: GenerationParamsType
  onChange: (value: GenerationParamsType) => void
  selectedPatternName?: string
}

interface ColorPickerProps {
  value: ColorSchemeParams
  onChange: (value: ColorSchemeParams) => void
  /** 当前选中的纹样子类 ID，用于高亮对应的默认潘通色号 */
  subcategoryId?: string
  /** 多个子类（融合场景）：推荐色取各子类并集，交集优先排序 */
  subcategoryIds?: string[]
}

const pantoneColors: Record<string, string> = {
  '18-1662 TCX': '#C3423F',
  '16-0541 TCX': '#5F9E6E',
  '19-4052 TCX': '#26364B',
  '14-1324 TCX': '#C5B358',
  '18-1662': '#C3423F',
  '16-0541': '#5F9E6E',
  '19-4052': '#26364B',
  '14-1324': '#C5B358',
  '19-4151 TCX': '#1A2A3A',
  '19-4151': '#1A2A3A',
  '16-1450 TCX': '#E8B4B8',
  '16-1450': '#E8B4B8',
  '15-1260 TCX': '#7CB342',
  '15-1260': '#7CB342',
  '17-1462 TCX': '#FF6F00',
  '17-1462': '#FF6F00',
  '19-3950 TCX': '#00695C',
  '19-3950': '#00695C',
  '12-0752 TCX': '#D4AF37',
  '12-0752': '#D4AF37',
  '19-4006 TCX': '#1C1C1A',
  '19-4006': '#1C1C1A',
  '20-0000 TCX': '#262626',
  '20-0000': '#262626',
  '11-0601 TCX': '#F5F5F5',
  '11-0601': '#F5F5F5',
  '18-3224 TCX': '#8E24AA',
  '18-3224': '#8E24AA',
  '16-4725 TCX': '#1565C0',
  '16-4725': '#1565C0',
  '15-5519 TCX': '#009688',
  '18-1550 TCX': '#D73A49',
  '18-1550': '#D73A49',
  '18-1555 TCX': '#E63946',
  '18-1555': '#E63946',
  '18-1660 TCX': '#B5174A',
  '18-1660': '#B5174A',
  '18-1664 TCX': '#C41E3A',
  '18-1664': '#C41E3A',
  '19-1760 TCX': '#8B0000',
  '19-1760': '#8B0000',
  '16-1520 TCX': '#F87171',
  '16-1520': '#F87171',
  '16-1525 TCX': '#FCA5A5',
  '16-1525': '#FCA5A5',
  '18-2125 TCX': '#DC143C',
  '18-2125': '#DC143C',
  '19-2045 TCX': '#800020',
  '19-2045': '#800020',
  '15-4520 TCX': '#4682B4',
  '15-4520': '#4682B4',
  '15-4525 TCX': '#5B8EAD',
  '15-4525': '#5B8EAD',
  '15-4530 TCX': '#6CA6CD',
  '15-4530': '#6CA6CD',
  '16-4535 TCX': '#87CEEB',
  '16-4535': '#87CEEB',
  '17-4540 TCX': '#ADD8E6',
  '17-4540': '#ADD8E6',
  '19-4065 TCX': '#00008B',
  '19-4065': '#00008B',
  '19-4070 TCX': '#0000CD',
  '19-4070': '#0000CD',
  '19-4075 TCX': '#191970',
  '19-4075': '#191970',
  '14-0130 TCX': '#20B2AA',
  '14-0130': '#20B2AA',
  '14-0135 TCX': '#3CB371',
  '14-0135': '#3CB371',
  '14-0140 TCX': '#228B22',
  '14-0140': '#228B22',
  '14-0145 TCX': '#006400',
  '14-0145': '#006400',
  '14-0150 TCX': '#556B2F',
  '14-0150': '#556B2F',
  '15-0160 TCX': '#90EE90',
  '15-0160': '#90EE90',
  '15-0165 TCX': '#98FB98',
  '15-0165': '#98FB98',
  '12-0740 TCX': '#FFD700',
  '12-0740': '#FFD700',
  '12-0745 TCX': '#FFA500',
  '12-0745': '#FFA500',
  '13-0750 TCX': '#FFEC8B',
  '13-0750': '#FFEC8B',
  '13-0755 TCX': '#FFFACD',
  '13-0755': '#FFFACD',
  '14-0850 TCX': '#FAFAD2',
  '14-0850': '#FAFAD2',
  '16-1145 TCX': '#D2691E',
  '16-1145': '#D2691E',
  '16-1150 TCX': '#CD853F',
  '16-1150': '#CD853F',
  '17-1155 TCX': '#BC8F8F',
  '17-1155': '#BC8F8F',
  '18-1160 TCX': '#8B7355',
  '18-1160': '#8B7355',
  '19-1165 TCX': '#6B4423',
  '19-1165': '#6B4423',
  '18-3020 TCX': '#4B0082',
  '18-3020': '#4B0082',
  '18-3025 TCX': '#6A5ACD',
  '18-3025': '#6A5ACD',
  '18-3030 TCX': '#8A2BE2',
  '18-3030': '#8A2BE2',
  '19-3035 TCX': '#9400D3',
  '19-3035': '#9400D3',
  '16-3040 TCX': '#DDA0DD',
  '16-3040': '#DDA0DD',
  '16-3045 TCX': '#EE82EE',
  '16-3045': '#EE82EE',
  '18-0500 TCX': '#555555',
  '18-0500': '#555555',
  '18-0510 TCX': '#666666',
  '18-0510': '#666666',
  '18-0520 TCX': '#777777',
  '18-0520': '#777777',
  '18-0530 TCX': '#888888',
  '18-0530': '#888888',
  '17-1220 TCX': '#F4511E',
  '17-1220': '#F4511E',
  '14-0848 TCX': '#FFC107',
  '14-0848': '#FFC107',
  '18-2120 TCX': '#D32F2F',
  '18-2120': '#D32F2F',
  '16-1360 TCX': '#4CAF50',
  '16-1360': '#4CAF50',
  '19-2106 TCX': '#E91E63',
  '19-2106': '#E91E63',
  '15-0343 TCX': '#00BCD4',
  '15-0343': '#00BCD4',
  '14-1111 TCX': '#CDDC39',
  '14-1111': '#CDDC39',
  '12-0302 TCX': '#FFFFFF',
  '12-0302': '#FFFFFF',
  '21-0102 TCX': '#000000',
  '21-0102': '#000000',
  '14-1116 TCX': '#DECDBE',
  '14-1116': '#DECDBE',
  '14-1112 TCX': '#E8DFD5',
  '14-1112': '#E8DFD5',
  '14-1114 TCX': '#E3D8CB',
  '14-1114': '#E3D8CB',
  '14-1118 TCX': '#D8C2B0',
  '14-1118': '#D8C2B0',
  '14-1120 TCX': '#CFB59E',
  '14-1120': '#CFB59E',
  '15-1030 TCX': '#F5E6D3',
  '15-1030': '#F5E6D3',
  '15-1035 TCX': '#DDC4A8',
  '15-1035': '#DDC4A8',
  '16-1130 TCX': '#C9A87C',
  '16-1130': '#C9A87C',
  '17-1140 TCX': '#B8926A',
  '17-1140': '#B8926A',
  '18-1150 TCX': '#A67B5B',
  '18-1150': '#A67B5B',
  '19-1160 TCX': '#8B6349',
  '19-1160': '#8B6349',
  '14-0000 TCX': '#4A4A4A',
  '14-0000': '#4A4A4A',
  '15-0000 TCX': '#6B6B6B',
  '15-0000': '#6B6B6B',
  '16-0000 TCX': '#8A8A8A',
  '16-0000': '#8A8A8A',
  '17-0000 TCX': '#A6A6A6',
  '17-0000': '#A6A6A6',
  '18-0000 TCX': '#C0C0C0',
  '18-0000': '#C0C0C0',
  '19-0000 TCX': '#D9D9D9',
  '19-0000': '#D9D9D9',
  '18-0005 TCX': '#F0F0F0',
  '18-0005': '#F0F0F0',
  '19-0005 TCX': '#FAFAFA',
  '19-0005': '#FAFAFA',
  '18-0106 TCX': '#E8E8E8',
  '18-0106': '#E8E8E8',
  '18-0205 TCX': '#D8D8D8',
  '18-0205': '#D8D8D8',
  '18-0305 TCX': '#C8C8C8',
  '18-0305': '#C8C8C8',
  '18-0405 TCX': '#B8B8B8',
  '18-0405': '#B8B8B8',
  '18-0505 TCX': '#A8A8A8',
  '18-0505': '#A8A8A8',
  '18-0605 TCX': '#989898',
  '18-0605': '#989898',
  '18-0705 TCX': '#888888',
  '18-0705': '#888888',
  '18-0805 TCX': '#787878',
  '18-0805': '#787878',
  '18-0905 TCX': '#686868',
  '18-0905': '#686868',
  '18-1005 TCX': '#585858',
  '18-1005': '#585858',
}

const getPantoneColor = (pantone: string): string | undefined => {
  const normalized = pantone.trim().toUpperCase()

  // generationPresets 里硬编码的两个语义关键词（monochrome-black / multicolor）
  // 不是真正的潘通色号，给它们一个视觉占位色，避免 UI 弹"未找到色号"误报
  if (normalized === 'MONOCHROME-BLACK') return '#1a1a1a'
  if (normalized === 'MULTICOLOR') return 'linear-gradient(135deg, #d32f2f 0%, #fbc02d 25%, #388e3c 50%, #1976d2 75%, #7b1fa2 100%)'

  // 统一潘通表（src/config/pantoneMap.ts）优先：覆盖 '14-3904 TCX'、'16-1720 TCX' 等
  // 推荐色号，且 '14-3904' 与 '14-3904 TCX' 等价（表内自动生成短号别名）
  const entry = findPantoneEntry(pantone)
  if (entry) return entry.hex

  if (pantoneColors[normalized]) {
    return pantoneColors[normalized]
  }

  const baseCode = normalized.split(' ')[0]
  if (pantoneColors[baseCode]) {
    return pantoneColors[baseCode]
  }

  return undefined
}

export function ColorPicker({ value, onChange, subcategoryId, subcategoryIds }: ColorPickerProps) {
  const [imagePreview, setImagePreview] = useState<string>('')
  const [sampledColors, setSampledColors] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // 融合场景可传多个子类：推荐色取并集、交集优先；单子类时兼容原 subcategoryId
  const subIds = subcategoryIds && subcategoryIds.length > 0
    ? Array.from(new Set(subcategoryIds.filter((id): id is string => Boolean(id))))
    : subcategoryId
      ? [subcategoryId]
      : []

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setImagePreview(result)
        onChange({ ...value, mode: 'image' })
      }
      reader.readAsDataURL(file)
    }
  }

  const drawImageToCanvas = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight)
    const x = (rect.width - img.naturalWidth * scale) / 2
    const y = (rect.height - img.naturalHeight * scale) / 2

    ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !imagePreview) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ctx = canvas.getContext('2d')

    if (ctx) {
      const imageData = ctx.getImageData(x, y, 1, 1)
      const [r, g, b] = imageData.data
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
      setSampledColors((prev) => [...prev.slice(-4), hex])
      onChange({ ...value, mode: 'image', colors: [...sampledColors.slice(-4), hex] })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange({ ...value, mode: 'hue' })}
          className={`flex-1 py-1.5 rounded-sm font-song text-xs transition-all ${
            value.mode === 'hue'
              ? 'bg-palace-red text-rice-paper'
              : 'bg-rice-paper border border-deep-blue-200 text-deep-blue'
          }`}
        >
          色相/明度
        </button>
        <button
          onClick={() => onChange({ ...value, mode: 'pantone' })}
          className={`flex-1 py-1.5 rounded-sm font-song text-xs transition-all ${
            value.mode === 'pantone'
              ? 'bg-palace-red text-rice-paper'
              : 'bg-rice-paper border border-deep-blue-200 text-deep-blue'
          }`}
        >
          潘通色号
        </button>
        <button
          onClick={() => onChange({ ...value, mode: 'image' })}
          className={`flex-1 py-1.5 rounded-sm font-song text-xs transition-all ${
            value.mode === 'image'
              ? 'bg-palace-red text-rice-paper'
              : 'bg-rice-paper border border-deep-blue-200 text-deep-blue'
          }`}
        >
          图片吸色
        </button>
      </div>

      {value.mode === 'hue' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <ColorPalette
            hue={value.hue || 0}
            brightness={value.brightness || 50}
            onChange={(h, b) => onChange({ ...value, hue: h, brightness: b })}
          />
          <div className="space-y-2">
            <InkSlider
              label="色相"
              value={value.hue || 0}
              min={0}
              max={360}
              onChange={(v) => onChange({ ...value, hue: v })}
            />
            <InkSlider
              label="明度"
              value={value.brightness || 50}
              min={0}
              max={100}
              onChange={(v) => onChange({ ...value, brightness: v })}
            />
          </div>
        </motion.div>
      )}

      {value.mode === 'pantone' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <input
            type="text"
            placeholder="输入潘通色号，如 18-1662 TCX"
            value={value.pantone || ''}
            onChange={(e) => onChange({ ...value, pantone: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red cursor-text"
          />
          <div className="text-[11px] font-song text-deep-blue-300 mt-1">支持手动输入潘通色号，如 18-1662 TCX 或 18-1662</div>

          {/* 颜色预览条 + 错误提示：紧跟输入框，匹配成功时显示色块长条，失败时显示错误 */}
          {(value.pantone || '').trim() && (
            <div className="mt-2">
              {getPantoneColor(value.pantone || '') ? (
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-8 rounded-sm border border-deep-blue-200 shadow-sm"
                    style={{ background: getPantoneColor(value.pantone || '') }}
                  />
                  <span className="font-song text-sm text-deep-blue-light whitespace-nowrap">
                    {value.pantone === 'monochrome-black'
                      ? '单色黑预设'
                      : value.pantone === 'multicolor'
                        ? '多色预设'
                        : (() => {
                            const entry = Object.values(SUBCATEGORY_PANTONE_MAP).find(
                              (p) => normalizePantoneCode(p.pantoneCode) === normalizePantoneCode(value.pantone || '')
                            )
                            return entry ? `${entry.label} · ${value.pantone}` : value.pantone
                          })()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-warning-50 border border-warning-200 rounded-sm">
                  <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-song text-sm text-warning-dark">未找到该潘通色号，请输入正确的色号格式，如 18-1662 TCX</span>
                </div>
              )}
            </div>
          )}

          {/* 子类默认色号：高亮显示当前（单/多）子类对应的潘通色；多子类取并集、交集优先 */}
          {subIds.length > 0 && (() => {
            const recs = subIds
              .map((id) => getPantoneForSubcategory(id))
              .filter((p): p is NonNullable<ReturnType<typeof getPantoneForSubcategory>> => Boolean(p))
            if (recs.length === 0) return null
            // 统计每个色号命中的子类数量，交集（命中 >1）排前面
            const codeCount: Record<string, number> = {}
            subIds.forEach((id) => {
              const p = getPantoneForSubcategory(id)
              if (p) codeCount[p.pantoneCode] = (codeCount[p.pantoneCode] || 0) + 1
            })
            const uniqueRecs = Array.from(new Map(recs.map((p) => [p.pantoneCode, p])).values())
              .sort((a, b) => (codeCount[b.pantoneCode] || 0) - (codeCount[a.pantoneCode] || 0))
            return (
              <div className="mt-2 p-2 bg-ming-yellow/15 border border-ming-yellow/40 rounded-sm">
                <div className="flex items-center gap-2 text-xs font-song text-deep-blue-light mb-1.5">
                  <span className="text-ming-yellow">✦</span>
                  <span>{subIds.length > 1 ? '两个纹样共同适用色' : '当前子类推荐色'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {uniqueRecs.map((defaultPantone) => {
                    const hex = getPantoneColor(defaultPantone.pantoneCode)
                    const isActive = normalizePantoneCode(value.pantone || '') === normalizePantoneCode(defaultPantone.pantoneCode)
                    const shared = (codeCount[defaultPantone.pantoneCode] || 0) > 1
                    return (
                      <button
                        key={defaultPantone.pantoneCode}
                        type="button"
                        onClick={() => {
                          // 切到潘通色号 Tab，写入规范色号（'14-3904' → '14-3904 TCX'），保证可查
                          const entry = findPantoneEntry(defaultPantone.pantoneCode)
                          onChange({ ...value, mode: 'pantone', pantone: entry?.code ?? defaultPantone.pantoneCode })
                        }}
                        title={shared ? `${defaultPantone.label}（两纹样通用）` : `${defaultPantone.label} · ${defaultPantone.pantoneCode}`}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm transition-all ${
                          isActive
                            ? 'bg-palace-red text-rice-paper border border-palace-red shadow-sm'
                            : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-sm border border-deep-blue-200 flex-shrink-0"
                          style={{ background: hex || '#ccc' }}
                        />
                        <div className="text-left flex-1 min-w-0">
                          <div className={`text-sm font-song truncate ${isActive ? 'text-rice-paper' : 'text-deep-blue'}`}>
                            {defaultPantone.label}
                          </div>
                          <div className={`text-xs font-song truncate ${isActive ? 'text-rice-paper/80' : 'text-deep-blue-light'}`}>
                            {defaultPantone.pantoneCode}{shared ? ' · 通用' : ''}
                          </div>
                        </div>
                        {isActive && (
                          <svg className="w-4 h-4 text-rice-paper flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* 全部子类默认色号快捷选择：按主题显示几何色或花卉色；双子类显示并集 */}
          <div className="mt-2">
            {(() => {
              const entryList = subIds.map((id) => getLoraEntry(id)).filter(Boolean)
              const isFloral = entryList.some((e) => e?.themeId === 'floral')
              const isGeometric = entryList.some((e) => e?.themeId === 'geometric')
              // 几何色号集合
              // 几何常用色固定色板：深藏青、宫墙红、金色、朱红 + 墨黑（线稿/方胜可选补充）
              const geometricCodes = new Set<string>(['19-4052 TCX', '18-1662 TCX', '12-0752 TCX', '18-1555 TCX', '19-4006 TCX'])
              // 花卉色号集合
              const flowerCodes = new Set<string>(['16-1450 TCX', '12-0752 TCX', '18-1662 TCX', '18-1555 TCX', '14-3904 TCX', '16-1720 TCX'])

              // 根据主题过滤：只显示当前主题的色号；无主题时全部显示
              const allCodes = Array.from(new Set(Object.values(SUBCATEGORY_PANTONE_MAP).map((p) => p.pantoneCode)))
              const filteredCodes = subIds.length > 1
                ? allCodes.filter((c) => geometricCodes.has(c) || flowerCodes.has(c))
                : isGeometric
                  ? allCodes.filter((c) => geometricCodes.has(c))
                  : isFloral
                    ? allCodes.filter((c) => flowerCodes.has(c))
                    : allCodes

              const gridLabel = subIds.length > 1
                ? '双纹样常用色'
                : isFloral
                  ? '花卉纹样常用色'
                  : isGeometric
                    ? '几何纹样常用色'
                    : '纹样常用色'

              return (
                <>
                  <div className="text-xs font-song text-deep-blue-light mb-1.5">{gridLabel}</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {filteredCodes.map((code) => {
                      const info = Object.values(SUBCATEGORY_PANTONE_MAP).find((p) => p.pantoneCode === code)
                      const hex = getPantoneColor(code) || '#ccc'
                      const isActive = normalizePantoneCode(value.pantone || '') === normalizePantoneCode(code)
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            // 切到潘通色号 Tab，写入规范色号，保证可查
                            const entry = findPantoneEntry(code)
                            onChange({ ...value, mode: 'pantone', pantone: entry?.code ?? code })
                          }}
                          className={`flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-sm border transition-all ${
                            isActive
                              ? 'border-palace-red bg-palace-red/10 shadow-sm'
                              : 'border-deep-blue-200 bg-rice-paper hover:border-palace-red'
                          }`}
                          title={`${info?.label || ''} ${code}`}
                        >
                          <div
                            className="w-7 h-7 rounded-sm border border-deep-blue-200"
                            style={{ background: hex }}
                          />
                          <span className={`text-[10px] font-song leading-tight ${isActive ? 'text-palace-red font-semibold' : 'text-deep-blue-light'}`}>
                            {info?.label || code.split(' ')[0]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </div>
        </motion.div>
      )}

      {value.mode === 'image' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full px-3 py-2 text-sm bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue cursor-pointer"
          />
          {imagePreview && (
            <div className="relative">
              <div className="w-full h-28 bg-rice-paper-dark rounded-sm border border-deep-blue-200 overflow-hidden relative">
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="参考图"
                  className="w-full h-full object-contain"
                  onLoad={drawImageToCanvas}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onClick={handleCanvasClick}
                />
                <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-rice-paper text-xs rounded-sm">
                  点击图片吸色
                </span>
              </div>
              {sampledColors.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {sampledColors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-6 h-6 rounded-sm border border-deep-blue-200 shadow-sm"
                      style={{ background: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

export function GenerationParamsPanel({ value, onChange, selectedPatternName }: GenerationParamsProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-shufa text-xl text-deep-blue flex items-center">
        <span className="w-8 h-8 bg-deep-blue rounded-sm flex items-center justify-center text-rice-paper mr-3 text-sm">
          调
        </span>
        生成纹样参数
      </h2>

      {selectedPatternName && (
        <div className="bg-ming-yellow/20 border border-ming-yellow/30 rounded-sm px-4 py-2">
          <span className="font-song text-xs text-deep-blue-light">
            已根据你选择的参考纹样「{selectedPatternName}」预设了初始参数，可自由调整
          </span>
        </div>
      )}

      <InkSlider
        label="纹样繁复度"
        leftLabel="极简几何"
        rightLabel="满铺繁复"
        value={value.complexity}
        min={0}
        max={100}
        onChange={(v) => onChange({ ...value, complexity: v })}
      />

      <InkSlider
        label="肌理还原度（数值越高保留刺绣针脚、印染晕染、织锦肌理，数值越低越平面化）"
        leftLabel="平面化"
        rightLabel="肌理还原"
        value={value.textureDetail}
        min={0}
        max={100}
        onChange={(v) => onChange({ ...value, textureDetail: v })}
      />

      <div>
        <label className="block font-song text-deep-blue mb-2">配色方案</label>
        <ColorPicker
          value={value.colorScheme}
          onChange={(v) => onChange({ ...value, colorScheme: v })}
          subcategoryId={value.dimension?.subcategory}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-song text-deep-blue mb-2">排布方式</label>
          <BambooToggle
            options={ARRANGEMENT_OPTIONS}
            value={value.arrangement}
            onChange={(v) => {
              const arrangement = v as GenerationParamsType['arrangement']
              let next: GenerationParamsType = { ...value, arrangement }
              // 方胜纹：排布=四方连续 ↔ 单独 自动切换对应预设（与 loraMap 排布分流一致），
              // 回写疏密/平面化/文化强度/对称/推荐色；融合页由 buildFusionPromptParts 自动切 LoRA
              if (value.dimension?.subcategory === 'fangsheng') {
                const layoutPreset = getFangshengLayoutPreset(arrangement)
                next = {
                  ...next,
                  complexity: layoutPreset.complexity,
                  textureDetail: layoutPreset.textureDetail,
                  culturalIntensity: layoutPreset.culturalIntensity,
                  symmetry: layoutPreset.symmetry,
                  colorScheme: layoutPreset.colorScheme,
                }
              }
              onChange(next)
            }}
          />
        </div>

        <div>
          <label className="block font-song text-deep-blue mb-2">对称方式</label>
          <BambooToggle
            options={SYMMETRY_OPTIONS}
            value={value.symmetry}
            onChange={(v) => onChange({ ...value, symmetry: v as GenerationParamsType['symmetry'] })}
          />
        </div>
      </div>

      <div>
        <label className="block font-song text-deep-blue mb-2">
          文化符号强度
          <span className="text-xs text-deep-blue-light ml-2">（数值越低，生成结果对传统符号的再创作/抽象化程度越高；数值越高，越贴近符号原始形态）</span>
        </label>
        <InkSlider
          label=""
          value={value.culturalIntensity}
          min={0}
          max={100}
          onChange={(v) => onChange({ ...value, culturalIntensity: v })}
        />
      </div>
    </div>
  )
}
