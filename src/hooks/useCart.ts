import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { products } from '../lib/products'
import { classifyError, logSupabaseConfig, withTimeout } from '../lib/async'
import { computeSpecKey, specKeyOf } from '../lib/cartSpec'

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
  /** 规格唯一键：相同 specKey 视为同一条（合并数量）；不同则新开一行 */
  specKey?: string
  /** 该行定制的完整外观快照（3D 截图或产品合成图），合并数量时保留已有图 */
  snapshotImage?: string
  /** 首次加入时间 */
  addedAt?: string
  /** 最近一次操作（加购/改数量/合并）时间 */
  updatedAt?: string
}

const STORAGE_KEY = 'cart_items_local'
const DEBOUNCE_MS = 500
/** 兜底占位图：产品表查不到（如纸袋/抱枕/手帕等定制产品）时也绝不显示空白格 */
const FALLBACK_IMAGE = '/placeholder-pattern-a.png'
/** 超时上限：单次请求不超过 8s；网络失败会立即 reject，超时仅作兜底，尽快降级本地 */
const SESSION_TIMEOUT_MS = 8000
const DB_TIMEOUT_MS = 8000
/** 云同步失败的弱提示自动消失时间（本地数据可用，不强求重试） */
const NOTICE_AUTO_HIDE_MS = 6000
/** 云同步失败后自动重试一次的时间：云端恢复后可静默同步（不自动循环，避免持续刷请求） */
const AUTO_RETRY_MS = 15000

function nowIso(): string {
  return new Date().toISOString()
}

