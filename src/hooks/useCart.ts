import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { products } from '../lib/products'
import { withTimeout } from '../lib/async'

export interface CartItem {
  id: string
  productId: string
  generationId: string | null
  customization: Record<string, any>
  quantity: number
  /** 产品中文名（渲染兜底：item.name || product.name || '未命名商品'） */
  name?: string
  /** 产品单价（渲染兜底：item.price ?? product.price） */
  price?: string
  /** 产品默认图 / 定制预览 URL（渲染兜底，避免空白格） */
  image?: string
}

const STORAGE_KEY = 'cart_items_local'
const DEBOUNCE_MS = 500
/** 兜底占位图：产品表查不到（如纸袋/抱枕/手帕等定制产品）时也绝不显示空白格 */
const FALLBACK_IMAGE = '/placeholder-pattern-a.png'
/** 超时上限：单次请求不超过 8~10s，超时即结束 loading 并展示失败/重试 */
const SESSION_TIMEOUT_MS = 8000
const DB_TIMEOUT_MS = 10000

/** 兼容填充：name/price/image 未写入时从产品表补齐，保证购物车/订单不会出现无图无名条目 */
function enrichCartItem(item: any): CartItem {
  const product = item?.productId ? products[item.productId] : undefined
  const fallbackName = product?.name || '未命名商品'
  const fallbackPrice = product?.price || '0'
  const fallbackImage = product?.image || FALLBACK_IMAGE
  return {
    id: item?.id || crypto.randomUUID(),
    productId: item?.productId || '',
    generationId: item?.generationId ?? null,
    customization: item?.customization || {},
    quantity: typeof item?.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
    name: (typeof item?.name === 'string' && item.name.trim()) ? item.name : fallbackName,
    price: (typeof item?.price === 'string' && item.price.trim()) ? item.price : fallbackPrice,
    image: (typeof item?.image === 'string' && item.image.trim()) ? item.image : fallbackImage,
  }
}

/** 同步读取本地购物车（先画一版 / 失败兜底），绝不抛异常 */
function readLocalCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    // 历史脏数据兼容：过滤无 productId 的幽灵条目 + 补齐 name/price/image
    return raw
      .filter((it: any) => it && typeof it.productId === 'string' && it.productId)
      .map((it: any) => enrichCartItem(it))
  } catch {
    return []
  }
}

/** 安全获取会话：未配置 / 超时 / 异常一律返回 null，绝不抛异常卡死 loading */
async function getSessionSafe(): Promise<{ user: { id: string } | null } | null> {
  try {
    if (!supabase.auth) return null
    const res = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, '获取登录状态')
    return res?.data?.session ?? null
  } catch (e) {
    console.error('[Cart] getSession failed:', e)
    return null
  }
}

