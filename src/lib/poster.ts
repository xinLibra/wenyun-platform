// 海报合成引擎：纯前端 Canvas，不依赖 AI 场景生成。
// 背景模板为代码绘制的静态渐变 + 装饰（模板用静态图即可的等价实现，无需图片资源）；
// 主视觉用当前定制效果图（优先 3D canvas 截图，否则 2D 合成预览图）；
// 右下角生成二维码（链接可配置），最终输出 PNG/JPG 下载。
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

export interface PosterOptions {
  template: PosterTemplate
  /** 主标题（限 12 字） */
  title: string
  /** 一句话（限 30 字） */
  subtitle: string
  /** 日期文案（自动生成，如 2026年8月25日） */
  dateText: string
  /** Logo 图（dataURL 或同源 http 地址；失败自动降级为文字） */
  logoUrl: string
  /** 主视觉图（3D 截图 / 2D 合成预览 dataURL） */
  mainVisual: string
  /** 二维码内容（URL） */
  qrValue: string
  /** 站点名 */
  siteName: string
}

export const POSTER_WIDTH = 1080
export const POSTER_HEIGHT = 1440

// ---------- 基础工具 ----------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`图片加载失败: ${src.slice(0, 80)}…`))
    img.src = src
  })
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

// ---------- 主渲染 ----------

export async function renderPoster(opts: PosterOptions): Promise<HTMLCanvasElement> {
  const { template, title, subtitle, dateText, logoUrl, mainVisual, qrValue, siteName } = opts
  const W = POSTER_WIDTH
  const H = POSTER_HEIGHT

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建海报画布')

  // 字体预热，避免 canvas 文字渲染成默认字体
  try {
    const fonts = document.fonts
    await Promise.all([
      fonts?.load('84px "Ma Shan Zheng"').catch(() => undefined),
      fonts?.load('32px "Noto Serif SC"').catch(() => undefined),
      fonts?.load('26px "Noto Sans SC"').catch(() => undefined),
    ])
  } catch {
    /* 忽略：字体加载失败只影响观感 */
  }

  // 1. 背景渐变
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

  // 4. Logo（顶部居中，失败降级为文字）
  const logoH = 92
  let logoImg: HTMLImageElement | null = null
  if (logoUrl) {
    try {
      logoImg = await loadImage(logoUrl)
    } catch {
      logoImg = null
    }
  }
  if (logoImg) {
    const lw = logoImg.naturalWidth || 1
    const lh = logoImg.naturalHeight || 1
    const scale = Math.min(logoH / lh, 340 / lw)
    const w = lw * scale
    const h = lh * scale
    ctx.drawImage(logoImg, (W - w) / 2, 90, w, h)
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
  ctx.fillText(siteName, W / 2, 232)
  ctx.globalAlpha = 1

  // 6. 标题（书法体，超 7 字自动折两行）
  ctx.fillStyle = template.titleColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cleanTitle = title.trim() || '纹韵定制'
  if (cleanTitle.length <= 7) {
    ctx.font = '84px "Ma Shan Zheng", "KaiTi", serif'
    ctx.fillText(cleanTitle, W / 2, 340)
  } else {
    const half = Math.ceil(cleanTitle.length / 2)
    ctx.font = '60px "Ma Shan Zheng", "KaiTi", serif'
    ctx.fillText(cleanTitle.slice(0, half), W / 2, 312)
    ctx.fillText(cleanTitle.slice(half), W / 2, 374)
  }

  // 7. 副文案
  const cleanSubtitle = subtitle.trim()
  if (cleanSubtitle) {
    ctx.fillStyle = template.subtitleColor
    ctx.font = '32px "Noto Serif SC", serif'
    ctx.textAlign = 'center'
    ctx.fillText(cleanSubtitle, W / 2, 438)
  }

  // 8. 主视觉卡片
  const card = { x: 180, y: 478, w: 720, h: 560 }
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
  roundRect(ctx, card.x + 10, card.y + 10, card.w - 20, card.h - 20, 10)
  ctx.stroke()
  ctx.restore()

  if (mainVisual) {
    try {
      const img = await loadImage(mainVisual)
      drawImageContain(ctx, img, {
        x: card.x + 26,
        y: card.y + 26,
        w: card.w - 52,
        h: card.h - 52,
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
  ctx.moveTo(110, 1068)
  ctx.lineTo(W - 110, 1068)
  ctx.stroke()
  ctx.restore()

  // 10. 二维码（右下）+ 扫码提示
  if (qrValue) {
    const qrSize = 220
    const qrX = 740
    const qrY = 1080
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
      ctx.font = '26px "Noto Serif SC", serif'
      ctx.textAlign = 'center'
      ctx.fillText('扫码查看', qrX + qrSize / 2, qrY + qrSize + 42)
      ctx.globalAlpha = 1
    } catch {
      ctx.fillStyle = template.subtitleColor
      ctx.font = '26px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('二维码生成失败', qrX + qrSize / 2, qrY + qrSize / 2)
    }
  }

  // 11. 日期（左下）
  ctx.save()
  ctx.fillStyle = template.subtitleColor
  ctx.globalAlpha = 0.9
  ctx.font = '30px "Noto Serif SC", serif'
  ctx.textAlign = 'left'
  ctx.fillText(dateText, 110, 1160)
  ctx.globalAlpha = 0.6
  ctx.font = '24px "Noto Sans SC", sans-serif'
  ctx.fillText('AI 非遗纹样 · 私人定制', 110, 1206)
  ctx.restore()

  // 12. 页脚
  ctx.save()
  ctx.fillStyle = template.subtitleColor
  ctx.globalAlpha = 0.5
  ctx.font = '22px "Noto Sans SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${siteName} · 让传统纹样走进生活`, W / 2, 1374)
  ctx.restore()

  return canvas
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
