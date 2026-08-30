/**
 * 纹样子类 → 生成参数预设
 *
 * 数据来源：训练 caption 字段众数表（2026-08-19）；几何子类按训练 caption 对齐。
 * 不要拍脑袋改默认。
 *
 * 共性（几何 4 个子类几乎统一）：
 *   - complexity: 55–65                     → "medium detail, balanced density"
 *   - textureDetail: 25–30                  → "flat pattern design, clean lines, no texture"
 *   - culturalIntensity: 85                 → "classic authentic traditional form, clearly recognizable"
 *
 * 仅 arrangement / symmetry 按子类区分（见下表）。
 * 花卉等未列入众数表的子类走 DEFAULT_PRESET（排布=single、对称=none、complexity=55、
 * textureDetail=25、culturalIntensity=70），避免默认四方连续或高肌理。
 *
 * 配色双轨制：
 *   - UI 显示：用真实潘通色号（如 '19-4052 TCX'）在色板中高亮选中
 *   - Prompt 生成：用语义关键词（'monochrome-black' / 'multicolor'）保证训练 caption 一致性
 *   buildColorClause 会把语义关键词翻译成对应英文片段。
 */

import type { GenerationParams } from '../types/pattern'

/** 子类预设：与 GenerationParams 字段对齐（不含 dimension） */
export interface GenerationPreset {
  /** 排布 */
  arrangement: GenerationParams['arrangement']
  /** 对称 */
  symmetry: GenerationParams['symmetry']
  /** 疏密 0–100 */
  complexity: number
  /** 平面/肌理 0–100 */
  textureDetail: number
  /** 文化符号强度 0–100 */
  culturalIntensity: number
  /** 配色（含 pantone 色号 + prompt 语义关键词） */
  colorScheme: GenerationParams['colorScheme']
}

/**
 * 子类 → 默认潘通色号映射
 *
 * 用于 UI 高亮选中 + prompt 配色片段生成。
 * 同一个 pantone 色号在不同子类下可能对应不同的 prompt 语义，
 * 因此需要 subcategoryId 级别的映射，而非单纯 pantone code 映射。
 */
export interface SubcategoryPantone {
  /** 潘通色号（带 TCX 后缀，与 pantoneColors key 一致） */
  pantoneCode: string
  /** 色块中文名 */
  label: string
  /** 英文色名（用于 prompt 加权描述，如 "dark navy blue" / "palace red"） */
  englishName: string
  /** prompt 配色语义关键词（monochrome-black / multicolor） */
  promptTag: 'monochrome-black' | 'multicolor'
  /** 选择理由（仅注释用） */
  reason?: string
}

