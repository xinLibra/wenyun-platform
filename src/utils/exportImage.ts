// 导出效果图为 PNG / JPG 的工具函数
// 依赖：产品图和纹样图需要支持 CORS（跨域）加载，否则 canvas.toBlob 会报 SecurityError

export type LayoutMode = 'tile' | 'band' | 'corner' | 'center' | 'free'

export interface ExportParams {
  productImage: string
  patternImage?: string | null
  layoutMode: LayoutMode
  scale: number
  rotation: number
  positionX: number
  positionY: number
  blendMode: string
  textOverlay?: string
  textFont?: 'shufa' | 'song' | 'hei' | 'kai'
  textSize?: number
  textPositionX?: number
  textPositionY?: number
  textRotation?: number
  canvasWidth?: number
  canvasHeight?: number
}

const fontFamilyMap: Record<string, string> = {
  shufa: '"Ma Shan Zheng", cursive',
  song: '"Noto Serif SC", serif',
  hei: '"Noto Sans SC", sans-serif',
  kai: 'KaiTi, serif',
}

// 加载图片，设置 crossOrigin 避免 canvas 被污染
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`图片加载失败: ${src}`))
    img.src = src
  })
}

// 等待字体加载完成，避免 canvas 文字显示成默认字体
async function ensureFontLoaded(font: string) {
  try {
    await document.fonts.load(`16px ${font}`)
    await document.fonts.ready
  } catch (e) {
    console.warn('字体加载检测失败，继续使用系统回退字体', e)
  }
}

// 绘制居中放大 / 自由模式（对应 PatternRenderer 的 renderImageMode）
// 位置基准为产品图矩形（drawX/drawY/drawW/drawH），保证纹样是「贴在产品上」而不是散落在整张图上
function drawCenterOrFreeMode(
  ctx: CanvasRenderingContext2D,
  patternImg: HTMLImageElement,
  params: ExportParams,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number
) {
  const { scale, rotation, positionX, positionY, blendMode } = params
  const centerX = drawX + drawW / 2 + ((positionX - 50) / 100) * drawW
  const centerY = drawY + drawH / 2 + ((positionY - 50) / 100) * drawH
  const drawSize = Math.min(drawW, drawH) * 0.4 * (scale / 100)
  if (drawSize <= 0) return

  ctx.save()
  ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
  ctx.globalAlpha = 0.85
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(patternImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
  ctx.restore()
}

// 绘制角落点缀模式（对应 renderCornerMode）
function drawCornerMode(
  ctx: CanvasRenderingContext2D,
  patternImg: HTMLImageElement,
  params: ExportParams,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number
) {
  // corner 模式默认在左上角区域，逻辑与 center 模式一致，只是初始 positionX/Y 偏左上
  drawCenterOrFreeMode(ctx, patternImg, params, drawX, drawY, drawW, drawH)
}

// 绘制重复平铺模式（对应 renderTileMode，需要手动实现 background-repeat: repeat）
// 关键：只平铺在产品图矩形内（外层已 clip），且用 multiply 混合让产品图明暗光影透出，
// 呈现「纹样印在产品表面」的贴图效果，而不是整张图被纹样铺满的平面块
function drawTileMode(
  ctx: CanvasRenderingContext2D,
  patternImg: HTMLImageElement,
  params: ExportParams,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number
) {
  const { scale, rotation } = params
  // 对应 CSS 的 backgroundSize: `${scale / 2}%`（相对产品图矩形）
  const tileSize = drawW * (scale / 2 / 100)
  if (tileSize <= 0) return

  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.9

  // 整体围绕产品图中心旋转
  const centerX = drawX + drawW / 2
  const centerY = drawY + drawH / 2
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-centerX, -centerY)

  // 在产品矩形基础上多铺一圈，防止旋转后边缘露白（裁剪由外层 clip 兜底）
  const startX = drawX - tileSize
  const startY = drawY - tileSize
  const endX = drawX + drawW + tileSize
  const endY = drawY + drawH + tileSize

  for (let y = startY; y < endY; y += tileSize) {
    for (let x = startX; x < endX; x += tileSize) {
      ctx.drawImage(patternImg, x, y, tileSize, tileSize)
    }
  }
  ctx.restore()
}

