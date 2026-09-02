/**
 * 纹样真实生成（接 A1111 WebUI API）+ 失败降级到 mock
 *
 * 链路：
 *   前端 GenerationParams → 拼统一 caption prompt → POST /sd-api/generate
 *     → Vite dev proxy → http://127.0.0.1:8787/generate （scripts/sd_proxy.py）
 *     → http://127.0.0.1:7860/sdapi/v1/txt2img
 *     → 返回 base64 data URL
 *   失败 → 调用 mockGeneratePattern 兜底（页面不白屏）
 */

import { GenerationParams, ColorSchemeParams } from '../types/pattern'
import { getLoraEntry, DEFAULT_LORA_WEIGHT, FANGSHENG_LORA_MAP } from '../config/loraMap'
import { getPantoneForSubcategory } from '../config/generationPresets'
import { getPantoneHex as getPantoneHexFromMap } from '../config/pantoneMap'
import { mockGeneratePattern } from './mockGeneration'
import { inspectDataUrl, MIN_IMAGE_BYTES } from '../utils/downloadImage'

export interface PatternGenerationResult {
  imageUrl: string
  generationId: string
  /** 真实生成时为最终 prompt；降级到 mock 时为 mock 的 prompt */
  prompt: string
  /** 真实生成时为 negative prompt；mock 时为空字符串 */
  negativePrompt?: string
  /** 是否走了 mock 降级 */
  fallback: boolean
  /** 失败原因（fallback=true 时填充，便于页面提示） */
  fallbackReason?: string
  /** 真实生成返回的 seed；fallback 时为 -1 */
  seed?: number
  /** 真实生成耗时（毫秒）；fallback 时为 undefined */
  elapsedMs?: number
  /** 真实生成落盘路径（若 sd_proxy 配置了 SD_PROXY_OUTPUT_DIR）；fallback 时为 undefined */
  filePath?: string
}

/**
 * 规范化潘通色号：trim + 大写；可选去掉 TCX 后缀
 *
 * 用于解决「用户输入 18-1662 与库内 18-1662 TCX 比较失败」的 bug。
 * 严格相等比较 `pantoneCode === p` 会因后缀不同而落兜底分支，
 * 让颜色加权退化成 "pantone 18-1662 color" 弱描述。
 */
function normalizePantone(code: string, opts: { stripTcx?: boolean } = {}): string {
  let s = (code || '').trim().toUpperCase()
  if (opts.stripTcx) {
    s = s.replace(/\s*TCX\s*$/, '').trim()
  }
  return s
}

/**
 * 潘通色号 → HEX：统一走 src/config/pantoneMap.ts（全应用唯一权威来源），
 * 与推荐色表、GenerationParams 的 ColorPicker 查询保持一致，
 * 保证「推荐色一点即中」且 prompt 能拿到对应 HEX。
 * 支持 '14-3904' 与 '14-3904 TCX' 等价匹配（表内自动生成短号别名）。
 */
function getPantoneHex(pantone: string): string | null {
  return getPantoneHexFromMap(pantone)
}

/** WebUI 推理默认参数（与 spec 一致） */
const SD_DEFAULTS = {
  width: 512,
  height: 512,
  steps: 28,
  cfgScale: 7,
  samplerName: 'Euler a',
  seed: -1,
} as const

/**
 * 代理地址：
 *   - 生产：读 VITE_SD_API_URL（如 https://your-backend.example.com/sd-api），
 *     拼成 `${VITE_SD_API_URL}/generate`，由后端处理 CORS。
 *   - dev：若未设环境变量，fallback 到 '/sd-api/generate'，
 *     由 vite.config.ts 的 server.proxy 转发到本地 sd_proxy.py (http://127.0.0.1:8787)。
 *
 * 注：不硬编码 127.0.0.1，避免部署站误连本机。
 */
const PROXY_URL = import.meta.env.VITE_SD_API_URL
  ? `${String(import.meta.env.VITE_SD_API_URL).replace(/\/+$/, '')}/generate`
  : '/sd-api/generate'

/**
 * 拼装统一 caption prompt（顺序固定，禁止乱序）
 *
 * 模板：
 *   {触发词}, Chinese traditional {子类英文} pattern, {颜色加权前缀}, decorative motif,
 *   {平面/肌理}, {疏密}, {排布}, {对称}, {文化符号强度}, {配色},
 *   traditional ICH style, <lora:...:w>
 *
 * 颜色加权前缀：在 prompt 前半部分重复颜色词 2-3 次，增强模型对颜色的响应。
 * 子类未选时，触发词与子类英文段省略，但其余装饰段保留。
 */
