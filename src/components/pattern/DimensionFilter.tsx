/**
 * 第二步：选择灵感参考
 * 主题 → 子类 → 使用场景（无高级参考）
 */
import { useMemo } from 'react'
import { PatternDimension } from '../../types/pattern'
import {
  PATTERN_THEMES,
  SCENE_OPTIONS,
  getSubcategories,
  type PatternThemeId,
} from '../../data/patternTaxonomy'

interface DimensionFilterProps {
  value: PatternDimension
  onChange: (value: PatternDimension) => void
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-song rounded-sm border transition-all ${
        active
          ? 'bg-palace-red text-rice-paper border-palace-red shadow-sm'
          : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-palace-red'
      }`}
    >
      {children}
    </button>
  )
}

export function DimensionFilter({ value, onChange }: DimensionFilterProps) {
  const mainTheme = (value.mainTheme || '') as PatternThemeId | ''
  const subcategory = value.subcategory || ''
  const scenes = value.scenes || []

  const subs = useMemo(
    () => (mainTheme ? getSubcategories(mainTheme) : []),
    [mainTheme]
  )

  const selectedSceneHints = SCENE_OPTIONS.filter((s) => scenes.includes(s.id))

  return (
    <div className="space-y-5">
      <div>
        <p className="font-song text-sm text-deep-blue mb-2">
          主题 <span className="text-palace-red">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {PATTERN_THEMES.map((t) => (
            <Chip
              key={t.id}
              active={mainTheme === t.id}
              onClick={() =>
                onChange({
                  ...value,
                  mainTheme: t.id,
                  subcategory: '',
                  theme: t.id === 'floral' ? ['plant'] : ['animal'],
                })
              }
            >
              {t.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="font-song text-sm text-deep-blue mb-2">
          纹样子类 <span className="text-palace-red">*</span>
          <span className="text-deep-blue-light text-xs ml-2">
            对应具体 LoRA（如鹤纹、牡丹纹）
          </span>
        </p>
        {!mainTheme ? (
          <p className="font-song text-xs text-deep-blue-light">请先选择主题</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subs.map((s) => (
              <Chip
                key={s.id}
                active={subcategory === s.id}
                onClick={() => onChange({ ...value, subcategory: s.id })}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-song text-sm text-deep-blue mb-2">
          使用场景
          <span className="text-deep-blue-light text-xs ml-2">可选，将附加场景提示词</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SCENE_OPTIONS.map((s) => (
            <Chip
              key={s.id}
              active={scenes.includes(s.id)}
              onClick={() => {
                const next = scenes.includes(s.id)
                  ? scenes.filter((x) => x !== s.id)
                  : [...scenes, s.id]
                onChange({ ...value, scenes: next, application: next })
              }}
            >
              {s.label}
            </Chip>
          ))}
        </div>
        {selectedSceneHints.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedSceneHints.map((s) => (
              <div
                key={s.id}
                className="bg-deep-blue-50 border border-deep-blue-100 rounded-sm px-3 py-2"
              >
                <p className="font-song text-xs text-deep-blue mb-0.5">
                  {s.label} · 场景提示
                </p>
                <p className="font-song text-xs text-deep-blue-light leading-relaxed">
                  {s.promptHint}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
