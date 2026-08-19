/**
 * 纹样子类 → LoRA 文件映射表
 *
 * 数据来源：
 *  1) trigger 取自 src/data/patternTaxonomy.ts 中各 PatternSubcategory.trigger
 *  2) loraFile 仅录入「最终应存在于本机 WebUI 的 models/Lora/ 目录」的文件名（不含路径、不含扩展名）
 *     这些文件原本分散在 C:\LoraTraining\outputs\<subdir>\ 下，需用户手动复制（COPY，非移动）
 *     到 stable-diffusion-webui\models\Lora\ 后，A1111 才能在推理时加载到。
 *  3) 找不到 LoRA 的子类：loraFile 留空（null），prompt 仍然会带 trigger，只是不追加 <lora:...:w> 标签
 *
 * 默认权重 0.7（与训练验证时一致），如需统一调整改 DEFAULT_LORA_WEIGHT 即可。
 * 推荐权重区间 0.70–0.85（虎纹 0.65–0.80），如需按子类微调可在对应 entry 设 loraWeight 字段覆盖。
 */

import type { PatternThemeId } from '../data/patternTaxonomy'

/** 默认 LoRA 权重，方便全局调节 */
export const DEFAULT_LORA_WEIGHT = 0.7

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
  /** 触发词（来自 patternTaxonomy.trigger） */
  trigger: string
  /** LoRA 文件名（不含扩展名）。null 表示本机未部署该 LoRA，只写 trigger */
  loraFile: string | null
  /** LoRA 权重，默认走 DEFAULT_LORA_WEIGHT */
  loraWeight: number
}

/**
 * 映射表
 *
 * 2026-08-18 更新：10 个瑞兽子类 LoRA 已确认源文件存在于 C:\LoraTraining\outputs\<subdir>\
 * 用户需手动把下列 9 份 safetensors 复制到 stable-diffusion-webui\models\Lora\ 后重启或 refresh A1111：
 *   - ICH_crane_pattern_lora_v1           ← outputs/crane_v4/         （鹤纹，v4 E5 loss 0.0867）
 *   - ICH_butterfly_pattern_lora_v4       ← outputs/butterfly_v4/     （蝴蝶纹，v4 E4 loss 0.0904）
 *   - ICH_peacock_pattern_lora_v6         ← outputs/peacock_v6/       （孔雀纹，v6 最新版）
 *   - ICH_tiger_pattern_lora_v5            ← outputs/tiger_v5/         （虎纹，v5 E5 loss 0.0867；ControlNet 锁形仍不理想）
 *   - ICH_deer_pattern_lora_v1             ← outputs/deer_v1/          （鹿纹，E6 最低 loss）
 *   - ICH_dragon_pattern_lora_v1           ← outputs/dragon_v3/        （龙纹，v3 最新有报告版）
 *   - ICH_phoenix_pattern_lora_v4          ← outputs/phoenix_v4/       （凤鸟纹，v4 最新有报告版）
 *   - ICH_lion_pattern_lora_v1             ← outputs/lion_v1/          （狮纹，v1 有报告）
 *   - ICH_dragon_phoenix_pattern_lora_v7   ← outputs/dragon_phoenix_v7/（龙凤纹，v7 最新有报告版）
 *
 * 注：ICH_qilin_pattern_lora_v1（麒麟纹，源 outputs/qilin_v1/）已训练但因 patternTaxonomy
 * 中暂无 qilin 子类，此处不挂载。如需启用，需先在 patternTaxonomy.ts 增 qilin 子类。
 *
 * 花卉子类（缠枝/葫芦/花鸟/菊/莲/梅/牡丹/植物/其他花卉）暂无训练 LoRA，仅写 trigger。
 */
export const LORA_MAP: LoraMapEntry[] = [
  // ============ 花卉（暂无 LoRA，仅 trigger） ============
  {
    subcategoryId: 'interlocking_floral',
    themeId: 'floral',
    subLabelZh: '缠枝花纹',
    subLabelEn: 'interlocking floral',
    trigger: 'ichpattern_interlocking_floral',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'gourd',
    themeId: 'floral',
    subLabelZh: '葫芦纹',
    subLabelEn: 'gourd',
    trigger: 'ichpattern_gourd',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'flower_bird',
    themeId: 'floral',
    subLabelZh: '花鸟纹',
    subLabelEn: 'flower and bird',
    trigger: 'ichpattern_flower_bird',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'chrysanthemum',
    themeId: 'floral',
    subLabelZh: '菊花纹',
    subLabelEn: 'chrysanthemum',
    trigger: 'ichpattern_chrysanthemum',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'lotus',
    themeId: 'floral',
    subLabelZh: '莲花纹',
    subLabelEn: 'lotus',
    trigger: 'ichpattern_lotus',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'plum',
    themeId: 'floral',
    subLabelZh: '梅花纹',
    subLabelEn: 'plum blossom',
    trigger: 'ichpattern_plum',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'peony',
    themeId: 'floral',
    subLabelZh: '牡丹纹',
    subLabelEn: 'peony',
    trigger: 'ichpattern_peony',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'plant',
    themeId: 'floral',
    subLabelZh: '植物纹',
    subLabelEn: 'plant',
    trigger: 'ichpattern_plant',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
  },
  {
    subcategoryId: 'floral_other',
    themeId: 'floral',
    subLabelZh: '其他花卉',
    subLabelEn: 'floral',
    trigger: 'ichpattern_floral',
    loraFile: null,
    loraWeight: DEFAULT_LORA_WEIGHT,
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
  {
    subcategoryId: 'beast_other',
    themeId: 'beast',
    subLabelZh: '其他瑞兽',
    subLabelEn: 'beast',
    trigger: 'ichpattern_beast',
    // 通用瑞兽 LoRA 兜底（未在 9 个专属 LoRA 覆盖范围内的瑞兽子类时使用）
    loraFile: 'ICH_beast_pattern_lora-000001',
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
