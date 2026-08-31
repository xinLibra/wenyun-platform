/**
 * 纹样子类 → LoRA 文件映射表
 *
 * 数据来源：
 *  1) trigger 来自训练 caption 中的触发词（与 DELIVERY.md 中交付的 trigger 严格一致）
 *     支持多 trigger 逗号分隔（如牡丹 trigger = 'ich_flower_pattern, ich_peony_pattern'），
 *     buildPrompt 会逐项拼入 prompt 前部。
 *  2) loraFile 仅录入「最终应存在于本机 WebUI 的 models/Lora/ 目录」的文件名（不含路径、不含扩展名）
 *     这些文件由用户手动放置（几何部分来自 C:\LoraTraining\outputs\<subdir>\，花卉部分来自朋友交付）
 *  3) 找不到 LoRA 的子类：loraFile 留空（null），prompt 仍然会带 trigger，只是不追加 <lora:...:w> 标签
 *  4) 方胜纹按排布分流（FANGSHENG_LORA_MAP）：单独/居中 → single LoRA；四方连续 → continuous LoRA
 *     一次请求只挂一个方胜 LoRA，禁止同时加载两个
 *
 * 默认权重：
 *   - 几何 DEFAULT_LORA_WEIGHT = 0.7（与训练验证时一致，推荐 0.70–0.85）
 *   - 花卉统一 0.8（按 DELIVERY.md 要求，显式覆盖，避免被 DEFAULT_LORA_WEIGHT=0.7 误压低）
 * 如需统一调整改 DEFAULT_LORA_WEIGHT / FLOWER_LORA_WEIGHT 即可。
 */

import type { PatternThemeId } from '../data/patternTaxonomy'

/** 几何默认 LoRA 权重，方便全局调节 */
export const DEFAULT_LORA_WEIGHT = 0.7

/** 花卉默认 LoRA 权重（按 DELIVERY.md，几何与花卉权重不同，所以独立常量） */
export const FLOWER_LORA_WEIGHT = 0.8

/** 子类英文标签：用于拼 prompt 中的 "Chinese traditional {en} pattern" */
export interface LoraMapEntry {
  /** 子类 id（与 patternTaxonomy 中 PatternSubcategory.id 对齐） */
  subcategoryId: string
  /** 所属主题 */
  themeId: PatternThemeId
  /** 中文标签（镜像 patternTaxonomy，便于日志/调试） */
  subLabelZh: string
  /** 英文标签，会拼入 prompt 中的 "Chinese traditional {subLabelEn} pattern" */
  subLabelEn: string
  /**
   * 训练触发词（来自训练 caption）。
   * 支持多触发词：逗号分隔，buildPrompt 会逐项写入 prompt 前部。
   * 例：牡丹 = 'ich_flower_pattern, ich_peony_pattern' → prompt 中同时出现两者。
   */
  trigger: string
  /** LoRA 文件名（不含扩展名）。null 表示本机未部署该 LoRA，只写 trigger */
  loraFile: string | null
  /** LoRA 权重 */
  loraWeight: number
}