export function useCart() {
  // 惰性初始化：从 localStorage 同步读取，避免第一帧就是空数组导致"闪空态"
  const [items, setItems] = useState<CartItem[]>(readLocalCart)
  // 本地已有购物车 → 立即先画一版（先出结构），后台再与服务器对齐；
  // 本地为空 → 先显示加载态，首次同步完成（成功/失败/超时）必然结束
  const [hydrated, setHydrated] = useState<boolean>(() => readLocalCart().length > 0)
  /** 同步失败原因：有本地数据时做顶部提示，无本地数据时整页展示失败+重试 */
  const [error, setError] = useState<string | null>(null)
  const isLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 递增序号：只采纳最新一次同步结果，避免 StrictMode 双挂载 / auth 变化产生竞态 */
  const syncSeq = useRef(0)

  const syncCart = useCallback(async () => {
    const seq = ++syncSeq.current
    try {
      const session = await getSessionSafe()
      if (seq !== syncSeq.current) return

      const sessionUser = session?.user
      if (sessionUser) {
        try {
          const { data: dbCart, error: dbError } = await withTimeout(
            supabase
              .from('cart_items')
              .select('*')
              .eq('user_id', sessionUser.id)
              .order('created_at', { ascending: false }),
            DB_TIMEOUT_MS,
            '同步购物车'
          )
          if (seq !== syncSeq.current) return // 过期请求丢弃

          if (dbError) {
            console.error('[Cart] DB query error:', dbError)
            throw new Error(`购物车同步失败：${dbError.message || dbError.code || '数据库查询错误'}`)
          }

          if (dbCart && dbCart.length > 0) {
            const dbItems: CartItem[] = dbCart.map((item: any) =>
              enrichCartItem({
                id: item.id,
                productId: item.product_id,
                generationId: item.generation_id,
                customization: item.customization,
                quantity: item.quantity,
              })
            )
            setItems(dbItems)
          } else {
            // 关键修复：DB 无数据时绝不把本地已有购物车清空，
            // 否则刷新/重新登录后 localStorage 里的商品会被 [] 覆盖 →「购物车又变空」
            setItems(readLocalCart())
          }
          setError(null)
        } catch (e: any) {
          console.error('[Cart] Failed to sync cart from DB:', e)
          // 兜底：显示本地数据，不阻塞页面；同步失败原因留给 UI 提示
          setItems(readLocalCart())
          setError(e?.message || '同步购物车失败，当前显示本地数据')
        }
      } else {
        // 未登录：直接显示本地购物车（本地购物车不要求登录，也不会空转 loading）
        setItems(readLocalCart())
        setError(null)
      }
    } catch (e: any) {
      console.error('[Cart] syncCart fatal:', e)
      setError(e?.message || '加载购物车失败')
      setItems(readLocalCart())
    } finally {
      // 关键修复：无论成功 / 失败 / 超时，都必须结束 loading
      if (seq === syncSeq.current) {
        isLoaded.current = true
        setHydrated(true)
      }
    }
  }, [])

  useEffect(() => {
    void syncCart()

    const subscription = supabase.auth?.onAuthStateChange(() => {
      isLoaded.current = false
      void syncCart()
    })

    return () => {
      subscription?.data?.subscription?.unsubscribe()
      // 卸载时使进行中的同步作废，避免卸载后 setState
      syncSeq.current++
    }
  }, [syncCart])

  /** 手动重试：清空错误并重新同步 */
  const retry = useCallback(() => {
    setError(null)
    setHydrated(false)
    void syncCart()
  }, [syncCart])

  const COMPARE_FIELDS = ['scale', 'rotation', 'positionX', 'positionY', 'blendMode', 'patternOpacity']

  const saveToDB = useCallback(async (currentItems: CartItem[]) => {
    // 无论是否登录，先把当前购物车写入 localStorage，保证刷新后仍能读出
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems))
    } catch (e) {
      console.error('[Cart] Local save failed:', e)
    }

    if (!isLoaded.current) return

    const session = await getSessionSafe()
    const sessionUser = session?.user
    if (!sessionUser) return

    try {
      if (currentItems.length > 0) {
        const upsertResult = await withTimeout(
          supabase
            .from('cart_items')
            .upsert(
              currentItems.map(item => ({
                id: item.id,
                user_id: sessionUser.id,
                product_id: item.productId,
                generation_id: item.generationId || null,
                customization: item.customization,
                quantity: item.quantity,
              })),
              { onConflict: 'id' }
            ),
          DB_TIMEOUT_MS,
          '保存购物车'
        )

        if (upsertResult.error) {
          console.error('[Cart] Upsert failed:', upsertResult.error)
          return
        }

        const existingResult = await withTimeout(
          supabase
            .from('cart_items')
            .select('id')
            .eq('user_id', sessionUser.id),
          DB_TIMEOUT_MS,
          '查询购物车'
        )
        const existingIds = new Set((existingResult.data || []).map((item: any) => item.id))
        const currentIds = new Set(currentItems.map(item => item.id))

        const staleIds = [...existingIds].filter(id => !currentIds.has(id))
        if (staleIds.length > 0) {
          const delResult = await withTimeout(
            supabase
              .from('cart_items')
              .delete()
              .eq('user_id', sessionUser.id)
              .in('id', staleIds),
            DB_TIMEOUT_MS,
            '清理过期购物车'
          )
          if (delResult.error) {
            console.error('[Cart] Stale cleanup failed:', delResult.error)
          }
        }
      } else {
        // 清空购物车：删除该用户在 DB 中的全部行，
        // 否则刷新后 syncCart 会从 DB 把旧商品读回来（清空无效）
        const delResult = await withTimeout(
          supabase
            .from('cart_items')
            .delete()
            .eq('user_id', sessionUser.id),
          DB_TIMEOUT_MS,
          '清空购物车'
        )
        if (delResult.error) {
          console.error('[Cart] Clear DB failed:', delResult.error)
        }
      }
    } catch (e: any) {
      console.error('[Cart] Failed to save cart to DB:', e?.message || e)
    }
  }, [])

  useEffect(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
    }
    saveTimer.current = setTimeout(() => {
      void saveToDB(items)
    }, DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
      }
    }
  }, [items, saveToDB])

  function addToCart(item: Omit<CartItem, 'id'>) {
    // 兼容填充：调用方未写 name/price/image 时从产品表补齐，禁止 undefined/空字符串导致空白格
    const enriched = enrichCartItem(item)
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => {
        if (i.productId !== enriched.productId) return false

        for (const key of COMPARE_FIELDS) {
          const existingVal = i.customization[key]
          const newVal = enriched.customization[key]
          if (JSON.stringify(existingVal) !== JSON.stringify(newVal)) {
            return false
          }
        }

        return true
      })

      if (existingIndex >= 0) {
        const newItems = [...prev]
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          ...enriched,
          quantity: newItems[existingIndex].quantity + enriched.quantity,
        }
        return newItems
      }

      const uuid = crypto.randomUUID()
      return [...prev, { ...enriched, id: uuid }]
    })
  }

  function removeFromCart(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(id)
      return
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)))
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, hydrated, error, retry }
}
