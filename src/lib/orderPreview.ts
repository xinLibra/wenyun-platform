import { products } from './products'

/**
 * 商品默认/库存图地址集合：image_url 命中时视为「无有效定制预览」（历史脏数据把默认图直存 image_url），
 * 必须回退默认图，而不是把默认图当预览显示。
 */
const productDefaultImageUrls = new Set(
  Object.values(products)
    .map((p) => p?.image)
    .filter((v): v is string => typeof v === 'string')
)

export type OrderPreviewSource = 'image_url' | 'customization.preview' | 'default'

export interface OrderPreviewResult {
  url: string
  source: OrderPreviewSource
}

/**
 * 订单缩略图/详情预览候选（列表与详情读写一致）：
 * 1. image_url —— 定制纹样 / 定制效果图的 Storage 短链（http/https，且非商品默认图）
 *    （pattern-images 桶的地址直接显示，不判成「无 preview」）
 * 2. customization.previewImageUrl / preview_image_url / previewImage —— 产品轮廓+纹样合成图短链
 * 3. 都无有效短链 → 回退 products 默认图（source='default'，由调用方在 Console 打 warn）
 */
export function getOrderPreviewUrl(order: {
  image_url?: string | null
  customization?: Record<string, unknown> | null
}): OrderPreviewResult {
  const imageUrl = order.image_url
  if (
    typeof imageUrl === 'string' &&
    /^https?:\/\//i.test(imageUrl) &&
    !productDefaultImageUrls.has(imageUrl)
  ) {
    return { url: imageUrl, source: 'image_url' }
  }
  const c = order.customization
  if (c && typeof c === 'object') {
    for (const key of ['previewImageUrl', 'preview_image_url', 'previewImage'] as const) {
      const v = c[key]
      if (typeof v === 'string' && /^https?:\/\//i.test(v)) {
        return { url: v, source: 'customization.preview' }
      }
    }
  }
  return { url: '', source: 'default' }
}
