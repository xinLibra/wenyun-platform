interface PatternOption {
  patternId: string
  patternName: string
  imageUrl: string
}

interface PatternGroup {
  groupLabel: string
  options: PatternOption[]
}

interface PatternPickerProps {
  // 保留旧的 flat 用法以兼容；新用法用 groups 分组展示（示例 / 我的作品 / 我的收藏）
  options?: PatternOption[]
  groups?: PatternGroup[]
  // 按选择顺序排列：selectedSlots[0] = 第一个选中的纹样，selectedSlots[1] = 第二个选中的纹样
  selectedSlots: (PatternOption | null)[]
  onSelect: (option: PatternOption) => void
  label: string
  isLoading?: boolean
}

const SLOT_BORDER_CLASSES = ['border-palace-red', 'border-deep-blue-400']
const SLOT_BADGE_CLASSES = ['bg-palace-red', 'bg-deep-blue-400']

function PatternGrid({
  options,
  selectedSlots,
  onSelect,
}: {
  options: PatternOption[]
  selectedSlots: (PatternOption | null)[]
  onSelect: (option: PatternOption) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((opt) => {
        const slotIndex = selectedSlots.findIndex((s) => s?.patternId === opt.patternId)
        const isSelected = slotIndex !== -1
        return (
          <button
            key={opt.patternId}
            onClick={() => onSelect(opt)}
            title={opt.patternName}
            className={`relative aspect-square rounded-sm overflow-hidden border-2 transition-colors ${
              isSelected ? SLOT_BORDER_CLASSES[slotIndex] : 'border-transparent hover:border-deep-blue-200'
            }`}
          >
            <img src={opt.imageUrl} alt={opt.patternName} className="w-full h-full object-cover" />
            {isSelected && (
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full text-[10px] leading-4 text-center text-rice-paper font-song ${SLOT_BADGE_CLASSES[slotIndex]}`}
              >
                {slotIndex + 1}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function PatternPicker({ options, groups, selectedSlots, onSelect, label, isLoading }: PatternPickerProps) {
  const resolvedGroups: PatternGroup[] = groups ?? (options ? [{ groupLabel: '', options }] : [])
  const hasAnyOption = resolvedGroups.some((g) => g.options.length > 0)

  return (
    <div>
      <p className="font-song text-sm text-deep-blue mb-2">{label}</p>
      {isLoading ? (
        <p className="font-song text-xs text-deep-blue-light py-4 text-center">加载中...</p>
      ) : !hasAnyOption ? (
        <p className="font-song text-xs text-deep-blue-light py-4 text-center">暂无可选纹样</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {resolvedGroups.map((group) =>
            group.options.length === 0 ? null : (
              <div key={group.groupLabel || 'default'}>
                {group.groupLabel && (
                  <p className="font-song text-xs text-deep-blue-light mb-1">{group.groupLabel}</p>
                )}
                <PatternGrid options={group.options} selectedSlots={selectedSlots} onSelect={onSelect} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}