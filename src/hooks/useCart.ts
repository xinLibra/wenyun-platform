import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface CartItem {
  id: string
  productId: string
  generationId: string | null
  customization: Record<string, any>
  quantity: number
}

const STORAGE_KEY = 'cart_items_local'
const DEBOUNCE_MS = 500

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const isLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const syncCart = async () => {
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
            setItems(localCart)
          } else if (dbCart && dbCart.length > 0) {
            console.log('[Cart] DB loaded:', dbCart.length, 'items')
            const dbItems: CartItem[] = dbCart.map((item: any) => ({
              id: item.id,
              productId: item.product_id,
              generationId: item.generation_id,
              customization: item.customization,
              quantity: item.quantity,
            }))
            setItems(dbItems)
          } else {
            console.log('[Cart] Cart is empty (no DB error, no data)')
            setItems([])
          }
        } catch (error) {
          console.error('Failed to sync cart from DB:', error)
          const localCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
          setItems(localCart)
        }
      } else {
        const localCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        setItems(localCart)
      }
      
      isLoaded.current = true
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

  const COMPARE_FIELDS = ['scale', 'rotation', 'positionX', 'positionY', 'blendMode', 'material']

  const saveToDB = useCallback(async (currentItems: CartItem[]) => {
    if (!isLoaded.current) return

    const { data: { session } } = await supabase.auth?.getSession()
    
    if (!session?.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems))
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
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => {
        if (i.productId !== item.productId) return false
        
        for (const key of COMPARE_FIELDS) {
          const existingVal = i.customization[key]
          const newVal = item.customization[key]
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
          quantity: newItems[existingIndex].quantity + item.quantity,
        }
        return newItems
      }

      const uuid = crypto.randomUUID()
      return [...prev, { ...item, id: uuid }]
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

  return { items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems }
}
