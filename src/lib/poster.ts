// 海报合成引擎：纯前端 Canvas，不依赖 AI 场景生成。
// 背景模板为代码绘制的静态渐变 + 装饰（模板用静态图即可的等价实现，无需图片资源）；
// 主视觉用当前定制效果图（优先 3D canvas 截图，否则 2D 合成预览图）；
// 右下角生成二维码（统一链接平台首页），最终输出 PNG/JPG 下载。
import * as QRCode from 'qrcode'

export type PosterTemplateId = 'mo_yun' | 'liu_jin' | 'zhu_sha' | 'qing_lv' | 'su_ya'

export interface PosterTemplate {
  id: PosterTemplateId
  name: string
  /** 渐变背景（上→下） */
  bgFrom: string
  bgTo: string
  /** 主强调色（边框 / 装饰 / 印章） */
  accent: string
  /** 标题颜色 */
  titleColor: string
  /** 副文案 / 日期颜色 */
  subtitleColor: string
  /** 二维码深色模块颜色 */
  qrDark: string
  /** 装饰样式 */
  decoration: 'ink' | 'rings' | 'seal' | 'mountains' | 'plain'
  /** 深色背景模板：Logo 需反白着色才可见 */
  isDark?: boolean
}

export const POSTER_TEMPLATES: PosterTemplate[] = [
  {
    id: 'mo_yun',
    name: '墨韵',
    bgFrom: '#f6f1e7',
    bgTo: '#e8dfcd',
    accent: '#5b4636',
    titleColor: '#3d2f24',
    subtitleColor: '#6f5f4f',
    qrDark: '#2f241b',
    decoration: 'ink',
  },
  {
    id: 'liu_jin',
    name: '鎏金',
    bgFrom: '#0e1d36',
    bgTo: '#25436b',
    accent: '#d4af37',
    titleColor: '#f3e7c6',
    subtitleColor: '#c9d4e6',
    qrDark: '#17304f',
    decoration: 'rings',
    isDark: true,
  },
  {
    id: 'zhu_sha',
    name: '朱砂',
    bgFrom: '#fdf6ec',
    bgTo: '#f3e2cd',
    accent: '#b03a2e',
    titleColor: '#7a231c',
    subtitleColor: '#8a6a55',
    qrDark: '#7a231c',
    decoration: 'seal',
  },
  {
    id: 'qing_lv',
    name: '青绿',
    bgFrom: '#eef3ec',
    bgTo: '#d9e6d8',
    accent: '#2e7d5b',
    titleColor: '#1c4a35',
    subtitleColor: '#5c7a68',
    qrDark: '#1c4a35',
    decoration: 'mountains',
  },
  {
    id: 'su_ya',
    name: '素雅',
    bgFrom: '#ffffff',
    bgTo: '#f0f0f0',
    accent: '#4a4a4a',
    titleColor: '#2b2b2b',
    subtitleColor: '#6b6b6b',
    qrDark: '#2b2b2b',
    decoration: 'plain',
  },
]

/** 文字字体（与定制页字体对齐：书法/宋/黑/楷） */
export type PosterFontKey = 'shufa' | 'song' | 'hei' | 'kai'

export const POSTER_FONT_OPTIONS: ReadonlyArray<{
  key: PosterFontKey
  label: string
  family: string
}> = [
  { key: 'shufa', label: '书法体', family: '"Ma Shan Zheng", "KaiTi", serif' },
  { key: 'song', label: '宋体', family: '"Noto Serif SC", "Songti SC", serif' },
  { key: 'hei', label: '黑体', family: '"Noto Sans SC", "Microsoft YaHei", sans-serif' },
  { key: 'kai', label: '楷体', family: '"KaiTi", "STKaiti", serif' },
]

export const FONT_FAMILY: Record<PosterFontKey, string> = POSTER_FONT_OPTIONS.reduce(
  (acc, o) => {
    acc[o.key] = o.family
    return acc
  },
  {} as Record<PosterFontKey, string>
)

