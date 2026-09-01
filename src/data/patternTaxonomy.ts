/** 纹样主题 / 子类 / 场景 — 与 LoRA 训练目录对齐 */
import { SCENE_KEYWORDS } from '../config/culturalSemantics'

export type PatternThemeId = 'floral' | 'geometric'

export interface PatternSubcategory {
  id: string
  label: string
  trigger: string
}

export interface PatternTheme {
  id: PatternThemeId
  label: string
  subcategories: PatternSubcategory[]
}

/** 无卷草纹、无通用；「其他」放最后 */
export const PATTERN_THEMES: PatternTheme[] = [
  {
    id: 'floral',
    label: '花卉',
    subcategories: [
      { id: 'chrysanthemum', label: '菊花纹', trigger: 'ichpattern_chrysanthemum' },
      { id: 'lotus', label: '莲花纹', trigger: 'ichpattern_lotus' },
      { id: 'plum', label: '梅花纹', trigger: 'ichpattern_plum' },
      { id: 'peony', label: '牡丹纹', trigger: 'ichpattern_peony' },
      { id: 'orchid', label: '兰花纹', trigger: 'ichpattern_orchid' },
      { id: 'furong', label: '芙蓉花纹', trigger: 'ichpattern_hibiscus' },
      { id: 'pomegranate_flower', label: '石榴花纹', trigger: 'ichpattern_pomegranate_flower' },
    ],
  },
  {
    id: 'geometric',
    label: '几何',
    subcategories: [
      { id: 'huiwen', label: '回纹', trigger: 'ichpattern_huiwen' },
      { id: 'panchang', label: '盘长纹', trigger: 'ichpattern_panchang' },
      { id: 'jindi', label: '锦地纹', trigger: 'ichpattern_jindi' },
      { id: 'fangsheng', label: '方胜纹', trigger: 'ichpattern_fangsheng' },
    ],
  },
]

/** 使用场景选项：从文化语义表 scene 字段自动去重生成（见 culturalSemantics.ts） */
export { SCENE_OPTIONS } from '../config/culturalSemantics'

export function parsePromptToTags(text: string): {
  themeId?: PatternThemeId
  subcategoryId?: string
  sceneIds: string[]
} {
  const t = text.trim()
  const sceneIds: string[] = []
  // 场景识别：遍历语义表自动汇总的关键词，命中的标准场景全部勾选
  for (const [id, kws] of Object.entries(SCENE_KEYWORDS)) {
    if (kws.some((kw) => t.includes(kw)) && !sceneIds.includes(id)) {
      sceneIds.push(id)
    }
  }

  let themeId: PatternThemeId | undefined
  let subcategoryId: string | undefined

  const geometricMap: [RegExp, string][] = [
    [/回纹|回字纹/, 'huiwen'],
    [/盘长|盘肠纹/, 'panchang'],
    [/锦地/, 'jindi'],
    [/方胜/, 'fangsheng'],
  ]
  for (const [re, id] of geometricMap) {
    if (re.test(t)) {
      themeId = 'geometric'
      subcategoryId = id
      break
    }
  }
  if (!subcategoryId) {
    const floralMap: [RegExp, string][] = [
      [/牡丹/, 'peony'],
      [/莲|荷/, 'lotus'],
      [/梅/, 'plum'],
      [/菊/, 'chrysanthemum'],
      [/兰花|兰草/, 'orchid'],
      [/芙蓉/, 'furong'],
      [/石榴/, 'pomegranate_flower'],
    ]
    for (const [re, id] of floralMap) {
      if (re.test(t)) {
        themeId = 'floral'
        subcategoryId = id
        break
      }
    }
  }
  if (!themeId) {
    if (/花|花卉|植物/.test(t)) themeId = 'floral'
    else if (/几何|回纹|盘长|锦地|方胜/.test(t)) themeId = 'geometric'
  }
  return { themeId, subcategoryId, sceneIds }
}

export function getSubcategories(themeId: PatternThemeId) {
  return PATTERN_THEMES.find((t) => t.id === themeId)?.subcategories ?? []
}

export function findSubcategory(themeId: PatternThemeId, subId: string) {
  return getSubcategories(themeId).find((s) => s.id === subId)
}

/** 跨主题按子类 id 查找（融合推荐、双槽互斥校验用）；找不到返回 null */
export function findSubcategoryById(
  subId: string
): { id: string; label: string; themeId: PatternThemeId } | null {
  for (const theme of PATTERN_THEMES) {
    const sub = theme.subcategories.find((s) => s.id === subId)
    if (sub) return { id: sub.id, label: sub.label, themeId: theme.id }
  }
  return null
}
