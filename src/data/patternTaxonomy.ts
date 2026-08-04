/** 纹样主题 / 子类 / 场景 — 与 LoRA 训练目录对齐 */

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
      { id: 'plant', label: '植物纹', trigger: 'ichpattern_plant' },
      { id: 'floral_other', label: '其他花卉', trigger: 'ichpattern_floral' },
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
      { id: 'beast_other', label: '其他瑞兽', trigger: 'ichpattern_beast' },
    ],
  },
]

export const SCENE_OPTIONS = [
  { id: 'graduation', label: '毕业', promptHint: '寓意成长与高升；宜用鹤、梅、牡丹等；色调明快，适合礼品与书签。' },
  { id: 'wedding', label: '婚礼', promptHint: '寓意喜庆成双；宜用龙凤、牡丹、莲花；红金或柔和配色。' },
  { id: 'longevity', label: '寿辰', promptHint: '寓意长寿康宁；宜用鹤、鹿、桃、松；沉稳雅致。' },
  { id: 'home', label: '家居', promptHint: '装饰性强、可连续铺陈；宜团花、缠枝；色调和谐。' },
  { id: 'apparel', label: '服饰', promptHint: '适合面料与绣片；注意边缘完整与对称。' },
  { id: 'cultural', label: '文创周边', promptHint: '适合手机壳、帆布包等；主体清晰、背景干净。' },
] as const

export function parsePromptToTags(text: string): {
  themeId?: PatternThemeId
  subcategoryId?: string
  sceneIds: string[]
} {
  const t = text.trim()
  const sceneIds: string[] = []
  if (/毕业|成长|升学/.test(t)) sceneIds.push('graduation')
  if (/婚礼|结婚|喜庆|新婚/.test(t)) sceneIds.push('wedding')
  if (/寿|长寿|康宁|生日/.test(t)) sceneIds.push('longevity')
  if (/家居|室内|装饰/.test(t)) sceneIds.push('home')
  if (/服饰|衣服/.test(t)) sceneIds.push('apparel')
  if (/文创|周边|礼物|礼品/.test(t)) sceneIds.push('cultural')

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
