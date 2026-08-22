import { exportAndDownload, generatePreviewDataUrl } from '../utils/exportImage'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button, StampButton } from '../components/ui/Button'
import { InkSlider } from '../components/ui/InkSlider'
import { BambooToggle } from '../components/ui/Select'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { PatternRenderer, layoutPresets } from '../components/PatternRenderer'
import { DraggableText } from '../components/DraggableText'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabase'
import { Product3DViewer } from '../components/Product3DViewer'
import { loadProduct3DConfig, has3DConfig, COLOR_PALETTE, type Product3DConfig, type PatternAreaKey } from '../config/product3D'

/** HSL → HEX，用于色相/明度滑条 */
function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** canvas 读取纹样图主色（返回 HEX，失败 null） */
async function extractDominantColor(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      try {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0, g = 0, b = 0, cnt = 0
        for (let i = 0; i < data.length; i += 16) {
          const a = data[i + 3]
          if (a < 125) continue
          r += data[i]; g += data[i + 1]; b += data[i + 2]; cnt++
        }
        if (!cnt) { resolve(null); return }
        r = Math.round(r / cnt); g = Math.round(g / cnt); b = Math.round(b / cnt)
        const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
        resolve(hex)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}

function resolveImageUrl(imageUrl: string): string {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) return imageUrl
  // Likely a Supabase storage path like 'bucket_name/file_path'
  try {
    const { data } = supabase.storage.from('generations').getPublicUrl(imageUrl)
    if (data?.publicUrl) return data.publicUrl
  } catch { /* ignore */ }
  return imageUrl
}

interface UserPattern {
  id: string
  image_url: string
  title: string
  type: 'work' | 'favorite'
}

