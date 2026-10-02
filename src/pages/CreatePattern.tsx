import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, StampButton } from '../components/ui/Button'
import { GeneratingPulse } from '../components/ui/GeneratingPulse'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { DimensionFilter } from '../components/pattern/DimensionFilter'
import { GenerationParamsPanel, ColorPicker } from '../components/pattern/GenerationParams'
import { PromptInput } from '../components/pattern/PromptInput'
import { generatePatternWithFallback, generateFusionWithFallback } from '../services/patternGeneration'
import { InkSlider } from '../components/ui/InkSlider'
import { BambooToggle } from '../components/ui/Select'
import { applyPreset } from '../config/generationPresets'
import { PatternDimension, GenerationParams, PromptParseResult, CRAFT_OPTIONS, ETHNIC_OPTIONS, THEME_OPTIONS, APPLICATION_OPTIONS, ARRANGEMENT_OPTIONS, SYMMETRY_OPTIONS } from '../types/pattern'
import { supabase } from '../lib/supabase'

const DEFAULT_PATTERN_PREVIEW = '/images/heritage/theme-geometric-reference.png'
import { uploadPatternImage } from '../lib/storage'
import { mockSemanticSearch } from '../mock/semanticSearch'
import { PatternDnaRadar, type PatternDnaData } from '../components/PatternDnaRadar'
import { PatternFusionSlider } from '../components/PatternFusionSlider'
import {
  parsePromptToTags,
  findSubcategory,
  findSubcategoryById,
  PATTERN_THEMES,
  getSubcategories,
  type PatternThemeId,
} from '../data/patternTaxonomy'
import { getFusionRecommendations } from '../config/fusionRecommendations'
import { getFusionPairPreset } from '../config/fusionPairPresets'
import { downloadImage, downloadImageAsFormat } from '../utils/downloadImage'
import {
  writePendingPattern,
  writeGlobalSelectedPattern,
  LAST_GENERATED_PATTERN_KEY,
} from '../utils/customizeTransfer'


const DEFAULT_DIMENSION: PatternDimension = {
  craft: [],
  ethnic: [],
  theme: [],
  application: [],
  mainTheme: '',
  subcategory: '',
  scenes: [],
  style: {
    figurative: 50,
    traditional: 70,
    simplicity: 50,
    handmade: 60,
  },
}

const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  dimension: DEFAULT_DIMENSION,
  complexity: 50,
  textureDetail: 50,
  colorScheme: {
    mode: 'hue',
    hue: 240,
    brightness: 50,
  },
  arrangement: 'single',
  symmetry: 'mirror',
  culturalIntensity: 50,
}

/** 融合结果共用的一套参数（默认中性预设：藏青 hue 240 / 中等复杂度 / 镜像对称） */
const DEFAULT_FUSION_GENERATION_PARAMS: GenerationParams = {
  dimension: DEFAULT_DIMENSION,
  complexity: 50,
  textureDetail: 50,
  colorScheme: {
    mode: 'hue',
    hue: 240,
    brightness: 50,
  },
  arrangement: 'single',
  symmetry: 'mirror',
  culturalIntensity: 50,
}

/** 融合结果参数区：配色已复用 AI 生成页的 ColorPicker，这里不再维护独立色板 */

/**
 * 将当前生成参数映射到 DNA 雷达图 7 维度
 * 实时反映用户选择对纹样 DNA 的影响
 */
function computeDnaFromParams(p: GenerationParams): PatternDnaData {
  const { complexity, textureDetail, colorScheme, arrangement, symmetry, culturalIntensity, dimension: dim } = p
  const s = dim.style

  // 几何度：抽象度越高/几何元素越多 → 几何度越高；具象度高则几何度低
  // simplicity (平面化/几何化) 正向；figurative (具象度) 反向
  const geometricScore = Math.round(
    s.simplicity * 0.5 + (100 - s.figurative) * 0.3 + (100 - complexity) * 0.2
  )

  // 对称性：由排布方式决定
  const symmetryMap = { mirror: 90, rotation: 78, none: 35 } as const
  const symmetryScore = symmetryMap[symmetry] ?? 50

  // 曲率：具象度高 → 曲率高（曲线多）；肌理细节多 → 曲率高
  const curvatureScore = Math.round(
    s.figurative * 0.6 + textureDetail * 0.3 + complexity * 0.1
  )

  // 连续性：四方连续 > 适合纹样 > 单独纹样
  const repetitionMap = { seamless: 95, adapted: 68, single: 28 } as const
  const repetitionScore = repetitionMap[arrangement] ?? 50

  // 传统程度：traditional 滑条 + 文化强度
  const traditionalScore = Math.round(
    s.traditional * 0.5 + culturalIntensity * 0.3 + s.handmade * 0.2
  )

  // 现代适配：简洁度高 + 文化强度低 → 现代感强
  const modernFitScore = Math.round(
    s.simplicity * 0.4 + (100 - culturalIntensity) * 0.35 + (100 - s.handmade) * 0.25
  )

  // 配色复杂度：多色模式高 → 单色低；吸色法高 → 潘通中等
  let colorComplexity = 50
  if (colorScheme.mode === 'hue') colorComplexity = 82
  else if (colorScheme.mode === 'pantone') colorComplexity = colorScheme.pantone === 'monochrome-black' ? 35 : 55
  else if (colorScheme.mode === 'image') colorComplexity = 75
  colorComplexity = Math.round(colorComplexity * 0.7 + complexity * 0.3)

  return {
    geometricScore: Math.max(5, Math.min(99, geometricScore)),
    symmetryScore: Math.max(5, Math.min(99, symmetryScore)),
    curvatureScore: Math.max(5, Math.min(99, curvatureScore)),
    repetitionScore: Math.max(5, Math.min(99, repetitionScore)),
    traditionalScore: Math.max(5, Math.min(99, traditionalScore)),
    modernFitScore: Math.max(5, Math.min(99, modernFitScore)),
    colorComplexity: Math.max(5, Math.min(99, colorComplexity)),
  }
}

/** 融合来源的标签名：内置子类返回 taxonomy 中文名（如 #菊花纹）；「植物纹/动物纹」笼统词跳过；保存作品回退用作品名 */
function resolveFusionTagLabel(s: { patternId: string; patternName: string } | null | undefined): string {
  if (!s) return ''
  const sub = findSubcategoryById(s.patternId)
  if (sub && (sub.id === 'plant' || sub.id === 'animal')) return ''
  return sub?.label ?? s.patternName
}

