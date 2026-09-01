/**
 * 融合对预设：每两个「不同」纹样子类组合 → 默认「最佳」融合参数（含颜色）。
 *
 * key 为排序后的 `${idA}__${idB}`，与选择顺序无关。
 * pantoneCode 必须来自 pantoneMap（保证推荐色一点即中）。
 *
 * 触发时机（见 CreatePattern.tsx）：
 * - 从「未满两槽」→「两槽都选好」时自动套用一次；
 * - 仅换融合比例不重刷；更换任一子类则重新套该对的默认预设。
 *
 * 主题：几何（回纹/盘长纹/锦地纹/方胜纹）+ 花卉。瑞兽相关已全部移除。
 */

import type { GenerationParams } from '../types/pattern'
import { findPantoneEntry } from './pantoneMap'
import { DEFAULT_PRESET, GENERATION_PRESETS } from './generationPresets'
import { getDualPantoneRecommendations } from './fusionRecommendations'

export interface FusionPairPreset {
  /** 排布（layoutMode）：single / seamless / adapted */
  arrangement: GenerationParams['arrangement']
  /** 对称：mirror / rotation / none */
  symmetry: GenerationParams['symmetry']
  /** 复杂度 0–100（偏中高，避免极简糊成一片） */
  complexity: number
  /** 文化强度 0–100 */
  culturalIntensity: number
  /** 平面/肌理 0–100 */
  textureDetail: number
  /** 潘通色号（必须能在 pantoneMap 中查到） */
  pantoneCode: string
  /** 明度 0–100（映射 colorScheme.brightness） */
  lightness: number
  /** 默认融合比例 0–100（第一槽权重，仅套用于两槽均为真实 LoRA 且可传时） */
  fusionRatio?: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round = (v: number) => Math.round(v)

/** 精选组合表（key 已排序，与顺序无关） */
export const FUSION_PAIR_PRESETS: Record<string, FusionPairPreset> = {
  // ===== 几何 × 几何（回纹/盘长/锦地/方胜） =====
  // 回纹 + 锦地：连续底纹双拼
  'huiwen__jindi': { arrangement: 'seamless', symmetry: 'mirror', complexity: 65, culturalIntensity: 80, textureDetail: 30, pantoneCode: '19-4052 TCX', lightness: 45, fusionRatio: 50 },
  // 回纹 + 盘长：回环与连绵
  'huiwen__panchang': { arrangement: 'single', symmetry: 'mirror', complexity: 65, culturalIntensity: 85, textureDetail: 30, pantoneCode: '18-1662 TCX', lightness: 45, fusionRatio: 50 },
  // 回纹 + 方胜：几何疏密对照
  'huiwen__fangsheng': { arrangement: 'single', symmetry: 'mirror', complexity: 65, culturalIntensity: 85, textureDetail: 28, pantoneCode: '19-4052 TCX', lightness: 45, fusionRatio: 50 },
  // 盘长 + 方胜：吉庆方正双拼
  'panchang__fangsheng': { arrangement: 'single', symmetry: 'mirror', complexity: 70, culturalIntensity: 85, textureDetail: 30, pantoneCode: '18-1662 TCX', lightness: 45, fusionRatio: 50 },
  // 盘长 + 锦地：吉庆满铺
  'panchang__jindi': { arrangement: 'seamless', symmetry: 'mirror', complexity: 70, culturalIntensity: 85, textureDetail: 30, pantoneCode: '12-0752 TCX', lightness: 45, fusionRatio: 50 },
  // 锦地 + 方胜：满铺金地衬方胜
  'jindi__fangsheng': { arrangement: 'seamless', symmetry: 'mirror', complexity: 70, culturalIntensity: 85, textureDetail: 30, pantoneCode: '12-0752 TCX', lightness: 45, fusionRatio: 50 },
  // ===== 几何 × 花卉 =====
  // 牡丹 + 盘长：富贵连绵
  'peony__panchang': { arrangement: 'single', symmetry: 'mirror', complexity: 70, culturalIntensity: 80, textureDetail: 30, pantoneCode: '18-1662 TCX', lightness: 45, fusionRatio: 50 },
  // 牡丹 + 方胜：富贵方正
  'peony__fangsheng': { arrangement: 'single', symmetry: 'mirror', complexity: 70, culturalIntensity: 80, textureDetail: 30, pantoneCode: '16-1450 TCX', lightness: 50, fusionRatio: 50 },
  // 梅花 + 回纹：疏影与回环
  'plum__huiwen': { arrangement: 'single', symmetry: 'none', complexity: 60, culturalIntensity: 75, textureDetail: 28, pantoneCode: '14-3904 TCX', lightness: 50, fusionRatio: 50 },
  // 莲花 + 回纹：清莲与几何
  'lotus__huiwen': { arrangement: 'single', symmetry: 'mirror', complexity: 60, culturalIntensity: 75, textureDetail: 28, pantoneCode: '19-4052 TCX', lightness: 45, fusionRatio: 50 },
  // 菊花 + 锦地：金秋满铺
  'chrysanthemum__jindi': { arrangement: 'seamless', symmetry: 'mirror', complexity: 65, culturalIntensity: 75, textureDetail: 30, pantoneCode: '12-0752 TCX', lightness: 45, fusionRatio: 50 },
  // ===== 花卉 × 花卉（保留经典组合） =====
  'orchid__plum': { arrangement: 'single', symmetry: 'none', complexity: 55, culturalIntensity: 70, textureDetail: 28, pantoneCode: '14-3904 TCX', lightness: 55, fusionRatio: 50 },
  'furong__plum': { arrangement: 'single', symmetry: 'mirror', complexity: 55, culturalIntensity: 75, textureDetail: 28, pantoneCode: '16-1720 TCX', lightness: 55, fusionRatio: 50 },
  'lotus__orchid': { arrangement: 'single', symmetry: 'mirror', complexity: 55, culturalIntensity: 70, textureDetail: 28, pantoneCode: '14-3904 TCX', lightness: 55, fusionRatio: 50 },
  'peony__orchid': { arrangement: 'single', symmetry: 'mirror', complexity: 60, culturalIntensity: 75, textureDetail: 30, pantoneCode: '16-1450 TCX', lightness: 55, fusionRatio: 50 },
}

const GEOMETRIC_SUBCATEGORY_IDS = new Set(['huiwen', 'panchang', 'jindi', 'fangsheng'])

/** 组合 → 默认预设。无精选表项时按两个子类的生成预设派生通用默认。 */
export function getFusionPairPreset(a: string, b: string): FusionPairPreset {
  const key = [a, b].sort().join('__')
  const curated = FUSION_PAIR_PRESETS[key]
  if (curated) {
    // 兜底：即使精选表出现笔误，也保证色号可查
    return { ...curated, pantoneCode: resolvePantoneCode(curated.pantoneCode) }
  }

  const pa = GENERATION_PRESETS[a] ?? DEFAULT_PRESET
  const pb = GENERATION_PRESETS[b] ?? DEFAULT_PRESET
  const bothGeometric = GEOMETRIC_SUBCATEGORY_IDS.has(a) && GEOMETRIC_SUBCATEGORY_IDS.has(b)

  // fallback 颜色：优先使用双纹样推荐色的第一项（避免硬编码单一色）
  const dualRecs = getDualPantoneRecommendations([a, b])
  const defaultColor = dualRecs[0]?.code ?? '18-1662 TCX'

  const preset: FusionPairPreset = {
    arrangement:
      pa.arrangement === 'seamless' || pb.arrangement === 'seamless'
        ? 'seamless'
        : 'single',
    // 双几何/对称类 → 镜像对称；其余按子类默认（任一子类镜像则取镜像，更稳）
    symmetry:
      bothGeometric || pa.symmetry === 'mirror' || pb.symmetry === 'mirror'
        ? 'mirror'
        : 'none',
    complexity: clamp(round((pa.complexity + pb.complexity) / 2) + 5, 55, 75),
    culturalIntensity: clamp(round((pa.culturalIntensity + pb.culturalIntensity) / 2), 55, 75),
    textureDetail: round((pa.textureDetail + pb.textureDetail) / 2),
    // 使用双纹样推荐色第一项，无推荐时才回退安全色
    pantoneCode: defaultColor,
    lightness: 50,
    fusionRatio: 50,
  }
  return preset
}

/** 校验色号可查；不可查时回退到安全色（保证 apply 后 UI 无「未找到」） */
export function resolvePantoneCode(code: string): string {
  return findPantoneEntry(code) ? code : '18-1662 TCX'
}