const products = [
  { id: 'bookmark', name: '书签', price: '19', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Chinese%20bookmark%20with%20metal%20ring%20and%20silk%20tassel%20on%20wooden%20stick%20blank%20elegant%20product%20photography%20on%20white%20background&image_size=portrait_4_3', category: '文创' },
  { id: 'phonecase', name: '手机壳', price: '49', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20white%20smartphone%20case%20with%20detachable%20side%20frame%20minimal%20product%20photography%20on%20light%20background&image_size=portrait_4_3', category: '文创' },
  { id: 'notebook', name: '笔记本', price: '39', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spiral%20coil%20notebook%20blank%20kraft%20cover%20with%20silver%20metal%20binding%20rings%20minimal%20product%20photography&image_size=portrait_4_3', category: '文创' },
  { id: 'postcard', name: '明信片', price: '12', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=postcard%20blank%20white%20minimal%20product%20photography&image_size=landscape_4_3', category: '文创' },
  { id: 'tote', name: '手提包', price: '59', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=canvas%20tote%20bag%20blank%20natural%20beige%20with%20brown%20leather%20handles%20upright%20front%20view%20product%20photography&image_size=square', category: '文创' },
  { id: 'paper_bag', name: '纸袋', price: '29', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kraft%20paper%20shopping%20bag%20with%20twisted%20paper%20handles%20upright%20front%20view%20blank%20product%20photography&image_size=square', category: '文创' },
  { id: 'cushion', name: '抱枕', price: '89', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=square%20cushion%20pillow%20blank%20white%20with%20decorative%20border%20edge%20front%20view%20product%20photography&image_size=square', category: '文创' },
  { id: 'handkerchief', name: '手帕', price: '19', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=folded%20cotton%20handkerchief%20blank%20white%20minimal%20product%20photography%20on%20light%20background&image_size=square', category: '文创' },
  { id: 'scarf', name: '围巾', price: '299', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20wool%20scarf%20elegant%20minimal%20product%20photography&image_size=square', category: '服饰' },
  { id: 'silkscarf', name: '丝巾', price: '199', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silk%20scarf%20blank%20white%20elegant%20product%20photography&image_size=square', category: '服饰' },
  { id: 'square_scarf', name: '方巾', price: '149', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silk%20square%20scarf%20blank%20white%20elegant%20product%20photography&image_size=square', category: '服饰' },
  { id: 'tshirt', name: 'T恤', price: '89', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20white%20cotton%20t-shirt%20front%20view%20with%20collar%20sleeve%20and%20hem%20trim%20minimal%20product%20photography&image_size=portrait_4_3', category: '服饰' },
]

const productMaterials: Record<string, string[]> = {
  bookmark: ['wood', 'paper'],
  phonecase: ['plastic', 'silicone'],
  notebook: ['paper', 'leather'],
  postcard: ['paper'],
  tote: ['canvas', 'cotton'],
  paper_bag: ['paper'],
  cushion: ['cotton', 'polyester'],
  handkerchief: ['cotton', 'silk'],
  scarf: ['silk', 'wool'],
  silkscarf: ['silk'],
  square_scarf: ['silk'],
  tshirt: ['cotton', 'polyester'],
}

const views = ['front', 'back', 'side']

type LayoutMode = 'center' | 'tile' | 'corner' | 'band' | 'free'

const blendModeLabels: Record<string, string> = {
  normal: '正常',
  overlay: '叠加',
  multiply: '正片叠底',
  screen: '滤色',
}

/** 安全写入 localStorage：配额满时 warn 不 throw */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (err) {
    console.warn(`[localStorage] 写入失败（可能配额已满）: ${key}`, err)
    return false
  }
}

/** 安全读取 localStorage：坏数据返回 null */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch (err) {
    console.warn(`[localStorage] 读取失败: ${key}`, err)
    return null
  }
}

/** 安全写入 sessionStorage */
function safeSessionSet(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value)
    return true
  } catch (err) {
    console.warn(`[sessionStorage] 写入失败: ${key}`, err)
    return false
  }
}

/** 安全读取 sessionStorage */
function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch (err) {
    console.warn(`[sessionStorage] 读取失败: ${key}`, err)
    return null
  }
}

/** 清理过期的 product_config_draft_* 键，只保留当前产品草稿 */
function pruneOldDrafts(keepProductId: string) {
  const keepKey = `product_config_draft_${keepProductId}`
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('product_config_draft_') && k !== keepKey) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach((k) => {
    try { localStorage.removeItem(k) } catch { /* ignore */ }
  })
}

/** 判断 patternImage 是否为 base64 大数据（不存入草稿） */
function isBase64DataUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('data:')
}


const getInitialProduct = () => {
  const savedProduct = safeGetItem('selected_product_id')
  if (savedProduct && products.find(p => p.id === savedProduct)) {
    return savedProduct
  }
  return products[0]?.id || ''
}

const getInitialMaterial = (productId: string) => {
  const draftKey = `product_config_draft_${productId}`
  const savedDraft = safeGetItem(draftKey)
  if (savedDraft) {
    try {
      const draft = JSON.parse(savedDraft)
      return draft.materialId || (productMaterials[productId]?.[0] || '')
    } catch {
      // 解析失败
    }
  }
  return productMaterials[productId]?.[0] || ''
}

export default function CustomizeProduct() {
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const getInitialParams = (productId: string) => {
    const draftKey = `product_config_draft_${productId}`
    const savedDraft = safeGetItem(draftKey)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        return {
          scale: Math.round(draft.params?.scale || 100),
          rotation: Math.round(draft.params?.rotation || 0),
          positionX: Math.round(draft.params?.positionX || 50),
          positionY: Math.round(draft.params?.positionY || 50),
          blendMode: draft.params?.blendMode || 'normal',
        }
      } catch {
        // 解析失败
      }
    }
    return {
      scale: 100,
      rotation: 0,
      positionX: 50,
      positionY: 50,
      blendMode: 'normal',
    }
  }

  const getInitialTextParams = (productId: string) => {
    const draftKey = `product_config_draft_${productId}`
    const savedDraft = safeGetItem(draftKey)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        if (draft.text) {
          return {
            textOverlay: draft.text.textOverlay || '',
            textFont: draft.text.textFont || 'shufa',
            textSize: draft.text.textSize || 16,
            textPositionX: draft.text.textPositionX || 50,
            textPositionY: draft.text.textPositionY || 85,
            textRotation: draft.text.textRotation || 0,
          }
        }
      } catch {
        // 解析失败
      }
    }
    return {
      textOverlay: '',
      textFont: 'shufa' as const,
      textSize: 16,
      textPositionX: 50,
      textPositionY: 85,
      textRotation: 0,
    }
  }

  const getInitialCategory = () => {
    const savedCategory = safeGetItem('selected_product_category')
    if (savedCategory && ['文创', '服饰'].includes(savedCategory)) {
      return savedCategory
    }
    return '文创'
  }

  const [isExporting, setIsExporting] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(getInitialProduct())
  const [selectedMaterial, setSelectedMaterial] = useState(() => getInitialMaterial(getInitialProduct()))
  const [scale, setScale] = useState(getInitialParams(getInitialProduct()).scale)
  const [rotation, setRotation] = useState(getInitialParams(getInitialProduct()).rotation)
  const [positionX, setPositionX] = useState(getInitialParams(getInitialProduct()).positionX)
  const [positionY, setPositionY] = useState(getInitialParams(getInitialProduct()).positionY)
  const [currentView, setCurrentView] = useState('front')
  const [blendMode, setBlendMode] = useState(getInitialParams(getInitialProduct()).blendMode)
  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory())
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const savedProduct = safeGetItem('selected_product_id') || 'scarf_front'
    const draftKey = `product_config_draft_${savedProduct}`
    const savedDraft = safeGetItem(draftKey)
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        return draft.layoutMode || 'free'
      } catch {
        return 'free'
      }
    }
    return 'free'
  })
  const [patternArea, setPatternArea] = useState<PatternAreaKey>('chest')
  const [colorArea, setColorArea] = useState<PatternAreaKey | undefined>(undefined)
  const [activeColorPart, setActiveColorPart] = useState<string | null>(null)
  const [hue, setHue] = useState(210)
  const [lightness, setLightness] = useState(45)
  const [patternRenderLimit, setPatternRenderLimit] = useState(12)
  const [showCompare, setShowCompare] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'pattern' | 'text'>('pattern')
  
  const initialTextParams = getInitialTextParams(getInitialProduct())
  const [textOverlay, setTextOverlay] = useState(initialTextParams.textOverlay)
  const [textFont, setTextFont] = useState<'shufa' | 'song' | 'hei' | 'kai'>(initialTextParams.textFont)
  const [textSize, setTextSize] = useState(initialTextParams.textSize)
  const [textPositionX, setTextPositionX] = useState(initialTextParams.textPositionX)
  const [textPositionY, setTextPositionY] = useState(initialTextParams.textPositionY)
  const [textRotation, setTextRotation] = useState(initialTextParams.textRotation || 0)
  const [selectedElement, setSelectedElement] = useState<'pattern' | 'text' | null>('pattern')

  // ===== 3D 预览相关状态 =====
  const [product3DConfig, setProduct3DConfig] = useState<Product3DConfig | null>(null)
  // 右侧面板折叠状态
  const [panelExpanded, setPanelExpanded] = useState<{ layout: boolean; color: boolean; adjust: boolean }>({ layout: true, color: true, adjust: true })
  // 通用换色：colorMaterial.name → HEX 色值
  const [productColors, setProductColors] = useState<Record<string, string>>({})

  // 切换产品时异步加载 3D 配置
  useEffect(() => {
    let cancelled = false
    if (!has3DConfig(selectedProduct)) {
      setProduct3DConfig(null)
      setProductColors({})
      return
    }
    setProduct3DConfig(null)
    loadProduct3DConfig(selectedProduct).then((cfg) => {
      if (cancelled) return
      setProduct3DConfig(cfg)
      // 不默认上深色：空 colorMap → 保持 glb 原色；用户点色板后再写入
      setProductColors({})
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct])

  const showToastMessage = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const handleExport = async (format: 'png' | 'jpg') => {
    setIsExporting(true)
    try {
      await exportAndDownload(
        {
          productImage: currentProduct?.image || '',
          patternImage: selectedPatternImage,
          layoutMode,
          scale,
          rotation,
          positionX,
          positionY,
          blendMode,
          textOverlay,
          textFont,
          textSize,
          textPositionX,
          textPositionY,
          textRotation,
          canvasWidth: 1024,
          canvasHeight: 1024,
        },
        format,
        currentProduct?.name || '纹韵定制'
      )
    } catch (err) {
      console.error('导出失败', err)
      alert('导出失败，请稍后重试。如果问题持续，可能是图片跨域权限配置问题。')
    } finally {
      setIsExporting(false)
    }
  }

  const handleLayoutChange = (mode: LayoutMode) => {
    setLayoutMode(mode)
    const preset = layoutPresets[mode]
    if (mode !== 'free') {
      setScale(preset.scale)
      setRotation(preset.rotation)
      setPositionX(preset.positionX)
      setPositionY(preset.positionY)
      setBlendMode(preset.blendMode)
    }
  }

  const handleProductChange = (productId: string) => {
    safeSetItem('selected_product_id', productId)
    pruneOldDrafts(productId)

    const savedPattern = safeSessionGet(`customize:selectedPattern:${productId}`)
    let restoredPatternUrl: string | null = null
    if (savedPattern) {
      try {
        const p = JSON.parse(savedPattern)
        if (p?.image_url) restoredPatternUrl = p.image_url
      } catch { /* ignore */ }
    }

    const defaultPatternArea: PatternAreaKey = productId === 'tote' ? 'center' : 'chest'

    const draftKey = `product_config_draft_${productId}`
    const savedDraft = safeGetItem(draftKey)
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setSelectedProduct(productId)
        setSelectedMaterial(draft.materialId || (productMaterials[productId]?.[0] || ''))
        if (restoredPatternUrl) {
          setSelectedPatternImage(restoredPatternUrl)
        } else if (draft.patternImage) {
          setSelectedPatternImage(draft.patternImage)
        }
        setScale(Math.round(draft.params?.scale || 100))
        setRotation(Math.round(draft.params?.rotation || 0))
        setPositionX(Math.round(draft.params?.positionX || 50))
        setPositionY(Math.round(draft.params?.positionY || 50))
        setBlendMode(draft.params?.blendMode || 'normal')
        if (draft.layoutMode) setLayoutMode(draft.layoutMode)
        if (draft.text) {
          setTextOverlay(draft.text.textOverlay || '')
          setTextFont(draft.text.textFont || 'shufa')
          setTextSize(draft.text.textSize || 16)
          setTextPositionX(draft.text.textPositionX || 50)
          setTextPositionY(draft.text.textPositionY || 85)
          setTextRotation(draft.text.textRotation || 0)
        }
        setProductColors(draft.colors || {})
        setActiveColorPart(null)
        setPatternArea(defaultPatternArea)
        setColorArea(productId === 'tote' ? 'center' : undefined)
        return
      } catch {
        // 解析失败，使用默认值
      }
    }
    
    setSelectedProduct(productId)
    const availableMaterials = productMaterials[productId] || []
    setSelectedMaterial(availableMaterials[0] || '')
    if (restoredPatternUrl) {
      setSelectedPatternImage(restoredPatternUrl)
    }
    setScale(100)
    setRotation(0)
    setPositionX(50)
    setPositionY(50)
    setBlendMode('normal')
    setTextOverlay('')
    setTextFont('shufa')
    setTextSize(16)
    setTextPositionX(50)
    setTextPositionY(85)
    setTextRotation(0)
    setLayoutMode('free')
    setProductColors({})
    setActiveColorPart(null)
    setPatternArea(defaultPatternArea)
    setColorArea(productId === 'tote' ? 'center' : undefined)
  }
  
  const [isBuying, setIsBuying] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [orderPreviewImg, setOrderPreviewImg] = useState<string>('')
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false)
  const viewerCaptureRef = useRef<(() => string | null) | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [quantityAction, setQuantityAction] = useState<'cart' | 'buy' | null>(null)
  const [orderFormData, setOrderFormData] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [showPatternModal, setShowPatternModal] = useState(false)
  const [patternTab, setPatternTab] = useState<'work' | 'favorite'>('work')
  const [userPatterns, setUserPatterns] = useState<UserPattern[]>([])
  const [selectedPatternImage, setSelectedPatternImage] = useState<string | null>(() => {
    const lastPattern = safeGetItem('last_generated_pattern')
    return lastPattern || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20calico%20pattern%20minimal%20elegant&image_size=square'
  })
  const [patternModalLoading, setPatternModalLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [patternImageStates, setPatternImageStates] = useState<Record<string, 'loading' | 'loaded' | 'error'>>({})
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const productBoxRef = useRef<HTMLDivElement>(null)   // 新增：拖拽比例计算改用这个更小、更准确的容器

  useEffect(() => {
    const reorderProduct = safeGetItem('reorder_product')
    
    if (reorderProduct) {
      try {
        const { productId, customization } = JSON.parse(reorderProduct)
        setSelectedProduct(productId)
        setSelectedMaterial(customization?.material || (productMaterials[productId]?.[0] || ''))
        setScale(customization?.scale || 100)
        setRotation(customization?.rotation || 0)
        setPositionX(customization?.positionX || 50)
        setPositionY(customization?.positionY || 50)
        setBlendMode(customization?.blendMode || 'normal')
        try { localStorage.removeItem('reorder_product') } catch { /* ignore */ }
        return
      } catch {
        // 解析失败，继续尝试读取草稿
      }
    }

    const draftKey = `product_config_draft_${selectedProduct}`
    const savedDraft = safeGetItem(draftKey)

    const savedPattern = safeSessionGet(`customize:selectedPattern:${selectedProduct}`)
    if (savedPattern) {
      try {
        const p = JSON.parse(savedPattern)
        if (p?.image_url) {
          setSelectedPatternImage(p.image_url)
        }
      } catch { /* ignore */ }
    }
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setSelectedMaterial(draft.materialId || (productMaterials[selectedProduct]?.[0] || ''))
        if (draft.patternImage && !savedPattern) {
          setSelectedPatternImage(draft.patternImage)
        }
        if (draft.layoutMode) {
          setLayoutMode(draft.layoutMode)
        }
        setScale(draft.params?.scale || 100)
        setRotation(draft.params?.rotation || 0)
        setPositionX(draft.params?.positionX || 50)
        setPositionY(draft.params?.positionY || 50)
        setBlendMode(draft.params?.blendMode || 'screen')
        if (draft.text) {
          setTextOverlay(draft.text.textOverlay || '')
          setTextFont(draft.text.textFont || 'shufa')
          setTextSize(draft.text.textSize || 16)
          setTextPositionX(draft.text.textPositionX || 50)
          setTextPositionY(draft.text.textPositionY || 85)
          setTextRotation(draft.text.textRotation || 0)
        }
      } catch {
        // 解析失败，使用默认值
      }
    }
  }, [])

  useEffect(() => {
    const draftKey = `product_config_draft_${selectedProduct}`
    // base64 大图不写入草稿，避免撑爆 localStorage 配额；仅存 URL 或标记
    const patternImageForDraft = isBase64DataUrl(selectedPatternImage) ? null : selectedPatternImage
    const draft = {
      productId: selectedProduct,
      materialId: selectedMaterial,
      patternImage: patternImageForDraft,
      layoutMode,
      params: { scale, rotation, positionX, positionY, blendMode },
      text: { textOverlay, textFont, textSize, textPositionX, textPositionY, textRotation },
      colors: productColors,
      updatedAt: new Date().toISOString()
    }
    safeSetItem(draftKey, JSON.stringify(draft))
  }, [selectedProduct, selectedMaterial, selectedPatternImage, layoutMode, scale, rotation, positionX, positionY, blendMode, textOverlay, textFont, textSize, textPositionX, textPositionY, textRotation, productColors])

  // ===== 色相/明度滑条：实时写入当前激活部件 =====
  useEffect(() => {
    if (!activeColorPart) return
    const hex = hslToHex(hue, 60, lightness)
    setProductColors((prev) => ({ ...prev, [activeColorPart]: hex }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hue, lightness, activeColorPart])

  const handleReset = () => {
    const confirmed = window.confirm('确定要恢复默认设置吗？当前调节将被清空')
    if (confirmed) {
      const preset = layoutPresets[layoutMode]
      if (layoutMode !== 'free') {
        setScale(preset.scale)
        setRotation(preset.rotation)
        setPositionX(preset.positionX)
        setPositionY(preset.positionY)
        setBlendMode(preset.blendMode)
      } else {
        setScale(100)
        setRotation(0)
        setPositionX(50)
        setPositionY(50)
        setBlendMode('screen')
      }
      setTextOverlay('')
      setTextFont('shufa')
      setTextSize(16)
      setTextPositionX(50)
      setTextPositionY(85)
      setTextRotation(0)
      showToastMessage('已恢复默认设置')
    }
  }

  const patternsCacheRef = useRef<{ userId: string; ts: number; data: UserPattern[] } | null>(null)

  const fetchUserPatterns = async (force = false) => {
    if (!force && patternsCacheRef.current?.data && Date.now() - patternsCacheRef.current.ts < 60_000) {
      setUserPatterns(patternsCacheRef.current.data)
      return
    }

    setPatternModalLoading(true)
    try {
      const { data: { session } } = await Promise.race([
        supabase.auth?.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]) as any

      if (!session?.user) {
        navigate('/login')
        return
      }

      const patterns: UserPattern[] = []

      const [myWorksResult, favoritesResult] = await Promise.all([
        supabase
          .from('generations')
          .select('id, image_url, params')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('favorites')
          .select('generation_id')
          .eq('user_id', session.user.id)
          .limit(30),
      ])

      if (myWorksResult.data) {
        myWorksResult.data.forEach((work: any) => {
          patterns.push({
            id: work.id,
            image_url: work.image_url,
            title: work.params?.title || `我的作品 #${work.id.slice(0, 8)}`,
            type: 'work',
          })
        })
      }

      const favRecords = favoritesResult.data
      if (favRecords && favRecords.length > 0) {
        const generationIds = favRecords.map((f: any) => f.generation_id)
        const { data: favGenerations } = await supabase
          .from('generations')
          .select('id, image_url, params')
          .in('id', generationIds)

        if (favGenerations) {
          favGenerations.forEach((fav: any) => {
            if (!patterns.find(p => p.id === fav.id)) {
              patterns.push({
                id: fav.id,
                image_url: fav.image_url,
                title: fav.params?.title || `收藏作品 #${fav.id.slice(0, 8)}`,
                type: 'favorite',
              })
            }
          })
        }
      }

      setUserPatterns(patterns)
      patternsCacheRef.current = { userId: session.user.id, ts: Date.now(), data: patterns }
    } catch (err) {
      console.error('Fetch patterns error:', err)
      if (!userPatterns.length) {
        setFetchError(true)
      }
    } finally {
      setPatternModalLoading(false)
    }
  }

  const handleSelectPattern = (pattern: UserPattern) => {
    setSelectedPatternImage(pattern.image_url)
    try {
      safeSessionSet(`customize:selectedPattern:${selectedProduct}`, JSON.stringify({
        id: pattern.id,
        image_url: pattern.image_url,
        title: pattern.title,
      }))
    } catch { /* ignore */ }
    setShowPatternModal(false)
  }

  const handleOpenPatternModal = () => {
    setShowPatternModal(true)
    setFetchError(false)
    setPatternRenderLimit(12)
    setPatternImageStates({})
    if (patternsCacheRef.current?.data && Date.now() - patternsCacheRef.current.ts < 60_000) {
      setUserPatterns(patternsCacheRef.current.data)
      setPatternModalLoading(false)
    }
    fetchUserPatterns()
  }

  const handleRetryPatterns = () => {
    setFetchError(false)
    fetchUserPatterns(true)
  }

  const handleClearPattern = () => {
    setSelectedPatternImage(null)
    try {
      sessionStorage.removeItem(`customize:selectedPattern:${selectedProduct}`)
    } catch { /* ignore */ }
    showToastMessage('已清除纹样')
  }

  const handleClearColors = () => {
    setProductColors({})
    setActiveColorPart(null)
    showToastMessage('已清除全部换色，恢复模型原色')
  }

  const handleClearPartColor = (partName: string) => {
    setProductColors((prev) => {
      const next = { ...prev }
      delete next[partName]
      return next
    })
    showToastMessage('已清除该部件换色')
  }

  const handleApplyDominantColor = async () => {
    if (!selectedPatternImage) {
      showToastMessage('请先选择纹样')
      return
    }
    const targetPart = activeColorPart || product3DConfig?.meshConfig?.colorMaterials?.[0]?.name || null
    if (!targetPart) {
      showToastMessage('当前产品无可配色部件')
      return
    }
    const hex = await extractDominantColor(selectedPatternImage)
    if (hex) {
      setProductColors((prev) => ({ ...prev, [targetPart]: hex }))
      const label = product3DConfig?.meshConfig?.colorMaterials?.find(c => c.name === targetPart)?.label || targetPart
      showToastMessage(`「${label}」已应用纹样主色 ${hex}`)
    } else {
      showToastMessage('纹样主色提取失败（可能跨域）')
    }
  }

  const handleApplyAllDominantColors = async () => {
    if (!selectedPatternImage) {
      showToastMessage('请先选择纹样')
      return
    }
    const cmList = product3DConfig?.meshConfig?.colorMaterials
    if (!cmList?.length) {
      showToastMessage('当前产品无可配色部件')
      return
    }
    const hex = await extractDominantColor(selectedPatternImage)
    if (hex) {
      const all: Record<string, string> = {}
      cmList.forEach((cm) => { all[cm.name] = hex })
      setProductColors(all)
      showToastMessage(`全部 ${cmList.length} 个部件已应用纹样主色 ${hex}`)
    } else {
      showToastMessage('纹样主色提取失败（可能跨域）')
    }
  }

  const saveDraft = () => {
    const draftKey = `product_config_draft_${selectedProduct}`
    const patternImageForDraft = isBase64DataUrl(selectedPatternImage) ? null : selectedPatternImage
    const draft = {
      productId: selectedProduct,
      materialId: selectedMaterial,
      patternImage: patternImageForDraft,
      layoutMode,
      params: { scale, rotation, positionX, positionY, blendMode },
      text: { textOverlay, textFont, textSize, textPositionX, textPositionY, textRotation },
      updatedAt: new Date().toISOString()
    }
    if (!safeSetItem(draftKey, JSON.stringify(draft))) {
      showToastMessage('本地缓存已满，配置仅本次有效')
    }
  }

  const handleSaveConfig = () => {
    saveDraft()
    alert('配置已保存')
  }

  const handleAddToCart = () => {
    setQuantityAction('cart')
    setQuantity(1)
    setShowQuantityModal(true)
  }

  const handleBuyNow = async () => {
    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再购买')
      navigate('/login')
      return
    }

    setQuantityAction('buy')
    setQuantity(1)
    setShowQuantityModal(true)
  }

  const handleConfirmQuantity = async () => {
    setShowQuantityModal(false)
    
    if (quantityAction === 'cart') {
      addToCart({
        productId: selectedProduct,
        generationId: null,
        customization: { scale, rotation, positionX, positionY, blendMode, patternImage: selectedPatternImage, textOverlay, textFont, textSize, textPositionX, textPositionY, textRotation },
        quantity: quantity
      })
      alert('已加入购物车')
    } else if (quantityAction === 'buy') {
      setShowOrderModal(true)
      setOrderPreviewLoading(true)
      setOrderPreviewImg('')

      const tryCapture3D = async () => {
        if (product3DConfig?.modelUrl && viewerCaptureRef.current) {
          const dataUrl = viewerCaptureRef.current()
          if (dataUrl) {
            setOrderPreviewImg(dataUrl)
            setOrderPreviewLoading(false)
            return true
          }
        }
        return false
      }

      try {
        const captured = await tryCapture3D()
        if (!captured) {
          const url = await generatePreviewDataUrl({
            productImage: currentProduct?.image || '',
            patternImage: selectedPatternImage,
            layoutMode,
            scale,
            rotation,
            positionX,
            positionY,
            blendMode,
            textOverlay,
            textFont,
            textSize,
            textPositionX,
            textPositionY,
            textRotation,
            canvasWidth: 256,
            canvasHeight: 256,
          }, 256)
          setOrderPreviewImg(url)
        }
      } catch {
        setOrderPreviewImg(currentProduct?.image || '')
      } finally {
        setOrderPreviewLoading(false)
      }
    }
    
    setQuantityAction(null)
  }

  const handleConfirmOrder = async () => {
    if (!orderFormData.name.trim()) {
      alert('请填写收货人姓名')
      return
    }

    if (!orderFormData.phone.trim()) {
      alert('请填写联系电话')
      return
    }

    if (!orderFormData.address.trim()) {
      alert('请填写收货地址')
      return
    }

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再购买')
      navigate('/login')
      return
    }

    console.log('[Order] Session user:', session.user.id, session.user.email)

    setIsBuying(true)

    try {
      const order = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
        product_id: selectedProduct,
        generation_id: null,
        image_url: selectedPatternImage,
        product_image: currentProduct?.image,
        customization: { scale, rotation, positionX, positionY, blendMode, layoutMode, textOverlay, textFont, textSize, textPositionX, textPositionY, textRotation },
        quantity: quantity,
        status: 'demo',
        created_at: new Date().toISOString(),
        shipping_info: { name: orderFormData.name, phone: orderFormData.phone, address: orderFormData.address }
      }

      console.log('[Order] Inserting order:', order)
      const insertResult = await supabase.from('orders').insert(order).select()
      console.log('[Order] Insert result:', insertResult)

      setShowOrderModal(false)
      setOrderFormData({ name: '', phone: '', address: '' })
      navigate('/orders')
    } catch (err) {
      console.error('[Order] Error:', err)
      alert('提交失败，请重试')
    } finally {
      setIsBuying(false)
    }
  }
  
  const filteredProducts = products.filter(p => p.category === selectedCategory)

  const initialTouchDistance = useRef(0)
  const initialTouchAngle = useRef(0)
  const initialScale = useRef(100)
  const initialRotation = useRef(0)

  const currentProduct = products.find(p => p.id === selectedProduct)

  const dragStartX = useRef(0)
  const dragStartY = useRef(0)
  const dragOffsetStartX = useRef(0)
  const dragOffsetStartY = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX
    dragStartY.current = e.clientY
    dragOffsetStartX.current = positionX
    dragOffsetStartY.current = positionY
    
    const longPressTimer = setTimeout(() => {
      window.addEventListener('mousemove', nativeMouseMoveHandler)
      window.addEventListener('mouseup', nativeMouseUpHandler)
      window.addEventListener('mouseleave', nativeMouseUpHandler)
    }, 200)
    
    const handleMouseUpEarly = () => {
      clearTimeout(longPressTimer)
      window.removeEventListener('mouseup', handleMouseUpEarly)
      window.removeEventListener('mouseleave', handleMouseUpEarly)
    }
    
    window.addEventListener('mouseup', handleMouseUpEarly)
    window.addEventListener('mouseleave', handleMouseUpEarly)
  }

  const nativeMouseMoveHandler = (e: MouseEvent) => {
    e.preventDefault()
  const el = productBoxRef.current
  if (!el) return
    
    const dx = e.clientX - dragStartX.current
    const dy = e.clientY - dragStartY.current
    
    const rect = el.getBoundingClientRect()
    const pxPerPercent = rect.width / 100
    
    const newX = dragOffsetStartX.current + (dx / pxPerPercent)
    const newY = dragOffsetStartY.current + (dy / pxPerPercent)
    
    setPositionX(Math.round(Math.max(0, Math.min(100, newX))))
    setPositionY(Math.round(Math.max(0, Math.min(100, newY))))
  }

  const nativeMouseUpHandler = () => {
    window.removeEventListener('mousemove', nativeMouseMoveHandler)
    window.removeEventListener('mouseup', nativeMouseUpHandler)
    window.removeEventListener('mouseleave', nativeMouseUpHandler)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragStartX.current = e.touches[0].clientX
      dragStartY.current = e.touches[0].clientY
      dragOffsetStartX.current = positionX
      dragOffsetStartY.current = positionY
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      
      const dx = touch2.clientX - touch1.clientX
      const dy = touch2.clientY - touch1.clientY
      initialTouchDistance.current = Math.sqrt(dx * dx + dy * dy)
      initialTouchAngle.current = Math.atan2(dy, dx) * (180 / Math.PI)
      initialScale.current = scale
      initialRotation.current = rotation
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 1) {
  const el = productBoxRef.current
  if (!el) return
      
      const dx = e.touches[0].clientX - dragStartX.current
      const dy = e.touches[0].clientY - dragStartY.current
      
      const rect = el.getBoundingClientRect()
      const pxPerPercent = rect.width / 100
      
      const newX = dragOffsetStartX.current + (dx / pxPerPercent)
      const newY = dragOffsetStartY.current + (dy / pxPerPercent)
      
      setPositionX(Math.round(Math.max(0, Math.min(100, newX))))
      setPositionY(Math.round(Math.max(0, Math.min(100, newY))))
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      
      const dx = touch2.clientX - touch1.clientX
      const dy = touch2.clientY - touch1.clientY
      const currentDistance = Math.sqrt(dx * dx + dy * dy)
      const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI)
      
      const scaleFactor = currentDistance / initialTouchDistance.current
      const angleDiff = currentAngle - initialTouchAngle.current
      
      setScale(Math.round(Math.max(10, Math.min(200, initialScale.current * scaleFactor))))
      setRotation(Math.round(initialRotation.current + angleDiff))
    }
  }

  useEffect(() => {
    const el = document.getElementById('preview-container')
    if (!el) return

    const is3DMode = !!(product3DConfig && product3DConfig.modelUrl)

    const handleWheel = (e: WheelEvent) => {
      if (is3DMode) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -2 : 2
      
      if (selectedElement === 'pattern') {
        setScale((prev: number) => Math.max(10, Math.min(200, prev + delta)))
      } else if (selectedElement === 'text') {
        setTextSize((prev: number) => Math.max(8, Math.min(120, prev + delta)))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [selectedElement, product3DConfig])



  return (
    <div className="min-h-screen py-8 px-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
          >
            产品定制
          </motion.h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">将您设计的纹样应用于各类文创产品，打造专属定制</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <h2 className="font-shufa text-xl text-deep-blue">定制流程</h2>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
            {[
              { step: '一', title: '选择产品', desc: '从博古架中挑选心仪产品' },
              { step: '二', title: '应用纹样', desc: '将设计好的纹样应用到产品上' },
              { step: '三', title: '精细调节', desc: '调整大小、位置、角度等参数' },
              { step: '四', title: '确认下单', desc: '预览效果后确认购买' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-palace-red rounded-sm flex items-center justify-center mb-2">
                    <span className="font-shufa text-ming-yellow text-lg">{item.step}</span>
                  </div>
                  <h3 className="font-shufa text-deep-blue text-sm mb-1">{item.title}</h3>
                  <p className="font-song text-xs text-deep-blue-light">{item.desc}</p>
                </div>
                {index < 3 && (
                  <svg className="w-6 h-6 text-deep-blue-200 mx-2 md:mx-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <FrameDecorations className="bg-rice-paper-light p-6 flex flex-col">
              <h2 className="font-shufa text-xl text-deep-blue mb-4 flex items-center">
                <span className="w-8 h-8 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-3 text-sm">品</span>
                选择产品
              </h2>
              
              <div className="flex gap-2 mb-4">
                {['文创', '服饰'].map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      safeSetItem('selected_product_category', category)
                      setSelectedCategory(category)
                    }}
                    className={`flex-1 py-2 px-4 rounded-sm font-song transition-all duration-300 ${
                      selectedCategory === category
                        ? 'bg-palace-red text-rice-paper shadow-md'
                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-deep-blue-light'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-2 content-start overflow-y-auto max-h-[40vh]">
                {filteredProducts.map((product, index) => (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.4) }}
                    onClick={() => handleProductChange(product.id)}
                    className={`flex flex-col items-start px-3 py-2 rounded-sm font-song text-sm transition-all duration-300 border ${
                      selectedProduct === product.id
                        ? 'bg-palace-red text-rice-paper border-palace-red shadow-md'
                        : 'bg-rice-paper border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                    }`}
                  >
                    <span className="font-shufa">{product.name}</span>
                    <span className={`text-xs ${selectedProduct === product.id ? 'text-ming-yellow' : 'text-deep-blue-light'}`}>¥{product.price}</span>
                  </motion.button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} className="flex-1">重置</Button>
                  <Button variant="outline" onClick={handleSaveConfig} className="flex-1">保存配置</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={handleOpenPatternModal} className="flex-1">选择纹样</Button>
                  <button
                    type="button"
                    onClick={handleClearPattern}
                    className="px-3 py-2 border border-deep-blue-200 rounded-sm font-song text-sm text-deep-blue hover:bg-deep-blue-50 transition-colors"
                  >
                    清除纹样
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('png')}
                    disabled={isExporting}
                    className="flex-1 px-4 py-2 border border-deep-blue-200 rounded-sm font-song text-deep-blue hover:bg-deep-blue-50 disabled:opacity-50"
                  >
                    {isExporting ? '导出中...' : '下载 PNG'}
                  </button>
                  <button
                    onClick={() => handleExport('jpg')}
                    disabled={isExporting}
                    className="flex-1 px-4 py-2 border border-deep-blue-200 rounded-sm font-song text-deep-blue hover:bg-deep-blue-50 disabled:opacity-50"
                  >
                    {isExporting ? '导出中...' : '下载 JPG'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleAddToCart} className="flex-1">加入购物车</Button>
                  <StampButton onClick={handleBuyNow} disabled={isBuying} className="flex-1">
                    {isBuying ? '处理中...' : '立即购买'}
                  </StampButton>
                </div>
              </div>
            </FrameDecorations>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FrameDecorations className="bg-rice-paper-light p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-shufa text-lg text-deep-blue flex items-center">
                    <span className="w-6 h-6 bg-ming-yellow/50 rounded-sm flex items-center justify-center text-deep-blue mr-2 text-sm">览</span>
                    效果预览
                  </h2>
                  
                  <div className="flex gap-2 z-10">
                    {/* 有 3D 配置的产品不显示对比/视角按钮 */}
                    {!has3DConfig(selectedProduct) && (
                      <>
                        <button
                          onClick={() => setShowCompare(!showCompare)}
                          className={`px-3 py-1.5 text-sm font-song rounded-sm transition-all duration-300 ${
                            showCompare
                              ? 'bg-deep-blue text-rice-paper shadow-sm'
                              : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-deep-blue-light'
                          }`}
                          style={{ zIndex: 10 }}
                        >
                          {showCompare ? '关闭对比' : '对比原图'}
                        </button>
                        {views.map((view) => (
                          <button
                            key={view}
                            onClick={() => setCurrentView(view)}
                            className={`px-3 py-1.5 text-sm font-song rounded-sm transition-all duration-300 ${
                              currentView === view
                                ? 'bg-palace-red text-rice-paper shadow-sm'
                                : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                            }`}
                            style={{ zIndex: 10 }}
                          >
                            {view === 'front' ? '正面' : view === 'back' ? '背面' : '侧面'}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="relative" ref={previewContainerRef} id="preview-container">
                  <div className="absolute -inset-3 border-3 border-deep-blue rounded-sm opacity-10" />

                  {/* ===== 3D 预览模式（所有有 3D 配置的产品） ===== */}
                  {product3DConfig && product3DConfig.modelUrl ? (
                    <div className="relative aspect-[3/4] bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden">
                      <Product3DViewer
                        modelUrl={`/models/${product3DConfig.modelUrl}`}
                        textureTargetMaterial={product3DConfig.meshConfig?.textureTargetMaterial || ''}
                        textureTargetMaterials={product3DConfig.meshConfig?.textureTargetMaterials}
                        colorTargetMaterials={product3DConfig.meshConfig?.colorTargetMaterials}
                        colorMaterials={product3DConfig.meshConfig?.colorMaterials || []}
                        patternImage={selectedPatternImage}
                        colorMap={productColors}
                        modelRotation={product3DConfig.modelRotation ?? [0, 0, 0]}
                        modelScale={product3DConfig.modelScale ?? 0.35}
                        cameraPosition={product3DConfig.cameraDefault?.position ?? [0, 0.12, 1.7]}
                        patternArea={patternArea}
                        colorArea={colorArea}
                        captureRef={viewerCaptureRef}
                      />

                      {/* 底部信息条 */}
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end pointer-events-none">
                        <div>
                          <h3 className="font-shufa text-lg text-deep-blue">{currentProduct?.name}</h3>
                          <p className="font-song text-palace-red text-base">¥{currentProduct?.price}</p>
                        </div>
                      </div>

                      {/* 操作提示 */}
                      <div className="absolute top-2 right-2 bg-rice-paper/90 backdrop-blur-sm px-2 py-1 rounded-sm">
                        <p className="font-song text-xs text-deep-blue-light">
                          拖拽旋转 · 滚轮缩放
                        </p>
                      </div>
                    </div>
                  ) : has3DConfig(selectedProduct) && !product3DConfig ? (
                    /* 3D 配置加载中 */
                    <div className="relative aspect-[3/4] bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden flex items-center justify-center">
                      <p className="font-song text-deep-blue-light">正在加载 3D 模型…</p>
                    </div>
                  ) : (
                    /* ===== 原来的 2D 预览逻辑（保持不变） ===== */
                    <>
                      {showCompare ? (
                        <div className="flex">
                          {/* 原图侧 */}
                          <div className="flex-1 relative aspect-[3/4] bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden">
                            <div className="absolute inset-0 bg-ink-wash opacity-10" />
                            <div className="absolute top-2 left-2 bg-rice-paper/90 backdrop-blur-sm px-2 py-1 rounded-sm">
                              <p className="font-song text-xs text-deep-blue">原图</p>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <img
                                src={currentProduct?.image}
                                alt={currentProduct?.name}
                                className="w-48 h-auto object-contain"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                              />
                            </div>
                          </div>

                          {/* 定制效果侧 */}
                          <div
                            className="flex-1 relative aspect-[3/4] bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden"
                            style={{ touchAction: 'none' }}
                            onClick={() => setSelectedElement(null)}
                          >
                            <div className="absolute inset-0 bg-ink-wash opacity-10" />
                            <div className="absolute top-2 left-2 bg-rice-paper/90 backdrop-blur-sm px-2 py-1 rounded-sm">
                              <p className="font-song text-xs text-deep-blue">定制效果</p>
                            </div>

                            <div
                              className="absolute inset-0 flex items-center justify-center"
                              onClick={(e) => { e.stopPropagation(); setSelectedElement(null); }}
                            >
                              <div className="relative" ref={productBoxRef}>
                                <img
                                  src={currentProduct?.image}
                                  alt={currentProduct?.name}
                                  className="w-48 h-auto object-contain"
                                  draggable={false}
                                  onDragStart={(e) => e.preventDefault()}
                                  onClick={(e) => { e.stopPropagation(); setSelectedElement(null); }}
                                />
                                <PatternRenderer
                                  layoutMode={layoutMode}
                                  patternImage={selectedPatternImage}
                                  scale={scale}
                                  rotation={rotation}
                                  positionX={positionX}
                                  positionY={positionY}
                                  blendMode={blendMode}
                                  isSelected={selectedElement === 'pattern'}
                                  onSelect={() => setSelectedElement('pattern')}
                                  onMouseDown={handleMouseDown}
                                  onTouchStart={handleTouchStart}
                                  onTouchMove={handleTouchMove}
                                  imageSize="small"
                                />
                                {textOverlay && (
                                  <DraggableText
                                    text={textOverlay}
                                    font={textFont}
                                    fontSize={textSize}
                                    positionX={textPositionX}
                                    positionY={textPositionY}
                                    rotation={textRotation}
                                    isSelected={selectedElement === 'text'}
                                    onSelect={() => setSelectedElement('text')}
                                    onPositionChange={(x, y) => {
                                      setTextPositionX(x)
                                      setTextPositionY(y)
                                    }}
                                    onSizeChange={setTextSize}
                                    onRotationChange={setTextRotation}
                                    containerRef={productBoxRef}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="relative aspect-[3/4] bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden"
                          style={{ touchAction: 'none' }}
                          onClick={() => setSelectedElement(null)}
                        >
                          <div className="absolute inset-0 bg-ink-wash opacity-10" />

                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            onClick={(e) => { e.stopPropagation(); setSelectedElement(null); }}
                          >
                            <div className="relative" ref={productBoxRef}>
                              <img
                                src={currentProduct?.image}
                                alt={currentProduct?.name}
                                className="w-48 h-auto object-contain"
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                onClick={(e) => { e.stopPropagation(); setSelectedElement(null); }}
                              />
                              <PatternRenderer
                                layoutMode={layoutMode}
                                patternImage={selectedPatternImage}
                                scale={scale}
                                rotation={rotation}
                                positionX={positionX}
                                positionY={positionY}
                                blendMode={blendMode}
                                isSelected={selectedElement === 'pattern'}
                                onSelect={() => setSelectedElement('pattern')}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                imageSize="large"
                              />
                              {textOverlay && (
                                <DraggableText
                                  text={textOverlay}
                                  font={textFont}
                                  fontSize={textSize}
                                  positionX={textPositionX}
                                  positionY={textPositionY}
                                  rotation={textRotation}
                                  isSelected={selectedElement === 'text'}
                                  onSelect={() => setSelectedElement('text')}
                                  onPositionChange={(x, y) => {
                                    setTextPositionX(x)
                                    setTextPositionY(y)
                                  }}
                                  onSizeChange={setTextSize}
                                  onRotationChange={setTextRotation}
                                  containerRef={productBoxRef}
                                />
                              )}
                            </div>
                          </div>

                          {/* 底部信息条（原有） */}
                          <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5">
                            {!showCompare && (
                              <div className="hidden sm:flex sm:items-center sm:gap-4 bg-rice-paper/70 backdrop-blur-sm px-2 py-1 rounded-sm w-fit">
                                <span className="font-song text-xs text-deep-blue-light">
                                  <span className="text-deep-blue">大小：{scale}%</span>
                                </span>
                                <span className="font-song text-xs text-deep-blue-light">
                                  <span className="text-deep-blue">位置：X:{positionX} Y:{positionY}</span>
                                </span>
                                <span className="font-song text-xs text-deep-blue-light">
                                  <span className="text-deep-blue">叠加：{blendModeLabels[blendMode] || blendMode}</span>
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-end">
                              <div>
                                <h3 className="font-shufa text-lg text-deep-blue">{currentProduct?.name}</h3>
                                <p className="font-song text-palace-red text-base">¥{currentProduct?.price}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 bg-rice-paper/90 backdrop-blur-sm px-2 py-1 rounded-sm">
                        <p className="font-song text-xs text-deep-blue-light">
                          <span className="hidden sm:inline">PC：拖拽移动 / 滚轮缩放</span>
                          <span className="sm:hidden">双指缩放旋转</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </FrameDecorations>

              <div className="sm:hidden bg-rice-paper/50 px-3 py-2">
                <div className="flex justify-between text-[10px] font-song">
                  <span className="text-deep-blue-light">大小：{scale}%</span>
                  <span className="text-deep-blue-light">位置：X:{positionX} Y:{positionY}</span>
                  <span className="text-deep-blue-light">叠加：{blendModeLabels[blendMode] || blendMode}</span>
                </div>
              </div>

              <FrameDecorations className="bg-rice-paper-light p-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('pattern')}
                    className={`flex-1 py-2 px-4 rounded-sm font-shufa text-sm transition-all ${
                      activeTab === 'pattern'
                        ? 'bg-palace-red text-rice-paper shadow-md'
                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red'
                    }`}
                  >
                    图案设置
                  </button>
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`flex-1 py-2 px-4 rounded-sm font-shufa text-sm transition-all ${
                      activeTab === 'text'
                        ? 'bg-palace-red text-rice-paper shadow-md'
                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red'
                    }`}
                  >
                    文字设置
                  </button>
                </div>

                {activeTab === 'pattern' && (
                  <div className="space-y-3">
                    {/* ===== 区块一：纹样排版 ===== */}
                    <div className="border border-deep-blue-200 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setPanelExpanded(p => ({ ...p, layout: !p.layout }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-deep-blue/5 hover:bg-deep-blue/10 transition-colors"
                      >
                        <span className="font-shufa text-sm text-deep-blue flex items-center">
                          <span className="w-5 h-5 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-2 text-xs">排</span>
                          纹样排版
                        </span>
                        <span className="text-deep-blue text-xs">{panelExpanded.layout ? '收起 ▲' : '展开 ▼'}</span>
                      </button>
                      {panelExpanded.layout && (
                        <div className="p-4">
                          <div className="grid grid-cols-4 gap-2">
                            {(Object.keys(layoutPresets) as LayoutMode[]).map((mode) => {
                              const preset = layoutPresets[mode]
                              return (
                                <button
                                  key={mode}
                                  onClick={() => handleLayoutChange(mode)}
                                  className={`relative p-3 rounded-sm transition-all duration-300 ${
                                    layoutMode === mode
                                      ? 'bg-palace-red text-rice-paper shadow-md'
                                      : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                                  }`}
                                >
                                  <div className="text-xl mb-1">{preset.icon}</div>
                                  <div className="font-song text-xs">{preset.name}</div>
                                </button>
                              )
                            })}
                          </div>

                          {(() => {
                            const tm = product3DConfig?.meshConfig?.textureTargetMaterials
                            if (!tm) return null
                            const hasChest = !!tm.chest?.length
                            const hasCenter = !!tm.center?.length
                            if (!hasChest && !hasCenter) return null
                            const leftKey: PatternAreaKey = hasCenter ? 'center' : 'chest'
                            const leftLabel = hasCenter ? '正中区域' : '仅胸前'
                            const rightKey: PatternAreaKey = 'full'
                            const rightLabel = selectedProduct === 'tote' ? '全包' : '全身'
                            return (
                              <div className="mt-4 pt-4 border-t border-deep-blue-100">
                                <div className="font-song text-xs text-deep-blue-light mb-2">贴图范围</div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPatternArea(leftKey)}
                                    className={`flex-1 py-1.5 text-sm font-song rounded-sm transition-all duration-300 ${
                                      patternArea === leftKey
                                        ? 'bg-palace-red text-rice-paper shadow-sm'
                                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                                    }`}
                                  >
                                    {leftLabel}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPatternArea(rightKey)}
                                    className={`flex-1 py-1.5 text-sm font-song rounded-sm transition-all duration-300 ${
                                      patternArea === rightKey
                                        ? 'bg-palace-red text-rice-paper shadow-sm'
                                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                                    }`}
                                  >
                                    {rightLabel}
                                  </button>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                    {/* ===== 区块二：部件配色 ===== */}
                    {product3DConfig?.meshConfig?.colorMaterials?.length ? (
                      <div className="border border-deep-blue-200 rounded-sm overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2.5 bg-deep-blue/5">
                          <button
                            onClick={() => setPanelExpanded(p => ({ ...p, color: !p.color }))}
                            className="flex items-center flex-1"
                          >
                            <span className="font-shufa text-sm text-deep-blue flex items-center">
                              <span className="w-5 h-5 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-2 text-xs">色</span>
                              部件配色
                            </span>
                            <span className="text-deep-blue text-xs ml-2">{panelExpanded.color ? '收起 ▲' : '展开 ▼'}</span>
                          </button>
                          <div className="flex gap-1.5 ml-2">
                            <button
                              type="button"
                              onClick={handleApplyAllDominantColors}
                              className="px-2 py-1 text-xs font-song border border-deep-blue-200 text-deep-blue rounded-sm hover:border-palace-red hover:text-palace-red transition-colors"
                              title="所有部件用纹样主色"
                            >
                              全部用纹样色
                            </button>
                            <button
                              type="button"
                              onClick={handleClearColors}
                              className="px-2 py-1 text-xs font-song border border-deep-blue-200 text-deep-blue rounded-sm hover:border-palace-red hover:text-palace-red transition-colors"
                            >
                              清除全部颜色
                            </button>
                          </div>
                        </div>
                        {panelExpanded.color && (
                          <div className="p-4 space-y-3">
                            {product3DConfig.meshConfig.colorMaterials.map((cm) => {
                              const isEditing = activeColorPart === cm.name
                              const hasColor = !!productColors[cm.name]
                              return (
                                <div key={cm.name} className={`rounded-sm border transition-all ${isEditing ? 'border-palace-red bg-palace-red/5 shadow-sm' : 'border-deep-blue-200 hover:border-deep-blue'}`}>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActiveColorPart(isEditing ? null : cm.name)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveColorPart(isEditing ? null : cm.name) } }}
                                    className={`w-full flex items-center justify-between px-3 py-2 cursor-pointer ${isEditing ? 'bg-palace-red/5' : 'hover:bg-deep-blue-5'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {hasColor ? (
                                        <span
                                          className="inline-block w-5 h-5 rounded-sm border border-deep-blue-300 shadow-sm"
                                          style={{ backgroundColor: productColors[cm.name] }}
                                        />
                                      ) : (
                                        <span className="inline-block w-5 h-5 rounded-sm border-2 border-dashed border-deep-blue-300 bg-rice-paper" />
                                      )}
                                      <span className="font-song text-sm text-deep-blue">{cm.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-song bg-palace-red text-rice-paper rounded-sm">
                                          <span className="w-1.5 h-1.5 rounded-full bg-ming-yellow" />
                                          编辑中
                                        </span>
                                      ) : (
                                        <span className="text-xs text-deep-blue-light group-hover:text-deep-blue">点击编辑</span>
                                      )}
                                      {hasColor && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleClearPartColor(cm.name) }}
                                          className="ml-1 px-1.5 py-0.5 text-[10px] font-song border border-deep-blue-200 text-deep-blue-light rounded-sm hover:border-palace-red hover:text-palace-red transition-colors"
                                          title="仅清除此部件颜色"
                                        >
                                          清除
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {isEditing && (
                                    <div className="px-3 pb-3 space-y-3">
                                      <div className="flex flex-wrap gap-2">
                                        {COLOR_PALETTE.map(({ c, name }) => (
                                          <button
                                            key={c}
                                            onClick={() => {
                                              setProductColors((prev) => ({ ...prev, [cm.name]: c }))
                                            }}
                                            title={name}
                                            className={`w-7 h-7 rounded-full border-2 transition-all ${
                                              productColors[cm.name] === c
                                                ? 'border-palace-red scale-110 shadow-md'
                                                : 'border-deep-blue-200 hover:border-deep-blue'
                                            }`}
                                            style={{ backgroundColor: c }}
                                          />
                                        ))}
                                      </div>

                                      <div className="space-y-2 pt-2 border-t border-deep-blue-100">
                                        <InkSlider
                                          label={`色相 (0–360)`}
                                          value={hue}
                                          min={0}
                                          max={360}
                                          onChange={(v) => { setHue(v); setActiveColorPart(cm.name) }}
                                        />
                                        <InkSlider
                                          label={`明度 (0–100)`}
                                          value={lightness}
                                          min={5}
                                          max={95}
                                          onChange={(v) => { setLightness(v); setActiveColorPart(cm.name) }}
                                        />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={handleApplyDominantColor}
                                        className="w-full py-1.5 text-xs font-song bg-rice-paper border border-deep-blue-200 text-deep-blue rounded-sm hover:border-palace-red hover:text-palace-red transition-colors"
                                      >
                                        此部件用纹样主色
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}

                            {product3DConfig.meshConfig.colorTargetMaterials?.center?.length ? (
                              <div className="pt-3 border-t border-deep-blue-100">
                                <div className="font-song text-xs text-deep-blue-light mb-2">上色范围</div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setColorArea('center')}
                                    className={`flex-1 py-1.5 text-sm font-song rounded-sm transition-all duration-300 ${
                                      colorArea === 'center'
                                        ? 'bg-palace-red text-rice-paper shadow-sm'
                                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                                    }`}
                                  >
                                    正中区域
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setColorArea('full')}
                                    className={`flex-1 py-1.5 text-sm font-song rounded-sm transition-all duration-300 ${
                                      colorArea === 'full'
                                        ? 'bg-palace-red text-rice-paper shadow-sm'
                                        : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                                    }`}
                                  >
                                    全包
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* ===== 区块三：定制调节 ===== */}
                    <div className="border border-deep-blue-200 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setPanelExpanded(p => ({ ...p, adjust: !p.adjust }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-deep-blue/5 hover:bg-deep-blue/10 transition-colors"
                      >
                        <span className="font-shufa text-sm text-deep-blue flex items-center">
                          <span className="w-5 h-5 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-2 text-xs">定</span>
                          定制调节
                        </span>
                        <span className="text-deep-blue text-xs">{panelExpanded.adjust ? '收起 ▲' : '展开 ▼'}</span>
                      </button>
                      {panelExpanded.adjust && (
                        <div className="p-4 space-y-4">
                          <InkSlider
                            label="纹样大小"
                            value={scale}
                            min={10}
                            max={200}
                            onChange={setScale}
                            className="w-full"
                          />

                          {layoutMode !== 'tile' && (
                            <InkSlider
                              label="左右偏移"
                              value={positionX}
                              min={0}
                              max={100}
                              onChange={setPositionX}
                              className="w-full"
                            />
                          )}

                          {layoutMode !== 'tile' && (
                            <InkSlider
                              label="上下偏移"
                              value={positionY}
                              min={0}
                              max={100}
                              onChange={setPositionY}
                              className="w-full"
                            />
                          )}

                          <InkSlider
                            label="旋转角度"
                            value={rotation}
                            min={-180}
                            max={180}
                            onChange={setRotation}
                            className="w-full"
                          />

                          <div className="pt-3 border-t border-deep-blue-100">
                            <label className="block font-song text-deep-blue text-sm mb-2">叠加效果</label>
                            <BambooToggle
                              options={[
                                { value: 'normal', label: '正常' },
                                { value: 'overlay', label: '叠加' },
                                { value: 'multiply', label: '正片叠底' },
                                { value: 'screen', label: '滤色' },
                              ]}
                              value={blendMode}
                              onChange={setBlendMode}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-song text-deep-blue text-xs mb-2">文字内容</label>
                      <input
                        type="text"
                        placeholder="输入文字（20字以内）"
                        value={textOverlay}
                        onChange={(e) => setTextOverlay(e.target.value.slice(0, 20))}
                        className="w-full px-3 py-2 border border-deep-blue-200 rounded-sm bg-rice-paper font-song text-deep-blue focus:outline-none focus:border-palace-red"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-song text-deep-blue text-xs mb-2">字体选择</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'shufa', label: '书法体', fontFamily: 'Ma Shan Zheng, cursive' },
                          { value: 'song', label: '宋体', fontFamily: 'Noto Serif SC, serif' },
                          { value: 'hei', label: '黑体', fontFamily: 'Noto Sans SC, sans-serif' },
                          { value: 'kai', label: '楷体', fontFamily: 'KaiTi, STKaiti, serif' },
                        ].map(font => (
                          <button
                            key={font.value}
                            onClick={() => setTextFont(font.value as any)}
                            className={`flex-1 px-3 py-1.5 text-xs rounded-sm border transition-all ${
                              textFont === font.value
                                ? 'bg-palace-red text-ming-yellow border-palace-red'
                                : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-palace-red'
                            }`}
                            style={{ fontFamily: font.fontFamily }}
                          >
                            {font.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block font-song text-deep-blue text-xs mb-2">文字大小</label>
                      <InkSlider
                        label=""
                        value={textSize}
                        min={8}
                        max={120}
                        onChange={setTextSize}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block font-song text-deep-blue text-xs mb-2">旋转角度</label>
                      <InkSlider
                        label=""
                        value={textRotation}
                        min={-180}
                        max={180}
                        onChange={setTextRotation}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="bg-deep-blue-50 p-3 rounded-sm">
                      <p className="font-song text-xs text-deep-blue-light text-center">
                        <span className="hidden sm:inline">💡 点击文字可选中，拖动调整位置，滚轮调整大小</span>
                        <span className="sm:hidden">💡 点击文字可选中，双指缩放旋转</span>
                      </p>
                    </div>
                  </div>
                )}
              </FrameDecorations>
            </div>


          </motion.div>
        </div>

        {showOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <FrameDecorations className="bg-rice-paper-light p-6">
                <h2 className="font-shufa text-xl text-deep-blue mb-4">确认订单</h2>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">收货人</label>
                    <input
                      type="text"
                      value={orderFormData.name}
                      onChange={(e) => setOrderFormData({ ...orderFormData, name: e.target.value })}
                      placeholder="请输入姓名"
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    />
                  </div>
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">联系电话</label>
                    <input
                      type="tel"
                      value={orderFormData.phone}
                      onChange={(e) => setOrderFormData({ ...orderFormData, phone: e.target.value })}
                      placeholder="请输入手机号"
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    />
                  </div>
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">收货地址</label>
                    <textarea
                      value={orderFormData.address}
                      onChange={(e) => setOrderFormData({ ...orderFormData, address: e.target.value })}
                      placeholder="请输入地址"
                      rows={2}
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-deep-blue-100 pt-4 mb-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-16 h-16 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0 relative">
                      {orderPreviewLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-deep-blue-200 border-t-palace-red rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <img
                          src={orderPreviewImg || selectedPatternImage || currentProduct?.image}
                          alt={currentProduct?.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-shufa text-deep-blue">{currentProduct?.name}</h3>
                      <p className="font-song text-sm text-deep-blue-light">
                        数量：{quantity} 件
                      </p>
                    </div>
                    <span className="font-song text-palace-red text-xl">¥{(parseFloat(currentProduct?.price || '0') * quantity).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-song text-deep-blue">订单合计</span>
                    <span className="font-song text-palace-red text-xl">¥{(parseFloat(currentProduct?.price || '0') * quantity).toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowOrderModal(false)}>
                    取消
                  </Button>
                  <Button className="flex-1" onClick={handleConfirmOrder} disabled={isBuying}>
                    {isBuying ? '处理中...' : '确认提交'}
                  </Button>
                </div>

                <p className="font-song text-xs text-deep-blue-light text-center mt-4">
                  演示模式，无需实际支付
                </p>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}

        {showQuantityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuantityModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-sm w-full"
            >
              <FrameDecorations className="bg-rice-paper-light p-6">
                <h2 className="font-shufa text-xl text-deep-blue mb-6 text-center">选择购买数量</h2>
                
                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue text-xl hover:bg-deep-blue-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-shufa text-2xl text-deep-blue">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(99, quantity + 1))}
                    className="w-12 h-12 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue text-xl hover:bg-deep-blue-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowQuantityModal(false)}>
                    取消
                  </Button>
                  <Button className="flex-1" onClick={handleConfirmQuantity}>
                    确认
                  </Button>
                </div>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence>
          {showPatternModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setShowPatternModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-lg w-full max-h-[80vh] overflow-hidden"
              >
                <FrameDecorations className="bg-rice-paper-light p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-shufa text-xl text-deep-blue">选择纹样</h2>
                    <button
                      onClick={() => setShowPatternModal(false)}
                      className="w-10 h-10 flex items-center justify-center text-deep-blue-light hover:text-deep-blue hover:bg-deep-blue-100 rounded-full transition-colors z-10 relative"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setPatternTab('work')}
                      className={`flex-1 py-2 px-4 rounded-sm font-song transition-all duration-300 ${
                        patternTab === 'work'
                          ? 'bg-palace-red text-rice-paper shadow-md'
                          : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-deep-blue-light'
                      }`}
                    >
                      我的作品
                    </button>
                    <button
                      onClick={() => setPatternTab('favorite')}
                      className={`flex-1 py-2 px-4 rounded-sm font-song transition-all duration-300 ${
                        patternTab === 'favorite'
                          ? 'bg-palace-red text-rice-paper shadow-md'
                          : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-deep-blue-light'
                      }`}
                    >
                      我的收藏
                    </button>
                  </div>

                  {patternModalLoading && userPatterns.filter(p => p.type === patternTab).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-8 h-8 border-4 border-deep-blue-200 border-t-palace-red rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="font-song text-deep-blue-light">加载中...</p>
                    </div>
                  ) : fetchError ? (
                    <div className="text-center py-16">
                      <p className="font-song text-deep-blue-light mb-4">加载失败</p>
                      <button
                        type="button"
                        onClick={handleRetryPatterns}
                        className="px-4 py-1.5 text-sm font-song bg-palace-red text-rice-paper rounded-sm hover:bg-palace-red-dark transition-colors"
                      >
                        点击重试
                      </button>
                    </div>
                  ) : (
                    userPatterns.filter(p => p.type === patternTab).length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="font-song text-deep-blue-light">
                          {patternTab === 'work' ? '暂无纹样作品' : '暂无收藏纹样'}
                        </p>
                        <p className="font-song text-deep-blue-light text-sm mt-2">
                          {patternTab === 'work' ? '去创作页面生成纹样后再来定制' : '在作品集里点击收藏，方便查找'}
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const filtered = userPatterns.filter(p => p.type === patternTab)
                        const shown = filtered.slice(0, patternRenderLimit)
                        const hasMore = patternRenderLimit < filtered.length
                        return (
                          <div
                            className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto"
                            onScroll={(e) => {
                              const t = e.currentTarget
                              if (t.scrollTop + t.clientHeight > t.scrollHeight - 120 && hasMore) {
                                setPatternRenderLimit((n) => Math.min(n + 12, filtered.length))
                              }
                            }}
                          >
                            {shown.map((pattern, index) => {
                              const imgState = patternImageStates[pattern.id] || 'loading'
                              const rawUrl = pattern.image_url
                              const resolvedUrl = resolveImageUrl(rawUrl)
                              const isHugeBase64 = rawUrl.startsWith('data:') && rawUrl.length > 300_000
                              return (
                                <motion.div
                                  key={pattern.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: Math.min(index, 8) * 0.05 }}
                                  onClick={() => handleSelectPattern(pattern)}
                                  className="cursor-pointer group"
                                >
                                  <div className="aspect-square bg-deep-blue-50 rounded-sm overflow-hidden border-2 border-transparent group-hover:border-palace-red transition-colors relative">
                                    {imgState === 'error' ? (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-deep-blue-50 p-2">
                                        <svg className="w-6 h-6 text-deep-blue-light mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-[10px] font-song text-deep-blue-light text-center">加载失败</span>
                                      </div>
                                    ) : (
                                      <>
                                        {imgState === 'loading' && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-deep-blue-50 z-10">
                                            <div className="w-5 h-5 border-2 border-deep-blue-200 border-t-palace-red rounded-full animate-spin"></div>
                                          </div>
                                        )}
                                        <img
                                          src={resolvedUrl}
                                          alt={pattern.title}
                                          loading="lazy"
                                          decoding="async"
                                          className={`w-full h-full object-cover transition-opacity duration-200 ${imgState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                                          onLoad={() => {
                                            setPatternImageStates((prev) => ({ ...prev, [pattern.id]: 'loaded' }))
                                          }}
                                          onError={() => {
                                            setPatternImageStates((prev) => ({ ...prev, [pattern.id]: 'error' }))
                                          }}
                                        />
                                        {isHugeBase64 && imgState === 'loaded' && (
                                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-1 py-0.5">
                                            <span className="text-[9px] text-white/90 font-song">原图</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <p className="font-shufa text-xs text-deep-blue truncate" title={pattern.title}>
                                      {pattern.title}
                                    </p>
                                  </div>
                                </motion.div>
                              )
                            })}
                            {hasMore && (
                              <button
                                type="button"
                                onClick={() => setPatternRenderLimit((n) => Math.min(n + 12, filtered.length))}
                                className="col-span-full py-2 text-xs font-song text-deep-blue-light hover:text-palace-red"
                              >
                                加载更多（剩余 {filtered.length - patternRenderLimit}）
                              </button>
                            )}
                          </div>
                        )
                      })()
                    )
                  )}
                </FrameDecorations>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-deep-blue text-rice-paper px-6 py-3 rounded-sm font-song shadow-lg">
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}