/**
 * 购物车 / 订单「规格唯一键」与展示辅助
 *
 * 决定「是否同一条商品」的唯一键 specKey 至少覆盖：
 *   - 产品类型 productId（bookmark / phonecase / …）
 *   - 纹样（generationId / patternImage）
 *   - 各部件配色（按部件名排序序列化，非默认色也要参与）
 *   - 纹样透明度 patternOpacity（默认 100 与改透明度必须不同规格）
 *   - 其它影响外观的排版 / 文字参数
 *
 * 用途：
 *   1. 购物车合并：specKey 相同 → 数量 +1 并移动行到顶部；不同 → 新开一行
 *   2. 订单快照：再次购买时精确还原同一规格
 *   3. 列表 / 详情展示：将配色、透明度等转成可读文案
 */

export type CartCustomization = Record<string, any>

/** 把配色对象序列化为确定顺序的字符串（按部件名排序，忽略书写顺序差异） */
export function normalizeColorsForSpec(
  colors: Record<string, string> | undefined | null
): string {
  const src = colors || {}
  const parts = Object.keys(src)
    .sort()
    .map((k) => `${k}:${String(src[k] ?? '').trim().toLowerCase()}`)
  return parts.join(',')
}

/**
 * 纹样内容指纹：无论纹样图以「完整 base64」还是「缩略图/短链」形式存储，
 * 同一张纹样都得到同一个指纹，用于规格唯一键的稳定性（避免因降采样改变 specKey）。
 * - http(s) 短链：直接用 URL
 * - data: base64：对内容做短哈希 + 长度，避免把几 MB 原始串写进 specKey
 */
export function patternHashOf(patternImage: string | null | undefined): string {
  if (!patternImage) return ''
  if (/^https?:\/\//i.test(patternImage)) return `url:${patternImage}`
  if (/^data:/i.test(patternImage)) {
    // 从 data: 前缀后（逗号之后）的 base64 内容取指纹；前缀 MIME 差异不影响同一像素内容
    const comma = patternImage.indexOf(',')
    const content = comma >= 0 ? patternImage.slice(comma + 1) : patternImage
    return `data:${stableHash(content)}:${content.length}`
  }
  return `other:${patternImage}`
}

/** FNV-1a 短哈希：把较长的 canonical 串压成固定长度，仅用于比对相等 */
function stableHash(str: string): string {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export interface SpecKeyInput {
  productId: string
  generationId?: string | null
  customization?: CartCustomization | null
}

/** 计算规格唯一键（确定性：同参输入永远同输出） */
export function computeSpecKey(input: SpecKeyInput): string {
  const c = input.customization || {}
  const patternId =
    input.generationId || c.generationId || c.patternId || ''
  const patternKey =
    patternId ||
    (typeof c.patternHash === 'string' && c.patternHash.trim()
      ? c.patternHash
      : typeof c.patternImage === 'string' && c.patternImage.trim()
        ? patternHashOf(c.patternImage)
        : 'none')
  const opacity = c.patternOpacity ?? c.opacity ?? 100
  const canonical = JSON.stringify({
    p: input.productId,
    pat: patternKey,
    colors: normalizeColorsForSpec(c.colors || c.colorMap),
    opacity: typeof opacity === 'number' ? opacity : Number(opacity) || 100,
    scale: c.scale ?? 100,
    rotation: c.rotation ?? 0,
    positionX: c.positionX ?? 50,
    positionY: c.positionY ?? 50,
    blendMode: c.blendMode ?? 'normal',
    layoutMode: c.layoutMode ?? 'free',
    textOverlay: c.textOverlay ?? '',
    textFont: c.textFont ?? '',
    textSize: c.textSize ?? 0,
    textPositionX: c.textPositionX ?? 50,
    textPositionY: c.textPositionY ?? 85,
    textRotation: c.textRotation ?? 0,
  })
  return `${input.productId}_${stableHash(canonical)}`
}

/** 供旧数据兜底：无 specKey 时用同样规则生成（读回后顺手补上） */
export function specKeyOf(item: {
  productId: string
  generationId?: string | null
  customization?: CartCustomization | null
}): string {
  return computeSpecKey(item)
}

/** 非默认规格的可见差异文案（购物车 / 订单展示用），无差异返回空数组 */
export function formatSpecDiffs(
  customization: CartCustomization | undefined | null
): string[] {
  const c = customization || {}
  const out: string[] = []

  const colors: Record<string, string> | undefined =
    c.colors || c.colorMap
  if (colors && Object.keys(colors).length > 0) {
    const labels = Object.keys(colors)
      .sort()
      .map((k) => `${k}:${String(colors[k] ?? '').toUpperCase()}`)
    out.push(`部件配色 ${labels.join(' ')}`)
  }

  const opacity = c.patternOpacity ?? c.opacity ?? 100
  if (typeof opacity === 'number' && opacity < 100) {
    out.push(`纹样透明度 ${Math.round(opacity)}%`)
  }
  return out
}
