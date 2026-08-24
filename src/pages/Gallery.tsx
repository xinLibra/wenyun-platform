import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { supabase } from '../lib/supabase'
import { useFavorites } from '../context/FavoriteContext'
import { PatternDnaRadar } from '../components/PatternDnaRadar'
import { mockPatternDna } from '../mock/patternDna'
import { PATTERN_THEMES, type PatternThemeId } from '../data/patternTaxonomy'

interface GalleryWork {
  id: string
  title: string
  author: string
  category: string
  likes: number
  image: string
  created_at: string
  tags: string[]
  favoriteCount: number
  /** 主题：floral | beast；旧数据无此字段（只出现在「全部」） */
  theme?: string
  /** 子类 id，与 patternTaxonomy 的 subcategories.id 一致 */
  subcategory?: string
  /** 'fusion' = 纹样融合；普通单类生成为 'ai' */
  source?: string
}

/**
 * 旧数据兼容：无 theme/subcategory 字段时，从 tags 反查子类中文名（与 PATTERN_THEMES label 一致），
 * 映射回主题 + 子类 id，使旧作品也能被花卉/瑞兽子类筛选命中；匹配不到则归入「全部」。
 */
function resolveWorkMeta(work: GalleryWork): { theme?: string; subcategory?: string } {
  if (work.theme) {
    return { theme: work.theme, subcategory: work.subcategory }
  }
  for (const theme of PATTERN_THEMES) {
    for (const sub of theme.subcategories) {
      if ((work.tags || []).includes(sub.label)) {
        return { theme: theme.id, subcategory: sub.id }
      }
    }
  }
  return { theme: work.theme, subcategory: work.subcategory }
}

