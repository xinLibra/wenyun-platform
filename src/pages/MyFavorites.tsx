import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { useFavorites } from '../context/FavoriteContext'
import { downloadImageAsFormat, downloadImageViaProxy } from '../utils/downloadImage'
import { isPlaceholderUrl } from '../lib/imageLoader'
import WorkDetailModal from '../components/WorkDetailModal'

interface FavoriteWork {
  id: string
  title: string
  image_url: string
  author_nickname: string
  is_public: boolean
  created_at: string
  params: Record<string, any>
}

export default function MyFavoritesPage() {
  const navigate = useNavigate()
  const { toggleFavorite } = useFavorites()
  const [favorites, setFavorites] = useState<FavoriteWork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailWork, setDetailWork] = useState<FavoriteWork | null>(null)
  const [openDownloadMenuId, setOpenDownloadMenuId] = useState<string | null>(null)
  const downloadMenuRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // 点击卡片下载菜单外部时收起格式选项
  useEffect(() => {
    if (!openDownloadMenuId) return
    const onClick = (e: MouseEvent) => {
      const menuEl = downloadMenuRefs.current[openDownloadMenuId]
      if (menuEl && !menuEl.contains(e.target as Node)) {
        setOpenDownloadMenuId(null)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [openDownloadMenuId])

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const { data: { session } } = await supabase.auth?.getSession()
        
        if (!session?.user) {
          navigate('/login')
          return
        }

        const { data: favoriteRecords, error: favoriteError } = await supabase
          .from('favorites')
          .select('generation_id')
          .eq('user_id', session.user.id)

        if (favoriteError) {
          console.error('Fetch favorites error:', favoriteError)
          setError('获取收藏失败，请稍后重试')
          setIsLoading(false)
          return
        }

        if (!favoriteRecords || favoriteRecords.length === 0) {
          setFavorites([])
          setIsLoading(false)
          return
        }

        const generationIds = favoriteRecords.map(f => f.generation_id)
        
        const { data: generationsData, error: generationsError } = await supabase
          .from('generations')
          .select('*')
          .in('id', generationIds)
          .eq('is_deleted', false)

        if (generationsError) {
          console.error('Fetch generations error:', generationsError)
          setError('获取收藏失败，请稍后重试')
        } else {
          setFavorites(
            (generationsData || []).map((row: any) => ({
              id: row.id,
              title: row.title || '',
              image_url: row.image_url || '',
              author_nickname: row.author_nickname || '',
              is_public: !!row.is_public,
              created_at: row.created_at,
              params: row.params || {},
            }))
          )
        }
      } catch (err) {
        console.error('Fetch favorites error:', err)
        setError('获取收藏失败，请稍后重试')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [navigate])

  const handleRemoveFavorite = async (generationId: string) => {
    const result = await toggleFavorite(generationId)
    if (result.success) {
      setFavorites(prev => prev.filter(f => f.id !== generationId))
    }
  }

  const handleDownload = async (favorite: FavoriteWork, format: 'png' | 'jpg') => {
    let imageUrl = favorite.image_url
    if (isPlaceholderUrl(imageUrl)) {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('image_url')
          .eq('id', favorite.id)
          .eq('is_deleted', false)
          .single()
        if (error) throw error
        imageUrl = data?.image_url || ''
      } catch (e: any) {
        console.error('[MyFavorites] fetch image for download failed:', e?.message ?? e, e)
        alert('获取图片失败，请稍后重试')
        return
      }
    }
    if (!imageUrl) {
      alert('该作品没有可下载的图片')
      return
    }

    const filename = `wenyun_pattern_${(favorite.id || '').slice(0, 8) || Date.now()}.${format === 'png' ? 'png' : 'jpg'}`
    setOpenDownloadMenuId(null)
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      if (isMobile) {
        window.open(
          format === 'png'
            ? `/.netlify/functions/download?url=${encodeURIComponent(imageUrl)}`
            : imageUrl,
          '_blank'
        )
        return
      }

      try {
        // 优先直接下载：支持 data: / blob: / http(s)，PNG 带校验，JPG 经 Canvas 白底转换
        await downloadImageAsFormat(imageUrl, filename, format)
      } catch (directErr) {
        console.warn('[MyFavorites] direct download failed, fallback to proxy/open:', directErr)
        if (format === 'png') {
          try {
            // 生产环境若跨域受限，经 Netlify download 函数中转
            await downloadImageViaProxy(imageUrl, filename)
          } catch (proxyErr) {
            // 本地 dev 未部署 Netlify 函数时，/functions/download 会返回 index.html(text/html)，
            // 直接打开原图让用户另存为，避免继续报「图源类型异常」。
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              window.open(imageUrl, '_blank')
            } else {
              throw proxyErr
            }
          }
        } else {
          // JPG 转换需要跨域原图；直接下载失败时只能打开原图让用户自行保存
          window.open(imageUrl, '_blank')
        }
      }
    } catch (error) {
      console.error('[MyFavorites] 下载失败:', error)
      alert((error as Error)?.message || '下载失败，请尝试右键图片另存为')
    }
  }

  const handleViewDetail = (favorite: FavoriteWork) => {
    setDetailWork(favorite)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
          >
            我的收藏
          </motion.h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">查看和管理您收藏的纹样作品</p>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto border-4 border-deep-blue-200 border-t-palace-red rounded-full animate-spin"></div>
            <p className="font-song text-deep-blue-light mt-4">加载中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-song text-deep-blue-light">{error}</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="font-song text-deep-blue-light">暂无收藏的作品</p>
            <p className="font-song text-deep-blue-light text-sm mt-2">去作品展示页收藏喜欢的纹样吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <FrameDecorations className="bg-rice-paper p-3">
                  <div
                    className="aspect-square bg-rice-paper-dark mb-3 overflow-hidden cursor-pointer"
                    onClick={() => handleViewDetail(favorite)}
                  >
                    <img
                      src={favorite.image_url}
                      alt={favorite.params?.title || '纹样'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-shufa text-sm text-deep-blue mb-1 truncate" title={favorite.params?.title}>
                      {favorite.params?.title || `纹样作品 #${favorite.id.slice(0, 8)}`}
                    </h3>
                    {favorite.params?.tags && favorite.params.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {favorite.params.tags.slice(0, 3).map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-deep-blue-50 text-deep-blue-light text-xs font-song rounded-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-song text-xs text-deep-blue-light">
                        {new Date(favorite.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="relative flex-1"
                        ref={(el) => {
                          downloadMenuRefs.current[favorite.id] = el
                        }}
                      >
                        <button
                          onClick={() =>
                            setOpenDownloadMenuId(openDownloadMenuId === favorite.id ? null : favorite.id)
                          }
                          className="w-full py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                        >
                          下载
                        </button>
                        {openDownloadMenuId === favorite.id && (
                          <div className="absolute left-0 right-0 bottom-full mb-1 flex flex-col gap-1 bg-rice-paper-light border border-deep-blue-200 rounded-sm shadow-lg p-1 z-50">
                            <button
                              onClick={() => handleDownload(favorite, 'png')}
                              className="w-full py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                            >
                              PNG
                            </button>
                            <button
                              onClick={() => handleDownload(favorite, 'jpg')}
                              className="w-full py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                            >
                              JPG
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleViewDetail(favorite)}
                        className="flex-1 py-1.5 bg-deep-blue-50 border border-deep-blue-200 rounded-sm font-song text-xs text-deep-blue hover:bg-deep-blue-100 transition-colors"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="px-3 py-1.5 bg-palace-red/10 border border-palace-red/20 rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                      >
                        取消收藏
                      </button>
                    </div>
                  </div>
                </FrameDecorations>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <WorkDetailModal
        work={
          detailWork
            ? {
                id: detailWork.id,
                title: detailWork.params?.title || detailWork.title || `纹样作品 #${detailWork.id.slice(0, 8)}`,
                tags: detailWork.params?.tags || [],
                author: detailWork.author_nickname || '匿名',
                image: detailWork.image_url,
                createdAt: detailWork.created_at,
              }
            : null
        }
        onClose={() => setDetailWork(null)}
      />
    </div>
  )
}