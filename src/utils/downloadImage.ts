// 统一下载图片工具（带防呆校验）：
// 1) 只接受「data:image/(png|jpeg|webp);base64,…」或 blob: 或 http(s) 图源；
//    拒绝 data:image/svg+xml（占位图）、JSON / 纯文本 / 空字符串等任何非位图 payload。
// 2) data: URL 先解码校验：byteLength > MIN_IMAGE_BYTES（默认 10KB），
//    且文件头为 PNG(89 50 4E 47) / JPEG(FF D8 FF) / WebP(RIFF….WEBP)，否则中止。
// 3) 校验通过后用 Blob + 正确 MIME 触发下载，失败一律抛错由调用方 toast。
// 4) 占位图 / 灰色 canvas 导出的无效数据不会被当作真实生成结果下载。

export const MIN_IMAGE_BYTES = 10 * 1024

export type ImageKind = 'png' | 'jpeg' | 'webp'

export function sniffImageHeader(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 16) return null
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'webp'
  }
  return null
}

export function dataUrlHeaderHex(bytes: Uint8Array): string {
  const head = Array.from(bytes.slice(0, 8))
  return head.map((b) => b.toString(16).padStart(2, '0')).join(' ')
}

export interface InspectDataUrl {
  ok: boolean
  mime: string
  kind: ImageKind | null
  bytes: Uint8Array
  byteLength: number
  headerHex: string
  reason?: string
}

/** 解析并校验 data URL。不做字节下限判定，仅解码 + 文件头嗅探。 */
export function inspectDataUrl(dataUrl: string): InspectDataUrl {
  const bad = (reason: string): InspectDataUrl => ({
    ok: false, mime: '', kind: null, bytes: new Uint8Array(0), byteLength: 0, headerHex: '', reason,
  })
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return bad('不是 data URL')
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return bad('data URL 缺少数据段')
  const meta = dataUrl.slice(5, comma)
  const raw = dataUrl.slice(comma + 1)

  // 仅接受位图 base64；SVG / utf8 文本（占位图常见形态）一律拒绝
  const mimeMatch = /^image\/(png|jpeg|jpg|webp)(?:;[^,]*)?$/i.exec(meta)
  if (!mimeMatch) return bad(`不支持的图片类型 meta=${meta.slice(0, 40)}（占位图不可下载）`)
  if (!/;base64/i.test(meta)) return bad('data URL 不是 base64 编码')

  const mime = mimeMatch[1].toLowerCase() === 'jpg' ? 'image/jpeg' : `image/${mimeMatch[1].toLowerCase()}`
  let bytes: Uint8Array
  try {
    const b64 = raw.replace(/\s/g, '')
    const bin = atob(b64)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch (e: any) {
    return bad(`base64 解码失败: ${e?.message || e}`)
  }
  const kind = sniffImageHeader(bytes)
  return {
    ok: kind !== null,
    mime: kind === 'jpeg' ? 'image/jpeg' : kind === 'webp' ? 'image/webp' : mime,
    kind,
    bytes,
    byteLength: bytes.length,
    headerHex: dataUrlHeaderHex(bytes),
    ...(kind === null ? { reason: `文件头不是 PNG/JPEG（${dataUrlHeaderHex(bytes)}）` } : {}),
  }
}

/** 校验图片字节：必须 > MIN_IMAGE_BYTES 且为 PNG/JPEG（WebP 默认放行需显式允许）。 */
export function assertImageBytes(
  bytes: Uint8Array,
  opts: { minBytes?: number; allowWebp?: boolean } = {},
): ImageKind {
  const min = opts.minBytes ?? MIN_IMAGE_BYTES
  if (bytes.length < min) {
    throw new Error(`图片数据异常（${bytes.length} 字节 < ${min}），请重新生成`)
  }
  const kind = sniffImageHeader(bytes)
  if (!kind) {
    throw new Error(`图片数据异常（文件头不是 PNG/JPEG: ${dataUrlHeaderHex(bytes)}），请重新生成`)
  }
  if (kind === 'webp' && !opts.allowWebp) {
    throw new Error('图片格式为 WebP，请选择 PNG/JPG 后重新生成')
  }
  return kind
}

/** 校验已下载的 Blob：MIME 必须为位图，字节数与文件头必须合法。 */
export async function assertImageBlob(blob: Blob): Promise<ImageKind> {
  const type = (blob.type || '').split(';')[0].trim().toLowerCase()
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(type)) {
    throw new Error(`图片源类型异常（${type || '(empty)'}），请重新生成后再下载`)
  }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return assertImageBytes(bytes)
}

