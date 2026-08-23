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