export const SUBCATEGORY_PANTONE_MAP: Record<string, SubcategoryPantone> = {
  // ===== 几何（4 条，单色系为主） =====
  huiwen:    { pantoneCode: '19-4052 TCX', label: '深藏青', englishName: 'dark navy blue', promptTag: 'monochrome-black', reason: '回纹素雅，墨青' },
  panchang:  { pantoneCode: '18-1662 TCX', label: '宫墙红', englishName: 'palace red',     promptTag: 'monochrome-black', reason: '盘长连绵，吉庆红' },
  jindi:     { pantoneCode: '12-0752 TCX', label: '金色',   englishName: 'golden yellow',  promptTag: 'monochrome-black', reason: '锦地满铺，富丽金' },
  fangsheng: { pantoneCode: '18-1555 TCX', label: '朱红',   englishName: 'vermillion',     promptTag: 'monochrome-black', reason: '方胜方正，朱红吉祥' },

  // ===== 花卉（单色系为主，按花型自然属性选色） =====
  // 牡丹：花团锦簇，藕粉色
  peony:                { pantoneCode: '16-1450 TCX', label: '藕粉',   englishName: 'light pink',       promptTag: 'monochrome-black', reason: '牡丹国色，柔美' },
  // 菊花：金秋盛放，金色
  chrysanthemum:        { pantoneCode: '12-0752 TCX', label: '金色',   englishName: 'golden yellow',    promptTag: 'monochrome-black', reason: '秋菊傲霜，金黄' },
  // 梅花：傲雪红梅
  plum:                 { pantoneCode: '18-1662 TCX', label: '宫墙红', englishName: 'palace red',       promptTag: 'monochrome-black', reason: '红梅傲雪，朱红' },
  // 莲花：出淤泥不染，淡粉
  lotus:                { pantoneCode: '16-1450 TCX', label: '藕粉',   englishName: 'light pink',       promptTag: 'monochrome-black', reason: '莲花清雅，淡粉' },
  // 花鸟：工笔重彩，朱红
  flower_bird:          { pantoneCode: '18-1555 TCX', label: '朱红',   englishName: 'vermillion',       promptTag: 'monochrome-black', reason: '花鸟工笔，朱红点睛' },
  // 兰花：空谷幽兰，月白/淡紫
  orchid:               { pantoneCode: '14-3904 TCX', label: '淡紫',   englishName: 'soft lilac',       promptTag: 'monochrome-black', reason: '空谷幽兰，淡雅' },
  // 芙蓉：朝开暮合，芙蓉出水，粉色
  furong:               { pantoneCode: '16-1720 TCX', label: '桃粉',   englishName: 'peach pink',       promptTag: 'monochrome-black', reason: '芙蓉娇艳，桃粉' },
  // 石榴花：多子多福，中国红
  pomegranate_flower:   { pantoneCode: '18-1662 TCX', label: '宫墙红', englishName: 'palace red',       promptTag: 'monochrome-black', reason: '石榴多子，朱红' },
}

/**
 * 根据 subcategoryId 取默认潘通色号
 */
export function getPantoneForSubcategory(subcategoryId: string | undefined | null): SubcategoryPantone | null {
  if (!subcategoryId) return null
  return SUBCATEGORY_PANTONE_MAP[subcategoryId] ?? null
}

/** 配色预设：单色黑（多数几何/花卉子类默认，用语义关键词供 buildColorClause 生成 prompt） */
const COLOR_MONO_BLACK: GenerationParams['colorScheme'] = {
  mode: 'pantone',
  pantone: 'monochrome-black',
}

/**
 * 通用默认预设（无子类 / 未列入预设表的子类用）
 * 注意：symmetry='none'（无规则），culturalIntensity=70（中等偏上），
 * 不是 85（几何/花卉子类的经典可辨），因为通用场景不一定要"经典可辨"。
 */
export const DEFAULT_PRESET: GenerationPreset = {
  arrangement: 'single',
  symmetry: 'none',
  complexity: 55,
  textureDetail: 25,
  culturalIntensity: 70,
  colorScheme: COLOR_MONO_BLACK,
}

/**
 * 子类 → 预设映射表
 *
 * ┌─────────────────┬──────────┬───────────────┬──────────────────┐
 * │ subcategoryId   │ 中文     │ arrangement    │ symmetry         │
 * ├─────────────────┼──────────┼───────────────┼──────────────────┤
 * │ huiwen          │ 回纹     │ single 单独    │ none  无规则      │
 * │ panchang        │ 盘长纹   │ single 单独    │ mirror 镜像      │
 * │ jindi           │ 锦地纹   │ seamless 连续  │ none  无规则      │
 * │ fangsheng       │ 方胜纹   │ single 单独    │ mirror 镜像      │
 * └─────────────────┴──────────┴───────────────┴──────────────────┘
 */