export function buildPromptParts(params: GenerationParams): {
  prompt: string
  negativePrompt: string
  loraFile: string | null
  loraWeight: number
  trigger: string
  subLabelEn: string | null
  subcategoryId: string
} {
  const subcategoryId = params.dimension.subcategory ?? 'n/a'
  // 方胜纹 ID 兼容三种写法：fangsheng / fangsheng_single / fangsheng_continuous
  const isFangsheng =
    subcategoryId === 'fangsheng' || subcategoryId === 'fangsheng_single' || subcategoryId === 'fangsheng_continuous'
  // 方胜排布分流：fangsheng_continuous 强制连续；fangsheng_single 强制单独；fangsheng 按 arrangement 判定
  const fangshengLayout =
    subcategoryId === 'fangsheng_continuous'
      ? 'continuous'
      : subcategoryId === 'fangsheng_single'
        ? 'single'
        : params.arrangement === 'seamless'
          ? 'continuous'
          : 'single'

  const sub = getLoraEntry(
    subcategoryId === 'fangsheng_single' || subcategoryId === 'fangsheng_continuous' ? 'fangsheng' : subcategoryId,
  )
  // 多 trigger 兼容：loraMap.trigger 支持逗号分隔字符串（比如牡丹：'ich_flower_pattern, ich_peony_pattern'）
  // 逐项写入 prompt 前部，保证每个触发词都被模型作为独立 token 单元处理
  let triggers: string[] = (sub?.trigger ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const subLabelEn = sub?.subLabelEn ?? null
  let loraFile = sub?.loraFile ?? null
  let loraWeight = sub?.loraWeight ?? DEFAULT_LORA_WEIGHT

  const parts: string[] = []

  // 0) 方胜纹排布分流：单独 → ichpattern_fangsheng_single + single LoRA（weight 0.9）；
  //    四方连续 → ichpattern_fangsheng_continuous + continuous LoRA（weight 0.9）。
  //    直接覆盖 trigger/loraFile/loraWeight，一次只挂一个方胜 LoRA，禁止单独模式误挂 continuous。
  if (isFangsheng) {
    const fs = FANGSHENG_LORA_MAP[fangshengLayout]
    triggers = [fs.trigger]
    loraFile = fs.loraFile
    loraWeight = 0.9 // 用户要求默认 0.9（0.85–0.95 区间内）
  }

  // 1) 触发词（牡丹/莲花 双 trigger 都会完整入列）
  for (const t of triggers) parts.push(t)

  // 2) Chinese traditional {子类英文} pattern
  if (subLabelEn) {
    // 锦地/方胜：固定前缀要求（不带括号变体）
    parts.push(
      subcategoryId === 'jindi'
        ? 'Chinese traditional jindi brocade ground pattern'
        : isFangsheng
          ? 'Chinese traditional fangsheng pattern'
          : `Chinese traditional ${subLabelEn} pattern`,
    )
  } else {
    // 没有具体子类时，仍保留 "Chinese traditional pattern" 的语义
    parts.push('Chinese traditional pattern')
  }

  // 2.5) 几何结构强化：回纹补 greek key / 直角折线 / 雷纹等描述，
  //      防止模型只看到 (meander) 就退化成放射状花格
  const structureBoost = GEOMETRIC_STRUCTURE_BOOST[subcategoryId]
  if (structureBoost) {
    structureBoost.forEach((w) => parts.push(w))
  }

  // 2.6) 方胜固定结构词（紧跟 trigger/描述、在配色之前；按排布分流）
  if (isFangsheng) {
    const prefix =
      fangshengLayout === 'continuous' ? FANGSHENG_FIXED_PREFIX_CONTINUOUS : FANGSHENG_FIXED_PREFIX_SINGLE
    prefix.forEach((w) => parts.push(w))
  }

  // 3) 颜色加权前缀：在 prompt 前半部分重复颜色词，增强模型对颜色的响应
  //    这是修复"选色后生成颜色不匹配"的核心改动——把颜色词放在 prompt 前半段
  //    并重复 2-3 次，让模型优先关注颜色描述。
  const colorWeighted = buildColorWeightedClause(params)
  if (colorWeighted) {
    parts.push(colorWeighted)
  }

  // 4) decorative motif（固定；锦地/方胜已并入固定前缀，避免重复）
  if (subcategoryId !== 'jindi' && !isFangsheng) {
    parts.push('decorative motif')
  }

  // 5) 平面/肌理：textureDetail 0–100（锦地/方胜默认偏 flat，flat 限定已在固定前缀，跳过避免重复）
  const tex = params.textureDetail ?? 50
  if (subcategoryId !== 'jindi' && !isFangsheng) {
    if (tex < 40) {
      parts.push('flat pattern design, clean lines, no texture')
    } else if (tex < 70) {
      parts.push('flat pattern design, subtle surface hint')
    } else {
      parts.push('embroidery texture')
    }
  }

  // 6) 疏密：complexity 0–100
  const cmp = params.complexity ?? 50
  if (cmp < 30) {
    parts.push('minimal geometric, simple sparse detail')
  } else if (cmp < 70) {
    parts.push('medium detail, balanced density')
  } else {
    parts.push('dense elaborate full pattern, intricate detail')
  }

  // 7) 排布：arrangement（方胜固定结构词已按排布写入，此处跳过重复；adapted 保留 fitted panel）
  switch (params.arrangement) {
    case 'single':
      if (!isFangsheng) {
        parts.push('single motif, centered medallion')
        // 盘长单独：强化"单个纹样"语义，避免退化成大面积连续网/满铺
        if (subcategoryId === 'panchang') {
          parts.push('single motif only, isolated emblem, large empty margin, no repeat, no tiling')
        }
      }
      // 回纹单独：训练预览多为居中带框纹样（framed border）
      if (subcategoryId === 'huiwen') {
        parts.push('framed border, isolated emblem, large empty margin, no repeat, no tiling')
      }
      // 锦地单独：centered medallion + single motif（基础已含）+ large empty margin / no seamless tile（2026-08-31）
      if (subcategoryId === 'jindi') {
        parts.push('large empty margin, no seamless tile')
      }
      break
    case 'seamless':
      if (!isFangsheng) {
        parts.push('seamless repeat, tileable continuous pattern')
        // 盘长连续版：补"交织结"连续语义，避免退化成单纯菱形网
        if (subcategoryId === 'panchang') {
          parts.push('continuous interlocking knot pattern')
        }
        // 回纹连续版：显式写 meander / greek key border（2026-08-31 专项）
        if (subcategoryId === 'huiwen') {
          parts.push('tileable continuous meander pattern, repeating greek key border')
        }
      }
      // 锦地连续版（默认）：疏密由第 6 步统一 caption 表控制，不在此重复
      break
    case 'adapted':
      parts.push('fitted panel motif, shaped to border')
      break
  }

  // 8) 对称：symmetry
  switch (params.symmetry) {
    case 'mirror':
      parts.push('bilateral mirror symmetry')
      break
    case 'rotation':
      parts.push('rotational symmetry')
      break
    case 'none':
      parts.push('asymmetric free composition')
      break
  }

  // 9) 文化符号强度：culturalIntensity 0–100
  const ci = params.culturalIntensity ?? 50
  if (ci < 35) {
    parts.push('simplified abstract interpretation of traditional symbol')
  } else if (ci < 65) {
    parts.push('recognizable traditional form with design refinement')
  } else {
    parts.push('classic authentic traditional form, clearly recognizable')
  }

  // 10) 配色：colorClause（保留在末尾，双重保险）
  parts.push(buildColorClause(params))

  // 末尾固定加 traditional ICH style
  parts.push('traditional ICH style')

  // LoRA 标签：放在末尾
  if (loraFile) {
    parts.push(`<lora:${loraFile}:${loraWeight}>`)
  }

  const prompt = parts.join(', ')
  const negativePrompt = buildNegativePrompt(params)

  return { prompt, negativePrompt, loraFile, loraWeight, trigger: triggers.join(', '), subLabelEn, subcategoryId }
}

/**
 * 颜色加权前缀：在 prompt 前半段重复颜色词 2-3 次，增强模型对颜色的响应。
 *
 * 设计思路：
 *   - SD 模型对 prompt 前半段的 token 权重更高（attention 机制），把颜色词放在前面
 *   - 重复 2-3 次（如 "light pink color, pink color, 藕粉色调"）进一步强化
 *   - 末尾的 buildColorClause 仍保留配色描述，形成首尾呼应的双重保险
 *
 * 返回空字符串表示无有效颜色信息。
 */
function buildColorWeightedClause(params: GenerationParams): string {
  const cs = params.colorScheme
  if (!cs) return ''

  // 图片吸色：取第一个颜色的英文名
  if (cs.mode === 'image' && cs.colors && cs.colors.length > 0) {
    const name = hexToColorName(cs.colors[0])
    if (!name) return ''
    return `${name} color, ${name} color scheme`
  }

  // 潘通色号
  if (cs.mode === 'pantone' && cs.pantone) {
    const p = cs.pantone.trim()

    // 1. 语义关键词：直接映射
    if (p === 'monochrome-black') {
      return 'monochrome black, black color scheme, ink black, #1A1A1A'
    }
    if (p === 'multicolor') {
      return 'multicolor, colorful palette, vibrant colors'
    }

    // 2. 真实潘通色号 → 查 SUBCATEGORY_PANTONE_MAP 取英文名 + 中文名
    //    使用 normalizePantone + stripTcx 比较：
    //    - 用户输入 '18-1662' 与库内 '18-1662 TCX' 视为同一色
    //    - 旧代码用严格相等 pantoneCode === p 会让手动输入落兜底分支
    //      （颜色加权退化成 "pantone 18-1662 color" 弱描述）
    const subId = params.dimension?.subcategory
    if (subId) {
      const pantoneInfo = getPantoneForSubcategory(subId)
      if (pantoneInfo && normalizePantone(pantoneInfo.pantoneCode, { stripTcx: true }) === normalizePantone(p, { stripTcx: true })) {
        const en = pantoneInfo.englishName
        const zh = pantoneInfo.label
        const tag = pantoneInfo.promptTag
        const hex = getPantoneHex(p)
        // HEX 写入 prompt：SD 模型对 "#RRGGBB" 比纯英文色名更敏感，是锁色的硬约束
        const hexPart = hex ? `, ${hex.toLowerCase()}` : ''
        // 根据 promptTag 决定重复方式：multicolor 时强调多彩，mono 时强调单色
        if (tag === 'multicolor') {
          return `${en} color, ${en} color scheme, ${zh}色调, multicolor palette${hexPart}`
        }
        // 盘长/回纹/锦地：配色写"线稿色"而非整块色，避免实底引导实物丝带/抽象块面（2026-08-31）
        if (subId === 'panchang' || subId === 'huiwen' || subId === 'jindi') {
          return `${en} line color, ${zh}线稿色${hexPart}`
        }
        return `${en} color, ${en} color scheme, ${zh}色调${hexPart}`
      }
    }

    // 3. 兜底：未知色号，用色号本身 + HEX（若查到）+ 基础颜色描述
    const baseCode = p.split(' ')[0] // e.g. "18-1662"
    const hex = getPantoneHex(p)
    const hexPart = hex ? `, ${hex.toLowerCase()}` : ''
    return `pantone ${baseCode} color, custom color scheme${hexPart}`
  }

  // 色相模式：hue → 英文名 + 亮度修饰
  if (cs.mode === 'hue') {
    const hueName = hueToColorName(cs.hue ?? 0)
    const b = cs.brightness ?? 50
    const brightWord = b < 35 ? 'dark' : b > 70 ? 'bright' : ''
    const prefix = brightWord ? `${brightWord} ` : ''
    return `${prefix}${hueName} color, ${hueName} color scheme`
  }

  return ''
}

/** 根据 colorScheme 写自然语言颜色段（放在 prompt 末尾，双重保险） */
function buildColorClause(params: GenerationParams): string {
  const cs = params.colorScheme
  if (!cs) return 'limited color palette'

  // 图片吸色：用 colors 数组拼成 "red, blue and white" 之类
  if (cs.mode === 'image' && cs.colors && cs.colors.length > 0) {
    // colors 是 hex，做个粗略 hue → 英文色名映射，避免 prompt 出现 #aabbcc
    const names = cs.colors.slice(0, 3).map(hexToColorName).filter(Boolean)
    if (names.length === 1) return `${names[0]} color palette`
    if (names.length === 2) return `${names[0]} and ${names[1]} color palette`
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} color palette`
  }

  // 潘通色号：区分语义关键词（monochrome-black / multicolor）和真实色号
  // 真实色号（如 '18-1662 TCX'）需要根据当前子类反查 prompt 语义标签，
  // 因为同一个色号在不同子类下可能对应不同语义（如 18-1662 TCX 对 panchang 是 mono，
  // 对 fangsheng 也是 mono；历史 multicolor 语义已随瑞兽子类移除）。
  if (cs.mode === 'pantone' && cs.pantone) {
    const p = cs.pantone.trim()
    // 1. 语义关键词（直接识别）
    if (p === 'monochrome-black') {
      // 盘长/回纹：黑白也写"线 + 浅底"，避免实底引导实物/块面
      const lineSub = params.dimension?.subcategory
      return lineSub === 'panchang' || lineSub === 'huiwen' || lineSub === 'jindi'
        ? 'monochrome black line on off-white background'
        : 'monochrome black palette'
    }
    if (p === 'multicolor') return 'multicolor palette'

    // 2. 真实潘通色号 → 按当前子类反查色名，写"具体色 + pantone code + HEX"。
    //    2026-08-31 修复：不再回写 'monochrome black palette'——
    //    前缀 buildColorWeightedClause 已写具体色（如 dark navy blue / #26364b），
    //    末尾再写黑白调会与所选色冲突（如"深藏青 + monochrome black"并存）。
    const subId = params.dimension?.subcategory
    if (subId) {
      const pantoneInfo = getPantoneForSubcategory(subId)
      if (pantoneInfo && normalizePantone(pantoneInfo.pantoneCode, { stripTcx: true }) === normalizePantone(p, { stripTcx: true })) {
        const en = pantoneInfo.englishName
        const hex = getPantoneHex(p)
        const hexPart = hex ? `, ${hex.toLowerCase()}` : ''
        // 盘长/回纹/锦地：线色 + 浅底（避免整块实底引导实物丝带/抽象块面；2026-08-31）
        if (subId === 'panchang' || subId === 'huiwen' || subId === 'jindi') {
          return `${en} line color on off-white background, pantone ${p.split(' ')[0]}${hexPart}`
        }
        return `${en} color palette, pantone ${p.split(' ')[0]}${hexPart}`
      }
    }

    // 3. 兜底：未知色号，直接拼描述性文本
    return `pantone ${p} inspired color palette`
  }

  // 色相模式：hue 0-360 → 英文色名 + brightness 影响明暗
  if (cs.mode === 'hue') {
    const hueName = hueToColorName(cs.hue ?? 0)
    const b = cs.brightness ?? 50
    if (b < 35) return `dark ${hueName} and black palette`
    if (b > 70) return `bright ${hueName} and white palette`
    return `${hueName} and white color palette`
  }

  return 'limited color palette'
}

function hueToColorName(hue: number): string {
  // 简化的色相 → 色名映射（与训练 caption 风格一致：单色名而非花哨描述）
  const h = ((hue % 360) + 360) % 360
  if (h < 15 || h >= 345) return 'red'
  if (h < 45) return 'orange'
  if (h < 70) return 'yellow'
  if (h < 165) return 'green'
  if (h < 200) return 'cyan'
  if (h < 255) return 'blue'
  if (h < 290) return 'purple'
  return 'pink'
}

function hexToColorName(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return ''
  const num = parseInt(m[1], 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  // 转 HSL
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0
  const d = max - min
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return hueToColorName(h)
}

/**
 * 根据主色 hue 返回应抑制的"抢色背景"列表
 *
 * 设计原则：只抑制 *background / dominant wrong hue*，不抑制 accent，
 * 避免误伤纹样本身需要的少量对比色（如龙纹身上的金色鳞片）。
 * multicolor / monochrome-black 不返回抑制列表，避免与多彩诉求冲突。
 */
function hueToSuppressedBackgrounds(hue: number): string[] {
  const h = ((hue % 360) + 360) % 360
  // red (宫墙红)
  if (h < 15 || h >= 345) {
    return ['blue background', 'cyan background', 'green background', 'yellow background', 'grey background']
  }
  // orange (橙红/栗棕)
  if (h < 45) {
    return ['blue background', 'cyan background', 'green background', 'purple background']
  }
  // yellow (金色)
  if (h < 70) {
    return ['blue background', 'cyan background', 'purple background', 'pink background']
  }
  // green
  if (h < 165) {
    return ['red background', 'pink background', 'purple background', 'orange background']
  }
  // cyan
  if (h < 200) {
    return ['red background', 'orange background', 'pink background']
  }
  // blue (深藏青/钴蓝)
  if (h < 255) {
    return ['red background', 'orange background', 'yellow background', 'pink background']
  }
  // purple
  if (h < 290) {
    return ['yellow background', 'green background', 'orange background']
  }
  // pink (藕粉)
  return ['green background', 'cyan background', 'blue background']
}

/** hex（#RRGGBB）→ 主色相 hue（0-360），供 inferDominantHue 复用 */
function hexToHue(hex: string): number | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const num = parseInt(m[1], 16)
  const r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0
  const d = max - min
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return h
}

/**
 * 从 colorScheme 推断主色 hue（用于偏色抑制）
 * 返回 null 表示无明确主色（如 multicolor），调用方应跳过抑制
 * subcategoryIds：潘通色号反查 promptTag 用的子类列表（单纹样传 [子类]，融合传 [A, B]）
 */
function inferDominantHue(colorScheme: ColorSchemeParams | undefined, subcategoryIds: string[]): number | null {
  const cs = colorScheme
  if (!cs) return null

  if (cs.mode === 'hue') {
    return cs.hue ?? null
  }

  if (cs.mode === 'image' && cs.colors && cs.colors.length > 0) {
    // 用第一个吸色作为主色
    return hexToHue(cs.colors[0])
  }

  if (cs.mode === 'pantone' && cs.pantone) {
    const p = cs.pantone.trim()
    // 语义关键词不参与偏色抑制（multicolor/mono-black 不应抑制任何色）
    if (p === 'multicolor' || p === 'monochrome-black') return null
    // 真实色号：任一子类反查 promptTag 为 multicolor 则整体不抑制
    for (const subId of subcategoryIds) {
      const pantoneInfo = subId ? getPantoneForSubcategory(subId) : null
      if (pantoneInfo && normalizePantone(pantoneInfo.pantoneCode, { stripTcx: true }) === normalizePantone(p, { stripTcx: true })) {
        if (pantoneInfo.promptTag === 'multicolor') return null
      }
    }
    // 单色：查 HEX → hue
    const hex = getPantoneHex(p)
    if (!hex) return null
    return hexToHue(hex)
  }

  return null
}

/**
 * Negative prompt 核心实现（支持多个子类 ID，融合用）
 * 注意：
 *   1. 生成几何纹样时，把未选中的其他几何纹样特征词列入排除（几何纹样线条接近，最易串味）
 *   2. 选中单色主色时，按 hue 抑制"抢色背景"，避免 SD 默认补蓝/灰背景
 *      （仅抑制 background，不抑制 accent，保留纹样本身少量对比色）
 */
/**
 * 几何子类 → 结构同义词（正向我方 prompt 已通过这些词描述结构）。
 * 负向规则（2026-08-31 修复）：
 *   - 选中某几何子类时，negative 中"保护"该子类的结构词——不能出现，否则与正向结构描述正负冲突、结构被弱化；
 *   - 未选中子类的结构特征词照常排除（防几何串味，如生成回纹时禁止 endless knot / interlocking diamond）。
 */
const GEOMETRIC_STRUCTURE_TERMS: Record<string, string[]> = {
  huiwen: ['meander pattern', 'greek key', 'meander'],
  panchang: ['endless knot'],
  jindi: ['brocade ground'],
  fangsheng: ['interlocking diamond', 'nested diamond', 'overlapping diamond'],
}

/** 全部几何结构候选词（去重后的 flat 列表，用于负向"排除未选中子类"） */
const ALL_GEOMETRIC_STRUCTURE_TERMS: string[] = Object.values(GEOMETRIC_STRUCTURE_TERMS).flat()

/**
 * 几何子类正向结构强化段（插在 "Chinese traditional ... pattern" 之后）。
 * 回纹（2026-08-31）：预览出现"放射状小花/星形"而非回字形折线，说明仅 (meander) 结构约束不足，
 * 补 greek key fret / rectangular spiral / thunder pattern / 正交直线 / 直角折线 / no floral。
 */
const GEOMETRIC_STRUCTURE_BOOST: Record<string, string[]> = {
  huiwen: [
    // 2026-08-31 专项：对齐训练预览（直角回纹 / greek key 边框 / 矩形螺旋迷宫 / 居中带框）
    'rectangular spiral meander',
    'greek key fret',
    'orthogonal right-angle lines',
    'nested rectangular maze',
    // 实物/抽象块面漂移元凶：缺"平面介质"限定。2d illustration / graphic design 强制图案而非实物
    '2d illustration',
    'graphic design',
  ],
  panchang: [
    'pan chang endless knot',
    'continuous interwoven ribbon knot',
    'mystic knot',
    'never-ending knot',
    // 实物丝带/胶带卷漂移的元凶：缺"平面介质"限定。2d illustration / graphic design 强制图案而非实物（2026-08-31）
    '2d illustration',
    'graphic design',
  ],
  jindi: [
    // 2026-08-31 二次修订：按用户固定前缀顺序（龟背六角 / 套环 / 菱格），
    // decorative motif / flat pattern design / clean lines / no texture 并入前缀，确保出现在配色之前
    'hexagonal honeycomb lattice',
    'tortoiseshell pattern',
    'repeating regular hexagon grid',
    'geometric brocade ground',
    'clean geometric cells',
    'decorative motif',
    'flat pattern design',
    'clean lines',
    'no texture',
    // 介质限定（防软边剪影漂移）：紧跟固定前缀，仍在配色之前
    '2d illustration',
    'graphic design',
  ],
}

/**
 * 方胜纹固定结构词（2026-08-31 专项）：紧跟 trigger 写入、在配色之前。
 * 按排布分流：单独/适合边框 → single 版；四方连续 → continuous 版。
 * decorative motif / flat pattern design / clean lines / no texture / 2d illustration 已固定于此，
 * 因此方胜跳过通用第 4/5 步，避免重复。
 */
const FANGSHENG_FIXED_PREFIX_SINGLE = [
  'interlocking diamond motif',
  'double diamond overlapping squares',
  'single centered medallion',
  'isolated emblem',
  'large empty margin',
  'no seamless tile',
  'no repeat',
  'decorative motif',
  'flat pattern design',
  'clean lines',
  'no texture',
  '2d illustration',
  'graphic design',
  'vector-like pattern',
  // 2026-09-01：单独专属结构强化（only one motif / nested diamond core / petal-like outer frame；large empty margin 已在固定前缀）
  'only one motif',
  'nested diamond core',
  'petal-like outer frame',
]

const FANGSHENG_FIXED_PREFIX_CONTINUOUS = [
  'interlocking diamond lattice',
  'double diamond overlapping squares',
  'seamless repeat',
  'tileable continuous pattern',
  'geometric fangsheng grid',
  'decorative motif',
  'flat pattern design',
  'clean lines',
  'no texture',
  '2d illustration',
  'graphic design',
  // 2026-09-01：连续专属结构强化（细线线描 / 嵌套双菱形轮廓 / 菱形网格）
  'fine line',
  'thin stroke linework',
  'nested double diamond outline',
  'diamond mesh',
]

function buildNegativePromptCore(
  subcategoryIds: string[],
  colorScheme: ColorSchemeParams | undefined,
  arrangement?: GenerationParams['arrangement'],
): string {
  // 方胜纹 ID 兼容三种写法：fangsheng / fangsheng_single / fangsheng_continuous
  const hasFangshengId = (ids: string[]) =>
    ids.some((id) => id === 'fangsheng' || id === 'fangsheng_single' || id === 'fangsheng_continuous')
  // 几何结构词索引用主 ID：fangsheng_single / fangsheng_continuous → fangsheng（保护其结构词不进 negative）
  const normalizeGeoId = (id: string) =>
    id === 'fangsheng_single' || id === 'fangsheng_continuous' ? 'fangsheng' : id

  const base = [
    'realistic photo',
    '3d render',
    'blurry',
    'deformed',
    'extra limbs',
    'text',
    'watermark',
    'logo',
    'letters',
    'words',
    'cartoon',
    'anime',
    'elephant',
    'low quality',
  ]
  // 几何串味排除 + 结构词保护：
  //   - 选中子类的结构词 → 保护（不进 negative）
  //   - 未选中子类的结构词 → 全部排除（防串味）
  const activeGeo = subcategoryIds.filter((id) => normalizeGeoId(id) in GEOMETRIC_STRUCTURE_TERMS)
  if (activeGeo.length > 0) {
    const protectedTerms = new Set<string>()
    activeGeo.forEach((id) => {
      ;(GEOMETRIC_STRUCTURE_TERMS[normalizeGeoId(id)] ?? []).forEach((t) => protectedTerms.add(t))
    })
    ALL_GEOMETRIC_STRUCTURE_TERMS.forEach((t) => {
      if (!protectedTerms.has(t)) base.push(t)
    })

    // 几何纹样防"花卉化/星形化"：压 floral / star / snowflake / radial（回纹被画成放射状花格的元凶）。
    // 融合含花卉子类（如 回纹+牡丹）时不压 floral，避免削弱融合侧特征。
    const hasFloralSide = subcategoryIds.some((id) => getLoraEntry(id)?.themeId === 'floral')
    if (!hasFloralSide) {
      base.push('floral', 'flower', 'petal', 'blossom', 'star motif', 'snowflake', 'radial petals', 'radial')
    }

    // 几何防"菱格/网格化"：压 diamond lattice / argyle（盘长易漂成红底菱格满铺）。
    // 方胜正向依赖 diamond 语义；锦地数据集含"菱格花心"且用户要求 negative 不得含 lattice——两者都不压菱形词。
    if (!hasFangshengId(subcategoryIds) && !subcategoryIds.includes('jindi')) {
      base.push('diamond lattice', 'argyle', 'grid pattern', 'simple geometric diamonds')
    }

    // 盘长强制实物压制：必须常驻 negative（漂成实物丝带/胶带卷照片的元凶）。
    // 只压 spool / roll of tape / yarn 等实物词，不压 ribbon（正向 interwoven ribbon 语义依赖）。
    if (subcategoryIds.includes('panchang')) {
      base.push(
        'photograph',
        'product photo',
        'spool',
        'roll of tape',
        'ribbon spool',
        'thread spool',
        'yarn',
        'physical object',
        'still life',
        'depth of field',
      )
    }

    // 回纹强制实物/抽象块面压制：花星、雪花、蓝灰抽象块面漂移的元凶（2026-08-31 专项）。
    if (subcategoryIds.includes('huiwen')) {
      base.push(
        'photograph',
        'product photo',
        'physical object',
        'still life',
        'organic',
        'abstract block',
        'fragmented shapes',
        'random geometry',
      )
    }

    // 锦地强制"软边抽象块面"压制：深色底+白剪影漂移的元凶（2026-08-31 专项，二次修订）。
    // broken lattice（破格/烂网格）是刻意压制词，允许含 lattice 子串，不算结构词泄漏。
    if (subcategoryIds.includes('jindi')) {
      base.push(
        'soft blob',
        'cloudy silhouette',
        'abstract amorphous shapes',
        'watercolor wash',
        'irregular organic blobs',
        'photorealistic fabric folds',
        'product photo',
        'broken lattice',
        'random geometry',
        'physical object',
      )
    }

    // 方胜强制"实物/织物/地砖/标尺照片"压制：漂成实物、布料、地板砖、带标尺/文字照片的元凶（2026-08-31 专项）。
    if (hasFangshengId(subcategoryIds)) {
      base.push(
        'photograph',
        'product photo',
        'furniture',
        'chair',
        'sofa',
        'blanket',
        'throw',
        'fabric folds',
        'textile texture',
        'woven cloth',
        'floor tiles',
        'checkerboard floor',
        'ruler',
        'measuring tape',
        'scale bar',
        'caption',
      )
    }
  }

  // 方胜纹排布=单独/居中：额外排除连续/平铺特征，防止退化成大面积连续网。
  // 变体 ID 覆盖：fangsheng_continuous 强制连续（不压 seamless）；fangsheng_single 强制单独。
  const effArrangement = subcategoryIds.includes('fangsheng_continuous')
    ? 'seamless'
    : subcategoryIds.includes('fangsheng_single')
      ? 'single'
      : arrangement
  if (hasFangshengId(subcategoryIds) && effArrangement !== 'seamless') {
    base.push(
      'seamless',
      'tileable',
      'continuous pattern',
      'repeating pattern',
      'full background pattern',
      'multiple motifs',
      'all-over pattern',
    )
  }

  // 偏色背景抑制：按主色 hue 抑制非选中色 background
  const hue = inferDominantHue(colorScheme, subcategoryIds)
  if (hue !== null) {
    const suppressed = hueToSuppressedBackgrounds(hue)
    base.push(...suppressed)
  }

  return base.join(', ')
}

/** 单纹样 negative prompt（对外签名保持不变） */
export function buildNegativePrompt(params: GenerationParams): string {
  return buildNegativePromptCore(
    params.dimension?.subcategory ? [params.dimension.subcategory] : [],
    params.colorScheme,
    params.arrangement,
  )
}

/**
 * 调用本地代理 → A1111 /sdapi/v1/txt2img
 * 失败时抛错，由上层 generatePatternWithFallback 捕获并降级 mock
 *
 * 超时策略：10 分钟（与 sd_proxy.py 端 urlopen timeout=10*60 对齐）
 * 旧值 5 分钟会先于后端 abort，造成前端降级 mock 时 Python 仍在跑下一笔请求，
 * 反而把 WebUI 队列堵死 → "一直 Generating"。
 */
async function callSdProxy(payload: {
  prompt: string
  negative_prompt: string
  width: number
  height: number
  steps: number
  cfg_scale: number
  sampler_name: string
  seed: number
}): Promise<{ imageUrl: string; generationId: string; seed: number; elapsedMs?: number; filePath?: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10 * 60 * 1000)

  try {
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      throw new Error(`SD proxy HTTP ${resp.status}: ${errText.slice(0, 200)}`)
    }

    const data = await resp.json()

    // —— 兼容 proxy / WebUI / 各版本后端的不同返回结构 ——
    const pick = (v: unknown): unknown =>
      typeof v === 'string' ? v : typeof v === 'object' && v !== null && 'image' in v ? (v as any).image : undefined
    const rawImage: unknown =
      pick(data?.image_url) ??
      pick(data?.image) ??
      pick(data?.url) ??
      (Array.isArray(data?.images) ? pick(data.images[0]) : undefined) ??
      (data?.data && typeof data.data === 'object' ? pick(data.data?.image_url) ?? pick(data.data?.image) ?? (Array.isArray(data.data.images) ? pick(data.data.images[0]) : undefined) : undefined) ??
      (data?.result && typeof data.result === 'object' ? pick(data.result?.image_url) ?? pick(data.result?.image) : undefined)

    if (typeof rawImage !== 'string' || rawImage.trim() === '') {
      throw new Error(data?.error || 'SD proxy 未返回有效图片字段（images 为空）')
    }
    const imageUrl = rawImage.trim()

    // —— 图片有效性校验：真实链路绝不把空图/占位/坏图当作成功 ——
    console.debug(
      '[patternGeneration] images[0] typeof:',
      typeof rawImage,
      '| 是 data:image 前缀:',
      imageUrl.startsWith('data:image/'),
      '| 字符串长度:',
      imageUrl.length,
    )
    if (imageUrl.startsWith('data:image/')) {
      const inspected = inspectDataUrl(imageUrl)
      console.debug(
        '[patternGeneration] base64 解码: byteLength=',
        inspected.byteLength,
        '| 文件头 hex:',
        inspected.headerHex || '(无)',
        '| 有效:',
        inspected.ok,
      )
      if (!inspected.ok || inspected.byteLength < MIN_IMAGE_BYTES) {
        throw new Error(
          inspected.ok
            ? `SD 返回图片过小（${inspected.byteLength} 字节 < ${MIN_IMAGE_BYTES}），未拿到有效图片`
            : (inspected.reason || 'SD 返回图片无效，未拿到有效图片'),
        )
      }
    } else if (/^https?:\/\//.test(imageUrl)) {
      console.debug('[patternGeneration] SD 返回远程 URL（下载时再做字节/文件头校验）')
    } else {
      throw new Error('SD 返回的图片字段既不是 data URL 也不是 http(s) URL，未拿到有效图片')
    }

    return {
      imageUrl,
      generationId: data.generation_id || `sd-${Date.now()}`,
      seed: typeof data.seed === 'number' ? data.seed : -1,
      elapsedMs: typeof data.elapsed_ms === 'number' ? data.elapsed_ms : undefined,
      filePath: data.file_path || undefined,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 真实生成入口（带 mock 降级）
 * 与原 mockGeneration.generatePatternWithFallback 同签名，方便直接替换 import。
 */
export async function generatePatternWithFallback(
  params: GenerationParams
): Promise<PatternGenerationResult> {
  const { prompt, negativePrompt, loraFile, loraWeight, trigger, subLabelEn, subcategoryId } = buildPromptParts(params)

  // 控制台打印最终 prompt，便于排查
  console.log('[patternGeneration] ===== 生成请求 =====')
  console.log('[patternGeneration] subcategoryId:', subcategoryId, `(${subLabelEn ?? 'n/a'})`)
  console.log('[patternGeneration] triggers:', trigger)
  console.log('[patternGeneration] lora:', loraFile ? `<lora:${loraFile}:${loraWeight}>` : 'none', '| weight:', loraWeight)
  console.log('[patternGeneration] final prompt:', prompt)
  console.log('[patternGeneration] negative prompt:', negativePrompt)

  // 校验 1：当前子类的结构词不得出现在 negative（防止与正向结构描述正负冲突）
  const geoStructureTerms = GEOMETRIC_STRUCTURE_TERMS[subcategoryId] ?? []
  const leakedStructureTerms = geoStructureTerms.filter((t) => negativePrompt.includes(t))
  console.log(
    '[patternGeneration] 结构词负向校验:',
    subcategoryId,
    leakedStructureTerms.length === 0
      ? `OK（negative 未含自身结构词：${geoStructureTerms.join(' / ') || 'n/a'}）`
      : `泄漏: ${leakedStructureTerms.join(' / ')}`,
  )

  // 校验 2：真实潘通色号时，prompt 不得同时出现具体色与 monochrome black palette（颜色单一）
  const hasRealPantone = /pantone \d{2}-\d{4}/.test(prompt)
  const hasMonoBlackPalette = prompt.includes('monochrome black palette')
  if (hasRealPantone && hasMonoBlackPalette) {
    console.warn('[patternGeneration] 颜色冲突: 具体潘通色号与 monochrome black palette 同时存在！')
  } else {
    console.log(
      '[patternGeneration] 颜色一致性:',
      hasRealPantone ? 'OK（具体潘通色号，单一色系）' : hasMonoBlackPalette ? 'OK（monochrome black 语义色）' : 'OK',
    )
  }

  // 校验 3：jindi 触发词写死（2026-08-31 约定 ichpattern_jindi），不得是占位文案
  if (subcategoryId === 'jindi') {
    console.log(
      '[patternGeneration] 锦地触发词校验:',
      trigger === 'ichpattern_jindi' ? 'OK（ichpattern_jindi）' : `异常（当前: ${trigger}）`,
    )
  }

  // 校验 4：盘长 negative 不得含 endless knot / interwoven / panchang / knot（会压掉正确结形）
  if (subcategoryId === 'panchang') {
    const forbidden = ['endless knot', 'interwoven', 'panchang', 'knot']
    const leaked = forbidden.filter((t) => negativePrompt.includes(t))
    console.log(
      '[patternGeneration] 盘长负向校验:',
      leaked.length === 0 ? 'OK（negative 无 endless knot / interwoven / panchang / knot）' : `泄漏: ${leaked.join(' / ')}`,
    )
    console.log(
      '[patternGeneration] 盘长 LoRA/trigger 校验:',
      loraFile === 'ICH_panchang_pattern_lora_v1_epoch8_FINAL_DELIVERY' && trigger === 'ichpattern_panchang'
        ? `OK（${loraFile} @ ${loraWeight} / ${trigger}）`
        : `异常（lora=${loraFile}, trigger=${trigger}）`,
    )
    // 供与 WebUI 同 seed 对比：完整 prompt / negative
    console.log('[patternGeneration] 盘长 final prompt:\n' + prompt)
    console.log('[patternGeneration] 盘长 final negative:\n' + negativePrompt)
  }

  // 校验 5：回纹 negative 必含实物/块面压制词，且不得含自身结构词
  if (subcategoryId === 'huiwen') {
    const required = [
      'photograph',
      'product photo',
      'physical object',
      'still life',
      'organic',
      'abstract block',
      'fragmented shapes',
      'random geometry',
      'star motif',
      'snowflake',
    ]
    const missing = required.filter((t) => !negativePrompt.includes(t))
    const forbidden = ['meander', 'greek key', 'rectangular spiral', 'maze', 'fret', 'orthogonal', 'huiwen']
    const leakedForbidden = forbidden.filter((t) => negativePrompt.includes(t))
    console.log(
      '[patternGeneration] 回纹负向校验:',
      missing.length === 0 && leakedForbidden.length === 0
        ? 'OK（压制词齐全，且无 meander/greek key/rectangular spiral/maze/fret/orthogonal）'
        : `${missing.length > 0 ? `缺: ${missing.join('/')}` : ''}${leakedForbidden.length > 0 ? ` 泄漏: ${leakedForbidden.join('/')}` : ''}`,
    )
    console.log('[patternGeneration] 回纹 final prompt:\n' + prompt)
    console.log('[patternGeneration] 回纹 final negative:\n' + negativePrompt)
  }

  // 校验 6：锦地 negative 必含软边/抽象压制词，且不得含结构禁词
  if (subcategoryId === 'jindi') {
    const required = [
      'soft blob',
      'cloudy silhouette',
      'abstract amorphous shapes',
      'watercolor wash',
      'irregular organic blobs',
      'photorealistic fabric folds',
      'product photo',
      'broken lattice',
      'random geometry',
      'physical object',
    ]
    const missing = required.filter((t) => !negativePrompt.includes(t))
    const forbidden = ['hexagon', 'honeycomb', 'tortoiseshell', 'brocade', 'jindi', 'geometric ground']
    const leakedForbidden = forbidden.filter((t) => negativePrompt.includes(t))
    // lattice 特判：只允许 broken lattice（刻意压制词），独立 lattice 结构词算泄漏
    const latticeOnlyBroken = negativePrompt.includes('lattice') && !negativePrompt.includes('broken lattice')
    const ok = missing.length === 0 && leakedForbidden.length === 0 && !latticeOnlyBroken
    console.log(
      '[patternGeneration] 锦地负向校验:',
      ok
        ? 'OK（压制词齐全，无 hexagon/honeycomb/tortoiseshell/brocade/jindi/geometric ground，lattice 仅以 broken lattice 刻意压制形式存在）'
        : `${missing.length > 0 ? `缺: ${missing.join('/')}` : ''}${leakedForbidden.length > 0 ? ` 泄漏: ${leakedForbidden.join('/')}` : ''}${latticeOnlyBroken ? ' lattice 泄漏' : ''}`,
    )
    console.log('[patternGeneration] 锦地 final prompt:\n' + prompt)
    console.log('[patternGeneration] 锦地 final negative:\n' + negativePrompt)
  }

  // 校验 7：方胜 LoRA/trigger 排布分流 + 负向必含/禁止 + flat/2d（2026-08-31 专项）
  const isFangshengGen =
    subcategoryId === 'fangsheng' || subcategoryId === 'fangsheng_single' || subcategoryId === 'fangsheng_continuous'
  if (isFangshengGen) {
    const layout =
      subcategoryId === 'fangsheng_continuous'
        ? 'continuous'
        : subcategoryId === 'fangsheng_single'
          ? 'single'
          : params.arrangement === 'seamless'
            ? 'continuous'
            : 'single'
    const expectLora =
      layout === 'continuous' ? 'ICH_fangsheng_continuous_lora_v1-000003' : 'ICH_fangsheng_single_lora_v2-000001'
    const expectTrigger = layout === 'continuous' ? 'ichpattern_fangsheng_continuous' : 'ichpattern_fangsheng_single'
    const loraOk = loraFile === expectLora && trigger === expectTrigger
    const wrongSideLora = layout === 'single' ? loraFile?.includes('continuous') : loraFile?.includes('single')
    const weightOk = loraWeight >= 0.85 && loraWeight <= 0.95
    const requiredNegative = [
      'realistic photo',
      'photograph',
      'product photo',
      '3d render',
      'furniture',
      'chair',
      'sofa',
      'blanket',
      'throw',
      'fabric folds',
      'textile texture',
      'woven cloth',
      'floor tiles',
      'checkerboard floor',
      'ruler',
      'measuring tape',
      'scale bar',
      'text',
      'watermark',
      'logo',
      'letters',
      'words',
      'caption',
    ]
    const missing = requiredNegative.filter((t) => !negativePrompt.includes(t))
    const forbidden = ['fangsheng', 'interlocking diamond', 'diamond motif', 'medallion']
    const leaked = forbidden.filter((t) => negativePrompt.includes(t))
    const hasFlat = prompt.includes('flat pattern design') && prompt.includes('2d illustration')
    // 排布专属正向词（2026-09-01）：连续 → fine line / thin stroke linework / nested double diamond outline / diamond mesh；
    // 单独 → only one motif / nested diamond core / petal-like outer frame（large empty margin 已在固定前缀）
    const posSingleWords = ['only one motif', 'nested diamond core', 'petal-like outer frame']
    const posContinuousWords = ['fine line', 'thin stroke linework', 'nested double diamond outline', 'diamond mesh']
    const missingPos = (layout === 'continuous' ? posContinuousWords : posSingleWords).filter((t) => !prompt.includes(t))
    // 排布专属负向：单独必含 seamless/tileable/full background/all-over；连续必不含 seamless/tileable/continuous
    const missingNegSingle =
      layout === 'single'
        ? ['seamless', 'tileable', 'full background pattern', 'all-over pattern'].filter((t) => !negativePrompt.includes(t))
        : []
    const leakedNegContinuous =
      layout === 'continuous'
        ? ['seamless', 'tileable', 'continuous pattern'].filter((t) => negativePrompt.includes(t))
        : []
    const ok =
      loraOk &&
      !wrongSideLora &&
      weightOk &&
      missing.length === 0 &&
      leaked.length === 0 &&
      hasFlat &&
      missingPos.length === 0 &&
      missingNegSingle.length === 0 &&
      leakedNegContinuous.length === 0
    console.log(
      '[patternGeneration] 方胜校验:',
      ok
        ? `OK（排布=${layout}，lora=${expectLora} weight=${loraWeight}，负向必含/禁止齐全，含 flat pattern design + 2d illustration，排布专属正/负向词齐）`
        : `${!loraOk ? `LoRA 不匹配(实际 ${loraFile})` : ''}${wrongSideLora ? ' 误挂另一侧 LoRA' : ''}${!weightOk ? ` weight 越界(${loraWeight})` : ''}${missing.length > 0 ? ` 负向缺: ${missing.join('/')}` : ''}${leaked.length > 0 ? ` 负向泄漏: ${leaked.join('/')}` : ''}${!hasFlat ? ' 无 flat pattern design/2d illustration' : ''}${missingPos.length > 0 ? ` 正向缺排布词: ${missingPos.join('/')}` : ''}${missingNegSingle.length > 0 ? ` 单独负向缺: ${missingNegSingle.join('/')}` : ''}${leakedNegContinuous.length > 0 ? ` 连续负向误含: ${leakedNegContinuous.join('/')}` : ''}`,
    )
    console.log('[patternGeneration] 方胜 final prompt:\n' + prompt)
    console.log('[patternGeneration] 方胜 final negative:\n' + negativePrompt)
  }

  console.log(
    '[patternGeneration] params: steps=', SD_DEFAULTS.steps,
    'cfg=', SD_DEFAULTS.cfgScale,
    'sampler=', SD_DEFAULTS.samplerName,
  )

  try {
    const result = await callSdProxy({
      prompt,
      negative_prompt: negativePrompt,
      width: SD_DEFAULTS.width,
      height: SD_DEFAULTS.height,
      steps: SD_DEFAULTS.steps,
      cfg_scale: SD_DEFAULTS.cfgScale,
      sampler_name: SD_DEFAULTS.samplerName,
      seed: SD_DEFAULTS.seed,
    })

    console.log(
      '[patternGeneration] ===== 真实生成成功 =====',
      '| seed:', result.seed,
      '| elapsed:', result.elapsedMs ? `${result.elapsedMs}ms` : 'n/a',
      '| file:', result.filePath || 'n/a',
      '| fallback: false',
    )

    return {
      imageUrl: result.imageUrl,
      generationId: result.generationId,
      prompt,
      negativePrompt,
      fallback: false,
      seed: result.seed,
      elapsedMs: result.elapsedMs,
      filePath: result.filePath,
    }
  } catch (err: any) {
    const reason = err?.name === 'AbortError'
      ? 'SD 生成超时（CPU 推理较慢，10 分钟仍未返回）'
      : (err?.message || String(err))
    console.warn(
      '[patternGeneration] ===== 真实生成失败，降级 mock =====',
      '| fallback: true',
      '| reason:', reason,
    )

    // mock 兜底：保证页面不白屏
    const mock = await mockGeneratePattern(params)
    return {
      imageUrl: mock.imageUrl,
      generationId: mock.generationId,
      // mockGeneratePattern 导出类型不含 prompt 字段，这里直接用本地拼好的 prompt
      // （上面 console.log 已打印过），保证 fallback 结果也有可读 prompt
      prompt,
      negativePrompt,
      fallback: true,
      fallbackReason: reason,
      seed: -1,
    }
  }
}

// ===================== 融合生成 =====================

export interface FusionGenerationOptions {
  /** 子类 A 的 subcategory id（如 'huiwen' 回纹） */
  subcategoryA: string
  /** 子类 B 的 subcategory id（如 'peony' 牡丹） */
  subcategoryB: string
  /** 子类 A 的融合比例（0-100） */
  ratioA: number
  /** 子类 B 的融合比例（0-100），一般与 ratioA 之和为 100 */
  ratioB: number
  /** 融合结果共用的一套生成参数（主题色/复杂度/文化符号强度/排布/对称） */
  params: GenerationParams
}

export interface FusionPromptInfo {
  prompt: string
  negativePrompt: string
  loraA: { file: string; weight: number } | null
  loraB: { file: string; weight: number } | null
  triggersA: string
  triggersB: string
  subLabelEnA: string | null
  subLabelEnB: string | null
}

/**
 * 融合 prompt 拼接
 *
 * 权重映射公式（写入注释供排障对照）：
 *   weight = clamp( loraMap 推荐权重 × 融合比例 / 100 )   // 保留 2 位小数，上限 1.5
 *   例：回纹（推荐 0.7）+ 牡丹（推荐 0.8），比例 70/30
 *     → 子类A: 0.7 × 0.70 = 0.49 → <lora:ICH_huiwen_pattern_lora:0.49>
 *     → 子类B: 0.8 × 0.30 = 0.24 → <lora:ICH_peony_pattern_lora_v7_clear:0.24>
 * 说明：
 *   - 推荐权重反映该 LoRA 训练效果（几何 0.7 / 花卉 0.8），再乘比例分配主次，
 *     避免两个 LoRA 同时满权导致叠色过冲。
 *   - 权重 < 0.05 视为该子类无贡献：省略 <lora:...> 标签，但 trigger 仍写入 prompt。
 *   - loraMap 中 loraFile 为 null 的子类：不加 lora 标签，只写 trigger，不崩溃。
 *     （2026-08-26 起兰花/芙蓉花/石榴花已挂载专属 LoRA，不再命中该分支。）
 */
/**
 * 花卉+回纹边框模式词表（2026-09-02 稳定版）
 *
 * 目标：回纹仅作最外细边框、内区仅花卉，避免回纹权重过高 / maze 结构词诱发「满铺迷宫」。
 * - 回纹 LoRA 权重恒 ≤0.6（默认 0.45–0.55），任何比例下滑条都降级为 border 语义；
 * - 花卉 LoRA 权重 0.75–0.85（内区主体）。
 */
const HUIWEN_BORDER_PROMPT = {
  /** 花卉侧 LoRA 权重区间（默认 0.75–0.85） */
  floralWeightRange: [0.75, 0.85] as const,
  /** 回纹侧 LoRA 权重区间（0.45–0.55，最高不超过 0.6） */
  huiwenWeightRange: [0.45, 0.55] as const,
  /** 正向必须包含的边框句（替换旧 border frame only / corner ornaments 倾向词） */
  requiredPositive: [
    'thin single-line outermost border only',
    'one narrow greek key frame along the four outer edges',
    'floral filling the inner panel only',
  ],
  /** 允许的补充边框描述（thin border 宽度约束） */
  availablePositive: ['simple rectangular meander border band', 'thin border width'],
  /** 正向禁止词：maze / labyrinth 类，命中即从 prompt 移除（以 border only 为准） */
  bannedPositive: [
    'nested rectangular maze',
    'rectangular spiral meander',
    'labyrinth',
    'dense meander field',
    'full meander background',
  ],
  /** 负向固定追加：压制满铺 / 迷宫 / 多层内框 */
  fixedNegative: [
    'meander filling the whole image',
    'labyrinth',
    'maze background',
    'nested meander',
    'all-over greek key',
    'huiwen all-over',
    'dense maze',
    'complex labyrinth medallion',
    // 保留既有压制（去重后拼入）
    'meander all-over pattern',
    'huiwen filling whole background',
    'borderless',
    'inner meander frame',
    'meander in the center',
    'nested meander square',
    'huiwen inside',
  ],
}

export function buildFusionPromptParts(options: FusionGenerationOptions): FusionPromptInfo {
  const { subcategoryA, subcategoryB, ratioA, ratioB, params } = options
  const subA = getLoraEntry(subcategoryA)
  const subB = getLoraEntry(subcategoryB)

  const triggersA: string[] = (subA?.trigger ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const triggersB: string[] = (subB?.trigger ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const subLabelEnA = subA?.subLabelEn ?? null
  const subLabelEnB = subB?.subLabelEn ?? null

  // 方胜纹排布分流（融合）：排布=单独/居中 → 单独 LoRA；排布=四方连续 → 连续 LoRA。
  // 直接覆盖 trigger 与 lora 文件，一次只挂一个方胜 LoRA，禁止两个同时加载。
  const isSeamless = params.arrangement === 'seamless'
  let loraFileA = subA?.loraFile ?? null
  let loraFileB = subB?.loraFile ?? null
  if (subcategoryA === 'fangsheng') {
    const fs = FANGSHENG_LORA_MAP[isSeamless ? 'continuous' : 'single']
    triggersA.length = 0
    triggersA.push(fs.trigger)
    loraFileA = fs.loraFile
  }
  if (subcategoryB === 'fangsheng') {
    const fs = FANGSHENG_LORA_MAP[isSeamless ? 'continuous' : 'single']
    triggersB.length = 0
    triggersB.push(fs.trigger)
    loraFileB = fs.loraFile
  }

  // 权重映射：推荐权重 × 比例（公式见函数上方注释）
  const clampW = (w: number) => Math.max(0, Math.min(1.5, w))
  const calcWeight = (recommended: number, ratio: number) =>
    Math.round(clampW((recommended * ratio) / 100) * 100) / 100
  let weightA = calcWeight(subA?.loraWeight ?? DEFAULT_LORA_WEIGHT, ratioA)
  let weightB = calcWeight(subB?.loraWeight ?? DEFAULT_LORA_WEIGHT, ratioB)

  // 融合是否含方胜：任一槽为方胜时，按全局排布决定"单独/连续"语义与负向提示
  const hasFangsheng = subcategoryA === 'fangsheng' || subcategoryB === 'fangsheng'

  // 回纹+花卉 边框模式（2026-09-01）：回纹只作边框、花卉居中主体。
  // 任一槽为回纹、另一槽为花卉（themeId === 'floral'）即启用（默认意图即边框融合）。
  const hasHuiwenBorder =
    (subcategoryA === 'huiwen' && subB?.themeId === 'floral') ||
    (subcategoryB === 'huiwen' && subA?.themeId === 'floral')
  if (hasHuiwenBorder) {
    // 2026-09-02 权重反转修复：旧值「回纹 0.7–0.85 略高」导致回纹满铺成迷宫。
    // 新值：花卉 0.75–0.85（内区主体）、回纹 0.45–0.55（最外细边框，恒 ≤0.6）。
    // 滑条把回纹比例推到 >45% 时仍按此 clamp（≤0.6），"满铺回纹"意图被降级为 border。
    const clampRange = (w: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(w * 100) / 100))
    const [fwLo, fwHi] = HUIWEN_BORDER_PROMPT.floralWeightRange
    const [hwLo, hwHi] = HUIWEN_BORDER_PROMPT.huiwenWeightRange
    if (subcategoryA === 'huiwen') {
      weightA = clampRange(weightA, hwLo, hwHi)
      weightB = clampRange(weightB, fwLo, fwHi)
    } else {
      weightB = clampRange(weightB, hwLo, hwHi)
      weightA = clampRange(weightA, fwLo, fwHi)
    }
  }

  const loraA = loraFileA && weightA >= 0.05 ? { file: loraFileA, weight: weightA } : null
  const loraB = loraFileB && weightB >= 0.05 ? { file: loraFileB, weight: weightB } : null

  // 复用单纹样的颜色/排布/对称等装饰段；伪 params 挂子类 A，用于潘通色号反查
  const pseudoParams: GenerationParams = {
    ...params,
    dimension: { ...params.dimension, subcategory: subcategoryA },
  }

  const parts: string[] = []

  // 1) 触发词：A、B 的 trigger 全部入列（多 trigger 逐项写入）
  for (const t of [...triggersA, ...triggersB]) parts.push(t)

  // 2) Chinese traditional {A} and {B} pattern
  if (subLabelEnA && subLabelEnB) {
    parts.push(`Chinese traditional ${subLabelEnA} and ${subLabelEnB} fusion pattern`)
  } else if (subLabelEnA || subLabelEnB) {
    parts.push(`Chinese traditional ${subLabelEnA ?? subLabelEnB} pattern`)
  } else {
    parts.push('Chinese traditional pattern')
  }

  // 2.5) 几何结构强化（融合侧命中则并入，如 回纹+牡丹 时回纹补直角折线描述）。
  // 2026-09-02：花卉+回纹边框模式下过滤回纹 maze/labyrinth 类结构词（nested rectangular maze /
  // rectangular spiral meander 会把"回纹边框"诱发成满幅迷宫），以 border only 语义为准。
  const removedMazeWords: string[] = []
  ;[subcategoryA, subcategoryB].forEach((id) => {
    const boost = GEOMETRIC_STRUCTURE_BOOST[id]
    if (!boost) return
    boost.forEach((w) => {
      if (hasHuiwenBorder && id === 'huiwen') {
        const banned = HUIWEN_BORDER_PROMPT.bannedPositive.find((b) => w.toLowerCase().includes(b.toLowerCase()))
        if (banned) {
          removedMazeWords.push(w)
          return
        }
      }
      parts.push(w)
    })
  })
  if (removedMazeWords.length > 0) {
    console.debug(
      '[patternGeneration] 花卉+回纹边框模式：移除正向 maze 倾向词 =',
      removedMazeWords.join(' | '),
      '（以 thin outermost border only 为准）',
    )
  }

  // 2.7) 回纹+花卉 边框模式（2026-09-02 稳定版）：回纹仅最外细边框、内区仅花卉。
  //      用 thin single-line / narrow greek key 精确词替换旧的 border frame only / square frame /
  //      corner cloud ornaments（角花/方框词会叠加成多框或诱发迷宫）。
  if (hasHuiwenBorder) {
    for (const w of HUIWEN_BORDER_PROMPT.requiredPositive) parts.push(w)
    for (const w of HUIWEN_BORDER_PROMPT.availablePositive) parts.push(w)
    parts.push('huiwen ONLY as outermost border, interior ONLY floral, no meander inside')
    // 旋转对称 → 细圆形回纹环（仍是最外细边框）
    if (params.symmetry === 'rotation') {
      parts.push('thin circular meander ring along outer edge')
    }
  }

  // 3) 颜色加权前缀：在 prompt 前半部分重复颜色词，增强模型对颜色的响应
  const colorWeighted = buildColorWeightedClause(pseudoParams)
  if (colorWeighted) parts.push(colorWeighted)

  // 4) decorative motif（固定；锦地已并入固定前缀，避免重复）
  if (subcategoryA !== 'jindi' && subcategoryB !== 'jindi') {
    parts.push('decorative motif')
  }

  // 5) 平面/肌理：textureDetail 0–100（锦地默认偏 flat，flat 限定已在固定前缀，跳过避免重复）
  const tex = params.textureDetail ?? 50
  if (subcategoryA !== 'jindi' && subcategoryB !== 'jindi') {
    if (tex < 40) {
      parts.push('flat pattern design, clean lines, no texture')
    } else if (tex < 70) {
      parts.push('flat pattern design, subtle surface hint')
    } else {
      parts.push('embroidery texture')
    }
  }

  // 6) 疏密：complexity 0–100
  const cmp = params.complexity ?? 50
  if (cmp < 30) {
    parts.push('minimal geometric, simple sparse detail')
  } else if (cmp < 70) {
    parts.push('medium detail, balanced density')
  } else {
    parts.push('dense elaborate full pattern, intricate detail')
  }

  // 7) 排布：arrangement
  // 2026-09-02：花卉+回纹边框模式强制 single——continuous tile 语义会要求"满铺可平铺"，
  // 与"回纹仅最外细边框"冲突，会把回纹融回满铺。预设/UI 已 single，这里做兜底强制。
  const arrangementUsed = hasHuiwenBorder ? ('single' as const) : params.arrangement
  switch (arrangementUsed) {
    case 'single':
      parts.push('single motif, centered medallion')
      // 融合含方胜/盘长/回纹且排布=单独：强化"单个纹样"语义，避免退化成连续网
      // （回纹+花卉边框模式除外：回纹作边框、花卉居中，不由 isolated emblem 语义接管）
      if (
        hasFangsheng ||
        subcategoryA === 'panchang' ||
        subcategoryB === 'panchang' ||
        ((subcategoryA === 'huiwen' || subcategoryB === 'huiwen') && !hasHuiwenBorder)
      ) {
        parts.push('single motif only, isolated emblem, large empty margin, no repeat, no tiling')
      }
      // 锦地单独：large empty margin / no seamless tile（2026-08-31）
      if (subcategoryA === 'jindi' || subcategoryB === 'jindi') {
        parts.push('large empty margin, no seamless tile')
      }
      break
    case 'seamless':
      // 回纹+花卉边框模式：不写平铺词（seamless/tileable 与"回纹只作边框"冲突），边框语义已在 2.7 注入
      if (!hasHuiwenBorder) {
        parts.push('seamless repeat, tileable continuous pattern')
        // 盘长连续版（融合侧命中则补）：交织结连续语义，避免退化成菱形网
        if (subcategoryA === 'panchang' || subcategoryB === 'panchang') {
          parts.push('continuous interlocking knot pattern')
        }
        // 回纹连续版（融合侧命中则补）：显式 meander / greek key border
        if (subcategoryA === 'huiwen' || subcategoryB === 'huiwen') {
          parts.push('tileable continuous meander pattern, repeating greek key border')
        }
      }
      // 锦地连续版（默认）：疏密由第 6 步统一 caption 表控制，不在此重复
      break
    case 'adapted':
      parts.push('fitted panel motif, shaped to border')
      break
  }

  // 8) 对称：symmetry
  switch (params.symmetry) {
    case 'mirror':
      parts.push('bilateral mirror symmetry')
      break
    case 'rotation':
      parts.push('rotational symmetry')
      break
    case 'none':
      parts.push('asymmetric free composition')
      break
  }

  // 9) 文化符号强度：culturalIntensity 0–100
  const ci = params.culturalIntensity ?? 50
  if (ci < 35) {
    parts.push('simplified abstract interpretation of traditional symbol')
  } else if (ci < 65) {
    parts.push('recognizable traditional form with design refinement')
  } else {
    parts.push('classic authentic traditional form, clearly recognizable')
  }

  // 10) 配色（保留在末尾，双重保险）
  parts.push(buildColorClause(pseudoParams))

  // 末尾固定加 traditional ICH style
  parts.push('traditional ICH style')

  // 11) 两个 LoRA 标签：子类 A 在前、子类 B 在后
  if (loraA) parts.push(`<lora:${loraA.file}:${loraA.weight}>`)
  if (loraB) parts.push(`<lora:${loraB.file}:${loraB.weight}>`)

  const prompt = parts.join(', ')
  let negativePrompt = buildNegativePromptCore([subcategoryA, subcategoryB], params.colorScheme, arrangementUsed)
  // 回纹+花卉边框模式：固定追加迷宫/满铺/多层框压制（2026-09-02 合并新旧压制词）
  if (hasHuiwenBorder) {
    negativePrompt += ', ' + HUIWEN_BORDER_PROMPT.fixedNegative.join(', ')
  }

  return {
    prompt,
    negativePrompt,
    loraA,
    loraB,
    triggersA: triggersA.join(', '),
    triggersB: triggersB.join(', '),
    subLabelEnA,
    subLabelEnB,
  }
}

/**
 * 融合生成入口（真实链路与单纹样一致：sd_proxy → A1111 txt2img）
 * 失败降级 mock 保证页面不白屏；控制台打印完整 prompt，便于验收核对 lora 权重
 */
export async function generateFusionWithFallback(options: FusionGenerationOptions): Promise<PatternGenerationResult> {
  const info = buildFusionPromptParts(options)

  console.log('[patternGeneration] ===== 融合生成请求 =====')
  console.log(
    '[patternGeneration] 子类A:',
    options.subcategoryA,
    `(${info.subLabelEnA ?? 'n/a'})`,
    '| 子类B:',
    options.subcategoryB,
    `(${info.subLabelEnB ?? 'n/a'})`,
    '| 比例:',
    `${options.ratioA}/${options.ratioB}`,
  )
  console.log(
    '[patternGeneration] loraA:',
    info.loraA ? `<lora:${info.loraA.file}:${info.loraA.weight}>` : 'none',
    '| loraB:',
    info.loraB ? `<lora:${info.loraB.file}:${info.loraB.weight}>` : 'none',
  )
  console.log('[patternGeneration] final prompt:', info.prompt)
  console.log('[patternGeneration] negative prompt:', info.negativePrompt)
  console.log(
    '[patternGeneration] params: steps=', SD_DEFAULTS.steps,
    'cfg=', SD_DEFAULTS.cfgScale,
    'sampler=', SD_DEFAULTS.samplerName,
    'size=', `${SD_DEFAULTS.width}x${SD_DEFAULTS.height}`,
  )

  // 回纹+花卉边框模式校验（2026-09-02）：正向细边框句、正向无 maze 泄漏、负向压制词、双 LoRA 权重区间
  const huiwenBorder =
    (options.subcategoryA === 'huiwen' && getLoraEntry(options.subcategoryB)?.themeId === 'floral') ||
    (options.subcategoryB === 'huiwen' && getLoraEntry(options.subcategoryA)?.themeId === 'floral')
  if (huiwenBorder) {
    const huiwenRatio = options.subcategoryA === 'huiwen' ? options.ratioA : options.ratioB
    const huiwenW = options.subcategoryA === 'huiwen' ? info.loraA?.weight : info.loraB?.weight
    const floralW = options.subcategoryA === 'huiwen' ? info.loraB?.weight : info.loraA?.weight
    // 1) 正向必需细边框句
    const missing = HUIWEN_BORDER_PROMPT.requiredPositive.filter((t) => !info.prompt.includes(t))
    // 2) 正向不得残留 maze / labyrinth（build 期已移除，这里复查）
    const mazeLeaked = HUIWEN_BORDER_PROMPT.bannedPositive.filter((b) => info.prompt.toLowerCase().includes(b))
    // 3) 负向固定压制词抽查（核心代表，防未来词表漂移）
    const negReq = [
      'meander filling the whole image',
      'labyrinth',
      'maze background',
      'nested meander',
      'all-over greek key',
      'dense maze',
      'complex labyrinth medallion',
      'meander all-over pattern',
      'huiwen inside',
    ]
    const negMissing = negReq.filter((t) => !info.negativePrompt.includes(t))
    // 4) LoRA 权重区间：回纹 0.45–0.55（最高 0.6）、花卉 0.75–0.85
    const [fwLo, fwHi] = HUIWEN_BORDER_PROMPT.floralWeightRange
    const [hwLo, hwHi] = HUIWEN_BORDER_PROMPT.huiwenWeightRange
    const wOk =
      huiwenW !== undefined && floralW !== undefined && huiwenW >= hwLo && huiwenW <= hwHi && floralW >= fwLo && floralW <= fwHi
    const pass = missing.length === 0 && mazeLeaked.length === 0 && negMissing.length === 0 && wOk
    console.log(
      '[patternGeneration] 回纹+花卉边框校验:',
      pass
        ? `OK（回纹 weight=${huiwenW}≤0.6，花卉 weight=${floralW}，thin outermost border 词齐，无 maze/labyrinth 泄漏，负向压制齐）`
        : `${missing.length > 0 ? ` 正向缺 thin border 词: ${missing.join('/')}` : ''}${mazeLeaked.length > 0 ? ` 正向 maze 泄漏: ${mazeLeaked.join('/')}` : ''}${negMissing.length > 0 ? ` 负向缺: ${negMissing.join('/')}` : ''}${!wOk ? ` 权重越界(回纹=${huiwenW}, 花卉=${floralW})` : ''}`,
    )
    console.log(
      '[patternGeneration] 回纹边框日志: 回纹比例=',
      `${huiwenRatio}%`,
      '| lora 权重: 回纹=',
      huiwenW,
      '花卉=',
      floralW,
      '| 正向含 thin outermost border:',
      info.prompt.includes('thin single-line outermost border only'),
      '| 正向含 maze/labyrinth:',
      /labyrinth|maze/i.test(info.prompt),
      '| 满铺回纹语义 -> 已降级为 border（比例>45% 时回纹权重仍 <=0.6）',
    )
    if (options.params?.arrangement === 'seamless') {
      console.warn('[patternGeneration] 花卉+回纹：检测到 seamless 排布，已强制按 single（continuous tile 与边框模式冲突）')
    }
  }

  try {
    const result = await callSdProxy({
      prompt: info.prompt,
      negative_prompt: info.negativePrompt,
      width: SD_DEFAULTS.width,
      height: SD_DEFAULTS.height,
      steps: SD_DEFAULTS.steps,
      cfg_scale: SD_DEFAULTS.cfgScale,
      sampler_name: SD_DEFAULTS.samplerName,
      seed: SD_DEFAULTS.seed,
    })

    console.log(
      '[patternGeneration] ===== 融合真实生成成功 =====',
      '| seed:', result.seed,
      '| elapsed:', result.elapsedMs ? `${result.elapsedMs}ms` : 'n/a',
      '| file:', result.filePath || 'n/a',
      '| fallback: false',
    )

    return {
      imageUrl: result.imageUrl,
      generationId: result.generationId,
      prompt: info.prompt,
      negativePrompt: info.negativePrompt,
      fallback: false,
      seed: result.seed,
      elapsedMs: result.elapsedMs,
      filePath: result.filePath,
    }
  } catch (err: any) {
    const reason = err?.name === 'AbortError'
      ? 'SD 生成超时（CPU 推理较慢，10 分钟仍未返回）'
      : (err?.message || String(err))
    console.warn(
      '[patternGeneration] ===== 融合真实生成失败，降级 mock =====',
      '| fallback: true',
      '| reason:', reason,
    )

    // mock 兜底：以子类 A 的触发词构造单纹样 params（mock 只保证页面有图）
    const mockParams: GenerationParams = {
      ...options.params,
      dimension: { ...options.params.dimension, subcategory: options.subcategoryA },
    }
    const mock = await mockGeneratePattern(mockParams)
    return {
      imageUrl: mock.imageUrl,
      generationId: mock.generationId,
      prompt: info.prompt,
      negativePrompt: info.negativePrompt,
      fallback: true,
      fallbackReason: reason,
      seed: -1,
    }
  }
}

/** 暴露给外部单测/调试使用 */
export const __debug = { buildPromptParts, buildFusionPromptParts, SD_DEFAULTS, PROXY_URL }