/**
 * 映射表
 *
 * ===== 几何 4 个子类（2026-08-31 已全部接入真实 LoRA） =====
 * 文件已置于 WebUI models/Lora 目录（C:\LoraTraining\stable-diffusion-webui\models\Lora\）：
 *   - huiwen    → ICH_huiwen_pattern_lora_v1_epoch5_FINAL     trigger: ichpattern_huiwen
 *   - panchang  → ICH_panchang_pattern_lora_v1_epoch8_FINAL_DELIVERY  trigger: ichpattern_panchang
 *   - jindi     → ICH_jindi_pattern_lora_v4-000004            trigger: ichpattern_jindi_hex（训练 caption 真实第一词）
 *   - fangsheng → 排布分流（FANGSHENG_LORA_MAP）：
 *       排布=单独/居中 → ICH_fangsheng_single_lora_v2-000001    trigger: ichpattern_fangsheng_single
 *       排布=四方连续 → ICH_fangsheng_continuous_lora_v1-000003 trigger: ichpattern_fangsheng_continuous
 *     （由 buildPrompt 按 arrangement 自动切换，见 patternGeneration.ts）
 *
 * ===== 花卉 8 个专属子类（均已挂载专属 LoRA） =====
 * （2026-08-20 朋友按 DELIVERY.md 交付，已复制到 WebUI models/Lora；
 *   2026-08-26 追加 兰花/芙蓉花/石榴花 三个专属 LoRA，trigger 以 safetensors metadata 为准）
 *   - peony          → ICH_peony_pattern_lora_v7_clear    trigger: ich_flower_pattern + ich_peony_pattern
 *   - chrysanthemum  → ICH_chrysanthemum_pattern_lora_v3   trigger: ichpattern_chrysanthemum
 *   - plum           → ICH_plum_blossom_pattern_lora_v2    trigger: ichpattern_plum_blossom（训练原词）+ 兼容旧 ichpattern_plum
 *   - lotus          → ICH_lotus_pattern_lora_v3_attr      trigger: ich_flower_pattern + ich_lotus_pattern
 *   - flower_bird    → ICH_flower_bird_pattern_lora_v3     trigger: ich_flower_pattern + ich_flower_bird_pattern
 *   - orchid         → ICH_orchid_pattern_lora_v3          trigger: ichpattern_orchid
 *   - furong         → ICH_hibiscus_pattern_lora_v5        trigger: ichpattern_hibiscus（旧占位 ichpattern_furong 已废弃）
 *   - pomegranate_flower → ICH_pomegranate_flower_pattern_lora_v6  trigger: ichpattern_pomegranate_flower
 */
