import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { supabase } from '../lib/supabase'
import { classifyError, logSupabaseConfig, withTimeout } from '../lib/async'
import { products } from '../lib/products'
import PatternPreview from '../components/PatternPreview'

export default function OrderConfirmPage() {
  const { id: orderId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Record<string, any> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        navigate('/')
        return
      }
      try {
        // 只取本页必需字段，避免拉全量；超时即结束 loading 并展示失败+重试
        logSupabaseConfig('OrderConfirm')
        const { data: orderData, error: queryError } = await withTimeout(
          // 单条详情：整列读取 customization（含 previewImageUrl / previewImage），无列表级超时风险
          supabase
            .from('orders')
            .select('id, product_id, generation_id, image_url, product_image, customization, status, created_at, quantity, shipping_info')
            .eq('id', orderId)
            .single(),
          8000,
          '加载订单详情'
        )

        if (queryError) {
          console.error('[OrderConfirm] Query error:', queryError?.message ?? queryError, queryError)
          setError(`订单加载失败：${classifyError(queryError, '数据库查询错误').message}`)
          return
        }
        if (orderData) {
          setOrder(orderData)
          setError(null)
        } else {
          navigate('/')
        }
      } catch (err: any) {
        console.error('[OrderConfirm]', err?.message ?? err, err)
        setError(classifyError(err, '加载订单详情失败，请检查网络后重试').message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, navigate, reloadKey])

  const retry = useCallback(() => {
    setError(null)
    setIsLoading(true)
    setReloadKey(k => k + 1)
  }, [])

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

  if (error) {
    return (
      <div className="min-h-screen bg-rice-paper flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-12 h-12 mx-auto bg-palace-red/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-palace-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86l-8.29 14.14a2 2 0 001.79 3h16.42a2 2 0 001.79-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="font-song text-deep-blue mb-2">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={retry}>重试</Button>
            <Button variant="outline" onClick={() => navigate('/orders')}>返回订单列表</Button>
          </div>
        </div>
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

  // 定制预览图（3D 截图 / 合成图短链）：优先 previewImageUrl，其次 previewImage（仅 http 短链），不用 data: base64
  const c = order.customization || {}
  const previewUrl =
    (typeof c.previewImageUrl === 'string' && /^https?:\/\//i.test(c.previewImageUrl) ? c.previewImageUrl : '') ||
    (typeof c.previewImage === 'string' && /^https?:\/\//i.test(c.previewImage) ? c.previewImage : '')

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
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-pattern-a.png' }}
                      className="w-full h-full object-cover"
                    />
                  ) : order.image_url && order.product_image ? (
                    <PatternPreview
                      productImage={order.product_image}
                      patternImage={order.image_url}
                      scale={c.scale || 100}
                      rotation={c.rotation || 0}
                      positionX={c.positionX || 50}
                      positionY={c.positionY || 50}
                      blendMode={c.blendMode || 'normal'}
                      size="medium"
                    />
                  ) : product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-pattern-a.png' }}
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
                  </div>

                  <div className="border-t border-deep-blue-100 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-song text-deep-blue-light">订单号</span>
                      <span className="font-song text-deep-blue font-mono">{order.id}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-song text-deep-blue-light">下单时间</span>
                      <span className="font-song text-deep-blue">
                        {(() => {
                          const raw = order.created_at;
                          const utcDateStr = raw.endsWith('Z') ? raw : raw + 'Z';
                          return new Date(utcDateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                        })()}
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