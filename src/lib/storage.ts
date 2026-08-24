import { supabase } from './supabase'

const PATTERN_IMAGE_BUCKET = 'pattern-images'

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',')
  const meta = commaIdx >= 0 ? dataUrl.slice(0, commaIdx) : ''
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl
  const mime = /data:([^;]+)/.exec(meta)?.[1] || 'image/png'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * 把 data: base64 纹样图上传到 Public 桶 pattern-images，
 * 返回公开 http(s) 短链；失败抛错由调用方提示。
 * 新作品 image_url 只存短链，禁止再向 generations.image_url 写 data: base64 大字段。
 */
export async function uploadPatternImage(userId: string, dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl)
  const ext = blob.type === 'image/png' ? 'png' : 'jpg'
  const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`
  const { error } = await supabase.storage.from(PATTERN_IMAGE_BUCKET).upload(filePath, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: blob.type,
  })
  if (error) throw new Error(`图片上传失败: ${error.message}`)
  const { data } = supabase.storage.from(PATTERN_IMAGE_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

/** 是否为可直接当 <img src> 用的 http(s) 短链 */
export function isHttpUrl(url: string | undefined | null): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

/** 是否为 data: base64 大字段 */
export function isDataUrl(url: string | undefined | null): boolean {
  return typeof url === 'string' && /^data:/i.test(url)
}

/**
 * 把 data: base64 图按最长边缩到 maxEdge（默认 384，符合 256~512 建议），
 * 输出 JPEG（白底，体积小）。非 data: 原样返回。
 */
export async function downscaleDataUrl(
  dataUrl: string,
  maxEdge = 384,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片解码失败'))
    img.src = dataUrl
  })
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  const w = Math.max(1, Math.round(image.width * scale))
  const h = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(image, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * 订单/购物车预览图统一入口：
 * - http(s) 短链：直接用
 * - data: base64：先降采样到 maxEdge，再上传 pattern-images 桶返回短链
 * - 其他（空/占位）：返回 undefined
 * 保证订单字段只存短 URL，不存 data: image 大 base64。
 */
export async function ensurePublicImageUrl(
  userId: string,
  url: string | undefined | null,
  maxEdge = 384,
): Promise<string | undefined> {
  if (isHttpUrl(url)) return url
  if (typeof url === 'string' && isDataUrl(url)) {
    const resized = await downscaleDataUrl(url, maxEdge)
    return uploadPatternImage(userId, resized)
  }
  return undefined
}
