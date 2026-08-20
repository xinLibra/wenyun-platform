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

import { GenerationParams } from '../types/pattern'
import { getLoraEntry, DEFAULT_LORA_WEIGHT } from '../config/loraMap'
import { getPantoneForSubcategory } from '../config/generationPresets'
import { mockGeneratePattern } from './mockGeneration'

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
 * 潘通色号 → HEX 映射（与 GenerationParams.tsx pantoneColors 保持一致）
 *
 * 这里只录入 SUBCATEGORY_PANTONE_MAP 用到的 12 条瑞兽子类色号，
 * 不照搬完整 200+ 条表，避免数据冗余维护负担。
 * 如有缺失，buildColorWeightedClause 会优雅降级（不写 HEX，只写色名）。
 */
const PANTONE_HEX_MAP: Record<string, string> = {
  // 瑞兽
  '18-1662 TCX': '#C3423F', // 宫墙红 dragon/phoenix_bird/dragon_phoenix/beast_other
  '19-4052 TCX': '#26364B', // 深藏青 crane
  '16-1450 TCX': '#E8B4B8', // 藕粉 butterfly
  '16-4725 TCX': '#1565C0', // 钴蓝 peacock
  '18-1150 TCX': '#CD853F', // 栗棕 deer
  '12-0752 TCX': '#D4AF37', // 金色 lion
  '17-1462 TCX': '#FF6F00', // 橙红 tiger
  // 花卉
  '18-1555 TCX': '#E63946', // 朱红 flower_bird
  '15-1260 TCX': '#7CB342', // 嫩绿 gourd/plant
  '16-0541 TCX': '#5F9E6E', // 松石绿 interlocking_floral
}