export const GENERATION_PRESETS: Record<string, GenerationPreset> = {
  // ===== 几何（4 个） =====
  huiwen: {
    arrangement: 'single',
    symmetry: 'none',
    complexity: 55,
    textureDetail: 25,
    culturalIntensity: 85,
    colorScheme: COLOR_MONO_BLACK,
  },
  panchang: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 60,
    textureDetail: 30,
    culturalIntensity: 85,
    colorScheme: COLOR_MONO_BLACK,
  },
  jindi: {
    arrangement: 'seamless',
    symmetry: 'none',
    complexity: 65,
    textureDetail: 30,
    culturalIntensity: 85,
    colorScheme: COLOR_MONO_BLACK,
  },
  fangsheng: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 60,
    textureDetail: 28,
    culturalIntensity: 85,
    colorScheme: COLOR_MONO_BLACK,
  },

  // ===== 花卉子类默认值 =====
  // 配色：每个子类对应一个具体潘通色号（见 SUBCATEGORY_PANTONE_MAP），不再使用 multicolor 语义预设
  // applyPreset 会自动用 SUBCATEGORY_PANTONE_MAP 中的真实色号覆盖 colorScheme
  flower_bird: {
    arrangement: 'single',
    symmetry: 'none',
    complexity: 65,
    textureDetail: 35,
    culturalIntensity: 75,
    colorScheme: { mode: 'pantone', pantone: '18-1555 TCX' },
  },
  chrysanthemum: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 55,
    textureDetail: 30,
    culturalIntensity: 70,
    colorScheme: { mode: 'pantone', pantone: '12-0752 TCX' },
  },
  lotus: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 55,
    textureDetail: 30,
    culturalIntensity: 75,
    colorScheme: { mode: 'pantone', pantone: '16-1450 TCX' },
  },
  plum: {
    arrangement: 'single',
    symmetry: 'none',
    complexity: 50,
    textureDetail: 28,
    culturalIntensity: 70,
    colorScheme: { mode: 'pantone', pantone: '18-1662 TCX' },
  },
  peony: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 60,
    textureDetail: 30,
    culturalIntensity: 75,
    colorScheme: { mode: 'pantone', pantone: '16-1450 TCX' },
  },
  orchid: {
    arrangement: 'single',
    symmetry: 'none',
    complexity: 50,
    textureDetail: 25,
    culturalIntensity: 70,
    colorScheme: { mode: 'pantone', pantone: '14-3904 TCX' },
  },
  furong: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 55,
    textureDetail: 28,
    culturalIntensity: 70,
    colorScheme: { mode: 'pantone', pantone: '16-1720 TCX' },
  },
  pomegranate_flower: {
    arrangement: 'single',
    symmetry: 'mirror',
    complexity: 55,
    textureDetail: 28,
    culturalIntensity: 75,
    colorScheme: { mode: 'pantone', pantone: '18-1662 TCX' },
  },
}

/**
 * 根据 subcategoryId 取预设；找不到返回 DEFAULT_PRESET
 */
export function getPreset(subcategoryId: string | undefined | null): GenerationPreset {
  if (!subcategoryId) return DEFAULT_PRESET
  return GENERATION_PRESETS[subcategoryId] ?? DEFAULT_PRESET
}

/**
 * 把预设应用到一组 GenerationParams 上，返回新的 GenerationParams。
 * 仅覆盖 preset 字段（arrangement/symmetry/complexity/textureDetail/culturalIntensity/colorScheme），
 * 保留 dimension（mainTheme/subcategory/scenes/style 等）由调用方负责设置。
 *
 * 配色双轨：
 *   - colorScheme.pantone 写入真实潘通色号（如 '19-4052 TCX'），供 UI 色板高亮
 *   - prompt 生成时 buildColorClause 会根据 pantoneCode + subcategoryId 反查 promptTag
 *     （monochrome-black / multicolor），保证训练 caption 一致性
 */
export function applyPreset(
  params: GenerationParams,
  subcategoryId: string | undefined | null
): GenerationParams {
  const preset = getPreset(subcategoryId)
  const pantone = getPantoneForSubcategory(subcategoryId)

  // 配色：如果子类有默认潘通色号，用真实色号替换语义关键词
  // （语义关键词仅用于 prompt 生成，UI 需要真实色号来高亮色块）
  let colorScheme = { ...preset.colorScheme }
  if (pantone) {
    colorScheme = {
      mode: 'pantone',
      pantone: pantone.pantoneCode,
    }
  }

  return {
    ...params,
    arrangement: preset.arrangement,
    symmetry: preset.symmetry,
    complexity: preset.complexity,
    textureDetail: preset.textureDetail,
    culturalIntensity: preset.culturalIntensity,
    colorScheme,
  }
}
