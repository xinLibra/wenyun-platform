import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  POSTER_TEMPLATES,
  POSTER_FONT_OPTIONS,
  renderPoster,
  downloadPoster,
  formatToday,
  ELEMENT_BOUNDS,
  DEFAULT_TITLE_EL,
  DEFAULT_SUBTITLE_EL,
  DEFAULT_DATE_EL,
  type PosterTemplateId,
  type PosterFontKey,
  type PosterTextElement,
  type RenderedElements,
  POSTER_WIDTH,
} from '../lib/poster'
import { Button } from './ui/Button'

interface PosterModalProps {
  open: boolean
  onClose: () => void
  productName: string
  /** 主视觉（3D 截图或 2D 合成预览的 dataURL；null 表示还在生成中） */
  mainVisual: string | null
  siteName?: string
}

const DEFAULT_LOGO = '/logo-icon.svg'
const DEFAULT_SITE_NAME = '纹韵 · AI非遗纹样设计平台'

/** 各元素字号范围 */
const SIZE_RANGE: Record<'title' | 'subtitle' | 'date', { min: number; max: number }> = {
  title: { min: 40, max: 120 },
  subtitle: { min: 18, max: 56 },
  date: { min: 18, max: 48 },
}

type DragKey = 'title' | 'subtitle' | 'date'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export function PosterModal({
  open,
  onClose,
  productName,
  mainVisual,
  siteName = DEFAULT_SITE_NAME,
}: PosterModalProps) {
  const [templateId, setTemplateId] = useState<PosterTemplateId>('mo_yun')
  // 自定义上传背景（dataURL；有值时优先于模板渐变背景）
  const [bgImage, setBgImage] = useState<string | null>(null)
  const bgFileRef = useRef<HTMLInputElement | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  // 可拖拽文字元素：位置 / 字体 / 字号 / 颜色（日期自动取当天，不提供输入框）
  const [titleEl, setTitleEl] = useState<PosterTextElement>(DEFAULT_TITLE_EL)
  const [subtitleEl, setSubtitleEl] = useState<PosterTextElement>(DEFAULT_SUBTITLE_EL)
  const [dateEl, setDateEl] = useState<PosterTextElement>(DEFAULT_DATE_EL)
  // Logo 与站点文字自定义颜色（null = 沿用模板默认：深色模板 Logo 反白为白 / 其余用模板副文字色）
  const [logoColor, setLogoColor] = useState<string | null>(null)
  const [siteTextColor, setSiteTextColor] = useState<string | null>(null)

  const [previewUrl, setPreviewUrl] = useState('')
  const [renderError, setRenderError] = useState('')
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewRef = useRef<HTMLImageElement | null>(null)
  /** 最近一次渲染的文字元素包围盒，用于预览命中检测 */
  const elementsRef = useRef<RenderedElements | null>(null)
  const dragRef = useRef<{ key: DragKey; dx: number; dy: number } | null>(null)

  // 打开时初始化表单
  useEffect(() => {
    if (!open) return
    setTemplateId('mo_yun')
    setBgImage(null)
    setTitle(productName ? `${productName} · 定制` : '纹韵定制')
    setSubtitle('')
    setTitleEl(DEFAULT_TITLE_EL)
    setSubtitleEl(DEFAULT_SUBTITLE_EL)
    setDateEl(DEFAULT_DATE_EL)
    setLogoColor(null)
    setSiteTextColor(null)
    setPreviewUrl('')
    setRenderError('')
    dragRef.current = null
  }, [open, productName])

  // 日期自动取当天（无输入框）
  const dateText = useMemo(() => formatToday(), [])

  // 二维码统一链接平台首页
  const qrValue = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/`
  }, [])

  // 合成海报（防抖，表单/拖动变化后自动重绘；图片已缓存，拖动不会重新 decode）
  useEffect(() => {
    if (!open || !mainVisual) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const template = POSTER_TEMPLATES.find((t) => t.id === templateId) ?? POSTER_TEMPLATES[0]
        const { canvas, elements } = await renderPoster({
          template,
          title: title.trim() || (productName ? `${productName} · 定制` : '纹韵定制'),
          subtitle: subtitle.trim(),
          dateText,
          logoUrl: DEFAULT_LOGO,
          mainVisual,
          qrValue,
          siteName,
          bgImage: bgImage || undefined,
          titleEl,
          subtitleEl,
          dateEl,
          logoColor: logoColor || undefined,
          siteTextColor: siteTextColor || undefined,
        })
        if (cancelled) return
        posterCanvasRef.current = canvas
        elementsRef.current = elements
        setPreviewUrl(canvas.toDataURL('image/png'))
        setRenderError('')
      } catch (e: any) {
        if (cancelled) return
        setRenderError(e?.message || '海报生成失败')
      }
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, mainVisual, templateId, bgImage, title, subtitle, dateText, titleEl, subtitleEl, dateEl, logoColor, siteTextColor, productName, siteName, qrValue])

  const handleDownload = (format: 'png' | 'jpg') => {
    if (!posterCanvasRef.current) {
      setRenderError('海报尚未生成完成，请稍候再试')
      return
    }
    downloadPoster(posterCanvasRef.current, format)
  }

  /** 上传自定义背景图（仅本地预览/导出，dataURL 即时合成） */
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setRenderError('请选择图片文件作为海报背景')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setBgImage(reader.result)
    }
    reader.onerror = () => setRenderError('背景图读取失败，请重试')
    reader.readAsDataURL(file)
  }

  // ---------- 预览拖拽 ----------

  /** 将鼠标屏幕坐标映射为海报（1080×1440）坐标 */
  const getPosterPoint = (clientX: number, clientY: number) => {
    const el = previewRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0) return null
    const scale = r.width / POSTER_WIDTH
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale }
  }

  /** 命中检测：鼠标点是否落在某个可拖文字元素上 */
  const hitTest = (p: { x: number; y: number }): DragKey | null => {
    const els = elementsRef.current
    if (!els) return null
    const candidates: Array<[DragKey, { x: number; y: number; w: number; h: number } | null]> = [
      ['title', els.title],
      ['subtitle', els.subtitle],
      ['date', els.date],
    ]
    for (const [key, box] of candidates) {
      if (!box) continue
      const rx = Math.max(box.w / 2 + 24, 48)
      const ry = Math.max(box.h / 2 + 20, 44)
      if (Math.abs(p.x - box.x) <= rx && Math.abs(p.y - box.y) <= ry) return key
    }
    return null
  }

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    const p = getPosterPoint(e.clientX, e.clientY)
    if (!p) return
    const key = hitTest(p)
    if (!key) return
    const box = elementsRef.current?.[key]
    if (!box) return
    dragRef.current = { key, dx: box.x - p.x, dy: box.y - p.y }
    e.currentTarget.setPointerCapture?.(e.pointerId)
    e.currentTarget.style.cursor = 'move'
  }

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current
    const p = getPosterPoint(e.clientX, e.clientY)
    if (!p) return
    if (drag) {
      const x = clamp(Math.round(p.x + drag.dx), ELEMENT_BOUNDS.xMin, ELEMENT_BOUNDS.xMax)
      const y = clamp(Math.round(p.y + drag.dy), ELEMENT_BOUNDS.yMin, ELEMENT_BOUNDS.yMax)
      if (drag.key === 'title') setTitleEl((s) => ({ ...s, x, y }))
      else if (drag.key === 'subtitle') setSubtitleEl((s) => ({ ...s, x, y }))
      else setDateEl((s) => ({ ...s, x, y }))
      return
    }
    // 未在拖动：悬停到元素上时提示可拖
    e.currentTarget.style.cursor = hitTest(p) ? 'move' : 'grab'
  }

  const handlePreviewPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    dragRef.current = null
    e.currentTarget.style.cursor = 'grab'
  }

  const ready = !!mainVisual && !!previewUrl && !renderError
  // 当前模板（提供标题/副文字默认色；null 状态时颜色控件回退到模板默认值）
  const template = POSTER_TEMPLATES.find((t) => t.id === templateId) ?? POSTER_TEMPLATES[0]

  const renderStyleRow = (
    label: string,
    value: PosterTextElement,
    onChange: (v: PosterTextElement) => void,
    sizeRange: { min: number; max: number },
    defaultColor: string
  ) => (
    <div className="flex items-center gap-2">
      <span className="font-song text-xs text-deep-blue w-14 shrink-0">{label}</span>
      <select
        value={value.font}
        onChange={(e) => onChange({ ...value, font: e.target.value as PosterFontKey })}
        className="px-2 py-1.5 border border-deep-blue-200 rounded-sm font-song text-sm text-deep-blue bg-white focus:border-palace-red outline-none"
        title="字体"
      >
        {POSTER_FONT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={sizeRange.min}
        max={sizeRange.max}
        step={1}
        value={value.size}
        onChange={(e) =>
          onChange({
            ...value,
            size: clamp(Number(e.target.value) || sizeRange.min, sizeRange.min, sizeRange.max),
          })
        }
        className="w-20 px-2 py-1.5 border border-deep-blue-200 rounded-sm font-song text-sm text-deep-blue focus:border-palace-red outline-none"
        title="字号"
      />
      <input
        type="color"
        value={value.color ?? defaultColor}
        onChange={(e) => onChange({ ...value, color: e.target.value })}
        className="w-9 h-9 p-0.5 border border-deep-blue-200 rounded-sm bg-white cursor-pointer shrink-0"
        title="文字颜色"
      />
    </div>
  )

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
                {/* 背景：模板 + 自定义上传 */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">背景</label>
                  <div className="grid grid-cols-3 gap-2">
                    {POSTER_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTemplateId(t.id)
                          setBgImage(null)
                        }}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-sm border-2 transition-all ${
                          templateId === t.id && !bgImage
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
                    <button
                      type="button"
                      onClick={() => bgFileRef.current?.click()}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-sm border-2 border-dashed transition-all ${
                        bgImage
                          ? 'border-palace-red bg-palace-red/5 shadow-md'
                          : 'border-deep-blue-200 hover:border-palace-red'
                      }`}
                    >
                      <span className="w-full h-10 rounded-sm border border-dashed border-deep-blue-300 bg-deep-blue/5 flex items-center justify-center">
                        <svg className="w-5 h-5 text-deep-blue-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <span className="font-song text-xs text-deep-blue">上传背景</span>
                    </button>
                  </div>
                  <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                  {bgImage && (
                    <button
                      type="button"
                      onClick={() => setBgImage(null)}
                      className="mt-1.5 font-song text-xs text-palace-red hover:underline flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      恢复默认模板
                    </button>
                  )}
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

                {/* 文字样式：字体 + 字号（可在预览拖拽位置） */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">
                    文字样式{' '}
                    <span className="text-deep-blue-light text-xs">（在右侧预览中可直接拖动标题 / 一句话 / 日期）</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {renderStyleRow('标题', titleEl, setTitleEl, SIZE_RANGE.title, template.titleColor)}
                    {renderStyleRow('一句话', subtitleEl, setSubtitleEl, SIZE_RANGE.subtitle, template.subtitleColor)}
                    {renderStyleRow('日期', dateEl, setDateEl, SIZE_RANGE.date, template.subtitleColor)}
                  </div>
                </div>

                {/* 日期（自动） */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">
                    日期 <span className="text-deep-blue-light">（自动取当天）</span>
                  </label>
                  <input
                    value={dateText}
                    readOnly
                    className="w-full px-3 py-2 border border-deep-blue-100 rounded-sm font-song text-deep-blue-light bg-deep-blue-50"
                  />
                </div>

                {/* Logo（统一站内默认 Logo）+ Logo 颜色 */}
                <div>
                  <label className="font-song text-sm text-deep-blue mb-2 block">
                    网站 Logo <span className="text-deep-blue-light">（统一使用站内默认）</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <img
                      src={DEFAULT_LOGO}
                      alt="网站 Logo"
                      className="h-9 w-auto object-contain text-palace-red"
                    />
                    <span className="font-song text-sm text-deep-blue-light">纹韵 · AI非遗纹样设计平台</span>
                  </div>
                </div>

                {/* Logo 与站点文字颜色（站点文字：Logo 下方平台名 / 二维码下方「扫码体验纹韵」/ 页脚，三处同步） */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-song text-xs text-deep-blue shrink-0">Logo 颜色</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={logoColor ?? (template.isDark ? '#ffffff' : '#000000')}
                        onChange={(e) => setLogoColor(e.target.value)}
                        className="w-9 h-9 p-0.5 border border-deep-blue-200 rounded-sm bg-white cursor-pointer"
                        title="Logo 颜色"
                      />
                      <button
                        type="button"
                        onClick={() => setLogoColor(null)}
                        className="font-song text-xs text-deep-blue-light hover:text-palace-red shrink-0"
                      >
                        恢复默认
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-song text-xs text-deep-blue shrink-0">
                      站点文字
                      <span className="text-deep-blue-light">（平台名 / 扫码提示 / 页脚同步）</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={siteTextColor ?? template.subtitleColor}
                        onChange={(e) => setSiteTextColor(e.target.value)}
                        className="w-9 h-9 p-0.5 border border-deep-blue-200 rounded-sm bg-white cursor-pointer"
                        title="站点文字颜色"
                      />
                      <button
                        type="button"
                        onClick={() => setSiteTextColor(null)}
                        className="font-song text-xs text-deep-blue-light hover:text-palace-red shrink-0"
                      >
                        恢复默认
                      </button>
                    </div>
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
                {renderError && <p className="font-song text-sm text-palace-red">{renderError}</p>}
              </div>

              {/* 右侧：预览 */}
              <div className="flex flex-col gap-3">
                <label className="font-song text-sm text-deep-blue">预览（1080 × 1440）</label>
                <div className="flex-1 min-h-[420px] bg-rice-paper-dark rounded-sm border border-deep-blue-100 flex items-center justify-center overflow-hidden p-3">
                  {!mainVisual ? (
                    <p className="font-song text-deep-blue-light">正在生成主视觉…</p>
                  ) : previewUrl ? (
                    <img
                      ref={previewRef}
                      src={previewUrl}
                      alt="海报预览"
                      draggable={false}
                      onPointerDown={handlePreviewPointerDown}
                      onPointerMove={handlePreviewPointerMove}
                      onPointerUp={handlePreviewPointerUp}
                      onPointerCancel={handlePreviewPointerUp}
                      className="max-h-[70vh] w-auto max-w-full object-contain rounded-sm shadow-lg select-none"
                      style={{ touchAction: 'none', cursor: 'grab' }}
                    />
                  ) : (
                    <p className="font-song text-deep-blue-light">海报合成中…</p>
                  )}
                </div>
                <p className="font-song text-xs text-deep-blue-light">
                  拖动标题 / 一句话 / 日期可调整位置；导出 PNG/JPG 与预览一致。主视觉优先使用 3D 截图。
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
