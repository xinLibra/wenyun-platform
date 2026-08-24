import { supabase } from './supabase'
import { withTimeout } from './async'

/**
 * 列表缩略图占位：轻量 SVG data URI（非网络请求），避免无图时的空白闪屏。
 * 注意：它很小（<1KB），与 generations.image_url 里动辄数百 KB 的 data: base64 完全两码事。
 */
export const PATTERN_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
      '<rect width="400" height="400" fill="#f5efe0"/>' +
      '<circle cx="200" cy="200" r="110" fill="none" stroke="#9e1f16" stroke-width="2" opacity="0.4"/>' +
      '<path d="M200 90c20 40 70 50 80 95s-60 70-80 125c-20-55-90-80-80-125s60-55 80-95z" fill="none" stroke="#9e1f16" stroke-width="2" opacity="0.5"/>' +
      '<text x="200" y="248" text-anchor="middle" font-family="serif" font-size="18" fill="#9e1f16" opacity="0.7">纹样加载中</text>' +
      '</svg>'
  )

/** 是否有真实图片可展示（http 短链 / data: base64 都算；空字符串或 undefined 视为无图） */
export function hasImage(url: string | undefined | null): boolean {
  return !!url && url !== ''
}

/** 是否需要用占位图（无地址时） */
export function isPlaceholderUrl(url: string | undefined | null): boolean {
  return !url || url === ''
}

/**
 * 列表渲染后按 id 批量补拉 image_url（并发受限，默认 3）。
 * 列表查询不投影 image_url（历史 data: base64 大字段是 statement timeout 元凶），
 * 由本函数在渲染后逐条取回，回填到对应卡片 <img>；
 * 单条失败只影响该卡（保持占位），整页不超时、不白屏。
 */
export async function loadImagesConcurrently(
  ids: string[],
  onResult: (id: string, url: string) => void,
  concurrency = 3
): Promise<void> {
  if (ids.length === 0) return
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++]
      try {
        const { data, error } = await withTimeout(
          supabase.from('generations').select('image_url').eq('id', id).single(),
          10000,
          '加载缩略图'
        )
        const url = (data as any)?.image_url as string | undefined
        if (!error && url) onResult(id, url)
      } catch (e: any) {
        // 单条失败只影响该卡片：保持占位，不刷屏
        console.warn(`[imageLoader] load failed for ${id}:`, e?.message ?? e)
      }
    }
  })
  await Promise.all(workers)
}
