import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { products, materials } from '../lib/products'
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

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

    const { data: { session } } = await supabase.auth?.getSession()
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
    } catch (err) {
      console.error('Order error:', err)
      alert('提交失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const fetchOrders = async () => {
      const { data: { session } } = await supabase.auth?.getSession()
      
      if (!session?.user) {
        navigate('/login')
        return
      }

      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        console.log('[DEBUG] 查询返回条数:', ordersData?.length)
        setOrders(ordersData || [])
      } catch (error) {
        console.error('[DEBUG] Fetch orders error:', error)
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [navigate])

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
                      {order.image_url && order.product_image ? (
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
                        />
                      ) : (
                        <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                          <img
                            src={product?.image}
                            alt={product?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-shufa text-lg text-deep-blue mb-1">{product?.name}</h3>
                      <p className="font-song text-sm text-deep-blue-light mb-2">
                        材质：{materials[order.customization?.material] || '未知'}
                      </p>
                      <p className="font-song text-xs text-deep-blue-light mb-2">
                        定制参数：尺寸 {order.customization?.scale || 100}%，旋转 {order.customization?.rotation || 0}°
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-song text-deep-blue-light text-sm">
                          {(() => {
                            const raw = order.created_at;
                            const utcDateStr = raw.endsWith('Z') ? raw : raw + 'Z';
                            const date = new Date(utcDateStr);
                            const formatted = date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                            console.log('[DEBUG] 时间格式化:', raw, '-> 加Z后:', utcDateStr, '-> 格式化后:', formatted);
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
                        {selectedOrder.image_url && selectedOrder.product_image ? (
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
                          />
                        ) : (
                          <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                            <img
                              src={products[selectedOrder.product_id]?.image}
                              alt={products[selectedOrder.product_id]?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-shufa text-lg text-deep-blue mb-1">
                          {products[selectedOrder.product_id]?.name}
                        </h3>
                        <p className="font-song text-sm text-deep-blue-light mb-2">
                          材质：{materials[selectedOrder.customization?.material] || '未知'}
                        </p>
                        <p className="font-song text-xs text-deep-blue-light">
                          定制参数：尺寸 {selectedOrder.customization?.scale || 100}%，旋转 {selectedOrder.customization?.rotation || 0}°，位置 ({selectedOrder.customization?.positionX || 50}%, {selectedOrder.customization?.positionY || 50}%)
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
                            console.log('[DEBUG] 详情时间格式化:', raw, '-> 加Z后:', utcDateStr, '-> 格式化后:', formatted);
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
                        {selectedOrder.image_url && selectedOrder.product_image ? (
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
                          />
                        ) : (
                          <div className="w-16 h-16 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                            <img
                              src={products[selectedOrder.product_id]?.image}
                              alt={products[selectedOrder.product_id]?.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-shufa text-deep-blue">{products[selectedOrder.product_id]?.name}</h3>
                        <p className="font-song text-sm text-deep-blue-light">
                          材质：{materials[selectedOrder.customization?.material] || '未知'}
                        </p>
                        <p className="font-song text-xs text-deep-blue-light">
                          数量：{reorderQuantity}件
                        </p>
                      </div>
                      <span className="font-shufa text-palace-red text-xl">¥{(parseFloat(products[selectedOrder.product_id]?.price || '0') * reorderQuantity).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-song text-deep-blue">订单合计</span>
                      <span className="font-shufa text-palace-red text-xl">¥{(parseFloat(products[selectedOrder.product_id]?.price || '0') * reorderQuantity).toFixed(0)}</span>
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