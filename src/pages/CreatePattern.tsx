import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button, StampButton } from '../components/ui/Button'
import { GeneratingPulse } from '../components/ui/GeneratingPulse'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { DimensionFilter } from '../components/pattern/DimensionFilter'
import { GenerationParamsPanel } from '../components/pattern/GenerationParams'
import { PromptInput } from '../components/pattern/PromptInput'
import { generatePatternWithFallback } from '../services/patternGeneration'
import { applyPreset } from '../config/generationPresets'
import { PatternDimension, GenerationParams, PromptParseResult, CRAFT_OPTIONS, ETHNIC_OPTIONS, THEME_OPTIONS, APPLICATION_OPTIONS, ARRANGEMENT_OPTIONS, SYMMETRY_OPTIONS } from '../types/pattern'
import { supabase } from '../lib/supabase'
import { mockSemanticSearch } from '../mock/semanticSearch'
import { PatternDnaRadar, type PatternDnaData } from '../components/PatternDnaRadar'
import { PatternFusionSlider } from '../components/PatternFusionSlider'
import {
  parsePromptToTags,
  findSubcategory,
  PATTERN_THEMES,
  getSubcategories,
  type PatternThemeId,
} from '../data/patternTaxonomy'
import { downloadImage } from '../utils/downloadImage'


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

