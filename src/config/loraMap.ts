/**
 * 纹样子类 → LoRA 文件映射表
 *
 * 数据来源：
 *  1) trigger 来自训练 caption 中的触发词（与 DELIVERY.md 中交付的 trigger 严格一致）
 *     支持多 trigger 逗号分隔（如牡丹 trigger = 'ich_flower_pattern, ich_peony_pattern'），
 *     buildPrompt 会逐项拼入 prompt 前部。
 *  2) loraFile 仅录入「最终应存在于本机 WebUI 的 models/Lora/ 目录」的文件名（不含路径、不含扩展名）
 *     这些文件由用户手动放置（瑞兽部分来自 C:\LoraTraining\outputs\<subdir>\，花卉部分来自朋友交付）
 *  3) 找不到 LoRA 的子类：loraFile 留空（null），prompt 仍然会带 trigger，只是不追加 <lora:...:w> 标签
 *
 * 默认权重：
 *   - 瑞兽 DEFAULT_LORA_WEIGHT = 0.7（与训练验证时一致，推荐 0.70–0.85，虎纹建议 0.65–0.80）
 *   - 花卉统一 0.8（按 DELIVERY.md 要求，显式覆盖，避免被 DEFAULT_LORA_WEIGHT=0.7 误压低）
 * 如需统一调整改 DEFAULT_LORA_WEIGHT / FLOWER_LORA_WEIGHT 即可。
 */

import type { PatternThemeId } from '../data/patternTaxonomy'

/** 瑞兽默认 LoRA 权重，方便全局调节 */
export const DEFAULT_LORA_WEIGHT = 0.7

/** 花卉默认 LoRA 权重（按 DELIVERY.md，瑞兽与花卉权重不同，所以独立常量） */
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
 * ===== 瑞兽 10 个子类 =====
 * （2026-08-18 确认源文件存在于 C:\LoraTraining\outputs\<subdir>\）
 *   - ICH_crane_pattern_lora_v1           ← outputs/crane_v4/
 *   - ICH_butterfly_pattern_lora_v4       ← outputs/butterfly_v4/
 *   - ICH_peacock_pattern_lora_v6         ← outputs/peacock_v6/
 *   - ICH_tiger_pattern_lora_v5           ← outputs/tiger_v5/
 *   - ICH_deer_pattern_lora_v1            ← outputs/deer_v1/
 *   - ICH_dragon_pattern_lora_v1          ← outputs/dragon_v3/
 *   - ICH_phoenix_pattern_lora_v4         ← outputs/phoenix_v4/
 *   - ICH_lion_pattern_lora_v1            ← outputs/lion_v1/
 *   - ICH_dragon_phoenix_pattern_lora_v7  ← outputs/dragon_phoenix_v7/
 *
 * ===== 花卉 9 个专属子类 + 通用花卉 fallback =====
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
 *   - gourd / interlocking_floral / plant                  → 无专属模型 → 通用花卉 ICH_flower_general_final
 *
 * 注：ICH_qilin_pattern_lora_v1（麒麟纹）源文件已训练，但 patternTaxonomy 中暂无 qilin 子类，
 *     此处不挂载。如需启用，需先在 patternTaxonomy.ts 增 qilin 子类。
 */
export const LORA_MAP: LoraMapEntry[] = [
  // ============ 花卉（专属 + 通用 fallback）============
  // 通用花卉 fallback：无专属模型的花卉子类统一走 ICH_flower_general_final + ich_flower_pattern
  {
    subcategoryId: 'gourd',
    themeId: 'floral',
    subLabelZh: '葫芦纹',
    subLabelEn: 'gourd',
    trigger: 'ich_flower_pattern',
    loraFile: 'ICH_flower_general_final',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  {
    subcategoryId: 'interlocking_floral',
    themeId: 'floral',
    subLabelZh: '缠枝花纹',
    subLabelEn: 'interlocking floral',
    trigger: 'ich_flower_pattern',
    loraFile: 'ICH_flower_general_final',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
  {
    subcategoryId: 'plant',
    themeId: 'floral',
    subLabelZh: '植物纹',
    subLabelEn: 'plant',
    trigger: 'ich_flower_pattern',
    loraFile: 'ICH_flower_general_final',
    loraWeight: FLOWER_LORA_WEIGHT,
  },
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

  // ============ 瑞兽（9 个子类挂载专属 LoRA） ============
  {
    subcategoryId: 'phoenix_bird',
    themeId: 'beast',
    subLabelZh: '凤鸟纹',
    subLabelEn: 'phoenix bird',
    trigger: 'ichpattern_phoenix',
    // v4 最新有报告版（源 outputs/phoenix_v4/）
    loraFile: 'ICH_phoenix_pattern_lora_v4',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'crane',
    themeId: 'beast',
    subLabelZh: '鹤纹',
    subLabelEn: 'crane',
    trigger: 'ichpattern_crane',
    // v4 E5 loss 0.0867，重命名为 v1（源 outputs/crane_v4/）
    loraFile: 'ICH_crane_pattern_lora_v1',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'butterfly',
    themeId: 'beast',
    subLabelZh: '蝴蝶纹',
    subLabelEn: 'butterfly',
    trigger: 'ichpattern_butterfly',
    // v4 E4 loss 0.0904，resume 后 optimizer 恢复显著（源 outputs/butterfly_v4/）
    loraFile: 'ICH_butterfly_pattern_lora_v4',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'tiger',
    themeId: 'beast',
    subLabelZh: '虎纹',
    subLabelEn: 'tiger',
    trigger: 'ichpattern_tiger',
    // v5 E5 loss 0.0867，形态相对最清晰；ControlNet 锁形仍不理想，建议配合底图换色（源 outputs/tiger_v5/）
    // 推荐权重 0.65–0.80，如需更低可在此覆盖 loraWeight
    loraFile: 'ICH_tiger_pattern_lora_v5',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'peacock',
    themeId: 'beast',
    subLabelZh: '孔雀纹',
    subLabelEn: 'peacock',
    trigger: 'ichpattern_peacock',
    // v6 最新版（源 outputs/peacock_v6/）
    loraFile: 'ICH_peacock_pattern_lora_v6',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'dragon_phoenix',
    themeId: 'beast',
    subLabelZh: '龙凤纹',
    subLabelEn: 'dragon and phoenix',
    trigger: 'ichpattern_dragon_phoenix',
    // v7 最新有报告版（源 outputs/dragon_phoenix_v7/）
    loraFile: 'ICH_dragon_phoenix_pattern_lora_v7',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'dragon',
    themeId: 'beast',
    subLabelZh: '龙纹',
    subLabelEn: 'dragon',
    trigger: 'ichpattern_dragon',
    // v3 最新有报告版（源 outputs/dragon_v3/）
    loraFile: 'ICH_dragon_pattern_lora_v1',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'deer',
    themeId: 'beast',
    subLabelZh: '鹿纹',
    subLabelEn: 'deer',
    trigger: 'ichpattern_deer',
    // E6 最低 loss，kohya 末轮保存（源 outputs/deer_v1/）
    loraFile: 'ICH_deer_pattern_lora_v1',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'lion',
    themeId: 'beast',
    subLabelZh: '狮纹',
    subLabelEn: 'lion',
    trigger: 'ichpattern_lion',
    // v1 有报告（源 outputs/lion_v1/）
    loraFile: 'ICH_lion_pattern_lora_v1',
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
]

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