// 绘制腰封模式（对应 renderBandMode，需要手动实现 background-repeat: repeat-x）
// 腰封位置/宽度基于产品图矩形；同样用 multiply 混合，产品轮廓不会被盖成平面块
function drawBandMode(
  ctx: CanvasRenderingContext2D,
  patternImg: HTMLImageElement,
  params: ExportParams,
  drawX: number,
  drawY: number,
  drawW: number,
  drawH: number
) {
  const { scale, rotation, positionX, positionY } = params
  const bandHeight = drawH * (scale / 5 / 100)
  const bandTop = drawY + drawH * ((positionY - scale / 10) / 100)
  const tileSize = drawW * (scale / 4 / 100)
  if (tileSize <= 0 || bandHeight <= 0) return

  const bandLeft = ((positionX - 50) * 0.8) / 100 * drawW

  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.9

  // 裁剪出腰封区域（与产品矩形重叠部分），避免平铺内容溢出到区域外
  ctx.beginPath()
  ctx.rect(drawX, bandTop, drawW, bandHeight)
  ctx.clip()

  const centerX = drawX + drawW / 2 + bandLeft
  const centerY = bandTop + bandHeight / 2
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-centerX, -centerY)

  const startX = drawX - tileSize
  const endX = drawX + drawW + tileSize

  for (let x = startX; x < endX; x += tileSize) {
    ctx.drawImage(patternImg, x, bandTop, tileSize, bandHeight)
  }
  ctx.restore()
}

// 绘制文字层
function drawText(
  ctx: CanvasRenderingContext2D,
  params: ExportParams,
  canvasW: number,
  canvasH: number
) {
  const {
    textOverlay,
    textFont = 'shufa',
    textSize = 16,
    textPositionX = 50,
    textPositionY = 85,
    textRotation = 0,
  } = params

  if (!textOverlay) return

  // 文字字号按画布实际尺寸相对屏幕编辑区（假设编辑区约384px宽）等比放大，
  // 避免导出图分辨率变大后文字显得过小
  const referenceWidth = 384
  const scaledFontSize = textSize * (canvasW / referenceWidth)

  const x = canvasW * (textPositionX / 100)
  const y = canvasH * (textPositionY / 100)

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((textRotation * Math.PI) / 180)
  ctx.font = `${scaledFontSize}px ${fontFamilyMap[textFont]}`
  ctx.fillStyle = '#1a1a2e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(textOverlay, 0, 0)
  ctx.restore()
}

