import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { supabase } from '../lib/supabase'
import { classifyError, logSupabaseConfig, sleep, withTimeout } from '../lib/async'
import { useNavigate } from 'react-router-dom'
import { products } from '../lib/products'
import PatternPreview from '../components/PatternPreview'

interface Order {
  id: string
  user_id: string
  product_id: string
  generation_id: string
  image_url?: string
  product_image?: string
  customization: Record<string, any>
  status: string
  created_at: string
  quantity?: number
  shipping_info?: {
    name?: string
    phone?: string
    address?: string
  }
}

const statusLabels: Record<string, string> = {
  demo: '演示订单',
  pending: '待付款',
  paid: '已付款',
  shipped: '已发货',
  completed: '已完成',
}

/** 超时上限：单次请求不超过 8s；网络失败会立即 reject，超时仅作兜底 */
const SESSION_TIMEOUT_MS = 8000
const DB_TIMEOUT_MS = 8000
/** 兜底占位图：产品表查不到时也绝不显示空白格 */
const FALLBACK_IMAGE = '/placeholder-pattern-a.png'
/** 网络不稳时自动重试：最多 3 次（1 次初始 + 2 次重试），间隔 1s */
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
/** 订单本地缓存（按用户隔离）：失败时先展示上次成功结果并标「可能不是最新」 */
const ORDERS_CACHE_PREFIX = 'orders_local_cache_'

function readOrdersCache(userId: string): { data: Order[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(ORDERS_CACHE_PREFIX + userId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.data)) return null
    return { data: parsed.data as Order[], ts: parsed.ts || 0 }
  } catch {
    return null
  }
}