export default function CreatePattern() {
  const navigate = useNavigate()
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
      explicitTheme === 'floral' || explicitTheme === 'beast'
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

      dimension.craft.forEach(id => {
        const option = CRAFT_OPTIONS.find(o => o.id === id)
        if (option) autoTags.push(option.label)
      })

      dimension.ethnic.forEach(id => {
        const option = ETHNIC_OPTIONS.find(o => o.id === id)
        if (option) autoTags.push(option.label)
      })

      dimension.theme.forEach(id => {
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

      const { data: savedData, error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        style_id: dimension.craft[0] || null,
        params: { ...generationParams, tags: uniqueTags, title },
        image_url: generatedImage,
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

  

  const handleShare = async () => {
    if (!generatedImage) {
      showToastMessage('请先生成纹样后再分享')
      return
    }

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
            .update({ is_public: true })
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

    // 执行分享：支持 Web Share 则调系统分享（可带图片），否则复制链接降级
    if (navigator.share) {
      try {
        let shareData: ShareData = {
          title: '我在纹韵设计的纹样',
          text: '快来看看我设计的非遗纹样！',
          url: shareUrl,
        }
        // 可分享图片文件时优先附带图片
        if (navigator.canShare) {
          try {
            const res = await fetch(generatedImage)
            const blob = await res.blob()
            const file = new File([blob], `纹韵纹样_${Date.now()}.png`, { type: 'image/png' })
            const filesData: ShareData = { ...shareData, files: [file] }
            if (navigator.canShare(filesData)) {
              shareData = filesData
            }
          } catch {
            // 图片拉取失败时降级为纯链接分享
          }
        }
        await navigator.share(shareData)
      } catch (err) {
        // 用户取消系统分享面板（AbortError）不算报错
        if ((err as any)?.name === 'AbortError') return
        console.error('Share error:', err)
        await copyShareLink(shareUrl)
      }
    } else {
      await copyShareLink(shareUrl)
    }
  }

  const copyShareLink = async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToastMessage('作品链接已复制到剪贴板')
    } catch (err) {
      console.error('Copy share link error:', err)
      window.prompt('复制作品链接：', shareUrl)
    }
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

  //const builtInFusionSamples = [
    //{ patternId: 'sample-a', patternName: '云纹', imageUrl: '/placeholder-pattern-a.png' },
    //{ patternId: 'sample-b', patternName: '海浪纹', imageUrl: '/placeholder-pattern-b.png' },
  //]
  const [fusionATheme, setFusionATheme] = useState<PatternThemeId | ''>('')
  const [fusionASub, setFusionASub] = useState('')
  const [fusionBTheme, setFusionBTheme] = useState<PatternThemeId | ''>('')
  const [fusionBSub, setFusionBSub] = useState('')

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
    if (!fusionSelectedA || !fusionSelectedB) return
    setIsFusing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      console.log('融合请求：', fusionSelectedA.patternId, fusionSelectedB.patternId, ratioA, ratioB)
      // 注意：只写 fusionResultImage，绝不写 generatedImage —— 后者是 AI 生成模式
      // 「实时预览」面板专用的 state，两个模式的预览必须互不影响。
      // TODO(Wu): 这里目前仍是 mock（取权重较高一方的图作为占位结果），
      // 等真实的融合接口/模型接好后，把这行换成接口返回的融合图 URL。
      setFusionResultImage(ratioA >= ratioB ? fusionSelectedA.imageUrl : fusionSelectedB.imageUrl)
      // 新生成融合图后，之前的已保存 id 失效，避免分享错作品
      setFusionCurrentWorkId('')
      setLastFusionRatio({ a: ratioA, b: ratioB })
      setShowDnaAnalysis(true)
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

        if (!worksError && existingWorks) {
          const existingTitles = existingWorks.map(w => (w as any).params?.title).filter(Boolean)
          if (existingTitles.includes(fusionWorkTitle)) {
            setIsFusionSaving(false)
            alert('该名称已被使用，请换一个')
            return null
          }
        }
      }

      const autoTags = ['纹样融合', fusionSelectedA?.patternName, fusionSelectedB?.patternName].filter(Boolean) as string[]
      const uniqueTags = [...new Set(autoTags)]
      const title = fusionWorkTitle || `融合纹样 #${Date.now().toString(36).toUpperCase()}`

      const { data: savedData, error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        style_id: null,
        params: {
          tags: uniqueTags,
          title,
          fusion: {
            patternAId: fusionSelectedA?.patternId,
            patternBId: fusionSelectedB?.patternId,
            ratioA: lastFusionRatio.a,
            ratioB: lastFusionRatio.b,
          },
        },
        image_url: fusionResultImage,
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
      alert('请先生成融合纹样后再分享')
      return
    }

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
            .update({ is_public: true })
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

    if (navigator.share) {
      try {
        let shareData: ShareData = {
          title: '我在纹韵设计的融合纹样',
          text: '快来看看我融合设计的非遗纹样！',
          url: shareUrl,
        }
        if (navigator.canShare) {
          try {
            const res = await fetch(fusionResultImage)
            const blob = await res.blob()
            const file = new File([blob], `融合纹样_${Date.now()}.png`, { type: 'image/png' })
            const filesData: ShareData = { ...shareData, files: [file] }
            if (navigator.canShare(filesData)) {
              shareData = filesData
            }
          } catch {
            // 图片拉取失败时降级为纯链接分享
          }
        }
        await navigator.share(shareData)
      } catch (err) {
        // 用户取消系统分享面板（AbortError）不算报错
        if ((err as any)?.name === 'AbortError') return
        console.error('Share error:', err)
        await copyShareLink(shareUrl)
      }
    } else {
      await copyShareLink(shareUrl)
    }
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
            onClick={() => setCreateMode('ai')}
            className={`px-6 py-2 rounded-sm font-song transition-colors ${
              createMode === 'ai'
                ? 'bg-palace-red text-rice-paper'
                : 'bg-rice-paper-light border border-deep-blue-200 text-deep-blue'
            }`}
          >
            AI生成
          </button>
          <button
            onClick={() => setCreateMode('fusion')}
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

              <Link to="/customize" onClick={() => {
                console.log('CreatePattern - generatedImage:', generatedImage)
                if (generatedImage) {
                  localStorage.setItem('last_generated_pattern', generatedImage)
                  console.log('CreatePattern - saved to localStorage')
                } else {
                  console.log('CreatePattern - generatedImage is empty, not saving')
                }
              }}>
                <Button variant="secondary">下一步：定制产品</Button>
              </Link>
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
                      src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20pattern%20design%20elegant%20minimal%20blue%20white&image_size=square"
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
                      dimension.craft.forEach(id => {
                        const option = CRAFT_OPTIONS.find(o => o.id === id)
                        if (option) displayTags.push(option.label)
                      })
                      dimension.ethnic.forEach(id => {
                        const option = ETHNIC_OPTIONS.find(o => o.id === id)
                        if (option) displayTags.push(option.label)
                      })
                      dimension.theme.forEach(id => {
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
      <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100 p-5">
        <h3 className="font-shufa text-lg text-deep-blue mb-1">选择两个纹样分类进行融合</h3>
        <p className="font-song text-xs text-deep-blue-light mb-4">
          每个位置先选主题，再选一个子类（对应 LoRA）
        </p>

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
          <p className="font-song text-xs text-deep-blue-light mb-2">子类</p>
          <div className="flex flex-wrap gap-2">
            {fusionBTheme ? (
              getSubcategories(fusionBTheme).map((s) => (
                <button
                  key={`b-sub-${s.id}`}
                  type="button"
                  onClick={() => {
                    setFusionBSub(s.id)
                    setFusionSelectedB({
                      patternId: s.id,
                      patternName: s.label,
                      imageUrl: '',
                    })
                    setFusionResultImage('')
                  }}
                  className={`px-3 py-1.5 text-sm font-song rounded-sm border transition-all ${
                    fusionBSub === s.id
                      ? 'bg-deep-blue text-rice-paper border-deep-blue'
                      : 'bg-rice-paper text-deep-blue border-deep-blue-200 hover:border-deep-blue'
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
      </div>
    </div>

    {/* 右侧：融合比例 + 预览（沿用 PatternFusionSlider） */}
    <div className="space-y-4">
      <PatternFusionSlider
        patternA={fusionSelectedA}
        patternB={fusionSelectedB}
        onGenerate={handleFusionGenerate}
        isGenerating={isFusing}
        resultImage={fusionResultImage}
      />

      {fusionResultImage && (
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
              {[fusionSelectedA?.patternName, fusionSelectedB?.patternName, '纹样融合']
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
              disabled={isFusionSaving}
            >
              {isFusionSaving ? '保存中...' : '保存'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowImagePreview(true)}
            >
              下载
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={handleFusionShare}>
              分享
            </Button>
          </div>
        </div>
      )}
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
              
              <div className="mt-4 flex justify-center">
                <button
                  onClick={async () => {
                    const imgUrl = createMode === 'fusion' ? fusionResultImage : generatedImage
                    if (!imgUrl) return
                    try {
                      await downloadImage(imgUrl, `纹韵纹样_${Date.now()}.png`)
                      showToastMessage('图片已开始下载')
                    } catch (err) {
                      console.error('下载失败:', err)
                      showToastMessage('下载失败，请检查网络或图片链接后重试')
                    }
                  }}
                  className="px-6 py-3 bg-palace-red text-rice-paper font-song rounded-sm hover:bg-palace-red-dark transition-colors shadow-md"
                >
                  下载图片
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
              <PatternDnaRadar dna={computeDnaFromParams(generationParams)} patternName={(createMode === 'fusion' ? fusionWorkTitle : workTitle) || '本次生成纹样'} />
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