/** 根据潘通色号查 HEX；支持 '18-1662' 与 '18-1662 TCX' 两种写法匹配到同一色 */
function getPantoneHex(pantone: string): string | null {
  const norm = normalizePantone(pantone)
  if (PANTONE_HEX_MAP[norm]) return PANTONE_HEX_MAP[norm]
  // 去 TCX 后缀再补回 TCX 后查（如 '18-1662' → '18-1662 TCX'）
  const stripped = normalizePantone(pantone, { stripTcx: true })
  if (PANTONE_HEX_MAP[stripped + ' TCX']) return PANTONE_HEX_MAP[stripped + ' TCX']
  return null
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
  const sub = getLoraEntry(params.dimension.subcategory)
  // 多 trigger 兼容：loraMap.trigger 支持逗号分隔字符串（比如牡丹：'ich_flower_pattern, ich_peony_pattern'）
  // 逐项写入 prompt 前部，保证每个触发词都被模型作为独立 token 单元处理
  const triggers: string[] = (sub?.trigger ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const subLabelEn = sub?.subLabelEn ?? null
  const loraFile = sub?.loraFile ?? null
  const loraWeight = sub?.loraWeight ?? DEFAULT_LORA_WEIGHT
  const subcategoryId = params.dimension.subcategory ?? 'n/a'

  const parts: string[] = []

  // 1) 触发词（牡丹/莲花/花鸟 双 trigger 都会完整入列）
  for (const t of triggers) parts.push(t)

  // 2) Chinese traditional {子类英文} pattern
  if (subLabelEn) {
    parts.push(`Chinese traditional ${subLabelEn} pattern`)
  } else {
    // 没有具体子类时，仍保留 "Chinese traditional pattern" 的语义
    parts.push('Chinese traditional pattern')
  }

  // 3) 颜色加权前缀：在 prompt 前半部分重复颜色词，增强模型对颜色的响应
  //    这是修复"选色后生成颜色不匹配"的核心改动——把颜色词放在 prompt 前半段
  //    并重复 2-3 次，让模型优先关注颜色描述。
  const colorWeighted = buildColorWeightedClause(params)
  if (colorWeighted) {
    parts.push(colorWeighted)
  }

  // 4) decorative motif（固定）
  parts.push('decorative motif')

  // 5) 平面/肌理：textureDetail 0–100
  const tex = params.textureDetail ?? 50
  if (tex < 40) {
    parts.push('flat pattern design, clean lines, no texture')
  } else if (tex < 70) {
    parts.push('flat pattern design, subtle surface hint')
  } else {
    parts.push('embroidery texture')
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
  switch (params.arrangement) {
    case 'single':
      parts.push('single motif, centered medallion')
      break
    case 'seamless':
      parts.push('seamless repeat, tileable continuous pattern')
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
      parts.push('radial rotational symmetry')
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
  // 因为同一个色号在不同子类下可能对应不同语义（如 18-1662 TCX 对 dragon 是 mono，
  // 对 dragon_phoenix 是 multicolor）。
  if (cs.mode === 'pantone' && cs.pantone) {
    const p = cs.pantone.trim()
    // 1. 语义关键词（直接识别）
    if (p === 'monochrome-black') return 'monochrome black palette'
    if (p === 'multicolor') return 'multicolor palette'

    // 2. 真实潘通色号 → 按当前子类查 prompt 语义标签
    //    使用 normalizePantone + stripTcx 比较，与 buildColorWeightedClause 保持一致
    const subId = params.dimension?.subcategory
    if (subId) {
      const pantoneInfo = getPantoneForSubcategory(subId)
      if (pantoneInfo && normalizePantone(pantoneInfo.pantoneCode, { stripTcx: true }) === normalizePantone(p, { stripTcx: true })) {
        if (pantoneInfo.promptTag === 'monochrome-black') return 'monochrome black palette'
        if (pantoneInfo.promptTag === 'multicolor') return 'multicolor palette'
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

/**
 * 从当前 colorScheme 推断主色 hue（用于偏色抑制）
 * 返回 null 表示无明确主色（如 multicolor），调用方应跳过抑制
 */
function inferDominantHue(params: GenerationParams): number | null {
  const cs = params.colorScheme
  if (!cs) return null

  if (cs.mode === 'hue') {
    return cs.hue ?? null
  }

  if (cs.mode === 'image' && cs.colors && cs.colors.length > 0) {
    // 用第一个吸色作为主色
    const m = /^#?([0-9a-fA-F]{6})$/.exec(cs.colors[0].trim())
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

  if (cs.mode === 'pantone' && cs.pantone) {
    const p = cs.pantone.trim()
    // 语义关键词不参与偏色抑制（multicolor/mono-black 不应抑制任何色）
    if (p === 'multicolor' || p === 'monochrome-black') return null
    // 真实色号：按子类反查 promptTag，multicolor 不抑制
    const subId = params.dimension?.subcategory
    if (subId) {
      const pantoneInfo = getPantoneForSubcategory(subId)
      if (pantoneInfo && normalizePantone(pantoneInfo.pantoneCode, { stripTcx: true }) === normalizePantone(p, { stripTcx: true })) {
        if (pantoneInfo.promptTag === 'multicolor') return null
      }
    }
    // 单色：查 HEX → hue
    const hex = getPantoneHex(p)
    if (!hex) return null
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

  return null
}

/**
 * Negative prompt 固定模板
 * 注意：
 *   1. 除非当前子类就是鹿纹（deer），否则把 "deer" 列入排除（瑞兽串味）
 *   2. 除非当前子类就是狮纹（lion），否则把 "lion" 列入排除
 *   3. 选中单色主色时，按 hue 抑制"抢色背景"，避免 SD 默认补蓝/灰背景
 *      （仅抑制 background，不抑制 accent，保留纹样本身少量对比色）
 */
export function buildNegativePrompt(params: GenerationParams): string {
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
  const subId = params.dimension?.subcategory
  if (subId !== 'deer') {
    base.push('deer')
  }
  // 狮纹场景下也不希望虎/鹿串味
  if (subId !== 'lion') {
    base.push('lion')
  }

  // 偏色背景抑制：按主色 hue 抑制非选中色 background
  const hue = inferDominantHue(params)
  if (hue !== null) {
    const suppressed = hueToSuppressedBackgrounds(hue)
    base.push(...suppressed)
  }

  return base.join(', ')
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

    const data = (await resp.json()) as {
      image_url?: string
      generation_id?: string
      seed?: number
      elapsed_ms?: number
      file_path?: string | null
      error?: string
    }
    if (!data.image_url) {
      throw new Error(data.error || 'SD proxy returned no image_url')
    }
    return {
      imageUrl: data.image_url,
      generationId: data.generation_id || `sd-${Date.now()}`,
      seed: data.seed ?? -1,
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

/** 暴露给外部单测/调试使用 */
export const __debug = { buildPromptParts, SD_DEFAULTS, PROXY_URL }
