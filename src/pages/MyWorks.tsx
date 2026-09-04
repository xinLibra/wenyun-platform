import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase, Generation } from '../lib/supabase'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { useFavorites } from '../context/FavoriteContext'
import { withTimeout, classifyError, sleep, logSupabaseConfig } from '../lib/async'
import {
  PATTERN_PLACEHOLDER,
  isPlaceholderUrl,
  loadImagesConcurrently,
  fetchHttpImageUrls,
  fetchGenerationImage,
} from '../lib/imageLoader'
import WorkDetailModal from '../components/WorkDetailModal'
import { downloadImageAsFormat, downloadImageViaProxy } from '../utils/downloadImage'

const SESSION_TIMEOUT_MS = 20000
const DB_TIMEOUT_MS = 25000
const FAV_TIMEOUT_MS = 5000
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

/** 列表查询行 → 前端 Generation 子集（列表不投影 image_url，置空待补图回填） */
function rowToGeneration(row: any): any {
  return {
    id: row.id,
    image_url: '',
    is_public: row.is_public,
    created_at: row.created_at,
    params: {
      title: row.title ?? '',
      tags: Array.isArray(row.tags) ? row.tags : [],
    },
  }
}

/**
 * 单卡缩略图：纯展示组件，不自己发请求（避免组件级 effect 被反复 cleanup 导致永不更新）。
 * - 有真实图（http 短链 / data: base64）→ 直接渲染
 * - 失败 → 显示「加载失败」+ 重试按钮
 * - 否则 → 占位图（等待页面级补图回填）
 */
