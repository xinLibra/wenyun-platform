import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { useCart } from '../hooks/useCart'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../lib/async'
import { products } from '../lib/products'
import { ensurePublicImageUrl } from '../lib/storage'
import { generateProductPreviewDataUrl } from '../utils/exportImage'
import PatternPreview from '../components/PatternPreview'
import { formatSpecDiffs } from '../lib/cartSpec'

/** 兜底占位图（与 useCart 保持一致） */
const FALLBACK_IMAGE = '/placeholder-pattern-a.png'

/** 时间显示：本地化为 月-日 时:分 */
function fmtShort(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 缩略图独立加载：失败时显示占位图，绝不阻塞整页渲染 */
function SafeImg({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const effectiveSrc = failed || !src ? FALLBACK_IMAGE : src
  return (
    <img
      src={effectiveSrc}
      alt={alt || '商品图片'}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}

export default function Cart() {
  const navigate = useNavigate()
  const { items, removeFromCart, updateQuantity, clearCart, hydrated, error, retry, notice, dismissNotice } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(item => item.id)))
    }
  }

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const selectedItemsList = items.filter(item => selectedItems.has(item.id))
  const totalPrice = selectedItemsList.reduce((sum, item) => {
    const product = products[item.productId]
    return sum + (parseFloat(item.price ?? product?.price ?? '0') * item.quantity)
  }, 0)

  const handleCheckout = async () => {
    if (selectedItems.size === 0) {
      alert('请先选择要结算的商品')
      return
    }

    // 安全获取登录状态：未配置 / 超时 / 异常都给出明确提示，不空转
    let session: { user: { id: string } | null } | null = null
    try {
      if (!supabase.auth) throw new Error('登录服务未配置')
      const res = await withTimeout(supabase.auth.getSession(), 8000, '获取登录状态')
      session = res?.data?.session ?? null
    } catch (e: any) {
      console.error('[Cart] getSession failed:', e)
      alert(`获取登录状态失败：${e?.message || '网络错误'}，请重试`)
      return
    }
    if (!session?.user) {
      alert('请先登录后再结算')
      navigate('/login')
      return
    }

    if (!formData.name.trim()) {
      alert('请填写收货人姓名')
      return
    }

    if (!formData.phone.trim()) {
      alert('请填写联系电话')
      return
    }

    if (!formData.address.trim()) {
      alert('请填写收货地址')
      return
    }

    setIsCheckingOut(true)

    try {
      const newOrders = []
      for (const item of selectedItemsList) {
        const product = products[item.productId]
        // 旧购物车项可能带 data: base64 预览/纹样图：统一转 Storage 短链，订单只存短 URL 不存大 base64
        const customization = { ...(item.customization || {}) }
        const cartAddedAt = customization.addedAt || item.addedAt || item.updatedAt || new Date().toISOString()
        customization.addedAt = cartAddedAt
        customization.updatedAt = customization.updatedAt || item.updatedAt || cartAddedAt
        // 统一产出「定制预览短链」：复用已有预览（加购时生成的 3D 截图/合成图），
        // 旧购物车项无预览则现场生成产品轮廓+纹样合成图。image_url 只写这个预览短链，
        // 绝不写纹样原图（禁止纯纹样 tile 当订单主图）。
        let previewShort: string | undefined
        const previewRaw = customization.previewImageUrl || customization.previewImage
        if (previewRaw && /^data:/i.test(previewRaw)) {
          try {
            previewShort = (await ensurePublicImageUrl(session.user.id, previewRaw, 384)) || undefined
          } catch (e) {
            console.warn('[Cart] preview upload failed, skip preview:', e)
          }
        } else if (previewRaw && /^https?:\/\//i.test(previewRaw)) {
          previewShort = previewRaw
        } else {
          // 旧购物车项无 preview：下单时现场生成「产品轮廓 + 纹样」合成图（书签/手提袋/手机壳等），
          // 保证订单与购物车一致（袋子上有纹样、书签上有纹样），绝不写纯纹样或产品默认图
          try {
            const generated = await generateProductPreviewDataUrl({
              productId: item.productId,
              patternImage: customization.patternImage,
              layoutMode: customization.layoutMode,
              scale: customization.scale || 100,
              rotation: customization.rotation || 0,
              positionX: customization.positionX || 50,
              positionY: customization.positionY || 50,
              patternOpacity: customization.patternOpacity ?? 100,
              colors: customization.colors || customization.colorMap,
            }, 384)
            if (generated) {
              console.log('[OrderPreview] source= composite')
              previewShort = (await ensurePublicImageUrl(session.user.id, generated, 384)) || undefined
            }
          } catch (e) {
            console.warn('[Cart] preview regenerate failed:', e)
          }
        }
        customization.previewImage = previewShort
        customization.previewImageUrl = previewShort
        let pattern = customization.patternImage
        if (pattern && /^data:/i.test(pattern)) {
          try {
            pattern = (await ensurePublicImageUrl(session.user.id, pattern, 512)) || pattern
          } catch (e) {
            console.warn('[Cart] pattern upload failed, keep original:', e)
          }
          customization.patternImage = pattern
        }
        console.log(
          `[OrderInsert] image_url=${previewShort ? previewShort.slice(0, 60) + (previewShort.length > 60 ? '…' : '') : '(none)'} ` +
          `| 含产品合成=${previewShort ? 'yes' : 'no'}`
        )
        const order = {
          id: crypto.randomUUID(),
          user_id: session.user.id,
          product_id: item.productId,
          generation_id: item.generationId,
          // image_url = 定制效果预览短链（产品轮廓+纹样合成图），纹样原图只放 customization.patternImage
          image_url: previewShort || undefined,
          product_image: product?.image || item.image,
          customization,
          quantity: item.quantity,
          status: 'demo',
          created_at: new Date().toISOString(),
          shipping_info: { name: formData.name, phone: formData.phone, address: formData.address }
        }
        newOrders.push(order)
      }

      await supabase.from('orders').insert(newOrders).select()
      
      if (session.user) {
        const deleteResult = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', session.user.id)
          .in('id', [...selectedItems])
        if (deleteResult.error) {
          console.error('[Cart] checkout delete failed:', deleteResult.error)
        }
      }
      
      for (const itemId of selectedItems) {
        removeFromCart(itemId)
      }
      setSelectedItems(new Set())
      setShowCheckout(false)
      setFormData({ name: '', phone: '', address: '' })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      navigate('/orders')
    } catch (err) {
      console.error('Checkout error:', err)
      alert('结算失败，请重试')
    } finally {
      setIsCheckingOut(false)
    }
  }

  // 首次读取完成前显示加载态，避免"先闪空态再出商品"
  if (!hydrated) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              购物车
            </motion.h1>
            <BranchDivider />
          </div>

          <FrameDecorations className="bg-rice-paper-light p-12">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 border-4 border-deep-blue-100 border-t-palace-red rounded-full animate-spin mb-6" />
              <p className="font-song text-deep-blue-light">正在加载购物车…</p>
            </div>
          </FrameDecorations>
        </div>
      </div>
    )
  }

  // 首次同步失败且本地也没有数据：整页展示失败原因 + 重试，禁止无限转圈
  if (error && items.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              购物车
            </motion.h1>
            <BranchDivider />
          </div>

          <FrameDecorations className="bg-rice-paper-light p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-palace-red/10 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-palace-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86l-8.29 14.14a2 2 0 001.79 3h16.42a2 2 0 001.79-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="font-shufa text-xl text-deep-blue mb-2">购物车加载失败</h2>
              <p className="font-song text-deep-blue-light mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={retry}>重试</Button>
                <Button variant="outline" onClick={() => window.location.href = '/customize'}>去定制产品</Button>
              </div>
            </div>
          </FrameDecorations>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              购物车
            </motion.h1>
            <BranchDivider />
          </div>

          <FrameDecorations className="bg-rice-paper-light p-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="font-shufa text-xl text-deep-blue mb-2">购物车空空如也</h2>
              <p className="font-song text-deep-blue-light mb-6">快去挑选心仪的产品吧！</p>
              <Button variant="outline" onClick={() => window.location.href = '/customize'}>去定制产品</Button>
            </div>
          </FrameDecorations>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
          >
            购物车
          </motion.h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">共 {items.length} 件商品</p>
        </div>

        <FrameDecorations className="bg-rice-paper-light p-6 mb-6">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-deep-blue-100">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedItems.size === items.length && items.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 text-palace-red border-deep-blue-200 rounded-sm focus:ring-palace-red"
              />
              <span className="ml-2 font-song text-deep-blue">全选</span>
            </label>
            <span className="font-song text-deep-blue-light text-sm">
              已选 {selectedItems.size} / {items.length} 件
            </span>
          </div>
          <div className="space-y-4">
            {items.map((item, index) => {
              const product = products[item.productId]
              // 渲染兜底：旧脏数据缺字段时也不出现无名空白行
              const displayName = item.name || product?.name || '未命名商品'
              const displayPrice = parseFloat(item.price ?? product?.price ?? '0') || 0
              const fallbackImage = item.image || product?.image
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex gap-3 p-4 bg-rice-paper rounded-sm border ${selectedItems.has(item.id) ? 'border-palace-red' : 'border-deep-blue-100'}`}
                >
                  <label className="flex items-start justify-center flex-shrink-0 cursor-pointer pt-6">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      className="w-5 h-5 text-palace-red border-deep-blue-200 rounded-sm focus:ring-palace-red"
                    />
                  </label>
                  <div className="flex-shrink-0">
                      {(item.customization?.previewImageUrl || item.customization?.previewImage) ? (
                        <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                          <SafeImg
                            src={item.customization.previewImageUrl || item.customization.previewImage}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : item.customization?.patternImage && product?.image ? (
                        <PatternPreview
                          productImage={product.image}
                          patternImage={item.customization.patternImage}
                          scale={item.customization.scale || 100}
                          rotation={item.customization.rotation || 0}
                          positionX={item.customization.positionX || 50}
                          positionY={item.customization.positionY || 50}
                          blendMode={item.customization.blendMode || 'normal'}
                          size="small"
                          showFrame={false}
                          layoutMode={item.customization.layoutMode || 'free'}
                          textOverlay={item.customization.textOverlay}
                          textFont={item.customization.textFont}
                          textSize={item.customization.textSize || 16}
                          textPositionX={item.customization.textPositionX || 50}
                          textPositionY={item.customization.textPositionY || 85}
                        />
                      ) : fallbackImage ? (
                        <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                          <SafeImg
                            src={fallbackImage}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-deep-blue-50 rounded-sm overflow-hidden flex-shrink-0 flex flex-col items-center justify-center">
                          <svg className="w-8 h-8 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-[10px] font-song text-deep-blue-light mt-1">暂无图</span>
                        </div>
                      )}
                    </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-shufa text-lg text-deep-blue mb-1 truncate" title={displayName}>{displayName}</p>
                    {formatSpecDiffs(item.customization).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {formatSpecDiffs(item.customization).map((diff) => (
                          <span
                            key={diff}
                            className="text-[11px] font-song text-palace-red bg-palace-red/5 border border-palace-red/20 rounded-sm px-1.5 py-0.5"
                          >
                            {diff}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue hover:bg-deep-blue-100 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-song text-deep-blue">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue hover:bg-deep-blue-100 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-song text-[11px] text-deep-blue-light mt-1.5">
                      加入 {item.addedAt ? fmtShort(item.addedAt) : '-'}
                      {item.updatedAt && item.updatedAt !== item.addedAt ? ` · 更新 ${fmtShort(item.updatedAt)}` : ''}
                    </p>
                  </div>
                  {/* 右列：价格在上、删除在下，独立分区互不遮挡 */}
                  <div className="flex flex-col items-end justify-between flex-shrink-0 pl-2">
                    <span className="font-shufa text-palace-red text-lg whitespace-nowrap">¥{(displayPrice * item.quantity).toFixed(0)}</span>
                    <button
                      onClick={() => setShowDeleteConfirm(item.id)}
                      title="删除商品"
                      className="w-8 h-8 flex items-center justify-center bg-palace-red text-rice-paper rounded-full hover:bg-palace-red-dark transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </FrameDecorations>

        <FrameDecorations className="bg-rice-paper-light p-6">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={clearCart}
                className="font-song text-deep-blue-light hover:text-palace-red transition-colors"
              >
                清空购物车
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-song text-deep-blue-light text-sm">合计（已选 {selectedItems.size} 件）</p>
                <p className="font-shufa text-palace-red text-2xl">¥{totalPrice.toFixed(0)}</p>
              </div>
              <Button size="lg" onClick={() => setShowCheckout(true)} disabled={selectedItems.size === 0}>
                去结算
              </Button>
            </div>
          </div>
        </FrameDecorations>

        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCheckout(false)}
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
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入姓名"
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    />
                  </div>
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">联系电话</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="请输入手机号"
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    />
                  </div>
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">收货地址</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="请输入地址"
                      rows={2}
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-deep-blue-100 pt-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-song text-deep-blue">订单合计</span>
                    <span className="font-shufa text-palace-red text-xl">¥{totalPrice.toFixed(0)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowCheckout(false)}>
                    取消
                  </Button>
                  <Button className="flex-1" onClick={handleCheckout} disabled={isCheckingOut}>
                    {isCheckingOut ? '处理中...' : '确认提交'}
                  </Button>
                </div>

                <p className="font-song text-xs text-deep-blue-light text-center mt-4">
                  演示模式，无需实际支付
                </p>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}

        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-sm w-full"
            >
              <FrameDecorations className="bg-rice-paper-light p-6">
                <h2 className="font-shufa text-xl text-deep-blue mb-4 text-center">确认删除</h2>
                
                <p className="font-song text-deep-blue-light text-center mb-6">
                  确定要删除这个商品吗？删除后无法恢复。
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
                    取消
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    removeFromCart(showDeleteConfirm)
                    setShowDeleteConfirm(null)
                  }}>
                    确认删除
                  </Button>
                </div>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}

        {notice && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,480px)]">
            <div className="bg-ink-black/90 text-rice-paper rounded-sm px-4 py-3 shadow-xl border border-rice-paper/10 flex items-center justify-between gap-3">
              <p className="font-song text-sm flex-1">{notice.message}</p>
              <button
                onClick={retry}
                className="font-song text-sm text-ming-yellow hover:text-rice-paper transition-colors flex-shrink-0"
              >
                重试
              </button>
              <button
                onClick={dismissNotice}
                aria-label="关闭提示"
                className="flex-shrink-0 text-rice-paper/60 hover:text-rice-paper transition-colors leading-none"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