/** 可拖拽文字元素：位置为中心点（1080×1440 坐标系），可调字体与字号 */
export interface PosterTextElement {
  x: number
  y: number
  font: PosterFontKey
  size: number
}

export const DEFAULT_TITLE_EL: PosterTextElement = { x: 540, y: 284, font: 'shufa', size: 76 }
export const DEFAULT_SUBTITLE_EL: PosterTextElement = { x: 540, y: 368, font: 'song', size: 30 }
export const DEFAULT_DATE_EL: PosterTextElement = { x: 150, y: 1140, font: 'song', size: 30 }

/** 元素可拖范围（海报坐标） */
export const ELEMENT_BOUNDS = { xMin: 70, yMin: 70, xMax: 1080 - 70, yMax: 1440 - 70 }

export interface PosterOptions {
  template: PosterTemplate
  /** 主标题（限 12 字） */
  title: string
  /** 一句话（限 30 字） */
  subtitle: string
  /** 日期文案（自动取当天） */
  dateText: string
  /** Logo 图（统一使用站内默认 Logo；失败自动降级为文字） */
  logoUrl: string
  /** 主视觉图（3D 截图 / 2D 合成预览 dataURL） */
  mainVisual: string
  /** 二维码内容（平台首页 URL） */
  qrValue: string
  /** 站点名 */
  siteName: string
  /** 自定义背景图（dataURL）；存在时 cover 铺满海报背景，否则用模板渐变+装饰 */
  bgImage?: string
  /** 标题元素（位置 / 字体 / 字号，缺省用默认） */
  titleEl?: Partial<PosterTextElement>
  /** 一句话元素 */
  subtitleEl?: Partial<PosterTextElement>
  /** 日期元素 */
  dateEl?: Partial<PosterTextElement>
}

export const POSTER_WIDTH = 1080
export const POSTER_HEIGHT = 1440

// ---------- 基础工具 ----------

/** 图片缓存：拖动调位置时避免每次重新 decode 主视觉/LoGo */
const imageCache = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`图片加载失败: ${src.slice(0, 80)}…`))
    img.src = src
  })
}

function loadImageCached(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src)
  if (!p) {
    p = loadImage(src).catch((e) => {
      imageCache.delete(src)
      throw e
    })
    imageCache.set(src, p)
  }
  return p
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number }
) {
  const iw = img.naturalWidth || img.width || 1
  const ih = img.naturalHeight || img.height || 1
  const scale = Math.min(rect.w / iw, rect.h / ih)
  const w = iw * scale
  const h = ih * scale
  ctx.drawImage(img, rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2, w, h)
}

