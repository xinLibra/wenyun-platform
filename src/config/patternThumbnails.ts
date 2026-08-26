/**
 * 纹样子类 → 缩略图
 *
 * 项目内没有为每个纹样单独存放的成品图，这里用「SVG data-URI 占位图」保证：
 * 1. 每个 patternId / 子类有独立的配色与图形（瑞兽=菱形徽记、花卉=四瓣花），
 *    不再出现凤鸟/蝴蝶/孔雀共用同一张 raw 图的问题；
 * 2. 图上标注该纹样的中文名，方便用户对照；
 * 3. 将来若按子类补充了真实缩略图（如 /patterns/thumb/crane.png），
 *    只需在 PATTERN_REAL_THUMBS 中登记路径即可优先使用。
 */

/** 真实缩略图登记表：patternId → 静态资源路径（优先使用，空则回落 SVG 占位图） */
export const PATTERN_REAL_THUMBS: Record<string, string> = {
  // 示例：crane: '/patterns/thumb/crane.png'
}

/** 每个纹样子类独立的缩略图色相（0-360），保证彼此视觉可区分 */
const PATTERN_HUES: Record<string, number> = {
  phoenix_bird: 350, // 凤鸟 · 红
  crane: 215, // 鹤 · 青蓝
  butterfly: 310, // 蝴蝶 · 紫粉
  tiger: 42, // 虎 · 金黄
  peacock: 180, // 孔雀 · 青绿
  dragon: 35, // 龙 · 金橙
  dragon_phoenix: 320, // 龙凤 · 紫红
  deer: 95, // 鹿 · 草绿
  lion: 205, // 狮 · 蓝
  orchid: 285, // 兰花 · 淡紫
  furong: 330, // 芙蓉 · 桃粉
  pomegranate_flower: 0, // 石榴花 · 红
  peony: 345, // 牡丹 · 粉红
  lotus: 165, // 莲 · 青
  chrysanthemum: 50, // 菊 · 黄
  plum: 15, // 梅 · 玫粉
  flower_bird: 255, // 花鸟 · 蓝紫
  interlocking_floral: 130, // 缠枝 · 绿
  gourd: 85, // 葫芦 · 青绿
}

/** 瑞兽主题子类集合（决定缩略图图形：菱形徽记 vs 四瓣花） */
const BEAST_IDS = new Set([
  'phoenix_bird',
  'crane',
  'butterfly',
  'tiger',
  'peacock',
  'dragon',
  'dragon_phoenix',
  'deer',
  'lion',
])

const FALLBACK_HUE = 30

function buildThumbSvg(label: string, hue: number, isBeast: boolean): string {
  const stroke = `hsl(${hue},58%,42%)`
  const accent = `hsl(${hue},60%,42%)`
  // 瑞兽用菱形徽记，花卉用四瓣花，一眼区分主题
  const glyph = isBeast
    ? `<polygon points="80,42 112,80 80,118 48,80" fill="none" stroke="${stroke}" stroke-width="3"/>
       <circle cx="80" cy="80" r="11" fill="${accent}"/>`
    : `<circle cx="80" cy="58" r="15" fill="none" stroke="${stroke}" stroke-width="3"/>
       <circle cx="80" cy="102" r="15" fill="none" stroke="${stroke}" stroke-width="3"/>
       <circle cx="58" cy="80" r="15" fill="none" stroke="${stroke}" stroke-width="3"/>
       <circle cx="102" cy="80" r="15" fill="none" stroke="${stroke}" stroke-width="3"/>
       <circle cx="80" cy="80" r="7" fill="${accent}"/>`

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},52%,94%)"/>` +
    `<stop offset="1" stop-color="hsl(${hue},58%,82%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="160" height="160" rx="10" fill="url(#bg)"/>` +
    glyph +
    `<text x="80" y="142" text-anchor="middle" font-size="22" fill="hsl(${hue},48%,28%)" font-family="'Songti SC','Noto Serif SC',serif">${label}</text>` +
    `</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 获取某个纹样子类的缩略图（data-URI），未登记的 patternId 也有独立色相兜底 */
export function getPatternThumbnail(patternId: string, label?: string): string {
  const real = PATTERN_REAL_THUMBS[patternId]
  if (real) return real

  const hue = PATTERN_HUES[patternId] ?? FALLBACK_HUE
  const isBeast = BEAST_IDS.has(patternId)
  const text = label && label.length > 4 ? `${label.slice(0, 4)}…` : label || patternId
  return buildThumbSvg(text, hue, isBeast)
}
