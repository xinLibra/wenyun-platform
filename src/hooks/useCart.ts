import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { products } from '../lib/products'

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

export function useCart() {
  // 惰性初始化：从 localStorage 同步读取，避免第一帧就是空数组导致"闪空态"
  const [items, setItems] = useState<CartItem[]>(() => {
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
  })
  // 首次读取（localStorage / 远端）是否完成。完成前 UI 应显示加载态而不是空态
  const [hydrated, setHydrated] = useState(false)
  const isLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const syncCart = async () => {
      setHydrated(false)
      const { data: { session } } = await supabase.auth?.getSession()
      
      if (session?.user) {
        try {
          const { data: dbCart, error: dbError } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

          if (dbError) {
            console.error('[Cart] DB query error:', dbError)
            const localCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            console.log('[Cart] Local fallback loaded:', localCart.length, 'items')
            setItems(Array.isArray(localCart) ? localCart : [])
          } else if (dbCart && dbCart.length > 0) {
            console.log('[Cart] DB loaded:', dbCart.length, 'items')
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
            const rawLocal = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            const localCart = Array.isArray(rawLocal)
              ? rawLocal
                  .filter((it: any) => it && typeof it.productId === 'string' && it.productId)
                  .map((it: any) => enrichCartItem(it))
              : []
            if (localCart.length > 0) {
              console.log('[Cart] DB empty, keep local items:', localCart.length, 'items')
              setItems(localCart)
            } else {
              console.log('[Cart] Cart is empty (no DB data, no local items)')
              setItems([])
            }
          }
        } catch (error) {
          console.error('Failed to sync cart from DB:', error)
          const localCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
          console.log('[Cart] Local fallback loaded:', localCart.length, 'items')
          setItems(Array.isArray(localCart) ? localCart : [])
        }
      } else {
        const localCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        console.log('[Cart] Local loaded:', localCart.length, 'items')
        setItems(Array.isArray(localCart) ? localCart : [])
      }
      
      isLoaded.current = true
      setHydrated(true)
    }

    syncCart()

    const subscription = supabase.auth?.onAuthStateChange(async (_event, _session) => {
      isLoaded.current = false
      await syncCart()
    })

    return () => {
      subscription?.data?.subscription?.unsubscribe()
    }
  }, [])

  const COMPARE_FIELDS = ['scale', 'rotation', 'positionX', 'positionY', 'blendMode', 'patternOpacity']

  const saveToDB = useCallback(async (currentItems: CartItem[]) => {
    // 无论是否登录，先把当前购物车写入 localStorage，保证刷新后仍能读出
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems))
    } catch (e) {
      console.error('[Cart] Local save failed:', e)
    }

    if (!isLoaded.current) return

    const { data: { session } } = await supabase.auth?.getSession()
    
    if (!session?.user) {
      return
    }

    try {
      if (currentItems.length > 0) {
        const upsertResult = await supabase
          .from('cart_items')
          .upsert(
            currentItems.map(item => ({
              id: item.id,
              user_id: session.user.id,
              product_id: item.productId,
              generation_id: item.generationId || null,
              customization: item.customization,
              quantity: item.quantity,
            })),
            { onConflict: 'id' }
          )
        
        if (upsertResult.error) {
          console.error('[Cart] Upsert failed:', upsertResult.error)
          return
        }

        const existingResult = await supabase
          .from('cart_items')
          .select('id')
          .eq('user_id', session.user.id)
        const existingIds = new Set((existingResult.data || []).map((item: any) => item.id))
        const currentIds = new Set(currentItems.map(item => item.id))
        
        const staleIds = [...existingIds].filter(id => !currentIds.has(id))
        if (staleIds.length > 0) {
          const delResult = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', session.user.id)
            .in('id', staleIds)
          if (delResult.error) {
            console.error('[Cart] Stale cleanup failed:', delResult.error)
          }
        }
      } else {
        // 清空购物车：删除该用户在 DB 中的全部行，
        // 否则刷新后 syncCart 会从 DB 把旧商品读回来（清空无效）
        const delResult = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', session.user.id)
        if (delResult.error) {
          console.error('[Cart] Clear DB failed:', delResult.error)
        }
      }
    } catch (error: any) {
      console.error('[Cart] Failed to save cart to DB:', error.message)
    }
  }, [])

  useEffect(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
    }
    saveTimer.current = setTimeout(() => {
      saveToDB(items)
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

  return { items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, hydrated }
}