// ---------- 模板装饰 ----------

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  template: PosterTemplate,
  W: number,
  H: number
) {
  const accent = template.accent
  switch (template.decoration) {
    case 'ink': {
      ctx.save()
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.12
      // 远山
      ctx.beginPath()
      ctx.moveTo(-60, H * 0.88)
      ctx.lineTo(W * 0.16, H * 0.64)
      ctx.lineTo(W * 0.32, H * 0.82)
      ctx.lineTo(W * 0.5, H * 0.6)
      ctx.lineTo(W * 0.68, H * 0.86)
      ctx.lineTo(W + 60, H * 0.7)
      ctx.lineTo(W + 60, H)
      ctx.lineTo(-60, H)
      ctx.closePath()
      ctx.fill()
      // 墨点
      ctx.globalAlpha = 0.08
      ;[
        [W * 0.12, H * 0.16, 26],
        [W * 0.86, H * 0.14, 18],
        [W * 0.9, H * 0.52, 34],
      ].forEach(([x, y, r]) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.restore()
      break
    }
    case 'rings': {
      ctx.save()
      ctx.strokeStyle = accent
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.2
      ;[
        [W * 0.9, H * 0.18, 150],
        [W * 0.1, H * 0.8, 130],
        [W * 0.52, H * 0.06, 96],
      ].forEach(([x, y, r]) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
      })
      ctx.globalAlpha = 0.12
      ctx.lineWidth = 26
      ;[
        [W * 0.92, H * 0.82, 200],
        [W * 0.08, H * 0.2, 170],
      ].forEach(([x, y, r]) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
      })
      ctx.restore()
      break
    }
    case 'seal': {
      ctx.save()
      ctx.fillStyle = accent
      // 右上朱红大圆、左下色块（低透明背景）
      ctx.globalAlpha = 0.1
      ctx.beginPath()
      ctx.arc(W * 0.88, H * 0.14, 130, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(W * 0.05, H * 0.8, 150, 150)
      // 标题旁实心印章
      ctx.globalAlpha = 0.85
      ctx.fillRect(W / 2 + 150, H * 0.235, 52, 52)
      ctx.restore()
      break
    }
    case 'mountains': {
      ctx.save()
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.12
      ctx.beginPath()
      ctx.moveTo(0, H * 0.92)
      ctx.lineTo(W * 0.14, H * 0.6)
      ctx.lineTo(W * 0.3, H * 0.78)
      ctx.lineTo(W * 0.45, H * 0.55)
      ctx.lineTo(W * 0.62, H * 0.8)
      ctx.lineTo(W * 0.8, H * 0.58)
      ctx.lineTo(W, H * 0.76)
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 0.08
      ctx.beginPath()
      ctx.moveTo(0, H * 0.96)
      ctx.lineTo(W * 0.22, H * 0.78)
      ctx.lineTo(W * 0.4, H * 0.9)
      ctx.lineTo(W * 0.62, H * 0.74)
      ctx.lineTo(W, H * 0.92)
      ctx.lineTo(W, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      break
    }
    case 'plain':
    default: {
      ctx.save()
      ctx.strokeStyle = accent
      ctx.globalAlpha = 0.2
      ctx.lineWidth = 1
      ctx.strokeRect(W * 0.04, H * 0.04, W * 0.92, H * 0.92)
      ctx.restore()
      break
    }
  }
}

// ---------- 文字元素 ----------

export interface RenderedElementBox {
  /** 中心 x */
  x: number
  /** 中心 y */
  y: number
  w: number
  h: number
}

export interface RenderedElements {
  title: RenderedElementBox
  subtitle: RenderedElementBox | null
  date: RenderedElementBox
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  opts: PosterOptions,
  t: PosterTextElement
): RenderedElementBox {
  const cleanTitle = opts.title.trim() || '纹韵定制'
  const font = FONT_FAMILY[t.font]
  ctx.fillStyle = opts.template.titleColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineHeight = t.size * 1.26
  let lines: string[]
  if (cleanTitle.length <= 7) {
    lines = [cleanTitle]
  } else {
    const half = Math.ceil(cleanTitle.length / 2)
    lines = [cleanTitle.slice(0, half), cleanTitle.slice(half)]
  }
  ctx.font = `${t.size}px ${font}`
  const startY = t.y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((ln, i) => ctx.fillText(ln, t.x, startY + i * lineHeight))
  const measured = ctx.measureText(lines[0])
  return { x: t.x, y: t.y, w: measured.width, h: lines.length * lineHeight }
}

function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  opts: PosterOptions,
  t: PosterTextElement
): RenderedElementBox | null {
  const cleanSubtitle = opts.subtitle.trim()
  if (!cleanSubtitle) return null
  ctx.fillStyle = opts.template.subtitleColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${t.size}px ${FONT_FAMILY[t.font]}`
  ctx.fillText(cleanSubtitle, t.x, t.y)
  const measured = ctx.measureText(cleanSubtitle)
  return { x: t.x, y: t.y, w: measured.width, h: t.size * 1.2 }
}

function drawDate(
  ctx: CanvasRenderingContext2D,
  opts: PosterOptions,
  t: PosterTextElement
): RenderedElementBox {
  ctx.save()
  ctx.fillStyle = opts.template.subtitleColor
  ctx.globalAlpha = 0.9
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${t.size}px ${FONT_FAMILY[t.font]}`
  ctx.fillText(opts.dateText, t.x, t.y)
  ctx.globalAlpha = 0.6
  ctx.font = `${Math.round(t.size * 0.8)}px "Noto Sans SC", "Microsoft YaHei", sans-serif`
  ctx.fillText('AI 非遗纹样 · 私人定制', t.x, t.y + t.size * 1.7)
  ctx.restore()
  const measured = ctx.measureText(opts.dateText)
  return { x: t.x, y: t.y, w: measured.width, h: t.size * 1.2 }
}

