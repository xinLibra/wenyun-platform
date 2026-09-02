import type { Handler } from '@netlify/functions'

/** 最小可接受的图片字节数：正常 512×512 PNG 通常 >50KB，10KB 为保守下限（占位 SVG ~1KB 会被拦下） */
const MIN_IMAGE_BYTES = 10 * 1024

/** PNG 头：89 50 4E 47；JPEG 头：FF D8 FF */
function sniffImageHeader(bytes: Uint8Array): 'png' | 'jpeg' | 'webp' | null {
  if (bytes.length < 12) return null
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

const jsonError = (statusCode: number, error: string, message = '') => ({
  statusCode,
  body: JSON.stringify({ error, ...(message ? { message } : {}) }),
})

const handler: Handler = async (event) => {
  const { queryStringParameters } = event
  const imageUrl = queryStringParameters?.url

  if (!imageUrl) {
    return jsonError(400, 'Missing url parameter')
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return jsonError(response.status, `Failed to fetch image: ${response.status}`)
    }

    const contentType = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()

    // 只接受真实位图 MIME；SVG / JSON / 纯文本（如占位图、错误页）一律拒绝
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(contentType)) {
      return jsonError(
        415,
        `Unsupported content type: ${contentType || '(empty)'}`,
        '图片源不是有效的 PNG/JPEG（可能是占位图或错误页）',
      )
    }

    const data = await response.arrayBuffer()
    const bytes = new Uint8Array(data)

    if (bytes.length < MIN_IMAGE_BYTES) {
      return jsonError(
        502,
        `Image too small: ${bytes.length} bytes`,
        '图片数据异常（过小），请重新生成后再下载',
      )
    }

    const kind = sniffImageHeader(bytes)
    if (!kind) {
      return jsonError(
        502,
        'Invalid image header',
        '图片数据异常（文件头不是 PNG/JPEG），请重新生成后再下载',
      )
    }

    const buffer = Buffer.from(bytes)
    const extension = kind === 'jpeg' ? 'jpg' : kind
    const filename = `wenyun_pattern_${Date.now()}.${extension}`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error: any) {
    return jsonError(
      500,
      'Failed to download image',
      error?.message || 'Unknown error',
    )
  }
}

export { handler }