export default function CreatePattern() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [dimension, setDimension] = useState<PatternDimension>(DEFAULT_DIMENSION)
  const [generationParams, setGenerationParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [selectedPatternName, setSelectedPatternName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [workTitle, setWorkTitle] = useState<string>('')
  
  const [isStep1Complete, setIsStep1Complete] = useState(false)
  const [isStep2Complete, setIsStep2Complete] = useState(false)
  const [isStep3Complete, setIsStep3Complete] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [showDnaAnalysis, setShowDnaAnalysis] = useState(false)
  /** 真实生成失败时的降级提示信息；为 null 表示最近一次生成是真实成功（或尚未生成） */
  const [fallbackInfo, setFallbackInfo] = useState<{ reason: string } | null>(null)
  /** 已保存作品的 id；未保存时为空。用于「分享时只更新不重复保存」 */
  const [currentWorkId, setCurrentWorkId] = useState<string>('')
  /** 融合模式已保存作品的 id；未保存时为空 */
  const [fusionCurrentWorkId, setFusionCurrentWorkId] = useState<string>('')
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const theme = searchParams.get('theme')
    const subcategory = searchParams.get('subcategory') || ''
    if (theme !== 'floral' && theme !== 'geometric') return

    const validSubcategory = getSubcategories(theme).some((item) => item.id === subcategory)
      ? subcategory
      : ''
    const nextDimension: PatternDimension = {
      ...DEFAULT_DIMENSION,
      mainTheme: theme,
      subcategory: validSubcategory,
    }
    const nextParams = validSubcategory
      ? applyPreset({ ...DEFAULT_GENERATION_PARAMS, dimension: nextDimension }, validSubcategory)
      : { ...DEFAULT_GENERATION_PARAMS, dimension: nextDimension }

    setDimension(nextDimension)
    setGenerationParams({ ...nextParams, dimension: nextDimension })
    setSelectedPatternName(
      validSubcategory ? findSubcategory(theme, validSubcategory)?.label || '' : ''
    )
    setIsStep2Complete(Boolean(validSubcategory))
  }, [searchParams])

  const showToastMessage = (message: string) => {
    setToastMessage(message)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 3000)
  }

  const handleDimensionChange = (value: PatternDimension) => {
    setDimension(value)

    // 检测 subcategory 是否发生变化：仅在「切换到新子类」时 applyPreset，
    // 用户拖滑条/改色触发的 handleParamsChange 不会走这里，所以不会盖回预设。
    // 这里读 state 拿到的是「本次事件之前」的值（React 会异步刷新），作 prevSubId 正确。
    const prevSubId = generationParams.dimension.subcategory
    const newSubId = value.subcategory
    const subChanged = !!newSubId && newSubId !== prevSubId

    const sub =
      value.mainTheme && value.subcategory
        ? findSubcategory(value.mainTheme as PatternThemeId, value.subcategory)
        : null

    setGenerationParams((prev) => {
      // 仅在子类变化时应用 preset；其他 dimension 字段变化（mainTheme / scenes / style）不重置滑条
      if (subChanged) {
        const next = applyPreset(prev, newSubId)
        next.dimension = value
        return next
      }
      return { ...prev, dimension: value }
    })

    setSelectedPatternName(sub?.label || '')
    // GenerationParamsPanel 里有现成的 selectedPatternName 提示
    // 「已根据你选择的参考纹样「xxx」预设了初始参数，可自由调整」，无需重复实现
    setIsStep2Complete(
      Boolean(
        (value.mainTheme && value.subcategory) ||
          (value.scenes && value.scenes.length > 0)
      )
    )
  }

  const handleParamsChange = (value: GenerationParams) => {
    setGenerationParams(value)
    setDimension(value.dimension)
    
    const defaultComplexity = 50
    const defaultTextureDetail = 50
    const defaultArrangement = 'single'
    const defaultSymmetry = 'mirror'
    const defaultCulturalIntensity = 50
    const defaultHue = 240
    const defaultBrightness = 50
    
    const hasChanged = 
      value.complexity !== defaultComplexity ||
      value.textureDetail !== defaultTextureDetail ||
      value.arrangement !== defaultArrangement ||
      value.symmetry !== defaultSymmetry ||
      value.culturalIntensity !== defaultCulturalIntensity ||
      value.colorScheme.mode !== 'hue' ||
      value.colorScheme.hue !== defaultHue ||
      value.colorScheme.brightness !== defaultBrightness ||
      value.colorScheme.pantone !== undefined ||
      value.colorScheme.colors !== undefined
    
    setIsStep3Complete(hasChanged)
  }

  const handlePromptParse = (result: PromptParseResult) => {
    const rawText = (
      (result as any).rawText ||
      (result as any).prompt ||
      localStorage.getItem('last_pattern_prompt') ||
      ''
    ).trim()

    if (rawText) {
      localStorage.setItem('last_pattern_prompt', rawText)
    }

    const auto = parsePromptToTags(rawText)
    // 推荐应用时携带明确的维度信息（主题/子类/场景），优先采用；普通文本解析走 auto
    const explicitTheme = (result.dimension as any)?.mainTheme as string | undefined
    const explicitSub = (result.dimension as any)?.subcategory as string | undefined
    const explicitScenes = (result.dimension as any)?.scenes as string[] | undefined
    const subId = explicitSub || auto.subcategoryId || ''
    const mainTheme: PatternThemeId | undefined =
      explicitTheme === 'floral' || explicitTheme === 'geometric'
        ? explicitTheme
        : auto.themeId || undefined

    const newDimension: PatternDimension = {
      ...DEFAULT_DIMENSION,
      ...result.dimension,
      craft: result.dimension?.craft || [],
      ethnic: result.dimension?.ethnic || [],
      theme: result.dimension?.theme || [],
      application: result.dimension?.application || [],
      mainTheme,
      subcategory: subId,
      scenes: explicitScenes?.length
        ? explicitScenes
        : auto.sceneIds.length
          ? auto.sceneIds
          : [],
      style: {
        ...DEFAULT_DIMENSION.style,
        ...(result.dimension?.style || {}),
      },
    }
    if (newDimension.scenes?.length) {
      newDimension.application = newDimension.scenes
    }

    // 数值类参数：未命中的字段用该子类的 generationPresets 默认值（applyPreset），
    // 解析出的字段覆盖预设，避免留空/NaN 或套用无关全局默认
    const presetBase = applyPreset(
      { ...DEFAULT_GENERATION_PARAMS, dimension: newDimension },
      subId || null
    )
    const newParams: GenerationParams = {
      ...presetBase,
      dimension: newDimension,
      complexity: result.complexity ?? presetBase.complexity,
      textureDetail: result.textureDetail ?? presetBase.textureDetail,
      colorScheme: result.colorScheme
        ? { ...presetBase.colorScheme, ...result.colorScheme }
        : presetBase.colorScheme,
      arrangement: result.arrangement || presetBase.arrangement,
      symmetry: result.symmetry || presetBase.symmetry,
      culturalIntensity:
        result.culturalIntensity ?? presetBase.culturalIntensity,
    }

    setDimension(newDimension)
    setGenerationParams(newParams)

    const sub =
      newDimension.mainTheme && newDimension.subcategory
        ? findSubcategory(
            newDimension.mainTheme as PatternThemeId,
            newDimension.subcategory
          )
        : null
    if (sub) setSelectedPatternName(sub.label)

    setIsStep1Complete(true)
    setIsStep2Complete(
      Boolean(
        (newDimension.mainTheme && newDimension.subcategory) ||
          (newDimension.scenes && newDimension.scenes.length > 0)
      )
    )
    // 解析/推荐后不自动收起「描述你想要的纹样」板块，用户通过折叠箭头手动收起
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    // 重新生成时自动清空作品名称，避免旧名称与新纹样不匹配
    setWorkTitle('')
    try {
      const result = await generatePatternWithFallback(generationParams)
      setGeneratedImage(result.imageUrl)
      // 新生成一张图后，之前的已保存 id 失效，避免分享错作品
      setCurrentWorkId('')
      localStorage.setItem('last_generated_pattern', result.imageUrl)
      if (result.fallback) {
        // 真实链路失败 → 已自动降级 mock，给出明确原因便于排查
        console.warn('[CreatePattern] 真实生成失败，降级到 mock:', result.fallbackReason)
        setFallbackInfo({ reason: result.fallbackReason || '未知原因' })
      } else {
        console.log('[CreatePattern] 真实生成成功, prompt=', result.prompt)
        setFallbackInfo(null)
      }
      setShowDnaAnalysis(true)
    } catch (error) {
      // 兜底保险：generatePatternWithFallback 内部已带 mock 降级，理论上不该走到这里
      // 走到这里说明 mock 也炸了 → 不再静默兜底 trae-api，让用户看到真实失败状态 + 重试按钮
      console.error('[CreatePattern] 生成彻底失败:', error)
      const reason = (error as Error)?.message || '生成彻底失败，请检查服务后重试'
      setFallbackInfo({ reason })
      setShowDnaAnalysis(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async (options?: { isPublic?: boolean; silent?: boolean }): Promise<string | null> => {
    if (!generatedImage) {
      alert('请先生成纹样后再保存')
      return null
    }

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再保存作品')
      navigate('/login')
      return null
    }

    setIsSaving(true)

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Get profile error:', profileError)
      }

      const isGuest = localStorage.getItem('is_guest') === 'true'
      const nickname = isGuest ? '游客' : (profileData?.nickname || session.user.email?.split('@')[0] || '用户')

      if (workTitle) {
        const { data: existingWorks, error: worksError } = await supabase
          .from('generations')
          .select('params')
          .eq('user_id', session.user.id)
          .eq('is_deleted', false)

        if (!worksError && existingWorks) {
          const existingTitles = existingWorks.map(w => (w as any).params?.title).filter(Boolean)
          if (existingTitles.includes(workTitle)) {
            setIsSaving(false)
            alert('该名称已被使用，请换一个')
            return null
          }
        }
      }

      const autoTags: string[] = []

      // 主标签：当前选中子类的中文名（与 PATTERN_THEMES 子类 label 一致），如 #牡丹纹 #鹿纹 #菊花纹
      const mainThemeId = generationParams.dimension.mainTheme as PatternThemeId | ''
      const subId = generationParams.dimension.subcategory
      let subLabel = ''
      if (mainThemeId && subId) {
        const found = findSubcategory(mainThemeId, subId)
        // 「植物纹 / 动物纹」属笼统主题词，禁止作为子类主标签
        if (found && found.id !== 'plant' && found.id !== 'animal') subLabel = found.label
      }
      if (!subLabel && subId) {
        const foundById = findSubcategoryById(subId)
        if (foundById && foundById.id !== 'plant' && foundById.id !== 'animal') subLabel = foundById.label
      }
      if (subLabel) autoTags.push(subLabel)

      // 次标签：主题中文名（花卉 / 几何），仅作次要补充，主分类标签必须是子类
      const themeLabel = mainThemeId
        ? (PATTERN_THEMES.find((t) => t.id === mainThemeId)?.label ?? '')
        : ''
      if (themeLabel) autoTags.push(themeLabel)

      dimension.craft.forEach(id => {
        const option = CRAFT_OPTIONS.find(o => o.id === id)
        if (option) autoTags.push(option.label)
      })

      dimension.ethnic.forEach(id => {
        const option = ETHNIC_OPTIONS.find(o => o.id === id)
        if (option) autoTags.push(option.label)
      })

      dimension.theme.forEach(id => {
        // 禁止「植物纹 / 动物纹」这类笼统主题标签，主分类由子类中文名承担
        if (id === 'plant' || id === 'animal') return
        const option = THEME_OPTIONS.find(o => o.id === id)
        if (option) autoTags.push(option.label)
      })

      dimension.application.forEach(id => {
        const option = APPLICATION_OPTIONS.find(o => o.id === id)
        if (option) autoTags.push(option.label)
      })

      const arrangementOption = ARRANGEMENT_OPTIONS.find(o => o.value === generationParams.arrangement)
      if (arrangementOption) autoTags.push(arrangementOption.label)

      const symmetryOption = SYMMETRY_OPTIONS.find(o => o.value === generationParams.symmetry)
      if (symmetryOption) autoTags.push(symmetryOption.label)

      if (generationParams.dimension.style.figurative < 40) {
        autoTags.push('抽象风格')
      } else if (generationParams.dimension.style.figurative > 60) {
        autoTags.push('具象风格')
      }

      if (generationParams.dimension.style.simplicity < 40) {
        autoTags.push('繁复风格')
      } else if (generationParams.dimension.style.simplicity > 60) {
        autoTags.push('简约风格')
      }

      if (generationParams.dimension.style.handmade < 40) {
        autoTags.push('数字科技感')
      } else if (generationParams.dimension.style.handmade > 60) {
        autoTags.push('手作感')
      }

      const uniqueTags = [...new Set(autoTags)]
      const title = workTitle || `纹样作品 #${Date.now().toString(36).toUpperCase()}`

      // 作品展示页筛选元数据：主题 + 子类（与 PATTERN_THEMES 的 subcategories.id 一致）+ 来源
      const mainTheme = generationParams.dimension.mainTheme || ''
      const subcategory = generationParams.dimension.subcategory || ''

      // 上传到 Public 桶 pattern-images，image_url 只存短链；禁止再写 data: base64 大字段
      let savedImageUrl = generatedImage
      if (savedImageUrl.startsWith('data:')) {
        try {
          savedImageUrl = await uploadPatternImage(session.user.id, generatedImage)
        } catch (uploadErr: any) {
          console.error('Upload image error:', uploadErr)
          alert(`图片上传失败，未保存: ${uploadErr?.message || '请稍后重试'}`)
          return null
        }
      }

      const { data: savedData, error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        style_id: dimension.craft[0] || null,
        params: {
          ...generationParams,
          tags: uniqueTags,
          title,
          source: 'ai',
          theme: mainTheme || undefined,
          subcategory: subcategory || undefined,
        },
        image_url: savedImageUrl,
        author_nickname: nickname,
        is_public: options?.isPublic ?? false,
      }).select('id').single()

      if (error) {
        console.error('Save error:', error)
        alert(`保存失败: ${error.message}`)
        return null
      }

      const newId = savedData?.id || ''
      setCurrentWorkId(newId)
      if (!options?.silent) {
        alert(options?.isPublic ? '已保存并设为公开' : '已保存至我的作品')
      }
      return newId
    } catch (err: any) {
      console.error('Save error:', err)
      alert(`保存失败: ${err.message || '未知错误'}`)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  

  /** 拉取图片 → PNG Blob（data:/blob:/http 均兼容）；失败返回 null，不抛错 */
  const fetchImageBlob = async (imageUrl: string): Promise<Blob | null> => {
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.blob()
    } catch (err) {
      console.error('[CreatePattern] 图片转 Blob 失败:', err)
      return null
    }
  }

  /** 尝试把 PNG Blob 写入系统剪贴板（Edge/Chrome 桌面端支持）；不支持或失败返回 false */
  const copyImageToClipboard = async (blob: Blob): Promise<boolean> => {
    try {
      if (!navigator.clipboard?.write || typeof (window as any).ClipboardItem === 'undefined') {
        throw new Error('当前浏览器不支持 ClipboardItem')
      }
      const CI = (window as any).ClipboardItem
      await navigator.clipboard.write([new CI({ 'image/png': blob })])
      return true
    } catch (err) {
      console.error('[CreatePattern] 复制图片到剪贴板失败:', err)
      return false
    }
  }

  /**
   * 真正的复制/分享：优先复制图片 → 降级复制链接 → 再降级下载。
   * 每个分支都有明确的成功/失败 toast，禁止「声称已复制但没有」的伪成功。
   */
  const performImageShare = async (
    imageBlobPromise: Promise<Blob | null>,
    imageUrl: string,
    shareUrl: string,
    fileName: string,
  ) => {
    const blob = await imageBlobPromise
    if (blob && (await copyImageToClipboard(blob))) {
      showToastMessage('已复制图片到剪贴板')
      return
    }

    const shareText = `我在纹韵设计的非遗纹样，快来看看！${shareUrl}`
    try {
      await navigator.clipboard.writeText(shareText)
      showToastMessage('已复制链接')
      return
    } catch (err) {
      console.error('[CreatePattern] 复制链接失败:', err)
    }

    try {
      await downloadImage(imageUrl, fileName)
      showToastMessage('当前浏览器不支持复制图片，已为你下载')
    } catch (err) {
      console.error('[CreatePattern] 分享降级下载失败:', err)
      showToastMessage('分享失败，请重试')
    }
  }

  /** 生成结果下载：可选 PNG / JPG（AI 生成与纹样融合共用） */
  const handleResultDownload = async (format: 'png' | 'jpg') => {
    const imgUrl = createMode === 'fusion' ? fusionResultImage : generatedImage
    if (!imgUrl) {
      showToastMessage('请先生成纹样后再下载')
      return
    }
    try {
      await downloadImageAsFormat(
        imgUrl,
        `纹韵纹样_${Date.now()}.${format === 'jpg' ? 'jpg' : 'png'}`,
        format
      )
      showToastMessage('图片已开始下载')
    } catch (err) {
      console.error('[CreatePattern] 下载失败:', err)
      // 直接展示底层校验结果（如「占位图不可下载 / 图片数据异常（过小），请重新生成」），
      // 而不是泛化的「下载失败」——让用户明确知道当前结果不能作为成图下载
      const msg = (err as Error)?.message
      showToastMessage(msg && /占位|数据异常|重新生成|格式|图片|请求失败/i.test(msg) ? msg : '下载失败，请检查网络或图片链接后重试')
    }
  }

  const handleShare = async () => {
    if (!generatedImage) {
      showToastMessage('请先生成纹样后再分享')
      return
    }
    // 提前拉取图片 Blob（无需用户激活），尽量贴近「点击回调」内调用 Clipboard API
    const imageBlobPromise = fetchImageBlob(generatedImage)

    const { data: { session } } = await supabase.auth?.getSession()

    let shareUrl = `${window.location.origin}/gallery`

    if (session?.user) {
      // 分享确认：说明分享需要公开作品，用户选择「是」才继续
      const confirmed = window.confirm('分享需要公开作品，是否公开并继续分享？')
      if (!confirmed) {
        return
      }

      try {
        // 若当前作品尚未保存 → 先保存（公开 = true），拿回新 id
        // 若已保存过（已有 currentWorkId）→ 只更新 is_public = true，不重复插入
        let workId: string | null = currentWorkId
        if (!workId) {
          workId = await handleSave({ isPublic: true, silent: true })
          if (!workId) return
        } else {
          const { error } = await supabase
            .from('generations')
            .update({ is_public: true, published_at: new Date().toISOString() })
            .eq('id', workId)
          if (error) {
            console.error('Update public error:', error)
            showToastMessage('设置公开失败，请重试')
            return
          }
        }
        shareUrl = `${window.location.origin}/gallery/${workId}`
      } catch (error) {
        console.error('Share save error:', error)
        showToastMessage('分享准备失败，请稍后重试')
        return
      }
    }

    // 真正的复制/分享：优先复制图片到剪贴板，失败逐级降级
    await performImageShare(imageBlobPromise, generatedImage, shareUrl, `纹韵纹样_${Date.now()}.png`)
  }

  /**
   * 「下一步：定制产品」
   * - 未生成纹样 → toast 提示，不跳转
   * - 未保存过 → 与「保存」一致的逻辑自动保存（is_public 走默认 false），拿回 workId
   * - 已保存过 → 沿用 currentWorkId，不重复 insert
   * - 写入 sessionStorage（customize:pendingPattern），跳转 /customize
   */
  const handleProceedToCustomize = async () => {
    if (!generatedImage) {
      showToastMessage('请先生成纹样')
      return
    }

    let workId: string | null = currentWorkId
    if (!workId) {
      workId = await handleSave({ silent: true })
      if (!workId) {
        showToastMessage('保存失败，无法进入定制，请重试')
        return
      }
    }

    const name = workTitle || `纹样作品 #${Date.now().toString(36).toUpperCase()}`

    // 写入跨页待套用数据（定制页消费后即删除）
    writePendingPattern({
      workId,
      imageUrl: generatedImage,
      name,
      from: 'create',
      ts: Date.now(),
    })

    // 写入定制页「选择纹样」同款全局 session 键，保证初始选中即生效
    writeGlobalSelectedPattern({
      id: workId,
      image_url: generatedImage,
      title: name,
    })

    // 保留旧兜底 key，与定制页初始 state 兼容
    try {
      localStorage.setItem(LAST_GENERATED_PATTERN_KEY, generatedImage)
    } catch (err) {
      console.warn('CreatePattern - save last_generated_pattern failed:', err)
    }

    navigate('/customize')
  }

  const [createMode, setCreateMode] = useState<'ai' | 'fusion'>('ai')
  const [userPatterns, setUserPatterns] = useState<{ patternId: string; patternName: string; imageUrl: string }[]>([])
  const [isLoadingUserPatterns, setIsLoadingUserPatterns] = useState(false)
  const [favoritePatterns, setFavoritePatterns] = useState<{ patternId: string; patternName: string; imageUrl: string }[]>([])
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false)
  void userPatterns; void isLoadingUserPatterns; void favoritePatterns; void isLoadingFavorites;
  const [fusionSelectedA, setFusionSelectedA] = useState<{ patternId: string; patternName: string; imageUrl: string } | null>(null)
  const [fusionSelectedB, setFusionSelectedB] = useState<{ patternId: string; patternName: string; imageUrl: string } | null>(null)
  const [isFusing, setIsFusing] = useState(false)
  // 融合模式的结果预览图，与 AI 生成模式的 generatedImage 完全隔离，互不覆盖
  const [fusionResultImage, setFusionResultImage] = useState<string>('')
  const [fusionWorkTitle, setFusionWorkTitle] = useState<string>('')
  const [isFusionSaving, setIsFusionSaving] = useState(false)
  const [lastFusionRatio, setLastFusionRatio] = useState<{ a: number; b: number }>({ a: 50, b: 50 })
  // 融合结果共用的一套生成参数（主题色/复杂度/文化符号强度/排布/对称），写入最终 prompt
  const [fusionParams, setFusionParams] = useState<GenerationParams>(DEFAULT_FUSION_GENERATION_PARAMS)

  //const builtInFusionSamples = [
    //{ patternId: 'sample-a', patternName: '云纹', imageUrl: '/placeholder-pattern-a.png' },
    //{ patternId: 'sample-b', patternName: '海浪纹', imageUrl: '/placeholder-pattern-b.png' },
  //]
  const [fusionATheme, setFusionATheme] = useState<PatternThemeId | ''>('')
  const [fusionASub, setFusionASub] = useState('')
  const [fusionBTheme, setFusionBTheme] = useState<PatternThemeId | ''>('')
  const [fusionBSub, setFusionBSub] = useState('')

  // ===== 融合页折叠 + 选满自动跳转（任务）=====
  const [fusionSelectOpen, setFusionSelectOpen] = useState(true) // 选纹样区默认展开
  const [fusionParamsOpen, setFusionParamsOpen] = useState(false) // 参数区可收起；选满后自动展开
  const fusionColorAreaRef = useRef<HTMLDivElement | null>(null) // 滚动目标：参数区潘通/推荐色区域
  const wasFusionCompleteRef = useRef(false) // 是否处于「两槽选满」状态（用于从不足→刚好过渡检测）
  const lastFusionPairKeyRef = useRef('') // 最近一次套用预设的组合 key（排序后，与顺序无关）

  // 选满两个「不同」子类：套用该组合的默认融合预设；且仅在从不足→刚好时自动展开参数区并滚动到推荐色
  useEffect(() => {
    const a = fusionASub
    const b = fusionBSub
    const complete = Boolean(a && b && a !== b)
    const pairKey = complete ? [a, b].sort().join('__') : ''

    // 更换任一子类（或首次选满）→ 重新套该对的默认预设；仅调融合比例不触发
    if (complete && pairKey !== lastFusionPairKeyRef.current) {
      lastFusionPairKeyRef.current = pairKey
      const preset = getFusionPairPreset(a as string, b as string)
      console.log(`[fusion] apply preset for ${pairKey}`, preset)
      setFusionParams((p) => ({
        ...p,
        complexity: preset.complexity,
        textureDetail: preset.textureDetail,
        culturalIntensity: preset.culturalIntensity,
        arrangement: preset.arrangement,
        symmetry: preset.symmetry,
        colorScheme: {
          mode: 'pantone',
          pantone: preset.pantoneCode,
          brightness: preset.lightness,
        },
      }))
    }

    // 从「不足两个」→「刚好两个」：先展开参数区，再平滑滚动到潘通/推荐色区域
    if (complete && !wasFusionCompleteRef.current) {
      setFusionParamsOpen(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fusionColorAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      })
    }

    if (!complete) {
      lastFusionPairKeyRef.current = ''
    }
    wasFusionCompleteRef.current = complete
  }, [fusionASub, fusionBSub])

  useEffect(() => {
    if (createMode !== 'fusion') return

    const fetchUserPatterns = async () => {
      setIsLoadingUserPatterns(true)
      try {
        const { data: { session } } = await supabase.auth?.getSession()
        if (!session?.user) {
          setUserPatterns([])
          return
        }
        const { data } = await supabase
          .from('generations')
          .select('id, params, image_url')
          .eq('user_id', session.user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(20)

        setUserPatterns(
          (data || []).map((g: any) => ({
            patternId: g.id,
            patternName: g.params?.title || '未命名纹样',
            imageUrl: g.image_url,
          }))
        )
      } finally {
        setIsLoadingUserPatterns(false)
      }
    }

    // 收藏的纹样：favorites 表关联 generations 表取标题和图片
    const fetchFavoritePatterns = async () => {
      setIsLoadingFavorites(true)
      try {
        const { data: { session } } = await supabase.auth?.getSession()
        if (!session?.user) {
          setFavoritePatterns([])
          return
        }
        const { data, error } = await supabase
          .from('favorites')
          .select('generation_id, generations(id, params, image_url)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) {
          console.error('Fetch favorites error:', error)
          setFavoritePatterns([])
          return
        }

        setFavoritePatterns(
          (data || [])
            .map((f: any) => f.generations)
            .filter(Boolean)
            .map((g: any) => ({
              patternId: g.id,
              patternName: g.params?.title || '未命名纹样',
              imageUrl: g.image_url,
            }))
        )
      } finally {
        setIsLoadingFavorites(false)
      }
    }

    fetchUserPatterns()
    fetchFavoritePatterns()
  }, [createMode])

  const handleFusionGenerate = async (ratioA: number, ratioB: number) => {
    if (!fusionSelectedA || !fusionSelectedB || !fusionASub || !fusionBSub) {
      showToastMessage('请先选满两个纹样子类')
      return
    }
    if (fusionASub === fusionBSub) {
      showToastMessage('请选择两个不同的纹样再生成')
      return
    }
    setIsFusing(true)
    try {
      // 真实融合链路：sd_proxy → A1111 txt2img，失败自动降级 mock（generateFusionWithFallback 内部处理）
      // 两槽触发词 + 两个 LoRA 权重（比例映射，公式见 patternGeneration.buildFusionPromptParts 注释）
      const result = await generateFusionWithFallback({
        subcategoryA: fusionASub,
        subcategoryB: fusionBSub,
        ratioA,
        ratioB,
        params: fusionParams,
      })
      console.log('[CreatePattern] 融合生成完成:', { ratioA, ratioB, prompt: result.prompt, fallback: result.fallback })
      // 注意：只写 fusionResultImage，绝不写 generatedImage —— 后者是 AI 生成模式
      // 「实时预览」面板专用的 state，两个模式的预览必须互不影响。
      setFusionResultImage(result.imageUrl)
      // 新生成融合图后，之前的已保存 id 失效，避免分享错作品
      setFusionCurrentWorkId('')
      setLastFusionRatio({ a: ratioA, b: ratioB })
      setShowDnaAnalysis(true)
      if (result.fallback) {
        console.warn('[CreatePattern] 融合真实生成失败，降级 mock:', result.fallbackReason)
        setFallbackInfo({ reason: result.fallbackReason || '未知原因' })
      } else {
        console.log('[CreatePattern] 融合真实生成成功, prompt=', result.prompt)
        setFallbackInfo(null)
      }
    } catch (error) {
      console.error('[CreatePattern] 融合生成彻底失败:', error)
      setFallbackInfo({ reason: (error as Error)?.message || '融合生成失败' })
    } finally {
      setIsFusing(false)
    }
  }

  // 统一选择逻辑：先选中的进入第一个位置，后选中的进入第二个位置；
  // 再次点击已选中的项目会取消选中（第二个位置会自动补位到第一个位置）；
  // 两个位置都选满后再点新项目，会替换掉第二个位置

  const handleFusionSave = async (options?: { isPublic?: boolean; silent?: boolean }): Promise<string | null> => {
    if (!fusionResultImage) {
      alert('请先生成融合纹样后再保存')
      return null
    }

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再保存作品')
      navigate('/login')
      return null
    }

    setIsFusionSaving(true)

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Get profile error:', profileError)
      }

      const isGuest = localStorage.getItem('is_guest') === 'true'
      const nickname = isGuest ? '游客' : (profileData?.nickname || session.user.email?.split('@')[0] || '用户')

      if (fusionWorkTitle) {
        const { data: existingWorks, error: worksError } = await supabase
          .from('generations')
          .select('params')
          .eq('user_id', session.user.id)
          .eq('is_deleted', false)

        if (!worksError && existingWorks) {
          const existingTitles = existingWorks.map(w => (w as any).params?.title).filter(Boolean)
          if (existingTitles.includes(fusionWorkTitle)) {
            setIsFusionSaving(false)
            alert('该名称已被使用，请换一个')
            return null
          }
        }
      }

      // 纹样融合标签：固定 #纹样融合 + 两个来源子类中文名（与 PATTERN_THEMES 子类 label 一致），如 #菊花纹 #兰花纹
      const autoTags = ['纹样融合', resolveFusionTagLabel(fusionSelectedA), resolveFusionTagLabel(fusionSelectedB)].filter(Boolean) as string[]
      const uniqueTags = [...new Set(autoTags)]
      const title = fusionWorkTitle || `融合纹样 #${Date.now().toString(36).toUpperCase()}`

      // 作品展示页筛选元数据：来源标记 fusion + 融合来源 id 对（供展示/溯源）
      const fusionPair = [fusionSelectedA?.patternId, fusionSelectedB?.patternId].filter(Boolean) as string[]

      // 上传到 Public 桶 pattern-images，image_url 只存短链；禁止再写 data: base64 大字段
      let savedImageUrl = fusionResultImage
      if (savedImageUrl.startsWith('data:')) {
        try {
          savedImageUrl = await uploadPatternImage(session.user.id, fusionResultImage)
        } catch (uploadErr: any) {
          console.error('Upload image error:', uploadErr)
          alert(`图片上传失败，未保存: ${uploadErr?.message || '请稍后重试'}`)
          return null
        }
      }

      const { data: savedData, error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        style_id: null,
        params: {
          tags: uniqueTags,
          title,
          source: 'fusion',
          theme: 'fusion',
          fusion_pair: fusionPair,
          fusion: {
            patternAId: fusionSelectedA?.patternId,
            patternBId: fusionSelectedB?.patternId,
            ratioA: lastFusionRatio.a,
            ratioB: lastFusionRatio.b,
            generationParams: fusionParams,
          },
        },
        image_url: savedImageUrl,
        author_nickname: nickname,
        is_public: options?.isPublic ?? false,
      }).select('id').single()

      if (error) {
        console.error('Save error:', error)
        alert(`保存失败: ${error.message}`)
        return null
      }

      const newId = savedData?.id || ''
      setFusionCurrentWorkId(newId)
      if (!options?.silent) {
        alert(options?.isPublic ? '已保存并设为公开' : '已保存至我的作品')
      }
      return newId
    } catch (err: any) {
      console.error('Save error:', err)
      alert(`保存失败: ${err.message || '未知错误'}`)
      return null
    } finally {
      setIsFusionSaving(false)
    }
  }

  const handleFusionShare = async () => {
    if (!fusionResultImage) {
      showToastMessage('请先生成融合纹样后再分享')
      return
    }
    // 提前拉取图片 Blob，尽量贴近「点击回调」内调用 Clipboard API
    const imageBlobPromise = fetchImageBlob(fusionResultImage)

    const { data: { session } } = await supabase.auth?.getSession()

    let shareUrl = `${window.location.origin}/gallery`

    if (session?.user) {
      const confirmed = window.confirm('分享需要公开作品，是否公开并继续分享？')
      if (!confirmed) return

      try {
        // 未保存 → 先公开保存拿新 id；已保存 → 仅更新 is_public = true，不重复插入
        let workId: string | null = fusionCurrentWorkId
        if (!workId) {
          workId = await handleFusionSave({ isPublic: true, silent: true })
          if (!workId) return
        } else {
          const { error } = await supabase
            .from('generations')
            .update({ is_public: true, published_at: new Date().toISOString() })
            .eq('id', workId)
          if (error) {
            console.error('Update public error:', error)
            showToastMessage('设置公开失败，请重试')
            return
          }
        }
        shareUrl = `${window.location.origin}/gallery/${workId}`
      } catch (error) {
        console.error('Share save error:', error)
        showToastMessage('分享准备失败，请稍后重试')
        return
      }
    }

    // 真正的复制/分享：优先复制图片到剪贴板，失败逐级降级
    await performImageShare(imageBlobPromise, fusionResultImage, shareUrl, `融合纹样_${Date.now()}.png`)
  }

  /**
   * 「下一步：定制产品」（融合模式）
   * 与 AI 模式 handleProceedToCustomize 逻辑一致：自动保存 + 写入跨页数据 + 跳转 /customize
   */
  const handleFusionProceedToCustomize = async () => {
    if (!fusionResultImage) {
      showToastMessage('请先生成纹样')
      return
    }

    let workId: string | null = fusionCurrentWorkId
    if (!workId) {
      workId = await handleFusionSave({ silent: true })
      if (!workId) {
        showToastMessage('保存失败，无法进入定制，请重试')
        return
      }
    }

    const name = fusionWorkTitle || `融合纹样 #${Date.now().toString(36).toUpperCase()}`

    writePendingPattern({
      workId,
      imageUrl: fusionResultImage,
      name,
      from: 'fusion',
      ts: Date.now(),
    })
    writeGlobalSelectedPattern({
      id: workId,
      image_url: fusionResultImage,
      title: name,
    })
    try {
      localStorage.setItem(LAST_GENERATED_PATTERN_KEY, fusionResultImage)
    } catch (err) {
      console.warn('CreatePattern - save last_generated_pattern failed:', err)
    }

    navigate('/customize')
  }

  return (
    <><div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-shufa text-4xl md:text-5xl text-deep-blue mb-4"
          >
            纹样创作
          </motion.h1>
          <BranchDivider />
          <p className="font-song text-deep-blue-light mt-4">多维度筛选非遗元素，智能调节AI参数，创造独一无二的纹样作品</p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => { setCreateMode('ai'); setFallbackInfo(null) }}
            className={`px-6 py-2 rounded-sm font-song transition-colors ${
              createMode === 'ai'
                ? 'bg-palace-red text-rice-paper'
                : 'bg-rice-paper-light border border-deep-blue-200 text-deep-blue'
            }`}
          >
            AI生成
          </button>
          <button
            onClick={() => { setCreateMode('fusion'); setFallbackInfo(null) }}
            className={`px-6 py-2 rounded-sm font-song transition-colors ${
              createMode === 'fusion'
                ? 'bg-palace-red text-rice-paper'
                : 'bg-rice-paper-light border border-deep-blue-200 text-deep-blue'
            }`}
          >
            ✦ 纹样融合
          </button>
        </div>

        {createMode === 'ai' && (
        <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 bg-rice-paper-light border border-deep-blue-100 rounded-sm p-4 md:p-6"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-palace-red/10 rounded-sm flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-palace-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="font-song text-deep-blue-light">
              <p className="text-deep-blue font-shufa mb-1">操作提示</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>以下三个步骤为递进式操作，您可以依次完成，也可以根据需要跳过某些步骤</li>
                <li>第一步「描述」可选；解析后自动勾选主题/子类/场景，描述会进入生成提示词</li>
                <li>第二步请至少选择「主题 + 子类」</li>
                <li>第三步可调复杂度、平面化、配色与对称；也可使用默认直接生成</li>
              </ul>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-4">
              {[
                {
                  id: 1,
                  title: '描述你想要的纹样',
                  description: '解析后将自动为您勾选下方对应的筛选项，您仍可手动调整',
                  icon: '笔',
                  iconBg: 'bg-palace-red',
                  isCompleted: isStep1Complete,
                },
                {
                  id: 2,
                  title: '选择灵感参考',
                  description: '这里的选择将影响AI从哪些风格的传统纹样中汲取灵感',
                  icon: '灵',
                  iconBg: 'bg-deep-blue',
                  isCompleted: isStep2Complete,
                },
                {
                  id: 3,
                  title: '调整生成效果',
                  description: '这里的参数直接决定最终生成结果的具体呈现效果',
                  icon: '调',
                  iconBg: 'bg-ming-yellow',
                  isCompleted: isStep3Complete,
                },
              ].map((step, stepIndex) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: stepIndex * 0.1 }}
                  className="bg-rice-paper-light rounded-sm border border-deep-blue-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-rice-paper transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${step.iconBg} rounded-sm flex items-center justify-center text-rice-paper font-shufa text-lg`}>
                        {step.icon}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-shufa text-lg text-deep-blue">{step.title}</span>
                          {step.isCompleted && (
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-song text-xs text-deep-blue-light">{step.description}</span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedStep === step.id ? 180 : 0 }}
                      className="w-5 h-5 text-deep-blue-light"
                    >
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </motion.div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: expandedStep === step.id ? 'auto' : 0, opacity: expandedStep === step.id ? 1 : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      {step.id === 1 && (
                        <PromptInput 
                          onParse={handlePromptParse} 
                          onParseComplete={setIsStep1Complete}
                          onSemanticSearch={mockSemanticSearch}
                        />
                      )}
                      {step.id === 2 && (
                        <DimensionFilter value={dimension} onChange={handleDimensionChange} />
                      )}
                      {step.id === 3 && (
                        <GenerationParamsPanel 
                          value={generationParams} 
                          onChange={handleParamsChange}
                          selectedPatternName={selectedPatternName}
                        />
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* 真实生成失败降级提示：fallback=true 时显示，提供「重试真实生成」按钮 */}
            <AnimatePresence>
              {fallbackInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-sm">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="font-song text-sm text-warning-dark font-semibold">
                          真实生成失败，已降级为占位 mock
                        </div>
                        <div className="font-song text-xs text-deep-blue-light mt-1 break-words">
                          原因：{fallbackInfo.reason}
                        </div>
                        <div className="font-song text-xs text-deep-blue-light mt-1">
                          请确认 WebUI（端口 7860）与 sd_proxy（端口 8787）已启动，然后点击重试
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="px-3 py-1.5 text-xs font-song bg-palace-red text-rice-paper rounded-sm hover:bg-palace-red-dark disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {isGenerating ? '重试中...' : '重试真实生成'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="flex justify-center gap-4 mt-8"
            >
              <StampButton onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <span className="flex items-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-ming-yellow border-t-transparent rounded-full mr-2"
                    />
                    生成中...
                  </span>
                ) : (
                  '生成纹样'
                )}
              </StampButton>

              <Button
                variant="secondary"
                onClick={() => void handleProceedToCustomize()}
              >
                下一步：定制产品
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <FrameDecorations className="bg-rice-paper-light p-6 sticky top-20">
              <h2 className="font-shufa text-xl text-deep-blue mb-4 flex items-center">
                <span className="w-8 h-8 bg-ming-yellow/50 rounded-sm flex items-center justify-center text-deep-blue mr-3 text-sm">览</span>
                实时预览
              </h2>

              <div className="relative">
                <div className="absolute -inset-4 border-4 border-deep-blue rounded-sm opacity-20" />
                <div className="absolute -inset-2 border-2 border-palace-red rounded-sm opacity-30" />

                <div className="relative aspect-square bg-rice-paper-dark rounded-sm overflow-hidden">
                  {isGenerating ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <GeneratingPulse size={120} />
                      <span className="absolute bottom-8 font-song text-deep-blue-light text-sm">正在生成纹样...</span>
                    </div>
                  ) : generatedImage ? (
                    <img
                      src={generatedImage}
                      alt="纹样预览"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={DEFAULT_PATTERN_PREVIEW}
                      alt="纹样预览"
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-palace-red" />
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-palace-red" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-palace-red" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-palace-red" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block font-song text-sm text-deep-blue-light mb-1">作品名称</label>
                  <input
                    type="text"
                    value={workTitle}
                    onChange={(e) => setWorkTitle(e.target.value)}
                    placeholder="为您的作品起个名字"
                    className="w-full px-3 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block font-song text-sm text-deep-blue-light mb-1">标签</label>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const displayTags: string[] = []

                      // 主标签：子类中文名（如 #牡丹纹 #鹿纹）
                      const mainThemeId = generationParams.dimension.mainTheme as PatternThemeId | ''
                      const subId = generationParams.dimension.subcategory
                      let subLabel = ''
                      if (mainThemeId && subId) {
                        const found = findSubcategory(mainThemeId, subId)
                        if (found && found.id !== 'plant' && found.id !== 'animal') subLabel = found.label
                      }
                      if (!subLabel && subId) {
                        const foundById = findSubcategoryById(subId)
                        if (foundById && foundById.id !== 'plant' && foundById.id !== 'animal') subLabel = foundById.label
                      }
                      if (subLabel) displayTags.push(subLabel)

                      // 次标签：主题中文名（花卉 / 几何）
                      const themeLabel = mainThemeId
                        ? (PATTERN_THEMES.find((t) => t.id === mainThemeId)?.label ?? '')
                        : ''
                      if (themeLabel) displayTags.push(themeLabel)

                      dimension.craft.forEach(id => {
                        const option = CRAFT_OPTIONS.find(o => o.id === id)
                        if (option) displayTags.push(option.label)
                      })
                      dimension.ethnic.forEach(id => {
                        const option = ETHNIC_OPTIONS.find(o => o.id === id)
                        if (option) displayTags.push(option.label)
                      })
                      dimension.theme.forEach(id => {
                        // 禁止笼统「植物纹 / 动物纹」
                        if (id === 'plant' || id === 'animal') return
                        const option = THEME_OPTIONS.find(o => o.id === id)
                        if (option) displayTags.push(option.label)
                      })
                      dimension.application.forEach(id => {
                        const option = APPLICATION_OPTIONS.find(o => o.id === id)
                        if (option) displayTags.push(option.label)
                      })
                      const arrangementOption = ARRANGEMENT_OPTIONS.find(o => o.value === generationParams.arrangement)
                      if (arrangementOption) displayTags.push(arrangementOption.label)
                      const symmetryOption = SYMMETRY_OPTIONS.find(o => o.value === generationParams.symmetry)
                      if (symmetryOption) displayTags.push(symmetryOption.label)
                      if (generationParams.dimension.style.figurative < 40) displayTags.push('抽象风格')
                      else if (generationParams.dimension.style.figurative > 60) displayTags.push('具象风格')
                      if (generationParams.dimension.style.simplicity < 40) displayTags.push('繁复风格')
                      else if (generationParams.dimension.style.simplicity > 60) displayTags.push('简约风格')
                      if (generationParams.dimension.style.handmade < 40) displayTags.push('数字科技感')
                      else if (generationParams.dimension.style.handmade > 60) displayTags.push('手作感')
                      const uniqueDisplayTags = [...new Set(displayTags)]
                      return uniqueDisplayTags.length > 0 ? uniqueDisplayTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-deep-blue-50 text-deep-blue-light text-xs font-song rounded-sm"
                        >
                          #{tag}
                        </span>
                      )) : (
                        <span className="text-deep-blue-300 text-xs font-song">未选择标签</span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '保存'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => setShowImagePreview(true)}
                >
                  下载
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={handleShare}
                >
                  分享
                </Button>
              </div>

              {generatedImage && (
                <button
                  onClick={() => setShowDnaAnalysis(true)}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-palace-red/10 to-ming-yellow/10 border border-palace-red/30 rounded-sm hover:border-palace-red transition-colors"
                >
                  <span className="text-lg">✦</span>
                  <span className="font-shufa text-base text-deep-blue">查看AI纹样DNA分析</span>
                </button>
              )}
            </FrameDecorations>
          </motion.div>
        </div>
        </>
        )}

{createMode === 'fusion' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* 左侧：两个纹样分类 */}
    <div className="space-y-6">
      <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100">
        <button
          type="button"
          onClick={() => setFusionSelectOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-ming-yellow/5 transition-colors"
        >
          <div>
            <h3 className="font-shufa text-lg text-deep-blue">选择两个纹样分类进行融合</h3>
            <p className="font-song text-xs text-deep-blue-light mt-0.5">
              每个位置先选主题，再选一个子类
            </p>
          </div>
          <span className="flex-shrink-0 font-song text-xs text-deep-blue-light flex items-center gap-1">
            {fusionSelectOpen ? '收起' : '展开'}
            <svg
              className={`w-4 h-4 transition-transform ${fusionSelectOpen ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {fusionSelectOpen && (
          <div className="px-5 pb-5">
        {/* 第一个分类 */}
        <div className="mb-6 pb-6 border-b border-deep-blue-100">
          <p className="font-shufa text-deep-blue mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-sm bg-palace-red text-rice-paper text-xs flex items-center justify-center">1</span>
            第一个纹样
          </p>
          <p className="font-song text-xs text-deep-blue-light mb-2">主题</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PATTERN_THEMES.map((t) => (
              <button
                key={`a-theme-${t.id}`}
                type="button"
                onClick={() => {
                  setFusionATheme(t.id)
                  setFusionASub('')
                  setFusionSelectedA(null)
                  setFusionResultImage('')
                }}
                className={`px-3 py-1.5 text-sm font-song rounded-sm border transition-all ${
                  fusionATheme === t.id
                    ? 'bg-palace-red text-rice-paper border-palace-red'
                    : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-palace-red'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="font-song text-xs text-deep-blue-light mb-2">子类</p>
          <div className="flex flex-wrap gap-2">
            {fusionATheme ? (
              getSubcategories(fusionATheme).map((s) => (
                <button
                  key={`a-sub-${s.id}`}
                  type="button"
                  onClick={() => {
                    setFusionASub(s.id)
                    setFusionSelectedA({
                      patternId: s.id,
                      patternName: s.label,
                      imageUrl: '',
                    })
                    // 第一槽改选后若与第二槽冲突：清空第二槽并提示重选
                    if (fusionBSub === s.id) {
                      setFusionBSub('')
                      setFusionSelectedB(null)
                      showToastMessage('两个纹样不能相同，已清空第二槽请重选')
                    }
                    setFusionResultImage('')
                  }}
                  className={`px-3 py-1.5 text-sm font-song rounded-sm border transition-all ${
                    fusionASub === s.id
                      ? 'bg-palace-red text-rice-paper border-palace-red'
                      : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-palace-red'
                  }`}
                >
                  {s.label}
                </button>
              ))
            ) : (
              <p className="font-song text-xs text-deep-blue-light">请先选择主题</p>
            )}
          </div>
        </div>

        {/* 第二个分类 */}
        <div>
          <p className="font-shufa text-deep-blue mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-sm bg-deep-blue text-rice-paper text-xs flex items-center justify-center">2</span>
            第二个纹样
          </p>
          <p className="font-song text-xs text-deep-blue-light mb-2">主题</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PATTERN_THEMES.map((t) => (
              <button
                key={`b-theme-${t.id}`}
                type="button"
                onClick={() => {
                  setFusionBTheme(t.id)
                  setFusionBSub('')
                  setFusionSelectedB(null)
                  setFusionResultImage('')
                }}
                className={`px-3 py-1.5 text-sm font-song rounded-sm border transition-all ${
                  fusionBTheme === t.id
                    ? 'bg-deep-blue text-rice-paper border-deep-blue'
                    : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-deep-blue'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* 第一槽选定后：第二槽显示「可融合」推荐（点击直接填入主题+子类） */}
          {fusionASub && (() => {
            const recs = getFusionRecommendations(fusionASub)
              .filter((rid) => rid !== fusionASub)
              .map((rid) => findSubcategoryById(rid))
              .filter((r): r is NonNullable<typeof r> => Boolean(r))
            if (recs.length === 0) return null
            return (
              <div className="mb-3 p-2.5 bg-ming-yellow/10 border border-ming-yellow/40 rounded-sm">
                <p className="font-song text-xs text-deep-blue-light mb-1.5">
                  常与「{fusionSelectedA?.patternName ?? '第一纹样'}」一起融合：
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recs.map((r) => (
                    <button
                      key={`b-rec-${r.id}`}
                      type="button"
                      onClick={() => {
                        setFusionBTheme(r.themeId)
                        setFusionBSub(r.id)
                        setFusionSelectedB({
                          patternId: r.id,
                          patternName: r.label,
                          imageUrl: '',
                        })
                        setFusionResultImage('')
                      }}
                      className="px-2.5 py-1 text-xs font-song rounded-sm border border-ming-yellow bg-rice-paper text-deep-blue hover:bg-ming-yellow/20 transition-all"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          <p className="font-song text-xs text-deep-blue-light mb-2">子类</p>
          <div className="flex flex-wrap gap-2">
            {fusionBTheme ? (
              getSubcategories(fusionBTheme).map((s) => {
                // 任务：两槽不能选同一子类 —— 第二槽禁用与第一槽相同的子类
                const disabled = s.id === fusionASub
                return (
                  <button
                    key={`b-sub-${s.id}`}
                    type="button"
                    disabled={disabled}
                    title={disabled ? '请选择不同纹样' : s.label}
                    onClick={() => {
                      if (disabled) {
                        showToastMessage('请选择不同的纹样')
                        return
                      }
                      setFusionBSub(s.id)
                      setFusionSelectedB({
                        patternId: s.id,
                        patternName: s.label,
                        imageUrl: '',
                      })
                      setFusionResultImage('')
                    }}
                    className={`px-3 py-1.5 text-sm font-song rounded-sm border transition-all ${
                      disabled
                        ? 'bg-deep-blue-50 text-deep-blue-light/50 border-deep-blue-100 cursor-not-allowed'
                        : fusionBSub === s.id
                          ? 'bg-deep-blue text-rice-paper border-deep-blue'
                          : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-deep-blue'
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })
            ) : (
              <p className="font-song text-xs text-deep-blue-light">请先选择主题</p>
            )}
          </div>
          </div>
          </div>
        )}
      </div>

      {/* 融合结果参数区（已移至左侧）：两槽共用一套参数，写入最终 prompt */}
      <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100">
        <button
          type="button"
          onClick={() => setFusionParamsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-ming-yellow/5 transition-colors"
        >
          <div>
            <h3 className="font-shufa text-base text-deep-blue">融合结果参数</h3>
            <span className="font-song text-[11px] text-deep-blue-light mt-0.5 inline-block">调节后点「生成融合纹样」生效</span>
          </div>
          <span className="flex-shrink-0 font-song text-xs text-deep-blue-light flex items-center gap-1">
            {fusionParamsOpen ? '收起' : '展开'}
            <svg
              className={`w-4 h-4 transition-transform ${fusionParamsOpen ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {fusionParamsOpen && (
          <div className="px-5 pb-5 space-y-4">
          {/* 主题色 / 配色：复用 AI 生成页同一套 ColorPicker（色相/明度/潘通/吸色），双子类推荐色交集优先；包裹 ref 供「选满后滚动到推荐色」使用 */}
          <div ref={fusionColorAreaRef}>
          <ColorPicker
            value={fusionParams.colorScheme}
            onChange={(cs) => setFusionParams((p) => ({ ...p, colorScheme: cs }))}
            subcategoryId={fusionASub || undefined}
            subcategoryIds={[fusionASub, fusionBSub].filter(Boolean)}
          />
          </div>

          <InkSlider
            label="复杂度"
            leftLabel="极简"
            rightLabel="繁复"
            value={fusionParams.complexity}
            min={0}
            max={100}
            onChange={(v) => setFusionParams((p) => ({ ...p, complexity: v }))}
          />
          <InkSlider
            label="文化符号强度"
            leftLabel="抽象"
            rightLabel="还原"
            value={fusionParams.culturalIntensity}
            min={0}
            max={100}
            onChange={(v) => setFusionParams((p) => ({ ...p, culturalIntensity: v }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-song text-sm text-deep-blue-light mb-2">排布</label>
              <BambooToggle
                options={ARRANGEMENT_OPTIONS}
                value={fusionParams.arrangement}
                onChange={(v) => setFusionParams((p) => ({ ...p, arrangement: v as GenerationParams['arrangement'] }))}
                className="[&>button]:min-w-0 [&>button]:whitespace-nowrap [&>button]:px-1 [&>button]:text-sm"
              />
            </div>
            <div>
              <label className="block font-song text-sm text-deep-blue-light mb-2">对称</label>
              <BambooToggle
                options={SYMMETRY_OPTIONS}
                value={fusionParams.symmetry}
                onChange={(v) => setFusionParams((p) => ({ ...p, symmetry: v as GenerationParams['symmetry'] }))}
                className="[&>button]:min-w-0 [&>button]:whitespace-nowrap [&>button]:px-1 [&>button]:text-sm"
              />
            </div>
          </div>
          </div>
        )}
      </div>
    </div>

    {/* 右侧：融合比例 + 预览（桌面端 sticky：预览 + 比例条 + 生成按钮 + 工具栏滚动时常驻视口） */}
    <div className="space-y-4">
      <div className="lg:sticky lg:top-20 space-y-4">
      {fallbackInfo && (
        <div className="p-3 bg-warning-50 border border-warning-200 rounded-sm">
          <div className="font-song text-sm text-warning-dark font-semibold">融合真实生成失败，已降级为占位 mock</div>
          <div className="font-song text-xs text-deep-blue-light mt-1 break-words">原因：{fallbackInfo.reason}</div>
        </div>
      )}

      <PatternFusionSlider
        patternA={fusionSelectedA}
        patternB={fusionSelectedB}
        onGenerate={handleFusionGenerate}
        isGenerating={isFusing}
        resultImage={fusionResultImage}
      />

      {/* 工具栏：常驻渲染，无生成图时按钮禁用（hover 提示） */}
      <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100 p-5 space-y-3">
        <div>
          <label className="block font-song text-sm text-deep-blue-light mb-1">作品名称</label>
          <input
            type="text"
            value={fusionWorkTitle}
            onChange={(e) => setFusionWorkTitle(e.target.value)}
            placeholder="为您的融合作品起个名字"
            className="w-full px-3 py-2 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red"
            maxLength={50}
          />
        </div>
        <div>
          <label className="block font-song text-sm text-deep-blue-light mb-1">标签</label>
          <div className="flex flex-wrap gap-1">
            {['纹样融合', resolveFusionTagLabel(fusionSelectedA), resolveFusionTagLabel(fusionSelectedB)]
              .filter(Boolean)
              .map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-deep-blue-50 text-deep-blue-light text-xs font-song rounded-sm"
                >
                  #{tag}
                </span>
              ))}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleFusionSave()}
            disabled={isFusionSaving || !fusionResultImage}
            title={!fusionResultImage ? '请先生成融合纹样' : undefined}
          >
            {isFusionSaving ? '保存中...' : '保存'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowImagePreview(true)}
            disabled={!fusionResultImage}
            title={!fusionResultImage ? '请先生成融合纹样' : undefined}
          >
            下载
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleFusionShare}
            disabled={!fusionResultImage}
            title={!fusionResultImage ? '请先生成融合纹样' : undefined}
          >
            分享
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => void handleFusionProceedToCustomize()}
          disabled={!fusionResultImage}
          title={!fusionResultImage ? '请先生成融合纹样' : undefined}
        >
          下一步：定制产品
        </Button>
      </div>
      </div>
    </div>
  </div>
)}

      </div>
    </div>

    <AnimatePresence>
      {showImagePreview && (createMode === 'fusion' ? fusionResultImage : generatedImage) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full"
          >
            <div className="relative">
              <div className="aspect-square bg-rice-paper-dark rounded-sm overflow-hidden shadow-2xl">
                <img
                  src={createMode === 'fusion' ? fusionResultImage : generatedImage}
                  alt="纹样预览"
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => handleResultDownload('png')}
                  className="px-6 py-3 bg-palace-red text-rice-paper font-song rounded-sm hover:bg-palace-red-dark transition-colors shadow-md"
                >
                  下载 PNG
                </button>
                <button
                  onClick={() => handleResultDownload('jpg')}
                  className="px-6 py-3 border-2 border-rice-paper/80 text-rice-paper font-song rounded-sm hover:bg-rice-paper/10 transition-colors"
                >
                  下载 JPG
                </button>
              </div>
              
              <p className="mt-2 text-center font-song text-rice-paper/60 text-xs">点击任意空白处关闭预览</p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showDnaAnalysis && (createMode === 'fusion' ? fusionResultImage : generatedImage) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-ink-black/60 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowDnaAnalysis(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <FrameDecorations className="bg-rice-paper-light p-6 relative">
              <button
                onClick={() => setShowDnaAnalysis(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center hover:bg-deep-blue-100 rounded-full transition-colors z-10"
              >
                <svg className="w-6 h-6 text-deep-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <PatternDnaRadar dna={computeDnaFromParams(createMode === 'fusion' ? fusionParams : generationParams)} patternName={(createMode === 'fusion' ? fusionWorkTitle : workTitle) || '本次生成纹样'} />
            </FrameDecorations>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {toastMessage && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 bg-ink-black/90 text-rice-paper font-song text-sm rounded-md shadow-lg pointer-events-none">
        {toastMessage}
      </div>
    )}
    </>
  )
}
