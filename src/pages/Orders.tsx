import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { products, materials } from '../lib/products'

interface Order {
  id: string
  user_id: string
  product_id: string
  generation_id: string
  customization: Record<string, any>
  status: string
  created_at: string
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
  const [reorderFormData, setReorderFormData] = useState({
    name: '',
    address: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReorderSubmit = async () => {
    if (!reorderFormData.name.trim()) {
      alert('请填写收货人姓名')
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
        id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        user_id: session.user.id,
        product_id: selectedOrder.product_id,
        generation_id: selectedOrder.generation_id,
        customization: selectedOrder.customization,
        status: 'demo',
        created_at: new Date().toISOString(),
        shipping_info: { name: reorderFormData.name, address: reorderFormData.address }
      }

      const existingOrders = JSON.parse(localStorage.getItem('demo_orders') || '[]')
      existingOrders.unshift(order)
      localStorage.setItem('demo_orders', JSON.stringify(existingOrders))

      setOrders(prev => [order, ...prev])
      setShowReorderModal(false)
      setReorderFormData({ name: '', address: '' })
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

        const demoOrders = JSON.parse(localStorage.getItem('demo_orders') || '[]')
          .filter((o: Order) => o.user_id === session.user.id)

        const allOrders = [...demoOrders, ...(ordersData || [])].sort(
          (a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        setOrders(allOrders)
      } catch (error) {
        console.error('Fetch orders error:', error)
        const demoOrders = JSON.parse(localStorage.getItem('demo_orders') || '[]')
          .filter((o: Order) => o.user_id === session.user.id)
        setOrders(demoOrders)
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
                    <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                      <img
                        src={product?.image}
                        alt={product?.name}
                        className="w-full h-full object-cover"
                      />
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
                          {new Date(order.created_at).toLocaleString('zh-CN')}
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
                      <div className="w-24 h-24 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                        <img
                          src={products[selectedOrder.product_id]?.image}
                          alt={products[selectedOrder.product_id]?.name}
                          className="w-full h-full object-cover"
                        />
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
                        <span className="font-song text-deep-blue-light text-sm">下单时间</span>
                        <span className="font-song text-deep-blue text-sm">
                          {new Date(selectedOrder.created_at).toLocaleString('zh-CN')}
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
                        setShowReorderModal(true)
                      }}>
                        再买一单
                      </Button>
                    </div>
                  </>
                )}
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
                    <div className="w-16 h-16 bg-rice-paper-dark rounded-sm overflow-hidden flex-shrink-0">
                      <img
                        src={products[selectedOrder.product_id]?.image}
                        alt={products[selectedOrder.product_id]?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-shufa text-deep-blue">{products[selectedOrder.product_id]?.name}</h3>
                      <p className="font-song text-sm text-deep-blue-light">
                        材质：{materials[selectedOrder.customization?.material] || '未知'}
                      </p>
                    </div>
                    <span className="font-shufa text-palace-red text-xl">¥{products[selectedOrder.product_id]?.price}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-song text-deep-blue">订单合计</span>
                    <span className="font-shufa text-palace-red text-xl">¥{products[selectedOrder.product_id]?.price}</span>
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