function WorkImage({
  generation,
  failed,
  onRetry,
}: {
  generation: Generation
  failed: boolean
  onRetry: () => void
}) {
  const url = generation.image_url
  if (!isPlaceholderUrl(url)) {
    return <img src={url} alt="纹样作品" className="w-full h-full object-cover" />
  }
  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-rice-paper-dark">
        <span className="font-song text-xs text-deep-blue-light">加载失败</span>
        <button
          onClick={onRetry}
          className="px-3 py-1 bg-palace-red text-rice-paper rounded-sm font-song text-xs hover:bg-palace-red-dark transition-colors"
        >
          重试
        </button>
      </div>
    )
  }
  return <img src={PATTERN_PLACEHOLDER} alt="纹样作品" className="w-full h-full object-cover" />
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
  const [detailWork, setDetailWork] = useState<Generation | null>(null)
  const [failedIds, setFailedIds] = useState<Set<string>>(() => new Set())
  const [retryTick, setRetryTick] = useState(0)
  // failedIds 只作补图过滤依据，不进 effect 依赖：失败后不重跑补图（避免重试风暴），手动重试由 retryTick 触发
  const failedIdsRef = useRef(failedIds)
  failedIdsRef.current = failedIds
  // 分页：首次 20 条 +「加载更多」追加（range 多取 1 条探测 hasMore）
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  // 当前用户 id 存入 ref：loadMore 复用，无需重新取会话
  const userIdRef = useRef<string | null>(null)

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

        // 拉取作品：自动重试 3 次，每次 25s 兜底超时
        let rows: any[] = []
        let lastError: any = null
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const { data, error } = await withTimeout(
              supabase
                .from('generations')
                // 列表不拉 image_url（历史 data: base64 大字段合计可达数十 MB，是 statement timeout 元凶），
                // 缩略图用占位，查看详情 / 下载时再按 id 单条取
                .select('id, is_public, created_at, title:params->>title, tags:params->tags')
                .eq('user_id', userId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                // 首次 20 条：range 端点含首尾，多取 1 条探测是否还有更多
                .range(0, 20),
              DB_TIMEOUT_MS,
              '获取作品'
            )
            if (error) throw error
            rows = (data ?? []).slice(0, 20).map(rowToGeneration)
            if (mounted) setHasMore((data?.length ?? 0) > 20)
            userIdRef.current = userId
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
              // 缓存满一页（20 条）时也可能还有更多，允许继续加载更多
              setHasMore(cached.length >= 20)
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

        // 列表优先秒出：先渲染（favorite_count 默认 0），点赞数后台异步补，绝不让它阻塞列表
        const baseRows = rows.map((gen) => ({
          ...gen,
          favorite_count: 0
        })) as unknown as Generation[]
        writeWorksCache(userId, baseRows)

        if (mounted) {
          setGenerations(baseRows)
          setError('')
          setStaleNotice(false)
        }

        // 后台补点赞数（独立 5s 短超时，失败仅打一次日志，不影响列表渲染）
        const generationIds = rows.map((gen) => gen.id)
        if (generationIds.length > 0) {
          withTimeout(
            supabase
              .from('favorites')
              .select('generation_id')
              .in('generation_id', generationIds),
            FAV_TIMEOUT_MS,
            '获取点赞数'
          )
            .then((res: any) => {
              if (!mounted) return
              const favError = res?.error
              if (favError) {
                console.error('[MyWorks] query favorites failed:', favError?.message ?? favError, favError)
                return
              }
              const favoritesData = res?.data
              if (!favoritesData) return
              const favoriteCounts: Record<string, number> = {}
              favoritesData.forEach((fav: { generation_id: string }) => {
                favoriteCounts[fav.generation_id] = (favoriteCounts[fav.generation_id] || 0) + 1
              })
              setGenerations((prev) =>
                prev.map((g) => ({ ...g, favorite_count: favoriteCounts[g.id] || 0 }))
              )
            })
            .catch((favErr: any) => {
              if (!mounted) return
              console.error('[MyWorks] favorites query threw:', favErr?.message ?? favErr, favErr)
            })
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

  // 列表渲染后补图（一条链路，不重复请求）：
  // 1) 先批量预取 Storage 短链（http 行直接 img src 显示，不走 base64 下载）；
  // 2) 仅剩的 data: base64 历史行再按 id 严格串行补拉（并发 1、单条 45s）。
  // 成功 → setState 回填该卡 src 替换占位；失败 → 标记 failedIds（不做自动重试），卡片显示「加载失败」可手动重试。
  // 依赖只取 isLoading/retryTick：数据就绪时跑一次、手动点重试时再跑。
  // failedIds 经 ref 读取（不放进依赖）：失败后不重跑本 effect，杜绝同一 id 反复 FAIL 的重试风暴。
  // 每 id 的 ok/fail 只由 [imageLoader] 打一次（不在此重复打印，减少刷屏）。
  useEffect(() => {
    if (isLoading) return
    let cancelled = false
    const run = async () => {
      const ids = generations.map((g) => g.id)
      // 1) 短链预取：http 行直接回填，不需要走逐条补拉
      const shortMap = ids.length > 0 ? await fetchHttpImageUrls(ids) : {}
      if (cancelled) return
      if (Object.keys(shortMap).length > 0) {
        setGenerations((prev) =>
          prev.map((g) => (shortMap[g.id] ? { ...g, image_url: shortMap[g.id] } : g))
        )
      }
      // 2) 仍占位的 data: base64 历史行：严格串行补拉（并发 1、单条 45s）
      const pendingIds = generations
        .filter(
          (g) => isPlaceholderUrl(g.image_url) && !shortMap[g.id] && !failedIdsRef.current.has(g.id)
        )
        .map((g) => g.id)
      if (pendingIds.length === 0) return
      await loadImagesConcurrently(
        pendingIds,
        (id, url) => {
          if (cancelled) return
          setGenerations((prev) => prev.map((g) => (g.id === id ? { ...g, image_url: url } : g)))
        },
        1,
        (id) => {
          if (cancelled) return
          setFailedIds((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
        },
        45000
      )
    }
    run()
    // 只在页面卸载时取消回调；不随每次渲染取消已发出的请求
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, retryTick])

  const handlePublicToggle = async (generationId: string, currentPublic: boolean) => {
    const newValue = !currentPublic
    setGenerations((prev) =>
      prev.map((g) => (g.id === generationId ? { ...g, is_public: newValue } : g))
    )

    // 设公开时同步「最近一次公开时间」，供 Gallery「最新发布」排序；
    // 取消公开时不动 published_at（保留最后一次公开的时间戳，避免老公开作品沉底）
    const updatePayload: { is_public: boolean; published_at?: string } = { is_public: newValue }
    if (newValue) {
      updatePayload.published_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('generations')
      .update(updatePayload)
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
      // 软删除：不物理删除 generations（避免外键失败、保留 favorites 关联），标记已删并取消公开
      const { error } = await supabase
        .from('generations')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          is_public: false,
        })
        .eq('id', generationId)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Delete error:', error)
        alert(`删除失败: ${error.message || '请重试'}`)
      } else {
        // 本地列表移除 + 同步更新缓存，避免刷新后缓存把已删作品重新带回来
        const next = generations.filter(g => g.id !== generationId)
        setGenerations(next)
        writeWorksCache(session.user.id, next)
        refreshFavorites()
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('删除失败，请重试')
    }
  }

  /** 加载更多：按当前列表长度 offset 追加下一页 20 条 */
  const handleLoadMore = async () => {
    const userId = userIdRef.current
    if (!userId || loadingMore) return
    const offset = generations.length
    setLoadingMore(true)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('generations')
          .select('id, is_public, created_at, title:params->>title, tags:params->tags')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + 20),
        DB_TIMEOUT_MS,
        '加载更多'
      )
      if (error) throw error
      const newRows = (data ?? []).slice(0, 20).map(rowToGeneration)
      setHasMore((data?.length ?? 0) > 20)
      if (newRows.length > 0) {
        setGenerations((prev) => {
          const next = [...prev, ...newRows]
          writeWorksCache(userId, next)
          return next
        })
        // 追加新卡后重新触发补图 effect，为新增卡片回填缩略图
        setRetryTick((t) => t + 1)
      }
    } catch (e: any) {
      console.error('[MyWorks] load more failed:', e?.message ?? e)
      alert('加载更多失败，请重试')
    } finally {
      setLoadingMore(false)
    }
  }

  /** 按 id 单条取 image_url（下载时用；列表页不拉大字段） */
  const fetchImageUrl = async (generationId: string): Promise<string> => {
    const { data, error } = await withTimeout(
      supabase.from('generations').select('image_url').eq('id', generationId).eq('is_deleted', false).single(),
      DB_TIMEOUT_MS,
      '获取图片'
    )
    if (error) throw error
    if (!data?.image_url) throw new Error('该作品没有可下载的图片')
    return data.image_url
  }

  const handleDownload = async (generation: Generation, format: 'png' | 'jpg') => {
    let imageUrl = generation.image_url
    if (isPlaceholderUrl(imageUrl)) {
      try {
        imageUrl = await fetchImageUrl(generation.id)
      } catch (e: any) {
        console.error('[MyWorks] fetch image for download failed:', e?.message ?? e, e)
        alert('获取图片失败，请稍后重试')
        return
      }
    }

    const filename = `wenyun_pattern_${(generation.id || '').slice(0, 8) || Date.now()}.${format === 'png' ? 'png' : 'jpg'}`
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
        console.warn('[MyWorks] direct download failed, fallback to proxy/open:', directErr)
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
      console.error('[MyWorks] 下载失败:', error)
      alert((error as Error)?.message || '下载失败，请尝试右键图片另存为')
    }
  }

  const handleViewDetail = async (generation: Generation) => {
    let target = generation
    // 详情大图需要真实 image_url：若列表还没取到，先单条补拉（15s 超时，失败仍打开占位）
    if (isPlaceholderUrl(target.image_url)) {
      try {
        const imgUrl = await fetchGenerationImage(target.id, 45000)
        target = { ...target, image_url: imgUrl }
        setGenerations((prev) => prev.map((g) => (g.id === target.id ? target : g)))
      } catch (e: any) {
        console.warn('[MyWorks] fetch detail image failed:', e?.message ?? e)
      }
    }
    setDetailWork(target)
  }

  /** 卡片「加载失败 → 重试」：解除失败标记并触发补图 effect 重新拉取 */
  const handleRetryImage = (id: string) => {
    setFailedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setRetryTick((t) => t + 1)
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
                        onClick={() => handleViewDetail(generation)}
                      >
                        <WorkImage
                          generation={generation}
                          failed={failedIds.has(generation.id)}
                          onRetry={() => handleRetryImage(generation.id)}
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
                          <div className="flex flex-1 gap-1">
                            <button
                              onClick={() => handleDownload(generation, 'png')}
                              className="flex-1 py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                            >
                              PNG
                            </button>
                            <button
                              onClick={() => handleDownload(generation, 'jpg')}
                              className="flex-1 py-1.5 bg-rice-paper border border-palace-red rounded-sm font-song text-xs text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors"
                            >
                              JPG
                            </button>
                          </div>
                          <button
                            onClick={() => handleViewDetail(generation)}
                            className="flex-1 py-1.5 bg-deep-blue-50 border border-deep-blue-200 rounded-sm font-song text-xs text-deep-blue hover:bg-deep-blue-100 transition-colors"
                          >
                            查看
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-8 py-2 bg-rice-paper border border-palace-red rounded-sm font-song text-palace-red hover:bg-palace-red hover:text-rice-paper transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? '加载中...' : '加载更多'}
                    </button>
                  </div>
                )}
              </FrameDecorations>
            </motion.div>
          )}
        </motion.div>
      </div>

      <WorkDetailModal
        work={
          detailWork
            ? {
                id: detailWork.id,
                title: detailWork.params?.title || `纹样作品 #${detailWork.id.slice(0, 8)}`,
                tags: detailWork.params?.tags || [],
                author: '我的作品',
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