// 主函数：合成完整效果图，返回 canvas 供后续导出
export async function renderCompositeCanvas(params: ExportParams): Promise<HTMLCanvasElement> {
  const canvasW = params.canvasWidth ?? 1024
  const canvasH = params.canvasHeight ?? 1024

  const [productImg, patternImg] = await Promise.all([
    loadImage(params.productImage),
    params.patternImage ? loadImage(params.patternImage) : Promise.resolve(null),
  ])

  if (params.textOverlay) {
    await ensureFontLoaded(fontFamilyMap[params.textFont ?? 'shufa'])
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 canvas 2D 上下文')

  // 底色（避免JPG导出时透明区域变黑）
  ctx.fillStyle = '#F5F0E6' // 对应 rice-paper 底色
  ctx.fillRect(0, 0, canvasW, canvasH)

  // 画产品底图（居中铺满，保持比例）
  const scaleRatio = Math.min(canvasW / productImg.width, canvasH / productImg.height)
  const drawW = productImg.width * scaleRatio
  const drawH = productImg.height * scaleRatio
  const drawX = (canvasW - drawW) / 2
  const drawY = (canvasH - drawH) / 2
  ctx.drawImage(productImg, drawX, drawY, drawW, drawH)

  // 按排版模式画纹样（无纹样时跳过）
  if (patternImg) {
    // 纹样只出现在产品图区域内：统一 clip 到产品矩形，
    // 杜绝「纹样铺满整张图、产品被完全盖住」的平面纹样块
    ctx.save()
    ctx.beginPath()
    ctx.rect(drawX, drawY, drawW, drawH)
    ctx.clip()
    switch (params.layoutMode) {
      case 'tile':
        drawTileMode(ctx, patternImg, params, drawX, drawY, drawW, drawH)
        break
      case 'band':
        drawBandMode(ctx, patternImg, params, drawX, drawY, drawW, drawH)
        break
      case 'corner':
        drawCornerMode(ctx, patternImg, params, drawX, drawY, drawW, drawH)
        break
      case 'center':
      case 'free':
      default:
        drawCenterOrFreeMode(ctx, patternImg, params, drawX, drawY, drawW, drawH)
        break
    }
    ctx.restore()
  }

  // 重置混合模式，避免影响文字绘制
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1

  // 画文字
  drawText(ctx, params, canvasW, canvasH)

  return canvas
}

// 生成定制预览图（返回 base64 dataURL，用于订单缩略图等场景）
export async function generatePreviewDataUrl(
  params: ExportParams,
  size = 256
): Promise<string> {
  const canvas = await renderCompositeCanvas({
    ...params,
    canvasWidth: size,
    canvasHeight: size,
  })
  return canvas.toDataURL('image/png')
}

// ==================== 产品轮廓合成（订单 / 购物车缩略图专用）====================
// 目的：订单列表 / 详情的缩略图必须是「能看出是产品 + 带当前纹样」的效果图，
// 而不是平面纹样方块。该函数不依赖远程产品照片（避免 CORS / 图片失效 / 白底相乘变纹样块），
// 直接本地绘制产品轮廓（书签+流苏 / 手提袋 / 手机壳 / 笔记本 / 明信片 / 抱枕 / 手帕 / 围巾 / T恤等），
// 用当前纹样填充轮廓，输出方形 PNG。任何产品在任何网络环境下都能生成产品级预览。

export interface ProductPreviewParams {
  productId: string
  patternImage?: string | null
  layoutMode?: LayoutMode
  scale?: number
  rotation?: number
  positionX?: number
  positionY?: number
}

interface ShapeSpec {
  /** 绘制产品主轮廓路径（会被用于 clip 与描边） */
  path: (ctx: CanvasRenderingContext2D, S: number) => void
  /** 纹样填充区域（平铺范围 / 居中定位的基准矩形） */
  patternRect: (S: number) => { x: number; y: number; w: number; h: number }
  /** 产品细节：流苏 / 提手 / 相机开孔 / 线圈 / 折角等 */
  detail?: (ctx: CanvasRenderingContext2D, S: number) => void
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function shapeFor(productId: string): ShapeSpec {
  switch (productId) {
    case 'bookmark': {
      // 竖条书签 + 挂孔 + 流苏
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.32 * S, 0.08 * S, 0.36 * S, 0.66 * S, 0.025 * S),
        patternRect: (S) => ({ x: 0.32 * S, y: 0.08 * S, w: 0.36 * S, h: 0.66 * S }),
        detail: (ctx, S) => {
          // 顶部挂孔 + 红挂环
          ctx.beginPath()
          ctx.arc(0.5 * S, 0.15 * S, 0.028 * S, 0, Math.PI * 2)
          ctx.fillStyle = '#F5F0E6'
          ctx.fill()
          ctx.strokeStyle = '#A03A3A'
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          ctx.stroke()
          // 底部连接扣
          ctx.fillStyle = '#A03A3A'
          ctx.fillRect(0.415 * S, 0.736 * S, 0.17 * S, 0.014 * S)
          // 流苏线（金）
          ctx.strokeStyle = '#B08D57'
          ctx.lineWidth = Math.max(1.5, S * 0.009)
          ctx.beginPath()
          ctx.moveTo(0.425 * S, 0.75 * S)
          ctx.lineTo(0.435 * S, 0.84 * S)
          ctx.moveTo(0.5 * S, 0.75 * S)
          ctx.lineTo(0.5 * S, 0.85 * S)
          ctx.moveTo(0.575 * S, 0.75 * S)
          ctx.lineTo(0.565 * S, 0.84 * S)
          ctx.stroke()
          // 流苏穗（金）
          ctx.fillStyle = '#B08D57'
          for (const [cx, cy] of [
            [0.435, 0.85],
            [0.5, 0.862],
            [0.565, 0.85],
          ]) {
            ctx.beginPath()
            ctx.ellipse(cx * S, cy * S, 0.02 * S, 0.035 * S, 0, 0, Math.PI * 2)
            ctx.fill()
          }
        },
      }
    }
    case 'tote':
    case 'paper_bag': {
      // 手提袋 / 纸袋：袋身 + 提手
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.24 * S, 0.44 * S, 0.52 * S, 0.42 * S, 0.015 * S),
        patternRect: (S) => ({ x: 0.24 * S, y: 0.44 * S, w: 0.52 * S, h: 0.42 * S }),
        detail: (ctx, S) => {
          const handleColor = productId === 'paper_bag' ? '#6B5B45' : '#8A2F2F'
          ctx.strokeStyle = handleColor
          ctx.lineCap = 'round'
          ctx.lineWidth = Math.max(2, S * 0.018)
          // 左提手
          ctx.beginPath()
          ctx.moveTo(0.32 * S, 0.44 * S)
          ctx.quadraticCurveTo(0.35 * S, 0.18 * S, 0.44 * S, 0.44 * S)
          ctx.stroke()
          // 右提手
          ctx.beginPath()
          ctx.moveTo(0.56 * S, 0.44 * S)
          ctx.quadraticCurveTo(0.65 * S, 0.18 * S, 0.68 * S, 0.44 * S)
          ctx.stroke()
          // 袋口折边
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          ctx.beginPath()
          ctx.moveTo(0.24 * S, 0.47 * S)
          ctx.lineTo(0.76 * S, 0.47 * S)
          ctx.stroke()
          // 袋身底部弧线（立体感）
          ctx.globalAlpha = 0.25
          ctx.beginPath()
          ctx.moveTo(0.26 * S, 0.82 * S)
          ctx.quadraticCurveTo(0.5 * S, 0.87 * S, 0.74 * S, 0.82 * S)
          ctx.stroke()
        },
      }
    }
    case 'phonecase': {
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.25 * S, 0.12 * S, 0.5 * S, 0.74 * S, 0.06 * S),
        patternRect: (S) => ({ x: 0.265 * S, y: 0.135 * S, w: 0.47 * S, h: 0.71 * S }),
        detail: (ctx, S) => {
          // 相机开孔
          roundedRectPath(ctx, 0.295 * S, 0.175 * S, 0.1 * S, 0.1 * S, 0.02 * S)
          ctx.fillStyle = '#F5F0E6'
          ctx.fill()
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.5)'
          ctx.lineWidth = Math.max(1.5, S * 0.005)
          ctx.stroke()
          // 机身边缘
          ctx.globalAlpha = 0.4
          roundedRectPath(ctx, 0.27 * S, 0.14 * S, 0.46 * S, 0.7 * S, 0.05 * S)
          ctx.stroke()
        },
      }
    }
    case 'notebook': {
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.24 * S, 0.1 * S, 0.52 * S, 0.78 * S, 0.012 * S),
        patternRect: (S) => ({ x: 0.27 * S, y: 0.12 * S, w: 0.47 * S, h: 0.74 * S }),
        detail: (ctx, S) => {
          // 左侧线圈
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.8)'
          ctx.fillStyle = '#F5F0E6'
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          for (let i = 0; i < 9; i++) {
            const cy = (0.16 + i * 0.077) * S
            ctx.beginPath()
            ctx.arc(0.252 * S, cy, 0.016 * S, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
          }
          // 书脊阴影
          ctx.globalAlpha = 0.15
          ctx.fillRect(0.24 * S, 0.1 * S, 0.028 * S, 0.78 * S)
        },
      }
    }
    case 'postcard': {
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.12 * S, 0.26 * S, 0.76 * S, 0.48 * S, 0.01 * S),
        patternRect: (S) => ({ x: 0.12 * S, y: 0.26 * S, w: 0.76 * S, h: 0.48 * S }),
        detail: (ctx, S) => {
          // 明信片留白边
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
          ctx.lineWidth = Math.max(2, S * 0.008)
          roundedRectPath(ctx, 0.15 * S, 0.29 * S, 0.7 * S, 0.42 * S, 0.006 * S)
          ctx.stroke()
        },
      }
    }
    case 'cushion': {
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.15 * S, 0.15 * S, 0.7 * S, 0.7 * S, 0.1 * S),
        patternRect: (S) => ({ x: 0.17 * S, y: 0.17 * S, w: 0.66 * S, h: 0.66 * S }),
        detail: (ctx, S) => {
          // 缝边
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.55)'
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          roundedRectPath(ctx, 0.185 * S, 0.185 * S, 0.63 * S, 0.63 * S, 0.09 * S)
          ctx.stroke()
          // 装饰针脚
          ctx.setLineDash([S * 0.015, S * 0.012])
          roundedRectPath(ctx, 0.23 * S, 0.23 * S, 0.54 * S, 0.54 * S, 0.07 * S)
          ctx.stroke()
        },
      }
    }
    case 'handkerchief': {
      const diamondPath = (ctx: CanvasRenderingContext2D, S: number) => {
        ctx.beginPath()
        ctx.moveTo(0.5 * S, 0.1 * S)
        ctx.lineTo(0.88 * S, 0.5 * S)
        ctx.lineTo(0.5 * S, 0.9 * S)
        ctx.lineTo(0.12 * S, 0.5 * S)
        ctx.closePath()
      }
      return {
        path: diamondPath,
        patternRect: (S) => ({ x: 0.12 * S, y: 0.1 * S, w: 0.76 * S, h: 0.8 * S }),
        detail: (ctx, S) => {
          // 折叠线
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.4)'
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          ctx.beginPath()
          ctx.moveTo(0.5 * S, 0.1 * S)
          ctx.lineTo(0.5 * S, 0.9 * S)
          ctx.moveTo(0.12 * S, 0.5 * S)
          ctx.lineTo(0.88 * S, 0.5 * S)
          ctx.stroke()
          // 布边
          ctx.globalAlpha = 0.3
          diamondPath(ctx, S)
          ctx.lineWidth = Math.max(2, S * 0.008)
          ctx.stroke()
        },
      }
    }
    case 'scarf': {
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.1 * S, 0.44 * S, 0.8 * S, 0.14 * S, 0.02 * S),
        patternRect: (S) => ({ x: 0.1 * S, y: 0.44 * S, w: 0.8 * S, h: 0.14 * S }),
        detail: (ctx, S) => {
          // 折叠阴影
          ctx.fillStyle = 'rgba(91, 74, 58, 0.12)'
          ctx.fillRect(0.12 * S, 0.5 * S, 0.76 * S, 0.03 * S)
          // 两端流苏
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.7)'
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const xl = (0.11 + i * 0.016) * S
            ctx.moveTo(xl, 0.57 * S)
            ctx.lineTo(xl, 0.64 * S)
            const xr = (0.89 - i * 0.016) * S
            ctx.moveTo(xr, 0.57 * S)
            ctx.lineTo(xr, 0.64 * S)
          }
          ctx.stroke()
        },
      }
    }
    case 'silkscarf':
    case 'square_scarf': {
      const diamondPath = (ctx: CanvasRenderingContext2D, S: number) => {
        ctx.beginPath()
        ctx.moveTo(0.5 * S, 0.08 * S)
        ctx.lineTo(0.9 * S, 0.5 * S)
        ctx.lineTo(0.5 * S, 0.92 * S)
        ctx.lineTo(0.1 * S, 0.5 * S)
        ctx.closePath()
      }
      return {
        path: diamondPath,
        patternRect: (S) => ({ x: 0.1 * S, y: 0.08 * S, w: 0.8 * S, h: 0.84 * S }),
        detail: (ctx, S) => {
          // 四角折角
          ctx.fillStyle = 'rgba(91, 74, 58, 0.18)'
          for (const pts of [
            [0.5, 0.08, 0.42, 0.19, 0.58, 0.19],
            [0.9, 0.5, 0.81, 0.42, 0.81, 0.58],
            [0.5, 0.92, 0.42, 0.81, 0.58, 0.81],
            [0.1, 0.5, 0.19, 0.42, 0.19, 0.58],
          ] as const) {
            ctx.beginPath()
            ctx.moveTo(pts[0] * S, pts[1] * S)
            ctx.lineTo(pts[2] * S, pts[3] * S)
            ctx.lineTo(pts[4] * S, pts[5] * S)
            ctx.closePath()
            ctx.fill()
          }
          // 内折线
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.35)'
          ctx.lineWidth = Math.max(1.5, S * 0.005)
          ctx.beginPath()
          ctx.moveTo(0.42 * S, 0.19 * S)
          ctx.lineTo(0.58 * S, 0.19 * S)
          ctx.moveTo(0.81 * S, 0.42 * S)
          ctx.lineTo(0.81 * S, 0.58 * S)
          ctx.moveTo(0.42 * S, 0.81 * S)
          ctx.lineTo(0.58 * S, 0.81 * S)
          ctx.moveTo(0.19 * S, 0.42 * S)
          ctx.lineTo(0.19 * S, 0.58 * S)
          ctx.stroke()
        },
      }
    }
    case 'tshirt': {
      const tshirtPath = (ctx: CanvasRenderingContext2D, S: number) => {
        ctx.beginPath()
        ctx.moveTo(0.42 * S, 0.22 * S)
        ctx.quadraticCurveTo(0.5 * S, 0.15 * S, 0.58 * S, 0.22 * S)
        ctx.lineTo(0.7 * S, 0.27 * S)
        ctx.lineTo(0.84 * S, 0.47 * S)
        ctx.lineTo(0.71 * S, 0.48 * S)
        ctx.lineTo(0.75 * S, 0.88 * S)
        ctx.lineTo(0.25 * S, 0.88 * S)
        ctx.lineTo(0.29 * S, 0.48 * S)
        ctx.lineTo(0.16 * S, 0.47 * S)
        ctx.lineTo(0.3 * S, 0.27 * S)
        ctx.closePath()
      }
      return {
        path: tshirtPath,
        patternRect: (S) => ({ x: 0.16 * S, y: 0.16 * S, w: 0.68 * S, h: 0.73 * S }),
        detail: (ctx, S) => {
          // 领口
          ctx.strokeStyle = 'rgba(91, 74, 58, 0.6)'
          ctx.lineWidth = Math.max(2, S * 0.009)
          ctx.beginPath()
          ctx.moveTo(0.42 * S, 0.22 * S)
          ctx.quadraticCurveTo(0.5 * S, 0.15 * S, 0.58 * S, 0.22 * S)
          ctx.stroke()
          // 下摆
          ctx.lineWidth = Math.max(1.5, S * 0.006)
          ctx.beginPath()
          ctx.moveTo(0.25 * S, 0.88 * S)
          ctx.lineTo(0.75 * S, 0.88 * S)
          ctx.stroke()
        },
      }
    }
    default: {
      return {
        path: (ctx, S) => roundedRectPath(ctx, 0.24 * S, 0.22 * S, 0.52 * S, 0.56 * S, 0.03 * S),
        patternRect: (S) => ({ x: 0.24 * S, y: 0.22 * S, w: 0.52 * S, h: 0.56 * S }),
      }
    }
  }
}

