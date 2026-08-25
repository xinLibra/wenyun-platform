import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  POSTER_TEMPLATES,
  renderPoster,
  downloadPoster,
  formatToday,
  type PosterTemplateId,
} from '../lib/poster'
import { Button } from './ui/Button'

interface PosterModalProps {
  open: boolean
  onClose: () => void
  productName: string
  /** 主视觉（3D 截图或 2D 合成预览的 dataURL；null 表示还在生成中） */
  mainVisual: string | null
  /** 作品 id（供二维码「作品公开页」选项；无则禁用该选项） */
  workId?: string | null
  siteName?: string
}

const DEFAULT_LOGO = '/纹韵logo-透明背景.png'
const DEFAULT_SITE_NAME = '纹韵 · AI非遗纹样设计平台'

export function PosterModal({
  open,
  onClose,
  productName,
  mainVisual,
  workId,
  siteName = DEFAULT_SITE_NAME,
}: PosterModalProps) {
  const [templateId, setTemplateId] = useState<PosterTemplateId>('mo_yun')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [dateText, setDateText] = useState('')
  const [logoMode, setLogoMode] = useState<'default' | 'custom'>('default')
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO)
  const [qrTarget, setQrTarget] = useState<'home' | 'work' | 'custom'>('home')
  const [customUrl, setCustomUrl] = useState('')

  const [previewUrl, setPreviewUrl] = useState('')
  const [renderError, setRenderError] = useState('')
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 打开时初始化表单
  useEffect(() => {
    if (!open) return
    setTemplateId('mo_yun')
    setTitle(productName ? `${productName} · 定制` : '纹韵定制')
    setSubtitle('')
    setDateText(formatToday())
    setLogoMode('default')
    setLogoUrl(DEFAULT_LOGO)
    setQrTarget('home')
    setCustomUrl('')
    setPreviewUrl('')
    setRenderError('')
  }, [open, productName])

  // 二维码链接（可配置：平台首页 / 作品公开页 / 自定义）
  const qrValue = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (qrTarget === 'work' && workId) return `${origin}/gallery/${workId}`
    if (qrTarget === 'custom' && customUrl.trim()) return customUrl.trim()
    return `${origin}/`
  }, [qrTarget, workId, customUrl])

  // 合成海报（防抖，表单变化后自动重绘）
  useEffect(() => {
    if (!open || !mainVisual) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const template = POSTER_TEMPLATES.find((t) => t.id === templateId) ?? POSTER_TEMPLATES[0]
        const canvas = await renderPoster({
          template,
          title: title.trim() || (productName ? `${productName} · 定制` : '纹韵定制'),
          subtitle: subtitle.trim(),
          dateText: dateText || formatToday(),
          logoUrl,
          mainVisual,
          qrValue,
          siteName,
        })
        if (cancelled) return
        posterCanvasRef.current = canvas
        setPreviewUrl(canvas.toDataURL('image/png'))
        setRenderError('')
      } catch (e: any) {
        if (cancelled) return
        setRenderError(e?.message || '海报生成失败')
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, mainVisual, templateId, title, subtitle, dateText, logoUrl, qrValue, productName, siteName])

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setLogoUrl(String(reader.result))
      setLogoMode('custom')
    }
    reader.readAsDataURL(file)
  }

  const handleDownload = (format: 'png' | 'jpg') => {
    if (!posterCanvasRef.current) {
      setRenderError('海报尚未生成完成，请稍候再试')
      return
    }
    downloadPoster(posterCanvasRef.current, format)
  }

  const ready = !!mainVisual && !!previewUrl && !renderError

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-rice-paper w-full max-w-4xl rounded-sm shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-deep-blue-100">
              <h2 className="font-shufa text-2xl text-deep-blue">生成海报</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-sm border border-deep-blue-200 text-deep-blue hover:bg-deep-blue-50 transition-colors text-lg leading-none"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* 左侧：表单 */}
              <div className="flex flex-col gap-5">
                {/* 背景模板 */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">背景模板</label>
                  <div className="grid grid-cols-5 gap-2">
                    {POSTER_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateId(t.id)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-sm border-2 transition-all ${
                          templateId === t.id
                            ? 'border-palace-red shadow-md'
                            : 'border-deep-blue-100 hover:border-deep-blue-light'
                        }`}
                      >
                        <span
                          className="w-full h-10 rounded-sm border border-black/10"
                          style={{ background: `linear-gradient(180deg, ${t.bgFrom}, ${t.bgTo})` }}
                        />
                        <span className="font-song text-xs text-deep-blue">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 文案 */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">
                    标题 <span className="text-deep-blue-light">（{title.length}/12）</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 12))}
                    maxLength={12}
                    placeholder="例如：祥瑞云纹 · 定制书签"
                    className="w-full px-3 py-2 border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:border-palace-red outline-none"
                  />
                </div>

                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">
                    一句话 <span className="text-deep-blue-light">（{subtitle.length}/30）</span>
                  </label>
                  <input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value.slice(0, 30))}
                    maxLength={30}
                    placeholder="例如：千年纹样，落于日常"
                    className="w-full px-3 py-2 border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:border-palace-red outline-none"
                  />
                </div>

                {/* 日期（自动） */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">
                    日期 <span className="text-deep-blue-light">（自动生成）</span>
                  </label>
                  <input
                    value={dateText}
                    readOnly
                    className="w-full px-3 py-2 border border-deep-blue-100 rounded-sm font-song text-deep-blue-light bg-deep-blue-50"
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">网站 Logo</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setLogoMode('default')
                        setLogoUrl(DEFAULT_LOGO)
                      }}
                      className={`px-3 py-1.5 rounded-sm border-2 font-song text-sm transition-all ${
                        logoMode === 'default'
                          ? 'border-palace-red text-palace-red'
                          : 'border-deep-blue-100 text-deep-blue'
                      }`}
                    >
                      使用默认
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-3 py-1.5 rounded-sm border-2 font-song text-sm transition-all ${
                        logoMode === 'custom'
                          ? 'border-palace-red text-palace-red'
                          : 'border-deep-blue-100 text-deep-blue'
                      }`}
                    >
                      上传 Logo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    />
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="logo"
                        className="h-8 w-auto object-contain border border-deep-blue-100 rounded-sm p-0.5"
                      />
                    )}
                  </div>
                </div>

                {/* 二维码链接 */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">二维码链接</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3 flex-wrap">
                      <label className="flex items-center gap-1.5 font-song text-sm text-deep-blue cursor-pointer">
                        <input
                          type="radio"
                          checked={qrTarget === 'home'}
                          onChange={() => setQrTarget('home')}
                        />
                        平台首页
                      </label>
                      <label
                        className={`flex items-center gap-1.5 font-song text-sm cursor-pointer ${
                          workId ? 'text-deep-blue' : 'text-deep-blue-light'
                        }`}
                      >
                        <input
                          type="radio"
                          checked={qrTarget === 'work'}
                          disabled={!workId}
                          onChange={() => setQrTarget('work')}
                        />
                        作品公开页
                      </label>
                      <label className="flex items-center gap-1.5 font-song text-sm text-deep-blue cursor-pointer">
                        <input
                          type="radio"
                          checked={qrTarget === 'custom'}
                          onChange={() => setQrTarget('custom')}
                        />
                        自定义
                      </label>
                    </div>
                    {qrTarget === 'custom' && (
                      <input
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value.slice(0, 200))}
                        placeholder="https://…"
                        className="w-full px-3 py-2 border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:border-palace-red outline-none"
                      />
                    )}
                    {qrTarget === 'work' && !workId && (
                      <p className="font-song text-xs text-palace-red">当前未关联作品，暂不可选</p>
                    )}
                  </div>
                </div>

                {/* 操作 */}
                <div className="flex gap-2 mt-1">
                  <Button variant="primary" onClick={() => handleDownload('png')} disabled={!ready} className="flex-1">
                    下载 PNG
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload('jpg')} disabled={!ready} className="flex-1">
                    下载 JPG
                  </Button>
                </div>
                {renderError && (
                  <p className="font-song text-sm text-palace-red">{renderError}</p>
                )}
              </div>

              {/* 右侧：预览 */}
              <div className="flex flex-col gap-3">
                <label className="font-song text-sm text-deep-blue">预览（1080 × 1440）</label>
                <div className="flex-1 min-h-[420px] bg-rice-paper-dark rounded-sm border border-deep-blue-100 flex items-center justify-center overflow-hidden p-3">
                  {!mainVisual ? (
                    <p className="font-song text-deep-blue-light">正在生成主视觉…</p>
                  ) : previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="海报预览"
                      className="max-h-[70vh] w-auto max-w-full object-contain rounded-sm shadow-lg"
                    />
                  ) : (
                    <p className="font-song text-deep-blue-light">海报合成中…</p>
                  )}
                </div>
                <p className="font-song text-xs text-deep-blue-light">
                  主视觉优先使用 3D 截图；未启用 3D 时自动使用定制合成效果图。
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