export const LORA_MAP: LoraMapEntry[] = [
  // ============ 花卉（专属 LoRA） ============
  // 专属花卉 LoRA 1: 花鸟（双 trigger）
  {
    subcategoryId: 'flower_bird',
    themeId: 'floral',
    subLabelZh: '花鸟纹',
    subLabelEn: 'flower and bird',
    trigger: 'ich_flower_pattern, ich_flower_bird_pattern',
    loraFile: 'ICH_flower_bird_pattern_lora_v3',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  // 专属花卉 LoRA 2: 菊花（单 trigger）
  {
    subcategoryId: 'chrysanthemum',
    themeId: 'floral',
    subLabelZh: '菊花纹',
    subLabelEn: 'chrysanthemum',
    trigger: 'ichpattern_chrysanthemum',
    loraFile: 'ICH_chrysanthemum_pattern_lora_v3',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  // 专属花卉 LoRA 3: 莲花（双 trigger）
  {
    subcategoryId: 'lotus',
    themeId: 'floral',
    subLabelZh: '莲花纹',
    subLabelEn: 'lotus',
    trigger: 'ich_flower_pattern, ich_lotus_pattern',
    loraFile: 'ICH_lotus_pattern_lora_v3_attr',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  // 专属花卉 LoRA 4: 梅花（训练原词 ichpattern_plum_blossom 在前，兼容旧 ichpattern_plum 在后）
  {
    subcategoryId: 'plum',
    themeId: 'floral',
    subLabelZh: '梅花纹',
    subLabelEn: 'plum blossom',
    trigger: 'ichpattern_plum_blossom, ichpattern_plum',
    loraFile: 'ICH_plum_blossom_pattern_lora_v2',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  // 专属花卉 LoRA 5: 牡丹（双 trigger）
  {
    subcategoryId: 'peony',
    themeId: 'floral',
    subLabelZh: '牡丹纹',
    subLabelEn: 'peony',
    trigger: 'ich_flower_pattern, ich_peony_pattern',
    loraFile: 'ICH_peony_pattern_lora_v7_clear',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  // 新增花卉子类（2026-08-26）：已挂载专属 LoRA（朋友交付，文件已置于 WebUI models/Lora）
  //   - 兰花 trigger: ichpattern_orchid（metadata 确认，与训练 caption 一致）
  //   - 芙蓉花 trigger: ichpattern_hibiscus（safetensors metadata 确认；旧占位 ichpattern_furong 已废弃）
  //   - 石榴花 trigger: ichpattern_pomegranate_flower（metadata 确认，与训练 caption 一致）
  {
    subcategoryId: 'orchid',
    themeId: 'floral',
    subLabelZh: '兰花纹',
    subLabelEn: 'orchid',
    trigger: 'ichpattern_orchid',
    loraFile: 'ICH_orchid_pattern_lora_v3',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  {
    subcategoryId: 'furong',
    themeId: 'floral',
    subLabelZh: '芙蓉花纹',
    subLabelEn: 'hibiscus',
    trigger: 'ichpattern_hibiscus',
    loraFile: 'ICH_hibiscus_pattern_lora_v5',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  {
    subcategoryId: 'pomegranate_flower',
    themeId: 'floral',
    subLabelZh: '石榴花纹',
    subLabelEn: 'pomegranate flower',
    trigger: 'ichpattern_pomegranate_flower',
    loraFile: 'ICH_pomegranate_flower_pattern_lora_v6',
    loraWeight: FLOWER_LORA_WEIGHT,
  },

  // ============ 几何（4 个子类，trigger 对齐训练 caption） ============
  {
    subcategoryId: 'huiwen',
    themeId: 'geometric',
    subLabelZh: '回纹',
    subLabelEn: 'huiwen (meander)',
    trigger: 'ichpattern_huiwen',
    loraFile: 'ICH_huiwen_pattern_lora_v1_epoch5_FINAL',
    loraWeight: 0.9, // 回纹结构弱、易画成花星/雪花/抽象块面，提到推荐上限 0.9（2026-08-31）
  },
  {
    subcategoryId: 'panchang',
    themeId: 'geometric',
    subLabelZh: '盘长纹',
    subLabelEn: 'panchang (endless knot)',
    trigger: 'ichpattern_panchang',
    loraFile: 'ICH_panchang_pattern_lora_v1_epoch8_FINAL_DELIVERY',
    loraWeight: 0.9, // 盘长结构弱、易漂成菱格/实物丝带，提到推荐上限 0.9（2026-08-31）
  },
  {
    subcategoryId: 'jindi',
    themeId: 'geometric',
    subLabelZh: '锦地纹',
    subLabelEn: 'jindi (brocade ground)',
    // 2026-08-31 专项：trigger 按交付约定写死 ichpattern_jindi（若实测触发弱，对照训练 caption 首词再调）
    trigger: 'ichpattern_jindi',
    loraFile: 'ICH_jindi_pattern_lora_v4-000004',
    loraWeight: 0.85, // 锦地结构弱、易漂成软边抽象块面，固定 0.85（2026-08-31）
  },
  {
    subcategoryId: 'fangsheng',
    themeId: 'geometric',
    subLabelZh: '方胜纹',
    subLabelEn: 'fangsheng (overlapping diamond)',
    // 排布分流在 buildPrompt 完成：loraFile/trigger 由 FANGSHENG_LORA_MAP 按 arrangement 覆盖
    trigger: 'ichpattern_fangsheng',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
]

/**
 * 方胜纹排布 → LoRA 映射（仅当 subcategoryId === 'fangsheng' 时使用）
 *   - single      → 排布=单独/居中徽章：单纹样 LoRA（禁止大面积连续网）
 *   - continuous  → 排布=四方连续/满铺：连续铺排 LoRA
 * 一次请求只挂一个方胜 LoRA，禁止两个同时加载。
 */
export const FANGSHENG_LORA_MAP: Record<
  'single' | 'continuous',
  { loraFile: string; trigger: string }
> = {
  single: {
    loraFile: 'ICH_fangsheng_single_lora_v2-000001',
    trigger: 'ichpattern_fangsheng_single',
  },
  continuous: {
    loraFile: 'ICH_fangsheng_continuous_lora_v1-000003',
    trigger: 'ichpattern_fangsheng_continuous',
  },
}

/** 索引：subcategoryId → LoraMapEntry */
const LORA_INDEX: Record<string, LoraMapEntry> = LORA_MAP.reduce(
  (acc, entry) => {
    acc[entry.subcategoryId] = entry
    return acc
  },
  {} as Record<string, LoraMapEntry>
)

/**
 * 根据 subcategoryId 查询 LoRA 配置
 * 找不到时返回 null（调用方需自行处理"无 trigger 也无 LoRA"的兜底场景）
 */
export function getLoraEntry(subcategoryId: string | undefined | null): LoraMapEntry | null {
  if (!subcategoryId) return null
  return LORA_INDEX[subcategoryId] ?? null
}