// 在产品轮廓内按排版模式填充纹样（tile/band 平铺，其余居中单图）
function fillPatternClipped(
  ctx: CanvasRenderingContext2D,
  patternImg: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number },
  params: ProductPreviewParams
) {
  const { layoutMode = 'center', scale = 100, rotation = 0, positionX = 50, positionY = 50 } = params
  ctx.save()
  ctx.globalAlpha = 0.95
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2

  if (layoutMode === 'tile' || layoutMode === 'band') {
    const tileSize = Math.max(rect.w * (scale / 2 / 100), 10)
    if (tileSize > 0) {
      ctx.translate(cx, cy)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
      for (let y = rect.y - tileSize; y < rect.y + rect.h + tileSize; y += tileSize) {
        for (let x = rect.x - tileSize; x < rect.x + rect.w + tileSize; x += tileSize) {
          ctx.drawImage(patternImg, x, y, tileSize, tileSize)
        }
      }
    }
  } else {
    const drawSize = Math.min(rect.w, rect.h) * 0.55 * (scale / 100)
    if (drawSize > 0) {
      const centerX = cx + ((positionX - 50) / 100) * rect.w
      const centerY = cy + ((positionY - 50) / 100) * rect.h
      ctx.translate(centerX, centerY)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.drawImage(patternImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
    }
  }
  ctx.restore()
}

// 主函数：生成「产品轮廓 + 纹样」的方形缩略图（data URL）
// 不依赖远程产品照片，只在无纹样时退回纯底色轮廓，绝不产生「平面纹样方块」
export async function generateProductPreviewDataUrl(
  params: ProductPreviewParams,
  size = 384
): Promise<string> {
  const S = size
  const patternImg = params.patternImage ? await loadImage(params.patternImage).catch(() => null) : null

  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 canvas 2D 上下文')

  // 宣纸底色
  ctx.fillStyle = '#F5F0E6'
  ctx.fillRect(0, 0, S, S)

  const shape = shapeFor(params.productId || 'default')

  // 1) 投影（形状压暗偏移一层，形成立体感）
  ctx.save()
  ctx.shadowColor = 'rgba(91, 74, 58, 0.28)'
  ctx.shadowBlur = S * 0.03
  ctx.shadowOffsetY = S * 0.018
  ctx.fillStyle = 'rgba(91, 74, 58, 0.06)'
  shape.path(ctx, S)
  ctx.fill()
  ctx.restore()

  // 2) 纹样填充（裁剪到产品轮廓内，杜绝平面纹样块）
  const rect = shape.patternRect(S)
  ctx.save()
  shape.path(ctx, S)
  ctx.clip()
  if (patternImg) {
    fillPatternClipped(ctx, patternImg, rect, params)
  } else {
    ctx.fillStyle = '#E8DFC9'
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
  }
  ctx.restore()

  // 3) 轮廓描边
  ctx.save()
  shape.path(ctx, S)
  ctx.strokeStyle = 'rgba(91, 74, 58, 0.75)'
  ctx.lineWidth = Math.max(2, S * 0.006)
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()

  // 4) 产品细节（流苏 / 提手 / 相机开孔等）
  if (shape.detail) {
    ctx.save()
    shape.detail(ctx, S)
    ctx.restore()
  }

  return canvas.toDataURL('image/png')
}

// 检测 data: 图片是否「基本空白/单色」（用于判断 3D 截图是否真的贴上了纹样）。
// 缩放到 64x64 后只统计非透明像素的亮度标准差，过小则视为空白/未贴纹样截图。
function isUniformPreviewImage(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(true)
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data
        const lums: number[] = []
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a < 16) continue // 跳过透明背景
          lums.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])
        }
        if (lums.length < 8) return resolve(true) // 几乎全透明 → 空白
        const mean = lums.reduce((s, v) => s + v, 0) / lums.length
        let sq = 0
        for (const l of lums) sq += (l - mean) * (l - mean)
        const stddev = Math.sqrt(sq / lums.length)
        resolve(stddev < 10)
      } catch {
        resolve(true) // 解码异常保守视为空白，走合成兜底
      }
    }
    img.onerror = () => resolve(true)
    img.src = dataUrl
  })
}

