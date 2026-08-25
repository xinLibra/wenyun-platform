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