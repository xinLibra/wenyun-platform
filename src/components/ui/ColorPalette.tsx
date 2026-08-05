import { motion } from 'framer-motion'

interface ColorPaletteProps {
  hue: number
  brightness: number
  onChange: (hue: number, brightness: number) => void
}

const traditionalColors = [
  { name: '群青', hue: 245, brightness: 60 },
  { name: '靛蓝', hue: 225, brightness: 55 },
  { name: '黛蓝', hue: 210, brightness: 40 },
  { name: '宝蓝', hue: 215, brightness: 70 },
  { name: '石青', hue: 200, brightness: 50 },
  { name: '翡翠', hue: 160, brightness: 55 },
  { name: '石绿', hue: 145, brightness: 50 },
  { name: '松绿', hue: 130, brightness: 45 },
  { name: '葱青', hue: 120, brightness: 60 },
  { name: '柳黄', hue: 85, brightness: 75 },
  { name: '藤黄', hue: 55, brightness: 80 },
  { name: '赭黄', hue: 45, brightness: 65 },
  { name: '朱砂', hue: 10, brightness: 65 },
  { name: '朱红', hue: 15, brightness: 70 },
  { name: '胭脂', hue: 340, brightness: 55 },
  { name: '海棠红', hue: 350, brightness: 60 },
  { name: '桃红', hue: 355, brightness: 70 },
  { name: '丁香', hue: 320, brightness: 65 },
  { name: '藕荷', hue: 305, brightness: 70 },
  { name: '雪青', hue: 285, brightness: 75 },
  { name: '月白', hue: 220, brightness: 95 },
  { name: '竹青', hue: 180, brightness: 70 },
  { name: '苍灰', hue: 220, brightness: 60 },
  { name: '墨黑', hue: 220, brightness: 15 },
]

export function ColorPalette({ hue, brightness, onChange }: ColorPaletteProps) {
  const colorPreview = `hsl(${hue}, 70%, ${brightness}%)`

  const handleColorClick = (colorHue: number, colorBrightness: number) => {
    onChange(colorHue, colorBrightness)
  }

  const isSelected = (colorHue: number, colorBrightness: number) => {
    return colorHue === hue && colorBrightness === brightness
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 w-full"
    >
      {/* 固定正方形 + 自动换行：一行排满再排下一行，不拉伸变形 */}
      <div className="flex flex-wrap gap-1.5 w-full">
        {traditionalColors.map((color) => (
          <button
            key={color.name}
            type="button"
            title={color.name}
            onClick={() => handleColorClick(color.hue, color.brightness)}
            className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-sm transition-all ${
              isSelected(color.hue, color.brightness)
                ? 'ring-2 ring-palace-red ring-offset-1 scale-110 z-10'
                : 'border border-deep-blue-200/40 hover:border-deep-blue'
            }`}
            style={{
              backgroundColor: `hsl(${color.hue}, 70%, ${color.brightness}%)`,
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-0.5">
        <div
          className="w-7 h-7 rounded-sm border border-deep-blue-200 shrink-0 shadow-sm"
          style={{ background: colorPreview }}
        />
        <div className="text-left font-song text-xs text-deep-blue-light leading-relaxed">
          <div>
            <span className="text-deep-blue">色相：</span>
            {hue}°
          </div>
          <div>
            <span className="text-deep-blue">明度：</span>
            {brightness}%
          </div>
        </div>
      </div>
    </motion.div>
  )
}
