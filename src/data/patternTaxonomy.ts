/** 纹样主题 / 子类 / 场景 — 与 LoRA 训练目录对齐 */
import { SCENE_KEYWORDS } from '../config/culturalSemantics'

export type PatternThemeId = 'floral' | 'beast'

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
      { id: 'interlocking_floral', label: '缠枝花纹', trigger: 'ichpattern_interlocking_floral' },
      { id: 'gourd', label: '葫芦纹', trigger: 'ichpattern_gourd' },
      { id: 'flower_bird', label: '花鸟纹', trigger: 'ichpattern_flower_bird' },
      { id: 'chrysanthemum', label: '菊花纹', trigger: 'ichpattern_chrysanthemum' },
      { id: 'lotus', label: '莲花纹', trigger: 'ichpattern_lotus' },
      { id: 'plum', label: '梅花纹', trigger: 'ichpattern_plum' },
      { id: 'peony', label: '牡丹纹', trigger: 'ichpattern_peony' },
      { id: 'orchid', label: '兰花纹', trigger: 'ichpattern_orchid' },
      { id: 'furong', label: '芙蓉花纹', trigger: 'ichpattern_furong' },
      { id: 'pomegranate_flower', label: '石榴花纹', trigger: 'ichpattern_pomegranate_flower' },
      { id: 'plant', label: '植物纹', trigger: 'ichpattern_plant' },
    ],
  },
  {
    id: 'beast',
    label: '瑞兽',
    subcategories: [
      { id: 'phoenix_bird', label: '凤鸟纹', trigger: 'ichpattern_phoenix' },
      { id: 'crane', label: '鹤纹', trigger: 'ichpattern_crane' },
      { id: 'butterfly', label: '蝴蝶纹', trigger: 'ichpattern_butterfly' },
      { id: 'tiger', label: '虎纹', trigger: 'ichpattern_tiger' },
      { id: 'peacock', label: '孔雀纹', trigger: 'ichpattern_peacock' },
      { id: 'dragon_phoenix', label: '龙凤纹', trigger: 'ichpattern_dragon_phoenix' },
      { id: 'dragon', label: '龙纹', trigger: 'ichpattern_dragon' },
      { id: 'deer', label: '鹿纹', trigger: 'ichpattern_deer' },
      { id: 'lion', label: '狮纹', trigger: 'ichpattern_lion' },
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

  const beastMap: [RegExp, string][] = [
    [/鹤/, 'crane'],
    [/虎|老虎/, 'tiger'],
    [/龙凤/, 'dragon_phoenix'],
    [/龙/, 'dragon'],
    [/凤鸟|凤凰|凤/, 'phoenix_bird'],
    [/孔雀/, 'peacock'],
    [/狮/, 'lion'],
    [/鹿/, 'deer'],
    [/蝴蝶|蝶/, 'butterfly'],
  ]
  for (const [re, id] of beastMap) {
    if (re.test(t)) {
      themeId = 'beast'
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
      [/缠枝/, 'interlocking_floral'],
      [/葫芦/, 'gourd'],
      [/花鸟/, 'flower_bird'],
      [/植物/, 'plant'],
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
    else if (/兽|瑞兽|鸟/.test(t)) themeId = 'beast'
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
