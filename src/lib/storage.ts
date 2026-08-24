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