export default function Gallery() {
  const { id: detailId } = useParams<{ id?: string }>()
  const location = useLocation()
  const { favoriteIds, toggleFavorite } = useFavorites()
  /** 筛选：all | floral | beast | fusion；activeSubcategory 为空 = 该主题下全部子类 */
  const [activeFilter, setActiveFilter] = useState<'all' | PatternThemeId | 'fusion'>('all')
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null)
  const [showDnaAnalysis, setShowDnaAnalysis] = useState(false)
  const [sortBy, setSortBy] = useState('latest')
  const [page, setPage] = useState(1)
  const [works, setWorks] = useState<GalleryWork[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const itemsPerPage = 8

  const fetchWorks = async () => {
    setIsLoading(true)
    try {
      // 详情模式：按 id 单条取，避免全量拉 image_url（历史 data: base64 大字段会拖垮列表查询 / 触发 statement timeout）
      if (detailId) {
        const { data: gen, error: genErr } = await supabase
          .from('generations')
          .select('id, image_url, is_public, created_at, user_id, style_id, author_nickname, params')
          .eq('id', detailId)
          .maybeSingle()

        if (genErr) {
          console.error('Failed to fetch work detail:', genErr)
          setWorks([])
          setSelectedWork(null)
        } else if (gen) {
          const g = gen as any
          let favCount = 0
          const { data: favRows } = await supabase
            .from('favorites')
            .select('generation_id')
            .eq('generation_id', g.id)
          if (favRows) favCount = favRows.length

          const work: GalleryWork = {
            id: g.id,
            title: g.params?.title || `纹样作品 #${g.id.slice(0, 8)}`,
            author: g.author_nickname || '用户',
            category: g.style_id || 'custom',
            likes: 0,
            image: g.image_url,
            created_at: g.created_at,
            tags: g.params?.tags || [],
            favoriteCount: favCount,
            theme: g.params?.theme,
            subcategory: g.params?.subcategory,
            source: g.params?.source || (g.params?.fusion ? 'fusion' : undefined),
          }
          setWorks([work])
          setSelectedWork(work)
        } else {
          setWorks([])
          setSelectedWork(null)
        }
        setIsLoading(false)
        return
      }

      const { data: generationsData } = await supabase
        .from('generations')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (generationsData) {
        const userIds = [...new Set(generationsData.map((gen: any) => gen.user_id))]
        const generationIds = generationsData.map((gen: any) => gen.id)
        
        let userNicknames: Record<string, string> = {}
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, nickname')
            .in('id', userIds)

          if (profilesData) {
            profilesData.forEach((p: any) => {
              userNicknames[p.id] = p.nickname || ''
            })
          }
        }

        const favoriteCounts: Record<string, number> = {}
        if (generationIds.length > 0) {
          const { data: favoritesData } = await supabase
            .from('favorites')
            .select('generation_id')
            .in('generation_id', generationIds)

          if (favoritesData && favoritesData.length > 0) {
            favoritesData.forEach((fav: any) => {
              favoriteCounts[fav.generation_id] = (favoriteCounts[fav.generation_id] || 0) + 1
            })
          }
        }

        generationIds.forEach(id => {
          if (!favoriteCounts[id]) {
            favoriteCounts[id] = 0
          }
        })

        const transformed: GalleryWork[] = generationsData.map((gen: any) => {
          const profileNickname = userNicknames[gen.user_id]
          const authorName = profileNickname || gen.author_nickname || '用户'
          
          return {
            id: gen.id,
            title: gen.params?.title || `纹样作品 #${gen.id.slice(0, 8)}`,
            author: authorName,
            category: gen.style_id || 'custom',
            likes: Math.floor(Math.random() * 300) + 50,
            image: gen.image_url,
            created_at: gen.created_at,
            tags: gen.params?.tags || [],
            favoriteCount: favoriteCounts[gen.id] || 0,
            // 主题/子类/来源从保存时的 params 元数据读取（无对应列，统一走 JSONB）
            theme: gen.params?.theme,
            subcategory: gen.params?.subcategory,
            // 兼容：新数据写 source:'fusion'；旧数据通过 params.fusion 是否存在识别
            source: gen.params?.source || (gen.params?.fusion ? 'fusion' : undefined),
          }
        })
        setWorks(transformed)

        if (detailId) {
          const foundWork = transformed.find(w => w.id === detailId)
          if (foundWork) {
            setSelectedWork(foundWork)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch works:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorks()
  }, [detailId, location.pathname])

  /** 主题 + 子类 + 融合筛选（本地过滤：数据已全量拉取，切换筛选不重新请求、不整页转圈） */
  const filteredWorks = () => {
    if (activeFilter === 'fusion') {
      return works.filter(w => w.source === 'fusion')
    }
    if (activeFilter === 'floral' || activeFilter === 'beast') {
      return works.filter(w => {
        const meta = resolveWorkMeta(w)
        if (meta.theme !== activeFilter) return false
        if (activeSubcategory) return meta.subcategory === activeSubcategory
        return true
      })
    }
    return works
  }

  const sortedWorks = [...filteredWorks()].sort((a, b) => {
    if (sortBy === 'latest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sortBy === 'popular') return b.favoriteCount - a.favoriteCount
    return 0
  })

  const paginatedWorks = sortedWorks.slice(0, page * itemsPerPage)
  const hasMore = paginatedWorks.length < sortedWorks.length

  /** 当前选中的主题（决定子类横排 chip 行是否显示及其内容） */
  const activeTheme =
    activeFilter === 'floral' || activeFilter === 'beast'
      ? PATTERN_THEMES.find(t => t.id === activeFilter)
      : null

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  const handleFavorite = async (workId: string) => {
    const result = await toggleFavorite(workId)
    if (result.success) {
      setWorks(prev => prev.map(work => 
        work.id === workId ? { ...work, favoriteCount: result.count } : work
      ))
      setSelectedWork(prev => prev && prev.id === workId 
        ? { ...prev, favoriteCount: result.count }
        : prev
      )
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

  const handleShare = (work: GalleryWork) => {
    const shareUrl = `${window.location.origin}/gallery/${work.id}`
    if (navigator.share) {
      try {
        navigator.share({ title: work.title, url: shareUrl })
      } catch {
        // 用户取消分享，忽略
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('链接已复制到剪贴板')
    }
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
            作品展示
          </motion.h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">欣赏来自世界各地设计师的优秀非遗纹样作品</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {/* 全部：清空主题 / 子类 / 融合筛选 */}
            <button
              onClick={() => {
                setActiveFilter('all')
                setActiveSubcategory(null)
                setPage(1)
              }}
              className={`px-5 py-2 rounded-sm font-song transition-all duration-300 ${
                activeFilter === 'all'
                  ? 'bg-palace-red text-rice-paper shadow-md'
                  : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
              }`}
            >
              全部
            </button>

            {/* 主题：花卉 / 瑞兽（点主题名按主题筛，子类走下方横排 chip） */}
            {PATTERN_THEMES.map((theme) => {
              const isActive = activeFilter === theme.id
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    setActiveFilter(theme.id)
                    setActiveSubcategory(null)
                    setPage(1)
                  }}
                  className={`px-5 py-2 rounded-sm font-song transition-all duration-300 ${
                    isActive
                      ? 'bg-palace-red text-rice-paper shadow-md'
                      : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                  }`}
                >
                  {theme.label}
                </button>
              )
            })}

            {/* 纹样融合：无子类，直接筛融合作品 */}
            <button
              onClick={() => {
                setActiveFilter('fusion')
                setActiveSubcategory(null)
                setPage(1)
              }}
              className={`px-5 py-2 rounded-sm font-song transition-all duration-300 ${
                activeFilter === 'fusion'
                  ? 'bg-palace-red text-rice-paper shadow-md'
                  : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
              }`}
            >
              纹样融合
            </button>
          </div>

          {/* 主题子类横排 chip 行（可左右滑动）：选中花卉/瑞兽后出现在按钮下方 */}
          {activeTheme && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 overflow-x-auto pb-1 mt-2 mb-1 max-w-4xl mx-auto"
            >
              <button
                onClick={() => {
                  setActiveSubcategory(null)
                  setPage(1)
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-sm font-song text-sm transition-all duration-300 whitespace-nowrap ${
                  activeSubcategory === null
                    ? 'bg-palace-red text-rice-paper shadow-md'
                    : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                }`}
              >
                全部{activeTheme.label}
              </button>
              {activeTheme.subcategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubcategory(sub.id)
                    setPage(1)
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-sm font-song text-sm transition-all duration-300 whitespace-nowrap ${
                    activeSubcategory === sub.id
                      ? 'bg-palace-red text-rice-paper shadow-md'
                      : 'bg-rice-paper border border-deep-blue-200 text-deep-blue hover:border-palace-red hover:text-palace-red'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>

        <div className="flex justify-end mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('latest')}
              className={`px-4 py-2 rounded-sm font-song text-sm transition-all duration-300 ${
                sortBy === 'latest'
                  ? 'bg-deep-blue text-rice-paper'
                  : 'bg-rice-paper border border-deep-blue-200 text-deep-blue'
              }`}
            >
              最新发布
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-4 py-2 rounded-sm font-song text-sm transition-all duration-300 ${
                sortBy === 'popular'
                  ? 'bg-deep-blue text-rice-paper'
                  : 'bg-rice-paper border border-deep-blue-200 text-deep-blue'
              }`}
            >
              最受欢迎
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto border-4 border-deep-blue-200 border-t-palace-red rounded-full animate-spin"></div>
            <p className="font-song text-deep-blue-light mt-4">加载中...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedWorks.map((work, index) => (
                <motion.div
                  key={work.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card hover bordered onClick={() => { setSelectedWork(work); setShowDnaAnalysis(false) }}>
                    <div className="aspect-square bg-rice-paper-dark mb-3 overflow-hidden">
                      <img
                        src={work.image}
                        alt={work.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="font-shufa text-lg text-deep-blue mb-1">{work.title}</h3>
                    {work.tags && work.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {work.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-deep-blue-50 text-deep-blue-light text-xs font-song rounded-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="font-song text-sm text-deep-blue-light mb-2">作者: {work.author}</p>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFavorite(work.id)
                        }}
                        className={`flex items-center gap-1 p-1 transition-colors ${
                          favoriteIds.has(work.id) ? 'text-palace-red' : 'text-deep-blue-light hover:text-palace-red'
                        }`}
                      >
                        <svg className="w-5 h-5" fill={favoriteIds.has(work.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span className="font-song text-sm">{work.favoriteCount}</span>
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {sortedWorks.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto bg-deep-blue/10 rounded-sm flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="font-song text-deep-blue-light">
                  {activeFilter === 'all'
                    ? '暂无公开作品'
                    : activeFilter === 'fusion'
                      ? '暂无融合作品公开'
                      : activeSubcategory
                        ? '暂无该子类公开作品'
                        : '暂无该主题公开作品'}
                </p>
              </div>
            )}

            {hasMore && (
              <div className="text-center mt-12">
                <Button variant="outline" onClick={handleLoadMore}>加载更多</Button>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedWork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedWork(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <FrameDecorations className="bg-rice-paper-light p-6 relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-shufa text-2xl text-deep-blue">{selectedWork.title}</h2>
                    {selectedWork.tags && selectedWork.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedWork.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-deep-blue-50 text-deep-blue-light text-xs font-song rounded-sm"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="font-song text-deep-blue-light mt-2">作者: {selectedWork.author}</p>
                  </div>
                  <button
                    onClick={() => setSelectedWork(null)}
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center hover:bg-deep-blue-100 rounded-full transition-colors z-10"
                  >
                    <svg className="w-6 h-6 text-deep-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="aspect-square max-h-[45vh] w-auto mx-auto bg-rice-paper-dark rounded-sm overflow-hidden mb-4">
                  <img
                    src={selectedWork.image}
                    alt={selectedWork.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex items-center justify-end py-4 border-t border-deep-blue-100">
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(selectedWork.image)}>下载</Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare(selectedWork)}>分享</Button>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => setShowDnaAnalysis(!showDnaAnalysis)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-palace-red/10 to-ming-yellow/10 border border-palace-red/30 rounded-sm hover:border-palace-red transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✦</span>
                      <div className="text-left">
                        <span className="font-shufa text-base text-deep-blue block">AI纹样DNA分析</span>
                        <span className="font-song text-xs text-deep-blue-light">查看这张纹样的智能特征解读</span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: showDnaAnalysis ? 180 : 0 }}
                      className="w-5 h-5 text-palace-red flex-shrink-0"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </motion.div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: showDnaAnalysis ? 'auto' : 0, opacity: showDnaAnalysis ? 1 : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4">
                      <PatternDnaRadar dna={mockPatternDna} patternName={selectedWork.title} />
                    </div>
                  </motion.div>
                </div>
              </FrameDecorations>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}