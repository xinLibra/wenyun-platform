import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase, Generation } from '../lib/supabase'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { useFavorites } from '../context/FavoriteContext'
import { withTimeout, classifyError, sleep, logSupabaseConfig } from '../lib/async'

const SESSION_TIMEOUT_MS = 8000
const DB_TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const WORKS_CACHE_PREFIX = 'myworks_local_cache_'

function readWorksCache(userId: string): Generation[] | null {
  try {
    const raw = localStorage.getItem(`${WORKS_CACHE_PREFIX}${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}
function writeWorksCache(userId: string, data: Generation[]) {
  try {
    localStorage.setItem(`${WORKS_CACHE_PREFIX}${userId}`, JSON.stringify(data))
  } catch (e: any) {
    console.warn('[MyWorks] write cache failed:', e?.message ?? e)
  }
}

export default function MyWorksPage() {
  const navigate = useNavigate()
  const { favoriteIds, toggleFavorite, refreshFavorites } = useFavorites()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [staleNotice, setStaleNotice] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadWorks = async () => {
      try {
        // 防御：Supabase 未初始化时直接报错
        if (!supabase || !supabase.auth) {
          console.error('[MyWorks] supabase is not initialized')
          if (mounted) {
            setError('系统未正确配置，请联系管理员')
            setIsLoading(false)
          }
          return
        }

        logSupabaseConfig('MyWorks')

        // 会话校验（8s 超时）
        const sessionRes = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          '会话校验'
        ).catch((e) => {
          console.error('[MyWorks] getSession failed:', e?.message ?? e, e)
          return { data: { session: null }, error: e } as any
        })
        const sessionError = sessionRes?.error
        const session = sessionRes?.data?.session
        if (sessionError) {
          if (mounted) {
            setError(classifyError(sessionError).message)
            setIsLoading(false)
          }
          return
        }
        if (!session?.user) {
          console.info('[MyWorks] no active session, redirect to login')
          if (mounted) {
            setError('请先登录后查看我的作品')
            setIsLoading(false)
            navigate('/login')
          }
          return
        }

        const userId = session.user.id

        // 拉取作品：自动重试 3 次，每次 8s 超时
        let rows: any[] = []
        let lastError: any = null
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const { data, error } = await withTimeout(
              supabase
                .from('generations')
                // 只取列表必需列 + JSON 投影（名称 / 标签）；不拉整个 params，
                // 避免一次传输 base64 预览图、完整 prompt / DNA 等大字段
                .select('id, image_url, is_public, created_at, title:params->>title, tags:params->tags')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50),
              DB_TIMEOUT_MS,
              '获取作品'
            )
            if (error) throw error
            rows = (data ?? []).map((row: any) => ({
              id: row.id,
              image_url: row.image_url,
              is_public: row.is_public,
              created_at: row.created_at,
              params: {
                title: row.title ?? '',
                tags: Array.isArray(row.tags) ? row.tags : [],
              },
            }))
            lastError = null
            break
          } catch (e: any) {
            lastError = e
            if (attempt < MAX_ATTEMPTS) {
              // 中间重试静默，不打印 console.error，避免刷屏
              await sleep(RETRY_DELAY_MS)
            }
          }
        }

        if (lastError) {
          console.error(`[MyWorks] All ${MAX_ATTEMPTS} attempts failed:`, lastError?.message ?? lastError, lastError)
          const cached = readWorksCache(userId)
          if (cached && cached.length > 0) {
            if (mounted) {
              setGenerations(cached)
              setStaleNotice(true)
              setError('')
              setIsLoading(false)
            }
          } else {
            if (mounted) {
              setError(classifyError(lastError).message)
              setIsLoading(false)
            }
          }
          return
        }

        const generationIds = rows.map((gen) => gen.id)

        let favoriteCounts: Record<string, number> = {}
        if (generationIds.length > 0) {
          try {
            const { data: favoritesData, error: favError } = await withTimeout(
              supabase
                .from('favorites')
                .select('generation_id')
                .in('generation_id', generationIds),
              DB_TIMEOUT_MS,
              '获取点赞数'
            )
            if (favError) {
              console.error('[MyWorks] query favorites failed:', favError?.message ?? favError, favError)
            } else if (favoritesData) {
              favoriteCounts = {}
              favoritesData.forEach((fav: { generation_id: string }) => {
                favoriteCounts[fav.generation_id] = (favoriteCounts[fav.generation_id] || 0) + 1
              })
            }
          } catch (favErr: any) {
            console.error('[MyWorks] favorites query threw:', favErr?.message ?? favErr, favErr)
          }
        }

        const updatedGenerations = rows.map((gen) => ({
          ...gen,
          favorite_count: favoriteCounts[gen.id] || 0
        })) as unknown as Generation[]

        // 写入本地缓存，供下次网络失败时展示
        writeWorksCache(userId, updatedGenerations)

        if (mounted) {
          setGenerations(updatedGenerations)
          setError('')
          setStaleNotice(false)
        }
      } catch (err) {
        const anyErr = err as any
        // 禁止空 Error {}：显式拆出 message / code / hint，无则标记 unknown
        console.error('[MyWorks] unexpected error:', {
          message: anyErr?.message ?? 'unknown error',
          code: anyErr?.code,
          details: anyErr?.details,
          hint: anyErr?.hint,
          stack: anyErr?.stack,
          raw: err,
        })
        if (mounted) setError('获取作品失败，请稍后重试')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    setIsLoading(true)
    setError('')
    loadWorks()

    return () => {
      mounted = false
    }
  }, [navigate, reloadKey])

  const handlePublicToggle = async (generationId: string, currentPublic: boolean) => {
    const newValue = !currentPublic
    setGenerations((prev) =>
      prev.map((g) => (g.id === generationId ? { ...g, is_public: newValue } : g))
    )

    const { error } = await supabase
      .from('generations')
      .update({ is_public: newValue })
      .eq('id', generationId)

    if (error) {
      setGenerations((prev) =>
        prev.map((g) => (g.id === generationId ? { ...g, is_public: !newValue } : g))
      )
      alert('设置失败，请重试')
    }
  }

  const handleFavorite = async (generationId: string) => {
    await toggleFavorite(generationId)
  }

  const handleDelete = async (generationId: string) => {
    if (!confirm('确定要删除这个作品吗？')) return

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) return

    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('generation_id', generationId)

      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', generationId)

      if (error) {
        console.error('Delete error:', error)
        if (error.message?.includes('foreign key constraint')) {
          alert('删除失败：该作品已被其他用户收藏，无法删除')
        } else {
          alert(`删除失败: ${error.message || '请重试'}`)
        }
      } else {
        setGenerations(prev => prev.filter(g => g.id !== generationId))
        refreshFavorites()
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('删除失败，请重试')
    }
  }

  const handleDownload = async (imageUrl: string) => {
    try {
      const proxyUrl = `/.netlify/functions/download?url=${encodeURIComponent(imageUrl)}`
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      if (isMobile) {
        window.open(proxyUrl, '_blank')
      } else {
        const link = document.createElement('a')
        link.href = proxyUrl
        link.download = `wenyun_pattern_${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('下载失败:', error)
      alert('下载失败，请尝试右键图片另存为')
    }
  }

  const handleViewDetail = (generationId: string) => {
    navigate(`/gallery/${generationId}`)
  }

  const startEdit = (generation: Generation) => {
    setEditingId(generation.id)
    setEditTitle(generation.params?.title || '')
  }

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return

    const generation = generations.find((g) => g.id === editingId)
    if (!generation) return

    // 列表查询只投影了 params 的 title/tags，更新标题前先拉完整 params，避免覆盖丢失 prompt / DNA 等字段
    let fullParams = generation.params
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('params')
        .eq('id', editingId)
        .single()
      if (!error && data?.params) fullParams = data.params
    } catch (e: any) {
      console.error('[MyWorks] fetch full params failed:', e?.message ?? e, e)
    }

    const { error } = await supabase
      .from('generations')
      .update({ params: { ...fullParams, title: editTitle.trim() } })
      .eq('id', editingId)

    if (error) {
      console.error('Update title error:', error)
      alert('修改失败，请重试')
    } else {
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === editingId ? { ...g, params: { ...g.params, title: editTitle.trim() } } : g
        )
      )
      setEditingId(null)
      setEditTitle('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

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

  return (
    <div className="min-h-screen bg-rice-paper py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
            >
              我的作品
            </motion.h1>
            <BranchDivider />
            <p className="font-song text-deep-blue-light mt-4">查看和管理您保存的纹样作品</p>
          </div>

          {/* 弱提示：缓存数据可能不是最新 */}
          <AnimatePresence>
            {staleNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-sm font-song text-center mb-6"
              >
                <p>当前展示的是上次缓存的作品，可能不是最新</p>
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-2 px-4 py-1.5 bg-palace-red text-rice-paper rounded-sm font-song text-sm hover:bg-palace-red-dark transition-colors"
                >
                  重试
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 仅无缓存数据时才展示红色报错 */}
          {error && generations.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-sm font-song text-center mb-6"
            >
              <p>{error}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-2 px-4 py-1.5 bg-palace-red text-rice-paper rounded-sm font-song text-sm hover:bg-palace-red-dark transition-colors"
              >
                重试
              </button>
            </motion.div>
          )}

          {generations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-deep-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-deep-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {error ? (
                <>
                  <p className="font-song text-deep-blue-light mb-4">加载失败，请重试</p>
                  <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="px-6 py-2 bg-palace-red text-rice-paper rounded-sm font-song hover:bg-palace-red-dark transition-colors"
                  >
                    重试
                  </button>
                </>
              ) : (
                <>
                  <p className="font-song text-deep-blue-light mb-4">暂无作品，快去创作吧</p>
                  <button
                    onClick={() => navigate('/create')}
                    className="px-6 py-2 bg-palace-red text-rice-paper rounded-sm font-song hover:bg-palace-red-dark transition-colors"
                  >
                    去创作
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <FrameDecorations className="bg-rice-paper-light p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {generations.map((generation, index) => (
                    <motion.div
                      key={generation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-rice-paper rounded-sm border border-deep-blue-100 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div
                        className="aspect-square bg-rice-paper-dark overflow-hidden cursor-pointer"
                        onClick={() => handleViewDetail(generation.id)}
                      >
                        <img
                          src={generation.image_url}
                          alt="纹样作品"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        {editingId === generation.id ? (
                          <div className="mb-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                              className="w-full px-2 py-1 bg-rice-paper border border-palace-red rounded-sm font-shufa text-sm text-deep-blue focus:outline-none"
                              maxLength={50}
                              autoFocus
                            />
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={saveEdit}
                                className="px-2 py-0.5 bg-palace-red text-rice-paper text-xs font-song rounded-sm"
                              >
                                保存
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 py-0.5 bg-deep-blue-100 text-deep-blue text-xs font-song rounded-sm"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-shufa text-sm text-deep-blue truncate flex-1" title={generation.params?.title}>
                              {generation.params?.title || `纹样作品 #${generation.id.slice(0, 8)}`}
                            </h3>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleFavorite(generation.id)}
                                className={`p-1 transition-colors ${
                                  favoriteIds.has(generation.id) ? 'text-palace-red' : 'text-deep-blue-light hover:text-palace-red'
                                }`}
                              >
                                <svg className="w-4 h-4" fill={favoriteIds.has(generation.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => startEdit(generation)}
                                className="p-1 text-deep-blue-light hover:text-palace-red transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(generation.id)}
                                className="p-1 text-deep-blue-light hover:text-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {generation.params?.tags && generation.params.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {generation.params.tags.slice(0, 3).map((tag: string, index: number) => (
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
                            {new Date(generation.created_at).toLocaleDateString('zh-CN')}
                          </span>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={generation.is_public}
                              onChange={() => handlePublicToggle(generation.id, generation.is_public)}
                              className="w-4 h-4 text-palace-red border-deep-blue-200 rounded-sm focus:ring-palace-red"
                            />
                            <span className="ml-2 font-song text-xs text-deep-blue-light">公开</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload(generation.image_url)}
                            className="flex-1 py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                          >
                            下载
                          </button>
                          <button
                            onClick={() => handleViewDetail(generation.id)}
                            className="flex-1 py-1.5 bg-deep-blue-50 border border-deep-blue-200 rounded-sm font-song text-xs text-deep-blue hover:bg-deep-blue-100 transition-colors"
                          >
                            查看
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </FrameDecorations>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}