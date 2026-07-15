import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { supabase } from '../lib/supabase'
import { products, materials } from '../lib/products'

export default function OrderConfirmPage() {
  const { id: orderId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate('/')
        return
      }

      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (orderData) {
          setOrder(orderData)
        } else {
          navigate('/')
        }
      } catch (err) {
        console.error('Fetch order error:', err)
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rice-paper flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-4 border-palace-red border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="font-song text-deep-blue">加载中...</p>
        </motion.div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-rice-paper flex items-center justify-center">
        <div className="text-center">
          <p className="font-song text-deep-blue">订单不存在</p>
          <Button onClick={() => navigate('/')} className="mt-4">返回首页</Button>
        </div>
      </div>
    )
  }

  const product = products[order.product_id] || { name: '未知产品', price: '0', image: '' }
  const materialName = order.customization?.material ? materials[order.customization.material] || '未知材质' : ''

  return (
    <div className="min-h-screen bg-rice-paper py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 mx-auto bg-palace-red/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-palace-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-shufa text-3xl text-deep-blue mb-2">订单已提交</h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">演示模式，无需实际支付</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <FrameDecorations className="bg-rice-paper-light p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-song text-deep-blue-light">无图片</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="space-y-4">
                  <div>
                    <h2 className="font-shufa text-xl text-deep-blue">{product.name}</h2>
                    <p className="font-song text-deep-blue-light mt-1">
                      {materialName && `材质：${materialName}`}
                    </p>
                  </div>

                  <div className="border-t border-deep-blue-100 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-song text-deep-blue-light">订单号</span>
                      <span className="font-song text-deep-blue font-mono">{order.id}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-song text-deep-blue-light">下单时间</span>
                      <span className="font-song text-deep-blue">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-song text-deep-blue-light">订单状态</span>
                      <span className="font-song text-ming-yellow bg-ming-yellow/10 px-2 py-1 rounded-sm">
                        {order.status === 'pending' ? '待确认' : order.status}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-deep-blue-100 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-song text-deep-blue">合计金额</span>
                      <span className="font-zhuanke text-palace-red text-2xl">¥{product.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/my-works')}>
                返回我的作品
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/orders')}>
                查看订单列表
              </Button>
            </div>
          </FrameDecorations>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="font-song text-xs text-deep-blue-light">
            感谢您的购买！我们将尽快为您处理订单
          </p>
        </motion.div>
      </div>
    </div>
  )
}