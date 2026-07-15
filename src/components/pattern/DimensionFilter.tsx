import { useState } from 'react'
import { motion } from 'framer-motion'
import { PatternDimension, CRAFT_OPTIONS, ETHNIC_OPTIONS, THEME_OPTIONS, APPLICATION_OPTIONS } from '../../types/pattern'
import { InkSlider } from '../ui/InkSlider'

interface DimensionFilterProps {
  value: PatternDimension
  onChange: (value: PatternDimension) => void
}

interface MultiSelectTagProps {
  options: { id: string; label: string; children?: string[] }[]
  selected: string[]
  onChange: (selected: string[]) => void
  label: string
}

function MultiSelectTag({ options, selected, onChange, label }: MultiSelectTagProps) {
  const handleSelect = (id: string) => {
    if (selected.includes(id)) {
      onChange([])
    } else {
      onChange([id])
    }
  }

  return (
    <div className="mb-4">
      <label className="block font-shufa text-deep-blue text-sm mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(option.id)}
            className={`px-3 py-1.5 rounded-sm text-sm font-song transition-all duration-300 ${
              selected.includes(option.id)
                ? 'bg-palace-red text-rice-paper shadow-md'
                : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red'
            }`}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export function DimensionFilter({ value, onChange }: DimensionFilterProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['craft', 'ethnic', 'theme', 'style', 'application'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const updateStyle = (key: keyof PatternDimension['style'], val: number) => {
    onChange({
      ...value,
      style: { ...value.style, [key]: val },
    })
  }

  const totalSelected = [
    ...value.craft,
    ...value.ethnic,
    ...value.theme,
    ...value.application,
  ].length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-shufa text-xl text-deep-blue flex items-center">
          <span className="w-8 h-8 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-3 text-sm">
            选
          </span>
          多维度筛选
        </h2>
        <span className="font-song text-xs text-deep-blue-light bg-deep-blue-50 px-3 py-1 rounded-full">
          {totalSelected} 个条件已选
        </span>
      </div>

      <div className="space-y-3">
        <motion.div
          layout
          initial={false}
          className="bg-rice-paper border border-deep-blue-100 rounded-sm overflow-hidden"
        >
          <button
            onClick={() => toggleSection('craft')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-deep-blue-50 transition-colors"
          >
            <span className="font-shufa text-deep-blue">工艺</span>
            <motion.div
              animate={{ rotate: expandedSections.has('craft') ? 180 : 0 }}
              className="w-4 h-4 text-deep-blue-light"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: expandedSections.has('craft') ? 'auto' : 0, opacity: expandedSections.has('craft') ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <MultiSelectTag
                options={CRAFT_OPTIONS}
                selected={value.craft}
                onChange={(v) => onChange({ ...value, craft: v })}
                label="选择工艺类型"
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          layout
          initial={false}
          className="bg-rice-paper border border-deep-blue-100 rounded-sm overflow-hidden"
        >
          <button
            onClick={() => toggleSection('ethnic')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-deep-blue-50 transition-colors"
          >
            <span className="font-shufa text-deep-blue">族群/地域</span>
            <motion.div
              animate={{ rotate: expandedSections.has('ethnic') ? 180 : 0 }}
              className="w-4 h-4 text-deep-blue-light"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: expandedSections.has('ethnic') ? 'auto' : 0, opacity: expandedSections.has('ethnic') ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <MultiSelectTag
                options={ETHNIC_OPTIONS}
                selected={value.ethnic}
                onChange={(v) => onChange({ ...value, ethnic: v })}
                label="选择族群或地域"
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          layout
          initial={false}
          className="bg-rice-paper border border-deep-blue-100 rounded-sm overflow-hidden"
        >
          <button
            onClick={() => toggleSection('theme')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-deep-blue-50 transition-colors"
          >
            <span className="font-shufa text-deep-blue">纹样题材</span>
            <motion.div
              animate={{ rotate: expandedSections.has('theme') ? 180 : 0 }}
              className="w-4 h-4 text-deep-blue-light"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: expandedSections.has('theme') ? 'auto' : 0, opacity: expandedSections.has('theme') ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <MultiSelectTag
                options={THEME_OPTIONS}
                selected={value.theme}
                onChange={(v) => onChange({ ...value, theme: v })}
                label="选择纹样题材"
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          layout
          initial={false}
          className="bg-rice-paper border border-deep-blue-100 rounded-sm overflow-hidden"
        >
          <button
            onClick={() => toggleSection('style')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-deep-blue-50 transition-colors"
          >
            <span className="font-shufa text-deep-blue">参考纹样风格倾向</span>
            <motion.div
              animate={{ rotate: expandedSections.has('style') ? 180 : 0 }}
              className="w-4 h-4 text-deep-blue-light"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: expandedSections.has('style') ? 'auto' : 0, opacity: expandedSections.has('style') ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div>
                <InkSlider
                  label=""
                  leftLabel="具象"
                  rightLabel="抽象"
                  value={value.style.figurative}
                  min={0}
                  max={100}
                  onChange={(v) => updateStyle('figurative', v)}
                />
                <span className="text-xs text-deep-blue-light">控制参考纹样本身的写实/抽象程度</span>
              </div>
              <InkSlider
                label=""
                leftLabel="传统"
                rightLabel="现代"
                value={value.style.traditional}
                min={0}
                max={100}
                onChange={(v) => updateStyle('traditional', v)}
              />
              <InkSlider
                label=""
                leftLabel="手作感"
                rightLabel="数字科技感"
                value={value.style.handmade}
                min={0}
                max={100}
                onChange={(v) => updateStyle('handmade', v)}
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          layout
          initial={false}
          className="bg-rice-paper border border-deep-blue-100 rounded-sm overflow-hidden"
        >
          <button
            onClick={() => toggleSection('application')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-deep-blue-50 transition-colors"
          >
            <span className="font-shufa text-deep-blue">应用场景</span>
            <motion.div
              animate={{ rotate: expandedSections.has('application') ? 180 : 0 }}
              className="w-4 h-4 text-deep-blue-light"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: expandedSections.has('application') ? 'auto' : 0, opacity: expandedSections.has('application') ? 1 : 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <MultiSelectTag
                options={APPLICATION_OPTIONS}
                selected={value.application}
                onChange={(v) => onChange({ ...value, application: v })}
                label="选择应用场景"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}