/**
 * 统一的「当前定制效果图」生成入口（订单 / 购物车共用）：
 * 1) 优先 3D 预览 canvas 截图（含纹样、配色；截图空白/未贴纹样则跳过）
 * 2) 否则用产品轮廓 + 纹样的本地合成图（书签/手提袋/手机壳等）
 * 3) 都不可用返回 ''（由上层决定回退默认图并在 Console 打 warn），
 *    绝不把「未贴纹样的产品默认/库存图」当作定制效果图返回。
 */
export async function buildProductPreviewDataUrl(opts: {
  productId: string
  tryCapture3D?: (() => string | null) | null
  patternImage?: string | null
  layoutMode?: LayoutMode
  scale?: number
  rotation?: number
  positionX?: number
  positionY?: number
  /** 生成完成后回调实际来源：'capture3d'（3D 截图）| 'composite'（产品轮廓+纹样合成）| ''（失败） */
  onSource?: (source: 'capture3d' | 'composite') => void
}): Promise<string> {
  // 1) 3D 截图优先
  if (opts.tryCapture3D) {
    try {
      const shot = opts.tryCapture3D()
      if (shot) {
        if (/^data:/i.test(shot) && (await isUniformPreviewImage(shot))) {
          console.warn('[Preview] 3D 截图空白/未贴纹样，改用产品轮廓合成图')
        } else {
          opts.onSource?.('capture3d')
          return shot
        }
      }
    } catch (e) {
      console.warn('[Preview] 3D 截图失败，改用产品轮廓合成图:', e)
    }
  }
  // 2) 产品轮廓 + 纹样合成
  if (opts.patternImage) {
    try {
      const url = await generateProductPreviewDataUrl({
        productId: opts.productId,
        patternImage: opts.patternImage,
        layoutMode: opts.layoutMode,
        scale: opts.scale,
        rotation: opts.rotation,
        positionX: opts.positionX,
        positionY: opts.positionY,
      }, 384)
      if (url) {
        opts.onSource?.('composite')
        return url
      }
    } catch (e) {
      console.warn('[Preview] 产品轮廓合成失败:', e)
    }
  }
  return ''
}
