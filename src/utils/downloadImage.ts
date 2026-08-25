// 统一下载图片工具：
// - data:/blob: → 直接触发浏览器下载（同步手势栈内最可靠）
// - 远程 URL → 先 fetch 为 blob，再经 blob: 链接下载（避免跨域下载被浏览器拦截）
// 失败时抛错，由调用方 toast 提示并 console.error
export async function downloadImage(
  urlOrDataUrl: string,
  filename: string
): Promise<void> {
  if (!urlOrDataUrl) throw new Error('缺少图片地址')

  // data: / blob: 直接下载（fetch data: 大图可能受限，直接 a[download] 更稳）
  if (urlOrDataUrl.startsWith('data:') || urlOrDataUrl.startsWith('blob:')) {
    const a = document.createElement('a')
    a.href = urlOrDataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }

  // 远程 URL：fetch → blob → blob: 下载
  const res = await fetch(urlOrDataUrl, { mode: 'cors' })
  if (!res.ok) throw new Error(`图片请求失败: HTTP ${res.status}`)
  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟释放，避免个别浏览器在下载完成前 revoke 导致失败
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
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
 * 按指定格式下载图片：PNG 直接走 downloadImage；
 * JPG 需经 Canvas 合成（白底填充防透明区变黑）后导出 JPEG。
 * 远程 URL 需服务端允许 CORS（Supabase Storage 已开启），否则会抛错。
 */
export async function downloadImageAsFormat(
  urlOrDataUrl: string,
  filename: string,
  format: 'png' | 'jpg'
): Promise<void> {
  if (format === 'png') return downloadImage(urlOrDataUrl, filename)

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
