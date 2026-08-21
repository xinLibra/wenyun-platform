import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export interface CartItem {
  id: string
  productId: string
  generationId: string | null
  customization: Record<string, any>
  quantity: number
}

const STORAGE_KEY = 'cart_items_local'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const isLoaded = useRef(false)

  useEffect(() => {
    const syncCart = async () => {
      const { data: { session } } = await supabase.auth?.getSession()
      
      if (session?.user) {
        try {
          const { data: dbCart } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

          console.log('[Cart] DB query result:', { count: dbCart?.length || 0, error: null })

          if (dbCart && dbCart.length > 0) {
            const dbItems: CartItem[] = dbCart.map((item: any) => ({
              id: item.id,
              productId: item.product_id,
              generationId: item.generation_id,
              customization: item.customization,
              quantity: item.quantity,
            }))
            setItems(dbItems)
          } else {
            const localCart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
            if (localCart.length > 0) {
              setItems(localCart)
            } else {
              setItems([])
            }
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

  useEffect(() => {
    const saveToDB = async () => {
      if (!isLoaded.current) {
        return
      }

      const { data: { session } } = await supabase.auth?.getSession()
      
      if (session?.user) {
        try {
          if (items.length > 0) {
            const upsertResult = await supabase
              .from('cart_items')
              .upsert(
                items.map(item => ({
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
          }

          if (items.length > 0) {
            const existingResult = await supabase
              .from('cart_items')
              .select('id')
              .eq('user_id', session.user.id)
            const existingIds = new Set((existingResult.data || []).map((item: any) => item.id))
            const currentIds = new Set(items.map(item => item.id))
            
            const staleIds = [...existingIds].filter(id => !currentIds.has(id))
            if (staleIds.length > 0) {
              await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', session.user.id)
                .in('id', staleIds)
            }
          }
        } catch (error: any) {
          console.error('[Cart] Failed to save cart to DB:', error.message)
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      }
    }

    saveToDB()
  }, [items])

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