/** Uint8Array → Blob（拷贝到独立 ArrayBuffer，兼容 TS strict ArrayBuffer 类型） */
function bytesToBlob(bytes: Uint8Array, mime: string): Blob {
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime })
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadImage(
  urlOrDataUrl: string,
  filename: string
): Promise<void> {
  if (!urlOrDataUrl) throw new Error('缺少图片地址')

  // data: URL → 本地解码校验后以 Blob 下载（校验失败直接中止，绝不下载坏图）
  if (urlOrDataUrl.startsWith('data:')) {
    const inspected = inspectDataUrl(urlOrDataUrl)
    if (!inspected.ok) throw new Error(inspected.reason || '图片数据异常')
    const kind = assertImageBytes(inspected.bytes, { allowWebp: true })
    const mime = kind === 'jpeg' ? 'image/jpeg' : kind === 'webp' ? 'image/webp' : 'image/png'
    const blob = bytesToBlob(inspected.bytes, mime)
    triggerBlobDownload(blob, filename)
    console.debug(
      `[downloadImage] data: mime=${mime} b64_len=${urlOrDataUrl.length} decoded=${inspected.byteLength}B header=${inspected.headerHex}`
    )
    return
  }

  // blob: URL → 无法预检，直接下载（来源只可能是同页生成的真实图）
  if (urlOrDataUrl.startsWith('blob:')) {
    const a = document.createElement('a')
    a.href = urlOrDataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }

  // 远程 http(s) URL → fetch 为 Blob → 校验 MIME / 大小 / 文件头
  const res = await fetch(urlOrDataUrl, { mode: 'cors' })
  if (!res.ok) throw new Error(`图片请求失败: HTTP ${res.status}`)
  const blob = await res.blob()
  const kind = await assertImageBlob(blob)
  console.debug(
    `[downloadImage] remote: type=${blob.type} size=${blob.size}B kind=${kind}`
  )
  triggerBlobDownload(blob, filename)
}

function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败，无法转换格式'))
    img.src = url
  })
}

/**
 * 按指定格式下载图片：PNG 直接走 downloadImage（带校验）；
 * JPG 需经 Canvas 合成（白底填充防透明区变黑）后导出 JPEG。
 * 远程 URL 需服务端允许 CORS（Supabase Storage 已开启），否则会抛错。
 */
export async function downloadImageAsFormat(
  urlOrDataUrl: string,
  filename: string,
  format: 'png' | 'jpg'
): Promise<void> {
  // 占位 SVG 先拦截：canvas 能"画"出 SVG 但导出的不是纹样，严禁混入下载
  if (typeof urlOrDataUrl === 'string' && /^data:image\/svg/.test(urlOrDataUrl)) {
    throw new Error('当前展示的是占位图，请重新生成后再下载')
  }
  if (format === 'png') return downloadImage(urlOrDataUrl, filename)

  // JPG 转换：canvas 源数据同样需要是有效图片
  if (urlOrDataUrl.startsWith('data:')) {
    const inspected = inspectDataUrl(urlOrDataUrl)
    if (!inspected.ok) throw new Error(inspected.reason || '图片数据异常')
  }
  const img = await loadImageForCanvas(urlOrDataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width || 1
  canvas.height = img.naturalHeight || img.height || 1
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布，格式转换失败')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * 作品列表 / 详情 / 收藏等「历史作品」下载：经 Netlify download 函数中转，
 * 函数侧已校验 Content-Type / 文件头 / 最小字节；此处再对返回内容做二次校验，
 * 任何异常都抛错（调用方 toast），不会把 JSON / SVG / 截断内容落成 .png。
 */
export async function downloadImageViaProxy(
  imageUrl: string,
  filename: string,
): Promise<void> {
  if (!imageUrl) throw new Error('缺少图片地址')
  if (/^data:image\/svg/.test(imageUrl)) {
    throw new Error('当前展示的是占位图，请重新生成后再下载')
  }
  const proxyUrl = `/.netlify/functions/download?url=${encodeURIComponent(imageUrl)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) {
    let msg = `下载失败: HTTP ${res.status}`
    try {
      const payload = await res.json()
      if (payload?.message) msg = payload.message
      else if (payload?.error) msg = `下载失败: ${payload.error}`
    } catch { /* 忽略解析失败 */ }
    throw new Error(msg)
  }
  const blob = await res.blob()
  await assertImageBlob(blob)
  triggerBlobDownload(blob, filename)
}
