import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface FavoriteContextType {
  favoriteIds: Set<string>
  isLoggedIn: boolean
  toggleFavorite: (workId: string) => Promise<{ success: boolean; isFavorite: boolean; count: number }>
  refreshFavorites: () => Promise<void>
}

const FavoriteContext = createContext<FavoriteContextType | null>(null)

export const useFavorites = () => {
  const context = useContext(FavoriteContext)
  if (!context) {
    throw new Error('useFavorites must be used within a FavoriteProvider')
  }
  return context
}

export const FavoriteProvider = ({ children }: { children: React.ReactNode }) => {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const fetchFavorites = useCallback(async () => {
    const { data: { session } } = await supabase.auth?.getSession()
    setIsLoggedIn(!!session?.user)
    
    if (session?.user) {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('generation_id')
        .eq('user_id', session.user.id)
      
      if (favorites) {
        setFavoriteIds(new Set(favorites.map(f => f.generation_id)))
      }
    } else {
      setFavoriteIds(new Set())
    }
  }, [])

  useEffect(() => {
    fetchFavorites()
    
    const { data: { subscription } } = supabase.auth?.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true)
        fetchFavorites()
      } else {
        setIsLoggedIn(false)
        setFavoriteIds(new Set())
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [fetchFavorites])

  const getFavoriteCount = useCallback(async (workId: string): Promise<number> => {
    console.log('[Favorite] getFavoriteCount called for workId:', workId)
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('generation_id', workId)
    
    console.log('[Favorite] getFavoriteCount result - count:', count, 'error:', error)
    return count || 0
  }, [])

  const toggleFavorite = useCallback(async (workId: string): Promise<{ success: boolean; isFavorite: boolean; count: number }> => {
    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再收藏')
      window.location.href = '/login'
      return { success: false, isFavorite: false, count: 0 }
    }

    console.log('[Favorite] toggleFavorite called for workId:', workId, 'userId:', session.user.id)

    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('generation_id', workId)
      .maybeSingle()

    console.log('[Favorite] Check existing favorite - data:', existingFavorite, 'error:', checkError)

    let isFavorite: boolean

    if (existingFavorite) {
      console.log('[Favorite] Found existing favorite, deleting...')
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existingFavorite.id)
      
      console.log('[Favorite] Delete result - error:', deleteError)
      
      if (deleteError) {
        console.error('[Favorite] Failed to delete favorite:', deleteError.message, deleteError.details)
        alert('取消收藏失败，请重试')
        return { success: false, isFavorite: true, count: await getFavoriteCount(workId) }
      }

      setFavoriteIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(workId)
        return newSet
      })
      isFavorite = false
      console.log('[Favorite] Successfully deleted favorite')
    } else {
      console.log('[Favorite] No existing favorite, inserting...')
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({ user_id: session.user.id, generation_id: workId })
      
      console.log('[Favorite] Insert result - error:', insertError)
      
      if (insertError) {
        console.error('[Favorite] Failed to insert favorite:', insertError.message, insertError.details)
        alert('收藏失败，请重试')
        return { success: false, isFavorite: false, count: await getFavoriteCount(workId) }
      }

      setFavoriteIds(prev => new Set([...prev, workId]))
      isFavorite = true
      console.log('[Favorite] Successfully inserted favorite')
    }

    const count = await getFavoriteCount(workId)
    console.log('[Favorite] Final count:', count)

    return { success: true, isFavorite, count }
  }, [getFavoriteCount])

  const refreshFavorites = useCallback(async () => {
    await fetchFavorites()
  }, [fetchFavorites])

  return (
    <FavoriteContext.Provider value={{ favoriteIds, isLoggedIn, toggleFavorite, refreshFavorites }}>
      {children}
    </FavoriteContext.Provider>
  )
}
