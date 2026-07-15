import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button, StampButton } from '../components/ui/Button'
import { ProductCard } from '../components/ui/Card'
import { InkSlider } from '../components/ui/InkSlider'
import { BambooToggle } from '../components/ui/Select'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabase'

interface UserPattern {
  id: string
  image_url: string
  title: string
  type: 'work' | 'favorite'
}

const products = [
  { id: 'bookmark', name: '书签', price: '19', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wooden%20bookmark%20blank%20minimal%20elegant%20product%20photography&image_size=portrait_4_3', category: '文创' },
  { id: 'phonecase', name: '手机壳', price: '49', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=smartphone%20case%20blank%20white%20minimal%20product%20photography&image_size=portrait_4_3', category: '文创' },
  { id: 'notebook', name: '笔记本', price: '39', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=notebook%20blank%20elegant%20minimal%20product%20photography&image_size=portrait_4_3', category: '文创' },
  { id: 'postcard', name: '明信片', price: '12', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=postcard%20blank%20white%20minimal%20product%20photography&image_size=landscape_4_3', category: '文创' },
  { id: 'tote', name: '手提袋', price: '59', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=canvas%20tote%20bag%20blank%20white%20minimal%20product%20photography&image_size=square', category: '文创' },
  { id: 'scarf', name: '围巾', price: '299', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20wool%20scarf%20elegant%20minimal%20product%20photography&image_size=square', category: '服饰' },
  { id: 'silkscarf', name: '丝巾', price: '199', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silk%20scarf%20blank%20white%20elegant%20product%20photography&image_size=square', category: '服饰' },
  { id: 'square_scarf', name: '方巾', price: '149', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silk%20square%20scarf%20blank%20white%20elegant%20product%20photography&image_size=square', category: '服饰' },
  { id: 'tshirt', name: 'T恤', price: '89', image: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=blank%20white%20cotton%20t-shirt%20minimal%20product%20photography&image_size=portrait_4_3', category: '服饰' },
]

const materials = [
  { id: 'wood', name: '木质' },
  { id: 'plastic', name: '塑料' },
  { id: 'silicone', name: '硅胶' },
  { id: 'silk', name: '丝绸' },
  { id: 'paper', name: '纸张' },
  { id: 'leather', name: '皮革' },
  { id: 'canvas', name: '帆布' },
  { id: 'cotton', name: '纯棉' },
  { id: 'wool', name: '羊毛' },
  { id: 'polyester', name: '涤纶' },
]

const productMaterials: Record<string, string[]> = {
  bookmark: ['wood', 'paper'],
  phonecase: ['plastic', 'silicone'],
  notebook: ['paper', 'leather'],
  postcard: ['paper'],
  tote: ['paper', 'canvas'],
  scarf: ['silk', 'wool'],
  silkscarf: ['silk'],
  square_scarf: ['silk'],
  tshirt: ['cotton', 'polyester'],
}

const views = ['front', 'back', 'side']

const getInitialProduct = () => {
  const savedProduct = localStorage.getItem('selected_product_id')
  if (savedProduct && products.find(p => p.id === savedProduct)) {
    return savedProduct
  }
  return products[0]?.id || ''
}

const getInitialMaterial = (productId: string) => {
  const draftKey = `product_config_draft_${productId}`
  const savedDraft = localStorage.getItem(draftKey)
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
    const savedDraft = localStorage.getItem(draftKey)
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

  const getInitialCategory = () => {
    const savedCategory = localStorage.getItem('selected_product_category')
    if (savedCategory && ['文创', '服饰'].includes(savedCategory)) {
      return savedCategory
    }
    return '文创'
  }

  const [selectedProduct, setSelectedProduct] = useState(getInitialProduct())
  const [selectedMaterial, setSelectedMaterial] = useState(() => getInitialMaterial(getInitialProduct()))
  const [scale, setScale] = useState(getInitialParams(getInitialProduct()).scale)
  const [rotation, setRotation] = useState(getInitialParams(getInitialProduct()).rotation)
  const [positionX, setPositionX] = useState(getInitialParams(getInitialProduct()).positionX)
  const [positionY, setPositionY] = useState(getInitialParams(getInitialProduct()).positionY)
  const [currentView, setCurrentView] = useState('front')
  const [blendMode, setBlendMode] = useState(getInitialParams(getInitialProduct()).blendMode)
  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory())

  const handleProductChange = (productId: string) => {
    localStorage.setItem('selected_product_id', productId)
    
    const draftKey = `product_config_draft_${productId}`
    const savedDraft = localStorage.getItem(draftKey)
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setSelectedProduct(productId)
        setSelectedMaterial(draft.materialId || (productMaterials[productId]?.[0] || ''))
        setScale(Math.round(draft.params?.scale || 100))
        setRotation(Math.round(draft.params?.rotation || 0))
        setPositionX(Math.round(draft.params?.positionX || 50))
        setPositionY(Math.round(draft.params?.positionY || 50))
        setBlendMode(draft.params?.blendMode || 'normal')
        return
      } catch {
        // 解析失败，使用默认值
      }
    }
    
    setSelectedProduct(productId)
    const availableMaterials = productMaterials[productId] || []
    setSelectedMaterial(availableMaterials[0] || '')
    setScale(100)
    setRotation(0)
    setPositionX(50)
    setPositionY(50)
    setBlendMode('normal')
  }
  
  const [currentPage, setCurrentPage] = useState(0)
  const [isBuying, setIsBuying] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [orderFormData, setOrderFormData] = useState({
    name: '',
    address: '',
  })
  const [showPatternModal, setShowPatternModal] = useState(false)
  const [userPatterns, setUserPatterns] = useState<UserPattern[]>([])
  const [selectedPatternImage, setSelectedPatternImage] = useState<string>(() => {
    const lastPattern = localStorage.getItem('last_generated_pattern')
    return lastPattern || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20calico%20pattern%20minimal%20elegant&image_size=square'
  })
  const [patternModalLoading, setPatternModalLoading] = useState(false)
  const dragRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reorderProduct = localStorage.getItem('reorder_product')
    
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
        localStorage.removeItem('reorder_product')
        return
      } catch {
        // 解析失败，继续尝试读取草稿
      }
    }

    const draftKey = `product_config_draft_${selectedProduct}`
    const savedDraft = localStorage.getItem(draftKey)
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft)
        setSelectedMaterial(draft.materialId || (productMaterials[selectedProduct]?.[0] || ''))
        setScale(draft.params?.scale || 100)
        setRotation(draft.params?.rotation || 0)
        setPositionX(draft.params?.positionX || 50)
        setPositionY(draft.params?.positionY || 50)
        setBlendMode(draft.params?.blendMode || 'normal')
      } catch {
        // 解析失败，使用默认值
      }
    }
  }, [])

  useEffect(() => {
    const draftKey = `product_config_draft_${selectedProduct}`
    const draft = {
      productId: selectedProduct,
      materialId: selectedMaterial,
      params: { scale, rotation, positionX, positionY, blendMode },
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [selectedProduct, selectedMaterial, scale, rotation, positionX, positionY, blendMode])

  const handleReset = () => {
    setScale(100)
    setRotation(0)
    setPositionX(50)
    setPositionY(50)
    setBlendMode('normal')
  }

  const fetchUserPatterns = async () => {
    setPatternModalLoading(true)
    try {
      const { data: { session } } = await supabase.auth?.getSession()
      
      if (!session?.user) {
        navigate('/login')
        return
      }

      const patterns: UserPattern[] = []

      const { data: myWorks } = await supabase
        .from('generations')
        .select('id, image_url, params')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (myWorks) {
        myWorks.forEach((work: any) => {
          patterns.push({
            id: work.id,
            image_url: work.image_url,
            title: work.params?.title || `我的作品 #${work.id.slice(0, 8)}`,
            type: 'work',
          })
        })
      }

      const { data: favoriteRecords } = await supabase
        .from('favorites')
        .select('generation_id')
        .eq('user_id', session.user.id)

      if (favoriteRecords && favoriteRecords.length > 0) {
        const generationIds = favoriteRecords.map(f => f.generation_id)
        const { data: favorites } = await supabase
          .from('generations')
          .select('id, image_url, params')
          .in('id', generationIds)

        if (favorites) {
          favorites.forEach((fav: any) => {
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
    } catch (err) {
      console.error('Fetch patterns error:', err)
    } finally {
      setPatternModalLoading(false)
    }
  }

  const handleSelectPattern = (pattern: UserPattern) => {
    setSelectedPatternImage(pattern.image_url)
    setShowPatternModal(false)
  }

  const handleOpenPatternModal = () => {
    fetchUserPatterns()
    setShowPatternModal(true)
  }

  const saveDraft = () => {
    const draftKey = `product_config_draft_${selectedProduct}`
    const draft = {
      productId: selectedProduct,
      materialId: selectedMaterial,
      params: { scale, rotation, positionX, positionY, blendMode },
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }

  const handleSaveConfig = () => {
    saveDraft()
    alert('配置已保存')
  }

  const handleAddToCart = () => {
    addToCart({
      productId: selectedProduct,
      generationId: 'demo-id',
      customization: { scale, rotation, positionX, positionY, blendMode, material: selectedMaterial },
      quantity: quantity
    })
    alert('已加入购物车')
  }

  const handleBuyNow = async () => {
    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再购买')
      navigate('/login')
      return
    }

    setShowOrderModal(true)
  }

  const handleConfirmOrder = async () => {
    if (!orderFormData.name.trim()) {
      alert('请填写收货人姓名')
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

    setIsBuying(true)

    try {
      const order = {
        id: `demo_${Date.now()}`,
        user_id: session.user.id,
        product_id: selectedProduct,
        generation_id: null,
        customization: { scale, rotation, positionX, positionY, blendMode, material: selectedMaterial },
        status: 'demo',
        created_at: new Date().toISOString(),
        shipping_info: { name: orderFormData.name, address: orderFormData.address }
      }

      const existingOrders = JSON.parse(localStorage.getItem('demo_orders') || '[]')
      existingOrders.unshift(order)
      localStorage.setItem('demo_orders', JSON.stringify(existingOrders))

      setShowOrderModal(false)
      setOrderFormData({ name: '', address: '' })
      navigate('/orders')
    } catch (err) {
      console.error('Order error:', err)
      alert('提交失败，请重试')
    } finally {
      setIsBuying(false)
    }
  }
  
  const productsPerPage = 4
  const filteredProducts = products.filter(p => p.category === selectedCategory)
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const currentPageProducts = filteredProducts.slice(
    currentPage * productsPerPage,
    (currentPage + 1) * productsPerPage
  )

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
    e.preventDefault()
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
    if (!dragRef.current) return
    
    const dx = e.clientX - dragStartX.current
    const dy = e.clientY - dragStartY.current
    
    const rect = dragRef.current.getBoundingClientRect()
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
      if (!dragRef.current) return
      
      const dx = e.touches[0].clientX - dragStartX.current
      const dy = e.touches[0].clientY - dragStartY.current
      
      const rect = dragRef.current.getBoundingClientRect()
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
      
      setScale(Math.round(Math.max(50, Math.min(200, initialScale.current * scaleFactor))))
      setRotation(Math.round(initialRotation.current + angleDiff))
    }
  }

  useEffect(() => {
    const el = dragRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -2 : 2
      setScale((prev: number) => Math.max(50, Math.min(200, prev + delta)))
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    saveDraft()
  }, [selectedProduct, selectedMaterial, scale, rotation, positionX, positionY, blendMode])

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
            <FrameDecorations className="bg-rice-paper-light p-6">
              <h2 className="font-shufa text-xl text-deep-blue mb-4 flex items-center">
                <span className="w-8 h-8 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-3 text-sm">品</span>
                选择产品
              </h2>
              
              <div className="flex gap-2 mb-4">
                {['文创', '服饰'].map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      localStorage.setItem('selected_product_category', category)
                      setSelectedCategory(category)
                      setCurrentPage(0)
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
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="w-8 h-8 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-shufa text-deep-blue hover:bg-deep-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {currentPageProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ProductCard
                        {...product}
                        className={selectedProduct === product.id ? 'ring-2 ring-palace-red' : ''}
                        onClick={() => handleProductChange(product.id)}
                      />
                    </motion.div>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="w-8 h-8 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-shufa text-deep-blue hover:bg-deep-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
              
              <div className="flex justify-center mt-3">
                <span className="font-song text-xs text-deep-blue-light">
                  第 {currentPage + 1} / {totalPages} 页
                </span>
              </div>
            </FrameDecorations>

            <FrameDecorations className="bg-rice-paper-light p-6 mt-6">
              <h2 className="font-shufa text-xl text-deep-blue mb-4 flex items-center">
                <span className="w-8 h-8 bg-deep-blue rounded-sm flex items-center justify-center text-rice-paper mr-3 text-sm">材</span>
                材质选择
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {materials
                  .filter((material) => productMaterials[selectedProduct]?.includes(material.id))
                  .map((material) => (
                    <button
                      key={material.id}
                      onClick={() => setSelectedMaterial(material.id)}
                      className={`py-3 px-4 rounded-sm font-song transition-all duration-300 ${
                        selectedMaterial === material.id
                          ? 'bg-deep-blue text-rice-paper'
                          : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-deep-blue-light'
                      }`}
                    >
                      {material.name}
                    </button>
                  ))}
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
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute -inset-3 border-3 border-deep-blue rounded-sm opacity-10" />
                  
                  <div
                    className="relative aspect-[3/4] bg-gradient-to-b from-rice-paper-dark to-rice-paper rounded-sm overflow-hidden"
                    style={{ touchAction: 'none' }}
                  >
                    <div className="absolute inset-0 bg-ink-wash opacity-10" />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={currentProduct?.image}
                        alt={currentProduct?.name}
                        className="w-48 h-auto object-contain"
                      />
                    </div>
                    
                    <motion.div
                      ref={dragRef}
                      className="absolute inset-0 flex items-center justify-center cursor-grab select-none active:cursor-grabbing"
                      animate={{
                        scale: scale / 100,
                        rotate: rotation,
                        x: (positionX - 50) * 2,
                        y: (positionY - 50) * 2,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={{
                        transformOrigin: 'center center',
                        mixBlendMode: blendMode as any,
                        touchAction: 'none',
                      }}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                    >
                      <img
                        src={selectedPatternImage}
                        alt="纹样"
                        draggable={false}
                        className="w-40 h-40 object-cover"
                        style={{ 
                          opacity: 0.7,
                          userSelect: 'none',
                          pointerEvents: 'none'
                        } as React.CSSProperties}
                      />
                    </motion.div>
                    
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                      <div>
                        <h3 className="font-shufa text-lg text-deep-blue">{currentProduct?.name}</h3>
                        <p className="font-song text-palace-red text-base">¥{currentProduct?.price}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-song text-xs text-deep-blue-light">材质：{materials.find(m => m.id === selectedMaterial)?.name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 bg-rice-paper/90 backdrop-blur-sm px-2 py-1 rounded-sm">
                    <p className="font-song text-xs text-deep-blue-light">
                      <span className="hidden sm:inline">PC：拖拽移动 / 滚轮缩放</span>
                      <span className="sm:hidden">双指缩放旋转</span>
                    </p>
                  </div>
                </div>
              </FrameDecorations>

              <FrameDecorations className="bg-rice-paper-light p-4">
                <div className="mb-4">
                  <h2 className="font-shufa text-lg text-deep-blue flex items-center">
                    <span className="w-6 h-6 bg-palace-red rounded-sm flex items-center justify-center text-ming-yellow mr-2 text-sm">定</span>
                    定制调节
                  </h2>
                </div>
                
                <div className="space-y-4">
                  <InkSlider
                    label="纹样大小"
                    value={scale}
                    min={50}
                    max={200}
                    onChange={setScale}
                    className="w-full"
                  />
                  
                  <InkSlider
                    label="左右偏移"
                    value={positionX}
                    min={0}
                    max={100}
                    onChange={setPositionX}
                    className="w-full"
                  />
                  
                  <InkSlider
                    label="上下偏移"
                    value={positionY}
                    min={0}
                    max={100}
                    onChange={setPositionY}
                    className="w-full"
                  />
                  
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
              </FrameDecorations>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4 mt-6">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>重置</Button>
                <Button variant="outline" onClick={handleSaveConfig}>保存配置</Button>
                <Button variant="primary" onClick={handleOpenPatternModal}>选择纹样</Button>
              </div>
              
              <div className="flex gap-2 items-center">
                <div className="flex items-center border border-deep-blue-200 rounded-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-rice-paper font-song text-deep-blue hover:bg-deep-blue-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-song text-deep-blue">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(99, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-rice-paper font-song text-deep-blue hover:bg-deep-blue-100 transition-colors"
                  >
                    +
                  </button>
                </div>
                <Button variant="secondary" onClick={handleAddToCart}>加入购物车</Button>
                <StampButton onClick={handleBuyNow} disabled={isBuying}>
                  {isBuying ? '处理中...' : '立即购买'}
                </StampButton>
              </div>
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
                    <div className="w-16 h-16 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                      <img
                        src={currentProduct?.image}
                        alt={currentProduct?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-shufa text-deep-blue">{currentProduct?.name}</h3>
                      <p className="font-song text-sm text-deep-blue-light">
                        材质：{materials.find(m => m.id === selectedMaterial)?.name}
                      </p>
                    </div>
                    <span className="font-zhuanke text-palace-red text-xl">¥{currentProduct?.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-song text-deep-blue">订单合计</span>
                    <span className="font-zhuanke text-palace-red text-xl">¥{currentProduct?.price}</span>
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

                  {patternModalLoading ? (
                    <div className="text-center py-16">
                      <div className="w-8 h-8 border-4 border-deep-blue-200 border-t-palace-red rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="font-song text-deep-blue-light">加载中...</p>
                    </div>
                  ) : userPatterns.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="font-song text-deep-blue-light">暂无纹样作品</p>
                      <p className="font-song text-deep-blue-light text-sm mt-2">去创作页面生成纹样后再来定制</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto">
                      {userPatterns.map((pattern, index) => (
                        <motion.div
                          key={pattern.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSelectPattern(pattern)}
                          className="cursor-pointer group"
                        >
                          <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden border-2 border-transparent group-hover:border-palace-red transition-colors">
                            <img
                              src={pattern.image_url}
                              alt={pattern.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="mt-2">
                            <p className="font-shufa text-xs text-deep-blue truncate" title={pattern.title}>
                              {pattern.title}
                            </p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-sm ${
                              pattern.type === 'work' 
                                ? 'bg-deep-blue-100 text-deep-blue' 
                                : 'bg-palace-red-100 text-palace-red'
                            }`}>
                              {pattern.type === 'work' ? '我的作品' : '我的收藏'}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </FrameDecorations>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}