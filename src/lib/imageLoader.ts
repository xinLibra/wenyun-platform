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
 * 列表渲染后按 id 批量补拉 image_url（严格串行并发 1、单条 45s 超时）。
 * 列表查询不投影 image_url（历史 data: base64 大字段是 statement timeout 元凶），
 * 由本函数在渲染后逐条取回，回填到对应卡片 <img>；
 * 单条成功/失败都会在 console 打出该 id 的 ok/fail，失败经 onFailure 回传供卡片显示「加载失败」可重试。
 * 每个 id 在单次调用内只处理一次、失败不做自动重试（重试由调用方手动按钮触发），避免同一 id 反复 FAIL。
 */
export async function loadImagesConcurrently(
  ids: string[],
  onResult: (id: string, url: string) => void,
  concurrency = 1,
  onFailure?: (id: string, reason: string) => void,
  timeoutMs = 45000
): Promise<void> {
  if (ids.length === 0) return
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
    while (cursor < ids.length) {
      const id = ids[cursor++]
      try {
        const { data, error } = await withTimeout(
          supabase.from('generations').select('id, image_url').eq('id', id).single(),
          timeoutMs,
          '加载缩略图'
        )
        const row = data as any
        const url = row?.image_url as string | undefined
        if (!error && url) {
          console.log(`[imageLoader] OK ${id}: ${url.length} chars`)
          onResult(id, url)
        } else {
          const reason = error ? `${error.message ?? 'query error'}` : 'empty image_url'
          console.warn(`[imageLoader] FAIL ${id}: ${reason}`)
          onFailure?.(id, reason)
        }
      } catch (e: any) {
        const reason = e?.message ?? String(e)
        console.warn(`[imageLoader] FAIL ${id}: ${reason}`)
        onFailure?.(id, reason)
      }
    }
  })
  await Promise.all(workers)
}

/**
 * 批量取回「已是 http 短链」的 image_url（新数据保存时已转 Storage 短链，几十~几百字节）。
 * 用 like http% 行级过滤，历史 data: base64 大字段行不会返回 → 一次 select 不会拉到大字段。
 * 列表可直接把返回值当缩略图 src，无需再逐条补拉。
 */
export async function fetchHttpImageUrls(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const map: Record<string, string> = {}
  // 分片查询，避免 in 列表过长
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('generations')
          .select('id, image_url')
          .in('id', chunk)
          .like('image_url', 'http%'),
        8000,
        '获取短链图'
      )
      if (error) continue
      ;(data ?? []).forEach((row: any) => {
        if (
          row?.id &&
          typeof row.image_url === 'string' &&
          row.image_url.startsWith('http')
        ) {
          map[row.id] = row.image_url
        }
      })
    } catch (e: any) {
      // 短链预取失败不影响列表：后续可走按需补图
      console.warn('[imageLoader] fetchHttpImageUrls chunk failed:', e?.message ?? e)
    }
  }
  return map
}

/**
 * 单条按 id 取 image_url（补拉历史 data: base64；http 短链已在列表直取）。
 * 用于卡片进入视口后按需加载、详情/下载补图，单条短超时，失败抛错由调用方兜底。
 */
export async function fetchGenerationImage(id: string, timeoutMs = 45000): Promise<string> {
  const { data, error } = await withTimeout(
    supabase.from('generations').select('image_url').eq('id', id).single(),
    timeoutMs,
    '获取图片'
  )
  if (error) throw error
  if (!(data as any)?.image_url) throw new Error('该作品没有可用的图片')
  return (data as any).image_url as string
}