// ---------- 主渲染 ----------

export async function renderPoster(
  opts: PosterOptions
): Promise<{ canvas: HTMLCanvasElement; elements: RenderedElements }> {
  const { template, logoUrl, mainVisual, qrValue, siteName } = opts
  const W = POSTER_WIDTH
  const H = POSTER_HEIGHT
  const titleEl: PosterTextElement = { ...DEFAULT_TITLE_EL, ...opts.titleEl }
  const subtitleEl: PosterTextElement = { ...DEFAULT_SUBTITLE_EL, ...opts.subtitleEl }
  const dateEl: PosterTextElement = { ...DEFAULT_DATE_EL, ...opts.dateEl }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建海报画布')

  // 字体预热，避免 canvas 文字渲染成默认字体
  try {
    const fonts = document.fonts
    await Promise.all(
      POSTER_FONT_OPTIONS.map((o) => {
        const primary = o.family.split('"')[1] || 'serif'
        return fonts?.load(`84px "${primary}"`).catch(() => undefined)
      })
    )
  } catch {
    /* 忽略：字体加载失败只影响观感 */
  }

  // 1. 背景：自定义上传图优先（cover 居中裁切，避免拉伸变形），否则模板渐变+装饰
  const bgImage = opts.bgImage ? await loadImageCached(opts.bgImage).catch(() => null) : null
  if (bgImage) {
    const iw = bgImage.naturalWidth || 1
    const ih = bgImage.naturalHeight || 1
    const bgScale = Math.max(W / iw, H / ih)
    const bw = iw * bgScale
    const bh = ih * bgScale
    ctx.drawImage(bgImage, (W - bw) / 2, (H - bh) / 2, bw, bh)
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, template.bgFrom)
    grad.addColorStop(1, template.bgTo)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // 2. 装饰
    drawDecorations(ctx, template, W, H)

    // 3. 双层内边框
    ctx.save()
    ctx.strokeStyle = template.accent
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 2
    ctx.strokeRect(42, 42, W - 84, H - 84)
    ctx.globalAlpha = 0.25
    ctx.strokeRect(56, 56, W - 112, H - 112)
    ctx.restore()
  }

  // 4. Logo（顶部居中；深色模板反白着色保证可见；失败降级为文字）
  const logoH = 88
  let logoImg: HTMLImageElement | null = null
  if (logoUrl) {
    try {
      logoImg = await loadImageCached(logoUrl)
    } catch {
      logoImg = null
    }
  }
  if (logoImg) {
    const lw = logoImg.naturalWidth || 1
    const lh = logoImg.naturalHeight || 1
    const scale = Math.min(logoH / lh, 300 / lw)
    const w = lw * scale
    const h = lh * scale
    const x = (W - w) / 2
    const y = 64
    if (template.isDark) {
      // 反白：离屏画布先画原图，再以 source-in 用白色重着色
      const tmp = document.createElement('canvas')
      tmp.width = Math.max(1, Math.ceil(w))
      tmp.height = Math.max(1, Math.ceil(h))
      const tctx = tmp.getContext('2d')
      if (tctx) {
        tctx.clearRect(0, 0, tmp.width, tmp.height)
        tctx.drawImage(logoImg, 0, 0, tmp.width, tmp.height)
        tctx.globalCompositeOperation = 'source-in'
        tctx.fillStyle = '#ffffff'
        tctx.fillRect(0, 0, tmp.width, tmp.height)
        ctx.drawImage(tmp, x, y)
      } else {
        ctx.drawImage(logoImg, x, y, w, h)
      }
    } else {
      ctx.drawImage(logoImg, x, y, w, h)
    }
  } else {
    ctx.fillStyle = template.titleColor
    ctx.font = '46px "Ma Shan Zheng", "KaiTi", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((siteName.split('·')[0] || '纹韵').trim(), W / 2, 140)
  }

  // 5. 站点名
  ctx.fillStyle = template.subtitleColor
  ctx.globalAlpha = 0.85
  ctx.font = '26px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(siteName, W / 2, 196)
  ctx.globalAlpha = 1

  // 6. 标题（可拖/可调字体字号；超 7 字自动折两行）
  const titleBox = drawTitle(ctx, opts, titleEl)

  // 7. 一句话（可拖/可调字体字号）
  const subtitleBox = drawSubtitle(ctx, opts, subtitleEl)

  // 8. 主视觉卡片（放大主图、缩小外框留白）
  const card = { x: 104, y: 418, w: 872, h: 628 }
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetY = 8
  roundRect(ctx, card.x, card.y, card.w, card.h, 16)
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = template.accent
  ctx.globalAlpha = 0.45
  ctx.lineWidth = 1.5
  roundRect(ctx, card.x + 6, card.y + 6, card.w - 12, card.h - 12, 10)
  ctx.stroke()
  ctx.restore()

  if (mainVisual) {
    try {
      const img = await loadImageCached(mainVisual)
      drawImageContain(ctx, img, {
        x: card.x + 14,
        y: card.y + 14,
        w: card.w - 28,
        h: card.h - 28,
      })
    } catch {
      ctx.fillStyle = template.subtitleColor
      ctx.globalAlpha = 0.55
      ctx.font = '30px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('效果图加载失败', W / 2, card.y + card.h / 2)
      ctx.globalAlpha = 1
    }
  }

  // 9. 分隔线
  ctx.save()
  ctx.strokeStyle = template.accent
  ctx.globalAlpha = 0.25
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(110, 1066)
  ctx.lineTo(W - 110, 1066)
  ctx.stroke()
  ctx.restore()

  // 10. 二维码（右下，统一链接平台首页）+ 扫码提示
  const qrSize = 200
  const qrX = 756
  const qrY = 1074
  if (qrValue) {
    ctx.save()
    roundRect(ctx, qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.fill()
    ctx.restore()
    try {
      const qrCanvas = document.createElement('canvas')
      await QRCode.toCanvas(qrCanvas, qrValue, {
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: template.qrDark, light: '#ffffff' },
      })
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
      ctx.fillStyle = template.subtitleColor
      ctx.globalAlpha = 0.85
      ctx.font = '24px "Noto Serif SC", serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('扫码体验纹韵', qrX + qrSize / 2, qrY + qrSize + 38)
      ctx.globalAlpha = 1
    } catch {
      ctx.fillStyle = template.subtitleColor
      ctx.font = '26px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('二维码生成失败', qrX + qrSize / 2, qrY + qrSize / 2)
    }
  }

  // 11. 日期（可拖/可调字体字号；自动取当天）
  const dateBox = drawDate(ctx, opts, dateEl)

  // 12. 页脚
  ctx.save()
  ctx.fillStyle = template.subtitleColor
  ctx.globalAlpha = 0.5
  ctx.font = '22px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${siteName} · 让传统纹样走进生活`, W / 2, 1376)
  ctx.restore()

  return { canvas, elements: { title: titleBox, subtitle: subtitleBox, date: dateBox } }
}

/** 自动生成日期文案 */
export function formatToday(): string {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 下载海报 */
export function downloadPoster(canvas: HTMLCanvasElement, format: 'png' | 'jpg') {
  const filename = `纹韵海报-${Date.now()}.${format === 'jpg' ? 'jpg' : 'png'}`
  if (format === 'jpg') {
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/jpeg', 0.92)
  } else {
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
}
