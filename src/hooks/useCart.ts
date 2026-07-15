import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface CartItem {
  id: string
  productId: string
  generationId: string
  customization: Record<string, any>
  quantity: number
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  useEffect(() => {
    const syncCartWithDB = async () => {
      const { data: { session } } = await supabase.auth?.getSession()
      if (!session?.user) return

      try {
        const { data: dbCart } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', session.user.id)

        if (dbCart && dbCart.length > 0) {
          const dbItems: CartItem[] = dbCart.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            generationId: item.generation_id,
            customization: item.customization,
            quantity: item.quantity,
          }))
          
          const mergedItems = [...dbItems]
          items.forEach(localItem => {
            const existing = mergedItems.find(i => 
              i.productId === localItem.productId && 
              i.generationId === localItem.generationId &&
              JSON.stringify(i.customization) === JSON.stringify(localItem.customization)
            )
            if (!existing) {
              mergedItems.push(localItem)
            }
          })
          
          setItems(mergedItems)
        }
      } catch (error) {
        console.error('Failed to sync cart from DB:', error)
      }
    }

    syncCartWithDB()

    const subscription = supabase.auth?.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await syncCartWithDB()
      }
    })

    return () => {
      subscription?.data?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const saveToDB = async () => {
      const { data: { session } } = await supabase.auth?.getSession()
      if (!session?.user) return

      try {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', session.user.id)

        for (const item of items) {
          await supabase
            .from('cart_items')
            .insert({
              id: item.id,
              user_id: session.user.id,
              product_id: item.productId,
              generation_id: item.generationId,
              customization: item.customization,
              quantity: item.quantity,
            })
        }
      } catch (error) {
        console.error('Failed to save cart to DB:', error)
      }
    }

    const timer = setTimeout(saveToDB, 500)
    return () => clearTimeout(timer)
  }, [items])

  function addToCart(item: Omit<CartItem, 'id'>) {
    setItems((prev) => [...prev, { ...item, id: `cart-${Date.now()}` }])
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