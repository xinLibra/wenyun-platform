/**
 * 产品 3D 模型配置映射
 * productId → 对应 public/models/ 下的 json 配置文件路径
 * 仅在此映射中的产品才会加载 3D 预览，其余走 2D 占位
 */

export interface ColorMaterialConfig {
  name: string
  materialName: string
  label: string
}

export interface Product3DConfig {
  productId: string
  productName: string
  modelUrl: string
  meshConfig: {
    textureTargetMaterial: string
    colorMaterials: ColorMaterialConfig[]
  }
  modelLimit?: {
    maxTriFaces: number
    forwardAxis: string
  }
  textureSetting?: {
    wrapS: string
    wrapT: string
    textureScale: [number, number]
    offset: [number, number]
    rotation: number
  }
  cameraDefault?: {
    position: [number, number, number]
    lookAt: [number, number, number]
  }
  modelRotation?: [number, number, number]
  modelScale?: number
}

/** 产品 ID → json 配置路径（public 下相对路径） */
export const PRODUCT_3D_CONFIG: Record<string, string> = {
  phonecase: '/models/phone_case.json',
  phonecase_green: '/models/phone_case_green.json',
  bookmark: '/models/bookmark.json',
  cushion: '/models/cushion.json',
  tote: '/models/tote_bag.json',
  notebook: '/models/notebook.json',
  paper_bag: '/models/paper_bag.json',
  handkerchief: '/models/handkerchief.json',
  tshirt: '/models/t_shirt.json',
}

/** 判断产品是否有 3D 模型配置 */
export function has3DConfig(productId: string): boolean {
  return productId in PRODUCT_3D_CONFIG
}

/** 异步加载产品的 3D 配置 json */
export async function loadProduct3DConfig(productId: string): Promise<Product3DConfig | null> {
  const configPath = PRODUCT_3D_CONFIG[productId]
  if (!configPath) return null
  try {
    const resp = await fetch(configPath)
    if (!resp.ok) {
      console.warn(`[product3D] 配置加载失败: ${configPath} (${resp.status})`)
      return null
    }
    const data = await resp.json()
    // json 为数组结构，取第一项
    const item = Array.isArray(data) ? data[0] : data
    return item as Product3DConfig
  } catch (err) {
    console.error('[product3D] 配置加载异常', err)
    return null
  }
}

/** 预设色板（供换色面板使用） */
export const COLOR_PALETTE = [
  { c: '#2c3e50', name: '黛青' },
  { c: '#1a1a1a', name: '墨黑' },
  { c: '#8B4513', name: '赭石' },
  { c: '#C0C0C0', name: '银灰' },
  { c: '#E8D5B7', name: '米金' },
  { c: '#800020', name: '绛红' },
]
