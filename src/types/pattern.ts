export interface PatternDimension {
  craft: string[]
  ethnic: string[]
  theme: string[]
  application: string[]
  // ===== 新增 =====
  mainTheme?: 'floral' | 'beast' | ''
  subcategory?: string
  scenes?: string[]
  // ===== 新增结束 =====
  style: {
    figurative: number
    traditional: number
    simplicity: number
    handmade: number
  }
}

export interface StyleSliders {
  figurative: number
  traditional: number
  simplicity: number
  handmade: number
}

export interface GenerationParams {
  dimension: PatternDimension
  complexity: number
  textureDetail: number
  colorScheme: ColorSchemeParams
  arrangement: 'single' | 'seamless' | 'adapted'
  symmetry: 'mirror' | 'rotation' | 'none'
  culturalIntensity: number
}

export interface ColorSchemeParams {
  mode: 'hue' | 'pantone' | 'image'
  hue?: number
  brightness?: number
  pantone?: string
  colors?: string[]
}

export interface PromptParseResult {
  dimension: Partial<PatternDimension>
  complexity?: number
  textureDetail?: number
  colorScheme?: Partial<ColorSchemeParams>
  arrangement?: GenerationParams['arrangement']
  symmetry?: GenerationParams['symmetry']
  culturalIntensity?: number
}

export const CRAFT_OPTIONS = [
  { id: 'dye', label: '染织', children: ['蓝印花布', '扎染', '蜡染'] },
  { id: 'embroidery', label: '刺绣', children: ['苏绣', '湘绣', '蜀绣', '粤绣'] },
  { id: 'brocade', label: '织锦', children: ['云锦', '蜀锦', '壮锦'] },
  { id: 'carving', label: '雕刻', children: ['剪纸', '木雕', '砖雕', '石雕'] },
  { id: 'ceramic', label: '陶瓷', children: ['青花瓷', '粉彩', '钧瓷'] },
  { id: 'metal', label: '金属工艺', children: ['青铜纹饰', '花丝镶嵌'] },
]

export const ETHNIC_OPTIONS = [
  { id: 'han', label: '汉族' },
  { id: 'miao', label: '苗族' },
  { id: 'shui', label: '水族' },
  { id: 'tibetan', label: '藏族' },
  { id: 'mongolian', label: '蒙古族' },
  { id: 'yi', label: '彝族' },
  { id: 'dai', label: '傣族' },
]

export const THEME_OPTIONS = [
  { id: 'animal', label: '动物纹', children: ['龙凤', '瑞兽', '鱼虫'] },
  { id: 'human', label: '人物纹' },
  { id: 'plant', label: '植物纹', children: ['缠枝', '折枝', '团花'] },
  { id: 'geometric', label: '几何纹', children: ['回纹', '冰裂纹', '锁子纹'] },
  { id: 'composite', label: '组合纹' },
]

export const APPLICATION_OPTIONS = [
  { id: 'clothing', label: '服饰' },
  { id: 'packaging', label: '包装' },
  { id: 'home', label: '家居' },
  { id: 'cultural', label: '文创周边' },
]

export const ARRANGEMENT_OPTIONS = [
  { value: 'single', label: '单独纹样' },
  { value: 'seamless', label: '四方连续' },
  { value: 'adapted', label: '适合纹样' },
]

export const SYMMETRY_OPTIONS = [
  { value: 'mirror', label: '镜像对称' },
  { value: 'rotation', label: '旋转对称' },
  { value: 'none', label: '无规则' },
]

export interface Pattern {
  id: string
  user_id: string
  style: string
  color_scheme: string
  complexity: number
  detail: number
  symmetry: string
  image_url: string
  created_at: string
  style_abstract: number
  style_modern: number
  style_complexity: number
  style_digital: number
}

export const OLD_STYLE_MIGRATION: Record<string, PatternDimension> = {
  blueprint: {
    craft: ['dye'],
    ethnic: ['han'],
    theme: ['geometric'],
    application: ['home'],
    style: { figurative: 30, traditional: 90, simplicity: 70, handmade: 80 },
  },
  papercut: {
    craft: ['carving'],
    ethnic: ['han'],
    theme: ['animal', 'plant'],
    application: ['cultural'],
    style: { figurative: 50, traditional: 95, simplicity: 60, handmade: 90 },
  },
  embroidery: {
    craft: ['embroidery'],
    ethnic: ['han'],
    theme: ['plant', 'animal'],
    application: ['clothing'],
    style: { figurative: 70, traditional: 85, simplicity: 40, handmade: 95 },
  },
  ink: {
    craft: [],
    ethnic: ['han'],
    theme: ['plant', 'geometric'],
    application: ['home'],
    style: { figurative: 40, traditional: 70, simplicity: 80, handmade: 70 },
  },
  bronze: {
    craft: ['metal'],
    ethnic: ['han'],
    theme: ['animal', 'geometric'],
    application: ['cultural'],
    style: { figurative: 50, traditional: 95, simplicity: 50, handmade: 85 },
  },
  porcelain: {
    craft: ['ceramic'],
    ethnic: ['han'],
    theme: ['plant', 'geometric'],
    application: ['home'],
    style: { figurative: 60, traditional: 85, simplicity: 70, handmade: 80 },
  },
  fashion: {
    craft: ['dye', 'embroidery'],
    ethnic: ['han'],
    theme: ['plant', 'geometric'],
    application: ['clothing'],
    style: { figurative: 55, traditional: 80, simplicity: 60, handmade: 75 },
  },
}