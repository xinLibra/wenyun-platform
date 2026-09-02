import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FrameDecorations } from './decorations/CornerDecorations'
import { PatternDnaRadar } from './PatternDnaRadar'
import { mockPatternDna } from '../mock/patternDna'
import { supabase } from '../lib/supabase'
import { PATTERN_PLACEHOLDER, isPlaceholderUrl } from '../lib/imageLoader'
import { Button } from './ui/Button'
import { downloadImageViaProxy } from '../utils/downloadImage'

export interface WorkDetailModalWork {
  id: string
  title: string
  tags?: string[]
  author?: string
  image?: string
  createdAt?: string
}

interface WorkDetailModalProps {
  work: WorkDetailModalWork | null
  onClose: () => void
  /** 传入则显示「分享」按钮（公开作品用 /gallery/:id 链接） */
  shareUrl?: string
  isFavorite?: boolean
  favoriteCount?: number
  onToggleFavorite?: (id: string) => void
}

/**
 * 通用作品详情弹窗：大图、标题、标签、作者、纹样DNA、下载；
 * 支持 遮罩点击 / × / Esc 关闭；图片按需取（列表已有图直接用，否则按 id 单条拉）。
 */
export default function WorkDetailModal({
  work,
  onClose,
  shareUrl,
  isFavorite = false,
  favoriteCount = 0,
  onToggleFavorite,
}: WorkDetailModalProps) {
  const [imgSrc, setImgSrc] = useState('')
  const [showDna, setShowDna] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // 打开弹窗时按需取图：列表已带图（http 短链或 data:）直接用，否则按 id 单条取
  useEffect(() => {
    let cancelled = false
    if (!work) {
      setImgSrc('')
      setShowDna(false)
      return
    }
    setShowDna(false)
    if (work.image && work.image !== '') {
      setImgSrc(work.image)
      return
    }
    setImgSrc('')
    supabase
      .from('generations')
      .select('image_url')
      .eq('id', work.id)
      .eq('is_deleted', false)
      .single()
      .then(
        ({ data }) => {
          if (!cancelled && (data as any)?.image_url) setImgSrc((data as any).image_url)
        },
        () => {
          // 单条失败保持占位，不阻塞弹窗
        }
      )
    return () => {
      cancelled = true
    }
  }, [work])

  // Esc 关闭
  useEffect(() => {
    if (!work) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [work, onClose])

  const handleDownload = async () => {
    if (!work) return
    let url = imgSrc || work.image || ''
    if (!url) {
      try {
        const { data } = await supabase
          .from('generations')
          .select('image_url')
          .eq('id', work.id)
          .eq('is_deleted', false)
          .single()
        url = (data as any)?.image_url || ''
      } catch {
        // 忽略，交给下方提示
      }
    }
    if (!url) {
      alert('图片暂未加载完成，请稍后重试')
      return
    }
    setDownloading(true)
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      if (isMobile) {
        window.open(`/.netlify/functions/download?url=${encodeURIComponent(url)}`, '_blank')
        return
      }
      // 经 download 函数中转并校验文件头/大小，失败抛错不落盘
      await downloadImageViaProxy(url, `wenyun_pattern_${(work.id || '').slice(0, 8) || Date.now()}.png`)
    } catch (error) {
      console.error('[WorkDetailModal] 下载失败:', error)
      alert((error as Error)?.message || '下载失败，请尝试右键图片另存为')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = () => {
    if (!work || !shareUrl) return
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
    <AnimatePresence>
      {work && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
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
                <div className="pr-10">
                  <h2 className="font-shufa text-2xl text-deep-blue">{work.title}</h2>
                  {work.tags && work.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {work.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-deep-blue-50 text-deep-blue-light text-xs font-song rounded-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="font-song text-deep-blue-light mt-2">
                    作者: {work.author || '匿名'}
                    {work.createdAt && ` · ${new Date(work.createdAt).toLocaleDateString('zh-CN')}`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center hover:bg-deep-blue-100 rounded-full transition-colors z-10"
                  aria-label="关闭"
                >
                  <svg className="w-6 h-6 text-deep-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="aspect-square max-h-[45vh] w-auto mx-auto bg-rice-paper-dark rounded-sm overflow-hidden mb-4">
                {isPlaceholderUrl(imgSrc) ? (
                  <img src={PATTERN_PLACEHOLDER} alt={work.title} className="w-full h-full object-cover" />
                ) : (
                  <img src={imgSrc} alt={work.title} className="w-full h-full object-cover" />
                )}
              </div>

              <div className="flex items-center justify-end py-4 border-t border-deep-blue-100">
                <div className="flex gap-3">
                  {onToggleFavorite && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleFavorite(work.id)}
                      className={isFavorite ? 'text-palace-red border-palace-red' : ''}
                    >
                      {isFavorite ? '已收藏' : '收藏'} · {favoriteCount}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                    下载
                  </Button>
                  {shareUrl && (
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      分享
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowDna(!showDna)}
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
                    animate={{ rotate: showDna ? 180 : 0 }}
                    className="w-5 h-5 text-palace-red flex-shrink-0"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: showDna ? 'auto' : 0, opacity: showDna ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <PatternDnaRadar dna={mockPatternDna} patternName={work.title} />
                  </div>
                </motion.div>
              </div>
            </FrameDecorations>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