function tsOf(v: unknown): number {
  if (typeof v !== 'string' || !v) return 0
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

/** 按 updatedAt（次选 addedAt）降序：最近操作 / 最近加入在最上方 */
function sortByRecency(list: CartItem[]): CartItem[] {
  return [...list].sort((a, b) => {
    const ta = tsOf(a.updatedAt || a.addedAt)
    const tb = tsOf(b.updatedAt || b.addedAt)
    if (tb !== ta) return tb - ta
    // 同为旧数据的稳定兜底：按加入时间倒序
    return tsOf(b.addedAt) - tsOf(a.addedAt)
  })
}

/** 兼容填充：name/price/image 未写入时从产品表补齐；并按 customization 计算 specKey / 时间 / 快照 */
function enrichCartItem(item: any): CartItem {
  const product = item?.productId ? products[item.productId] : undefined
  const fallbackName = product?.name || '未命名商品'
  const fallbackPrice = product?.price || '0'
  const fallbackImage = product?.image || FALLBACK_IMAGE
  const customization: Record<string, any> = item?.customization || {}
  const productId = item?.productId || ''
  const generationId = item?.generationId ?? null
  const dbCreatedAt =
    typeof item?.createdAt === 'string'
      ? item.createdAt
      : typeof item?.created_at === 'string'
        ? item.created_at
        : undefined

  const specKey =
    (typeof item?.specKey === 'string' && item.specKey) ||
    computeSpecKey({ productId, generationId, customization })
  const addedAt =
    (typeof item?.addedAt === 'string' && item.addedAt) ||
    (typeof customization.addedAt === 'string' && customization.addedAt) ||
    dbCreatedAt
  const updatedAt =
    (typeof item?.updatedAt === 'string' && item.updatedAt) ||
    (typeof customization.updatedAt === 'string' && customization.updatedAt) ||
    addedAt ||
    dbCreatedAt

  const snapshotImage =
    (typeof item?.snapshotImage === 'string' && item.snapshotImage.trim() && item.snapshotImage) ||
    (typeof customization.previewImageUrl === 'string' && customization.previewImageUrl.trim() && customization.previewImageUrl) ||
    (typeof customization.previewImage === 'string' && customization.previewImage.trim() && customization.previewImage) ||
    undefined

  return {
    id: item?.id || crypto.randomUUID(),
    productId,
    generationId,
    customization,
    quantity: typeof item?.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
    name: (typeof item?.name === 'string' && item.name.trim()) ? item.name : fallbackName,
    price: (typeof item?.price === 'string' && item.price.trim()) ? item.price : fallbackPrice,
    image: (typeof item?.image === 'string' && item.image.trim()) ? item.image : fallbackImage,
    specKey,
    snapshotImage,
    addedAt,
    updatedAt,
  }
}

/** 把规格元信息（specKey / 加入时间 / 更新时间）落到 item 及其 customization，便于持久化 */
function stampMeta(item: CartItem, patch: { specKey?: string; addedAt?: string; updatedAt?: string }): CartItem {
  const specKey = patch.specKey || item.specKey || ''
  const addedAt = patch.addedAt || item.addedAt || nowIso()
  const updatedAt = patch.updatedAt || item.updatedAt || addedAt
  return {
    ...item,
    specKey,
    addedAt,
    updatedAt,
    customization: {
      ...(item.customization || {}),
      specKey,
      addedAt,
      updatedAt,
    },
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

type SessionResult = { ok: true; user: { id: string } | null } | { ok: false }

/** 安全获取会话：未配置 / 超时 / 异常返回 { ok: false }，绝不抛异常卡死 loading */
async function getSessionSafe(): Promise<SessionResult> {
  try {
    if (!supabase.auth) return { ok: false }
    const res = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, '获取登录状态')
    return { ok: true, user: res?.data?.session?.user ?? null }
  } catch (e: any) {
    console.error('[Cart] getSession failed:', e?.message ?? e, e)
    return { ok: false }
  }
}

export function useCart() {
  // 惰性初始化：从 localStorage 同步读取，避免第一帧就是空数组导致"闪空态"
  const [items, setItems] = useState<CartItem[]>(readLocalCart)
  // 本地已有购物车 → 立即先画一版（先出结构），后台再与服务器对齐；
  // 本地为空 → 先显示加载态，首次同步完成（成功/失败/超时）必然结束
  const [hydrated, setHydrated] = useState<boolean>(() => readLocalCart().length > 0)
  /** 同步失败原因：仅在「本地无任何数据且同步失败」时整页展示失败+重试 */
  const [error, setError] = useState<string | null>(null)
  /** 云同步失败的轻量提示：本地数据可正常使用时不打断体验，几秒自动消失 / 可关闭 / 可重试 */
  const [notice, setNotice] = useState<{ kind: 'offline' | 'pending'; message: string } | null>(null)
  /** 本地有改动但尚未成功推送云端（仅标记不阻塞 UI，云失败不回滚本地） */
  const [pendingSync, setPendingSync] = useState(false)
  const isLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 递增序号：只采纳最新一次同步结果，避免 StrictMode 双挂载 / auth 变化产生竞态 */
  const syncSeq = useRef(0)
  /** 云同步失败后的一次性自动重试定时器 */
  const autoRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncCart = useCallback(async () => {
    const seq = ++syncSeq.current
    try {
      const sessionRes = await getSessionSafe()
      if (seq !== syncSeq.current) return

      if (!sessionRes.ok) {
        // 登录状态服务本身不可用（断网 / Supabase 暂停）→ 云端不可用：弱提示 + 本地兜底
        const local = sortByRecency(readLocalCart())
        setItems(local)
        setError(null)
        setPendingSync(local.length > 0)
        if (local.length > 0) {
          setNotice({ kind: 'offline', message: '云端暂不可用，当前为本地购物车' })
        }
        scheduleAutoRetryOnce()
        return
      }

      const sessionUser = sessionRes.user
      if (!sessionUser) {
        // 未登录：直接显示本地购物车（本地购物车不要求登录，也不会空转 loading）
        setItems(sortByRecency(readLocalCart()))
        setError(null)
        setNotice(null)
        setPendingSync(false)
        return
      }

      try {
        logSupabaseConfig('Cart')
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
          console.error('[Cart] DB query error:', dbError?.message ?? dbError, dbError)
          throw dbError
        }

        if (dbCart && dbCart.length > 0) {
          const dbItems: CartItem[] = sortByRecency(
            dbCart.map((item: any) =>
              enrichCartItem({
                id: item.id,
                productId: item.product_id,
                generationId: item.generation_id,
                customization: item.customization,
                quantity: item.quantity,
                createdAt: item.created_at,
              })
            )
          )
          setItems(dbItems)
        } else {
          // 关键修复：DB 无数据时绝不把本地已有购物车清空，
          // 否则刷新/重新登录后 localStorage 里的商品会被 [] 覆盖 →「购物车又变空」
          setItems(sortByRecency(readLocalCart()))
        }
        setError(null)
        setNotice(null)
        setPendingSync(false)
      } catch (e: any) {
        console.error('[Cart] Failed to sync cart from DB:', e?.message ?? e, e)
        // 兜底：显示本地数据，不阻塞页面；云端失败只做弱提示，不再用大块红条打断体验
        const local = sortByRecency(readLocalCart())
        setItems(local)
        if (local.length > 0) {
          setError(null)
          setNotice({ kind: 'offline', message: `云端暂不可用，当前为本地购物车（${classifyError(e).message}）` })
        } else {
          setNotice(null)
          setError(`同步购物车失败：${classifyError(e).message}`)
        }
        scheduleAutoRetryOnce()
      }
    } catch (e: any) {
      console.error('[Cart] syncCart fatal:', e?.message ?? e, e)
      const local = sortByRecency(readLocalCart())
      setItems(local)
      if (local.length > 0) {
        setError(null)
        setNotice({ kind: 'offline', message: `云端暂不可用，当前为本地购物车（${classifyError(e).message}）` })
      } else {
        setNotice(null)
        setError(classifyError(e, '加载购物车失败').message)
      }
      scheduleAutoRetryOnce()
    } finally {
      // 关键修复：无论成功 / 失败 / 超时，都必须结束 loading
      if (seq === syncSeq.current) {
        isLoaded.current = true
        setHydrated(true)
      }
    }
  }, [])

  /** 云同步失败后安排一次性自动重试：云端恢复后可静默同步（不自动循环，避免持续刷请求） */
  const scheduleAutoRetryOnce = useCallback(() => {
    if (autoRetryTimer.current != null) return
    autoRetryTimer.current = setTimeout(() => {
      autoRetryTimer.current = null
      void syncCart()
    }, AUTO_RETRY_MS)
  }, [syncCart])

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
      if (autoRetryTimer.current) {
        clearTimeout(autoRetryTimer.current)
        autoRetryTimer.current = null
      }
    }
  }, [syncCart])

  // 云同步失败的轻量提示：几秒后自动消失（本地数据仍可用，不强求重试）
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), NOTICE_AUTO_HIDE_MS)
    return () => clearTimeout(t)
  }, [notice])

  /** 手动重试：清空错误/提示并重新同步（本地已有数据时不再闪 loading） */
  const retry = useCallback(() => {
    setError(null)
    setNotice(null)
    void syncCart()
  }, [syncCart])

  /** 关闭弱提示（不中断后台同步，也不影响本地数据） */
  const dismissNotice = useCallback(() => setNotice(null), [])

  const saveToDB = useCallback(async (currentItems: CartItem[]) => {
    // 无论是否登录，先把当前购物车写入 localStorage，保证刷新后仍能读出
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems))
    } catch (e) {
      console.error('[Cart] Local save failed:', e)
    }

    if (!isLoaded.current) return

    const sessionRes = await getSessionSafe()
    if (!sessionRes.ok) {
      // 云端不可用：本地已保存，标记待同步 + 弱提示，不回滚本地
      setPendingSync(true)
      setNotice({ kind: 'pending', message: '云端暂不可用，更改已保存在本地，稍后将自动同步' })
      return
    }
    const sessionUser = sessionRes.user
    if (!sessionUser) return

    try {
      if (currentItems.length > 0) {
        const upsertResult = await withTimeout(
          supabase
            .from('cart_items')
            .upsert(
              currentItems.map(item => {
                // 规格键与时间戳随 customization JSON 持久化（无需新增 DB 列即可跨设备恢复）
                const customization = {
                  ...(item.customization || {}),
                  specKey: item.specKey || item.customization?.specKey || computeSpecKey({
                    productId: item.productId,
                    generationId: item.generationId,
                    customization: item.customization,
                  }),
                  addedAt: item.addedAt || item.customization?.addedAt || nowIso(),
                  updatedAt: item.updatedAt || item.customization?.updatedAt || nowIso(),
                }
                return {
                  id: item.id,
                  user_id: sessionUser.id,
                  product_id: item.productId,
                  generation_id: item.generationId || null,
                  customization,
                  quantity: item.quantity,
                }
              }),
              { onConflict: 'id' }
            ),
          DB_TIMEOUT_MS,
          '保存购物车'
        )

        if (upsertResult.error) {
          console.error('[Cart] Upsert failed:', upsertResult.error?.message ?? upsertResult.error, upsertResult.error)
          throw upsertResult.error
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
          console.error('[Cart] Clear DB failed:', delResult.error?.message ?? delResult.error, delResult.error)
        }
      }
      setPendingSync(false)
      setNotice(null)
    } catch (e: any) {
      console.error('[Cart] Failed to save cart to DB:', e?.message ?? e, e)
      // 云失败不回滚本地：标记待同步，稍后自动重试补齐
      setPendingSync(true)
      setNotice({ kind: 'pending', message: '云端暂不可用，更改已保存在本地，稍后将自动同步' })
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

  /** 加购核心逻辑：按 specKey 判断规格是否相同 */
  function addToCart(input: Omit<CartItem, 'id'>) {
    const enriched = enrichCartItem(input)
    const specKey = computeSpecKey({
      productId: enriched.productId,
      generationId: enriched.generationId,
      customization: enriched.customization,
    })
    const now = nowIso()

    setItems((prev) => {
      // 找同规格：优先已带 specKey 的精确比对；旧数据按同样规则现场计算
      const existingIndex = prev.findIndex((i) => {
        if (i.productId !== enriched.productId) return false
        if (i.specKey) return i.specKey === specKey
        return specKeyOf({ productId: i.productId, generationId: i.generationId, customization: i.customization }) === specKey
      })

      if (existingIndex >= 0) {
        const old = prev[existingIndex]
        const oldCustom = old.customization || {}
        const newCustom = enriched.customization || {}
        // 合并：保留该规格原有截图与首次加入时间，数量相加并刷新最近操作时间。
        // 注意：新加的 item 可能缺 addedAt/快照，合并时以旧行为准，不覆盖为 undefined
        const merged: CartItem = stampMeta(
          {
            ...old,
            productId: old.productId || enriched.productId,
            generationId: old.generationId ?? enriched.generationId,
            quantity: old.quantity + enriched.quantity,
            name: old.name || enriched.name,
            price: old.price || enriched.price,
            image: old.image || enriched.image,
            // 快照沿用旧行（同规格外观一致），旧行无快照时用本次新快照
            snapshotImage: old.snapshotImage || enriched.snapshotImage,
            customization: {
              ...newCustom,
              ...oldCustom,
              specKey,
              addedAt: oldCustom.addedAt || old.addedAt || now,
              updatedAt: now,
              previewImageUrl: oldCustom.previewImageUrl || newCustom.previewImageUrl,
              previewImage:
                (oldCustom.previewImageUrl || oldCustom.previewImage) ||
                newCustom.previewImageUrl ||
                newCustom.previewImage,
            },
          },
          { specKey, updatedAt: now }
        )
        const others = prev.filter((p) => p.id !== old.id)
        return sortByRecency([merged, ...others])
      }

      // 新规格：新开一行（含完整快照），置于列表最上方
      const newItem = stampMeta(
        enrichCartItem({ ...enriched, id: crypto.randomUUID(), specKey, addedAt: now, updatedAt: now }),
        { specKey, addedAt: now, updatedAt: now }
      )
      return sortByRecency([newItem, ...prev])
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
    setItems((prev) => {
      const updated = prev.map((i) =>
        i.id === id ? stampMeta({ ...i, quantity }, { updatedAt: nowIso() }) : i
      )
      return sortByRecency(updated)
    })
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return { items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, hydrated, error, retry, notice, pendingSync, dismissNotice }
}