function writeOrdersCache(userId: string, data: Order[]) {
  try {
    localStorage.setItem(ORDERS_CACHE_PREFIX + userId, JSON.stringify({ data, ts: Date.now() }))
  } catch (e: any) {
    console.error('[Orders] cache write failed:', e?.message ?? e, e)
  }
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

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  /** 失败/未登录原因：无订单时整页展示失败+重试 */
  const [error, setError] = useState<string | null>(null)
  /** 有缓存降级：展示上次成功结果并弱提示「可能不是最新」 */
  const [staleNotice, setStaleNotice] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showReorderModal, setShowReorderModal] = useState(false)
  const [showReorderQuantityModal, setShowReorderQuantityModal] = useState(false)
  const [reorderQuantity, setReorderQuantity] = useState(1)
  const [reorderFormData, setReorderFormData] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReorderSubmit = async () => {
    if (!reorderFormData.name.trim()) {
      alert('请填写收货人姓名')
      return
    }

    if (!reorderFormData.phone.trim()) {
      alert('请填写联系电话')
      return
    }

    if (!reorderFormData.address.trim()) {
      alert('请填写收货地址')
      return
    }

    if (!selectedOrder) return

    // 安全获取登录状态：未配置 / 超时 / 异常都给出明确提示，不空转
    let session: { user: { id: string } | null } | null = null
    try {
      if (!supabase.auth) throw new Error('登录服务未配置')
      const res = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, '获取登录状态')
      session = res?.data?.session ?? null
    } catch (e: any) {
      console.error('[Orders] getSession failed:', e?.message ?? e, e)
      alert(`获取登录状态失败：${e?.message || '网络错误'}，请重试`)
      return
    }
    if (!session?.user) {
      alert('请先登录后再购买')
      navigate('/login')
      return
    }

    setIsSubmitting(true)

    try {
      const order = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
        product_id: selectedOrder.product_id,
        generation_id: selectedOrder.generation_id,
        image_url: selectedOrder.image_url,
        product_image: selectedOrder.product_image,
        customization: selectedOrder.customization,
        quantity: reorderQuantity,
        status: 'demo',
        created_at: new Date().toISOString(),
        shipping_info: { name: reorderFormData.name, phone: reorderFormData.phone, address: reorderFormData.address }
      }

      await supabase.from('orders').insert(order).select()

      setShowReorderModal(false)
      setReorderFormData({ name: '', phone: '', address: '' })
      alert('下单成功')
    } catch (err: any) {
      console.error('[Orders]', err?.message ?? err, err)
      alert('提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 递增序号：只采纳最新一次请求结果，避免 StrictMode 双挂载 / 重复导航产生竞态
  const fetchSeq = useRef(0)

  const fetchOrders = useCallback(async () => {
    const seq = ++fetchSeq.current
    let lastError: any = null
    try {
      // 安全获取登录状态：未配置 / 超时 / 异常都不会卡死 loading
      let session: { user: { id: string } | null } | null = null
      try {
        if (!supabase.auth) throw new Error('登录服务未配置')
        const res = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, '获取登录状态')
        session = res?.data?.session ?? null
      } catch (e: any) {
        console.error('[Orders]', e?.message ?? e, e)
        throw e
      }

      if (!session?.user) {
        // 未登录：明确提示「请先登录」，绝不空转 loading
        setError('请先登录后再查看订单')
        return
      }
      const userId = session.user.id

      // 拉取订单：只取列表必需字段 + 分页，避免拉全量大字段（customization 里可能含 base64 大图）；
      // 网络不稳时自动重试（最多 3 次，间隔 1s），仍失败再降级本地缓存 / 失败页
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (seq !== fetchSeq.current) return
        try {
          logSupabaseConfig('Orders')
          const { data: ordersData, error: queryError } = await withTimeout(
            supabase
              .from('orders')
              // 列表只取必要列；customization / shipping_info 用 JSON 投影只取渲染所需小字段，
              // 不拉 previewImage（可能是 base64 大图）与整段 customization / shipping_info
              .select(`id, user_id, product_id, generation_id, image_url, product_image, status, created_at, quantity,
                c_scale:customization->scale, c_rotation:customization->rotation,
                c_positionX:customization->positionX, c_positionY:customization->positionY,
                c_blendMode:customization->blendMode, c_layoutMode:customization->layoutMode,
                c_textOverlay:customization->textOverlay, c_textFont:customization->textFont,
                c_textSize:customization->textSize, c_textPositionX:customization->textPositionX,
                c_textPositionY:customization->textPositionY,
                s_name:shipping_info->name, s_phone:shipping_info->phone, s_address:shipping_info->address`)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(20),
            DB_TIMEOUT_MS,
            '加载订单'
          )
          if (seq !== fetchSeq.current) return // 过期请求丢弃

          if (queryError) {
            console.error('[Orders] Query error:', queryError?.message ?? queryError, queryError)
            throw queryError
          }

          // 把投影出的平铺字段重组为 Order 结构（previewImage 被刻意排除）
          const orders = (ordersData ?? []).map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            product_id: r.product_id,
            generation_id: r.generation_id,
            image_url: r.image_url,
            product_image: r.product_image,
            status: r.status,
            created_at: r.created_at,
            quantity: r.quantity,
            customization: {
              scale: r.c_scale,
              rotation: r.c_rotation,
              positionX: r.c_positionX,
              positionY: r.c_positionY,
              blendMode: r.c_blendMode,
              layoutMode: r.c_layoutMode,
              textOverlay: r.c_textOverlay,
              textFont: r.c_textFont,
              textSize: r.c_textSize,
              textPositionX: r.c_textPositionX,
              textPositionY: r.c_textPositionY,
            },
            shipping_info: {
              name: r.s_name,
              phone: r.s_phone,
              address: r.s_address,
            },
          }))

          setOrders(orders)
          setError(null)
          setStaleNotice(false)
          writeOrdersCache(userId, orders)
          return
        } catch (e: any) {
          lastError = e
          if (attempt < MAX_ATTEMPTS) {
            // 中间重试静默，避免刷屏
            await sleep(RETRY_DELAY_MS)
          }
        }
      }

      // 全部重试仍失败：有上次成功缓存先展示缓存并弱提示「可能不是最新」，无缓存展示失败页
      if (lastError) {
        console.error(`[Orders] All ${MAX_ATTEMPTS} attempts failed:`, lastError?.message ?? lastError, lastError)
      }
      if (seq !== fetchSeq.current) return
      const cached = readOrdersCache(userId)
      if (cached && cached.data.length > 0) {
        setOrders(cached.data)
        setStaleNotice(true)
        setError(null)
      } else {
        setOrders([])
        setStaleNotice(false)
        setError(classifyError(lastError).message)
      }
    } catch (e: any) {
      // getSession 阶段失败（断网 / Supabase 暂停）：可读文案 + 手动重试
      console.error('[Orders]', e?.message ?? e, e)
      if (seq !== fetchSeq.current) return
      setOrders([])
      setStaleNotice(false)
      setError(classifyError(e, '加载订单失败，请检查网络后重试').message)
    } finally {
      // 关键修复：无论成功 / 失败 / 超时，都必须结束 loading
      if (seq === fetchSeq.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void fetchOrders()
    return () => {
      fetchSeq.current++ // 卸载时使进行中的请求作废，避免卸载后 setState
    }
  }, [fetchOrders])

  const retry = useCallback(() => {
    setError(null)
    setStaleNotice(false)
    setIsLoading(true)
    void fetchOrders()
  }, [fetchOrders])

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="w-12 h-12 mx-auto border-4 border-deep-blue-200 border-t-palace-red rounded-full animate-spin"></div>
          <p className="font-song text-deep-blue-light mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录：明确提示「请先登录」，不空转 loading
  if (error === '请先登录后再查看订单') {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              我的订单
            </motion.h1>
            <BranchDivider />
          </div>

          <FrameDecorations className="bg-rice-paper-light p-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="font-shufa text-xl text-deep-blue mb-2">请先登录</h2>
              <p className="font-song text-deep-blue-light mb-6">登录后即可查看你的订单</p>
              <Button onClick={() => navigate('/login')}>去登录</Button>
            </div>
          </FrameDecorations>
        </div>
      </div>
    )
  }

  // 加载失败且没有数据：整页展示失败原因 + 重试，禁止无限转圈
  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              我的订单
            </motion.h1>
            <BranchDivider />
          </div>

          <FrameDecorations className="bg-rice-paper-light p-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-palace-red/10 rounded-sm flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-palace-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86l-8.29 14.14a2 2 0 001.79 3h16.42a2 2 0 001.79-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h2 className="font-shufa text-xl text-deep-blue mb-2">订单加载失败</h2>
              <p className="font-song text-deep-blue-light mb-6">{error}</p>
              <Button variant="outline" onClick={retry}>重试</Button>
            </div>
          </FrameDecorations>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              我的订单
            </motion.h1>
            <BranchDivider />
          </div>

          <FrameDecorations className="bg-rice-paper-light p-12">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h2 className="font-shufa text-xl text-deep-blue mb-2">暂无订单</h2>
              <p className="font-song text-deep-blue-light mb-6">快去定制心仪的产品吧！</p>
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
            我的订单
          </motion.h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">共 {orders.length} 笔订单</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-palace-red/10 border border-palace-red/30 rounded-sm flex items-center justify-between gap-4">
            <p className="font-song text-sm text-deep-blue">订单同步失败：{error}</p>
            <Button variant="outline" size="sm" onClick={retry} className="flex-shrink-0">重试</Button>
          </div>
        )}

        {staleNotice && (
          <div className="mb-4 p-4 bg-ming-yellow/20 border border-ming-yellow/40 rounded-sm flex items-center justify-between gap-4">
            <p className="font-song text-sm text-deep-blue">当前展示上次成功加载的订单，可能不是最新。请检查网络后刷新。</p>
            <Button variant="outline" size="sm" onClick={retry} className="flex-shrink-0">刷新</Button>
          </div>
        )}

        <div className="space-y-6">
          {orders.map((order, index) => {
            const product = products[order.product_id]
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <FrameDecorations className="bg-rice-paper-light p-6">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-deep-blue-100">
                    <span className="font-song text-deep-blue-light text-sm">订单号：{order.id.slice(0, 8)}</span>
                    <span className={`font-song text-sm ${order.status === 'demo' ? 'text-ming-yellow' : 'text-deep-blue-light'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>

                  <div 
                    className="flex gap-4 cursor-pointer hover:bg-rice-paper/50 rounded-sm p-2 -m-2 transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex-shrink-0">
                      {order.customization?.previewImage ? (
                        <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                          <SafeImg
                            src={order.customization.previewImage}
                            alt={product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : order.image_url && order.product_image ? (
                        <PatternPreview
                          productImage={order.product_image}
                          patternImage={order.image_url}
                          scale={order.customization.scale || 100}
                          rotation={order.customization.rotation || 0}
                          positionX={order.customization.positionX || 50}
                          positionY={order.customization.positionY || 50}
                          blendMode={order.customization.blendMode || 'normal'}
                          size="small"
                          showFrame={false}
                          layoutMode={order.customization.layoutMode}
                          textOverlay={order.customization.textOverlay}
                          textFont={order.customization.textFont}
                          textSize={order.customization.textSize || 16}
                          textPositionX={order.customization.textPositionX || 50}
                          textPositionY={order.customization.textPositionY || 85}
                        />
                      ) : (
                        <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                          <SafeImg
                            src={product?.image}
                            alt={product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-shufa text-lg text-deep-blue mb-1">{product?.name}</h3>
                      <p className="font-song text-xs text-deep-blue-light mb-2">
                        定制参数：尺寸 {order.customization?.scale || 100}%，旋转 {order.customization?.rotation || 0}°
                        {order.customization?.textOverlay && (
                          <span>，文字：{order.customization.textOverlay}</span>
                        )}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-song text-deep-blue-light text-sm">
                          {(() => {
                            const raw = order.created_at;
                            const utcDateStr = raw.endsWith('Z') ? raw : raw + 'Z';
                            const date = new Date(utcDateStr);
                            const formatted = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                            return formatted;
                          })()}
                        </span>
                        <span className="font-shufa text-palace-red text-lg">¥{product?.price}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-deep-blue-light">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {order.status === 'demo' && (
                    <div className="mt-4 p-3 bg-ming-yellow/20 rounded-sm">
                      <p className="font-song text-sm text-deep-blue-light">
                        <span className="text-ming-yellow">温馨提示：</span>这是演示订单，不涉及真实支付。
                      </p>
                    </div>
                  )}
                </FrameDecorations>
              </motion.div>
            )
          })}
        </div>

        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full"
            >
              <FrameDecorations className="bg-rice-paper-light p-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-deep-blue-100">
                  <h2 className="font-shufa text-xl text-deep-blue">订单详情</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="relative z-10 text-deep-blue-light hover:text-deep-blue transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {selectedOrder && (
                  <>
                    <div className="flex gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {selectedOrder.customization?.previewImage ? (
                          <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                            <SafeImg
                              src={selectedOrder.customization.previewImage}
                              alt={products[selectedOrder.product_id]?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : selectedOrder.image_url && selectedOrder.product_image ? (
                          <PatternPreview
                            productImage={selectedOrder.product_image}
                            patternImage={selectedOrder.image_url}
                            scale={selectedOrder.customization.scale || 100}
                            rotation={selectedOrder.customization.rotation || 0}
                            positionX={selectedOrder.customization.positionX || 50}
                            positionY={selectedOrder.customization.positionY || 50}
                            blendMode={selectedOrder.customization.blendMode || 'normal'}
                            size="small"
                            showFrame={false}
                            layoutMode={selectedOrder.customization.layoutMode}
                            textOverlay={selectedOrder.customization.textOverlay}
                            textFont={selectedOrder.customization.textFont}
                            textSize={selectedOrder.customization.textSize || 16}
                            textPositionX={selectedOrder.customization.textPositionX || 50}
                            textPositionY={selectedOrder.customization.textPositionY || 85}
                          />
                        ) : (
                          <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                            <SafeImg
                              src={products[selectedOrder.product_id]?.image}
                              alt={products[selectedOrder.product_id]?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-shufa text-deep-blue">
                          {products[selectedOrder.product_id]?.name}
                        </h3>
                        <p className="font-song text-xs text-deep-blue-light">
                          定制参数：尺寸 {selectedOrder.customization?.scale || 100}%，旋转 {selectedOrder.customization?.rotation || 0}°，位置 ({selectedOrder.customization?.positionX || 50}%, {selectedOrder.customization?.positionY || 50}%)
                          {selectedOrder.customization?.textOverlay && (
                            <span>，文字：{selectedOrder.customization.textOverlay}（{selectedOrder.customization.textSize || 16}px）</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="font-song text-deep-blue-light text-sm">订单号</span>
                        <span className="font-song text-deep-blue text-sm font-mono">{selectedOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-song text-deep-blue-light text-sm">购买数量</span>
                        <span className="font-song text-deep-blue text-sm">{selectedOrder.quantity || 1}件</span>
                      </div>
                      {selectedOrder.shipping_info && (
                        <>
                          <div className="flex justify-between">
                            <span className="font-song text-deep-blue-light text-sm">收货人</span>
                            <span className="font-song text-deep-blue text-sm">{selectedOrder.shipping_info.name || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-song text-deep-blue-light text-sm">联系电话</span>
                            <span className="font-song text-deep-blue text-sm">{selectedOrder.shipping_info.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-song text-deep-blue-light text-sm">收货地址</span>
                            <span className="font-song text-deep-blue text-sm max-w-[200px] text-right truncate">{selectedOrder.shipping_info.address || '-'}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="font-song text-deep-blue-light text-sm">下单时间</span>
                        <span className="font-song text-deep-blue text-sm">
                          {(() => {
                            const raw = selectedOrder.created_at;
                            const utcDateStr = raw.endsWith('Z') ? raw : raw + 'Z';
                            const date = new Date(utcDateStr);
                            const formatted = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                            return formatted;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-song text-deep-blue-light text-sm">订单状态</span>
                        <span className={`font-song text-sm ${selectedOrder.status === 'demo' ? 'text-ming-yellow' : 'text-deep-blue'}`}>
                          {statusLabels[selectedOrder.status] || selectedOrder.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-song text-deep-blue">合计金额</span>
                        <span className="font-shufa text-palace-red text-xl">¥{products[selectedOrder.product_id]?.price}</span>
                      </div>
                    </div>

                    {selectedOrder.status === 'demo' && (
                      <div className="mb-4 p-3 bg-ming-yellow/20 rounded-sm">
                        <p className="font-song text-sm text-deep-blue-light">
                          <span className="text-ming-yellow">温馨提示：</span>这是演示订单，不涉及真实支付。
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button className="flex-1" onClick={() => {
                        setReorderQuantity(1)
                        setShowReorderQuantityModal(true)
                      }}>
                        再次购买
                      </Button>
                    </div>
                  </>
                )}
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}

        {showReorderQuantityModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReorderQuantityModal(false)}
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
                    onClick={() => setReorderQuantity(Math.max(1, reorderQuantity - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue text-xl hover:bg-deep-blue-100 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-shufa text-2xl text-deep-blue">{reorderQuantity}</span>
                  <button
                    onClick={() => setReorderQuantity(Math.min(99, reorderQuantity + 1))}
                    className="w-12 h-12 flex items-center justify-center bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue text-xl hover:bg-deep-blue-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowReorderQuantityModal(false)}>
                    取消
                  </Button>
                  <Button className="flex-1" onClick={() => {
                    setShowReorderQuantityModal(false)
                    setShowReorderModal(true)
                  }}>
                    确认
                  </Button>
                </div>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}

        {showReorderModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReorderModal(false)}
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
                      value={reorderFormData.name}
                      onChange={(e) => setReorderFormData({ ...reorderFormData, name: e.target.value })}
                      placeholder="请输入姓名"
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    />
                  </div>
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">联系电话</label>
                    <input
                      type="tel"
                      value={reorderFormData.phone}
                      onChange={(e) => setReorderFormData({ ...reorderFormData, phone: e.target.value })}
                      placeholder="请输入手机号"
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    />
                  </div>
                  <div>
                    <label className="block font-song text-deep-blue-light text-sm mb-1">收货地址</label>
                    <textarea
                      value={reorderFormData.address}
                      onChange={(e) => setReorderFormData({ ...reorderFormData, address: e.target.value })}
                      placeholder="请输入地址"
                      rows={2}
                      className="w-full px-4 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-deep-blue-100 pt-4 mb-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-shrink-0">
                      {selectedOrder.customization?.previewImage ? (
                        <div className="w-16 h-16 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                          <img
                            src={selectedOrder.customization.previewImage}
                            alt={products[selectedOrder.product_id]?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : selectedOrder.image_url && selectedOrder.product_image ? (
                          <PatternPreview
                            productImage={selectedOrder.product_image}
                            patternImage={selectedOrder.image_url}
                            scale={selectedOrder.customization.scale || 100}
                            rotation={selectedOrder.customization.rotation || 0}
                            positionX={selectedOrder.customization.positionX || 50}
                            positionY={selectedOrder.customization.positionY || 50}
                            blendMode={selectedOrder.customization.blendMode || 'normal'}
                            size="small"
                            showFrame={false}
                            layoutMode={selectedOrder.customization.layoutMode}
                            textOverlay={selectedOrder.customization.textOverlay}
                            textFont={selectedOrder.customization.textFont}
                            textSize={selectedOrder.customization.textSize || 16}
                            textPositionX={selectedOrder.customization.textPositionX || 50}
                            textPositionY={selectedOrder.customization.textPositionY || 85}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                            <SafeImg
                              src={products[selectedOrder.product_id]?.image}
                              alt={products[selectedOrder.product_id]?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-shufa text-deep-blue">{products[selectedOrder.product_id]?.name}</h3>
                        <p className="font-song text-xs text-deep-blue-light">
                          数量：{reorderQuantity}件
                        </p>
                      </div>
                      <span className="font-song text-palace-red text-xl">¥{(parseFloat(products[selectedOrder.product_id]?.price || '0') * reorderQuantity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-song text-deep-blue">订单合计</span>
                      <span className="font-song text-palace-red text-xl">¥{(parseFloat(products[selectedOrder.product_id]?.price || '0') * reorderQuantity).toFixed(0)}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowReorderModal(false)}>
                    取消
                  </Button>
                  <Button className="flex-1" onClick={handleReorderSubmit} disabled={isSubmitting}>
                    {isSubmitting ? '处理中...' : '确认提交'}
                  </Button>
                </div>

                <p className="font-song text-xs text-deep-blue-light text-center mt-4">
                  演示模式，无需实际支付
                </p>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}