import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button, StampButton } from '../components/ui/Button'
import { GeneratingPulse } from '../components/ui/GeneratingPulse'
import { BranchDivider } from '../components/decorations/IceCrackDivider'
import { FrameDecorations } from '../components/decorations/CornerDecorations'
import { DimensionFilter } from '../components/pattern/DimensionFilter'
import { GenerationParamsPanel } from '../components/pattern/GenerationParams'
import { PromptInput } from '../components/pattern/PromptInput'
import { generatePatternWithFallback } from '../services/mockGeneration'
import { PatternDimension, GenerationParams, PromptParseResult, CRAFT_OPTIONS, ETHNIC_OPTIONS, THEME_OPTIONS, APPLICATION_OPTIONS, ARRANGEMENT_OPTIONS, SYMMETRY_OPTIONS } from '../types/pattern'
import { supabase } from '../lib/supabase'
import { mockSemanticSearch } from '../mock/semanticSearch'
import { PatternDnaRadar } from '../components/PatternDnaRadar'
import { mockPatternDna } from '../mock/patternDna'
import { PatternFusionSlider } from '../components/PatternFusionSlider'
import {
  parsePromptToTags,
  findSubcategory,
  PATTERN_THEMES,
  //SCENE_OPTIONS,
  getSubcategories,
  type PatternThemeId,
} from '../data/patternTaxonomy'


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
  const handleDimensionChange = (value: PatternDimension) => {
    setDimension(value)
    setGenerationParams((prev) => ({
      ...prev,
      dimension: value,
    }))

    const sub =
      value.mainTheme && value.subcategory
        ? findSubcategory(value.mainTheme as PatternThemeId, value.subcategory)
        : null
    setSelectedPatternName(sub?.label || '')
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

    const newDimension: PatternDimension = {
      ...DEFAULT_DIMENSION,
      ...result.dimension,
      craft: result.dimension?.craft || [],
      ethnic: result.dimension?.ethnic || [],
      theme: result.dimension?.theme || [],
      application: result.dimension?.application || [],
      mainTheme: auto.themeId || (result.dimension as any)?.mainTheme || '',
      subcategory: auto.subcategoryId || (result.dimension as any)?.subcategory || '',
      scenes: auto.sceneIds.length
        ? auto.sceneIds
        : (result.dimension as any)?.scenes || [],
      style: {
        ...DEFAULT_DIMENSION.style,
        ...(result.dimension?.style || {}),
      },
    }
    if (newDimension.scenes?.length) {
      newDimension.application = newDimension.scenes
    }

    const newParams: GenerationParams = {
      ...DEFAULT_GENERATION_PARAMS,
      dimension: newDimension,
      complexity: result.complexity ?? DEFAULT_GENERATION_PARAMS.complexity,
      textureDetail: result.textureDetail ?? DEFAULT_GENERATION_PARAMS.textureDetail,
      colorScheme: result.colorScheme
        ? { ...DEFAULT_GENERATION_PARAMS.colorScheme, ...result.colorScheme }
        : DEFAULT_GENERATION_PARAMS.colorScheme,
      arrangement: result.arrangement || DEFAULT_GENERATION_PARAMS.arrangement,
      symmetry: result.symmetry || DEFAULT_GENERATION_PARAMS.symmetry,
      culturalIntensity:
        result.culturalIntensity ?? DEFAULT_GENERATION_PARAMS.culturalIntensity,
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
    setExpandedStep(2)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generatePatternWithFallback(generationParams)
      setGeneratedImage(result.imageUrl)
      localStorage.setItem('last_generated_pattern', result.imageUrl)
      console.log('CreatePattern - Pattern generated and saved to localStorage:', result.imageUrl)
      setShowDnaAnalysis(true)
    } catch (error) {
      console.error('生成失败:', error)
      const fallbackImage = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20pattern%20design%20elegant%20minimal&image_size=square`
      setGeneratedImage(fallbackImage)
      localStorage.setItem('last_generated_pattern', fallbackImage)
      setShowDnaAnalysis(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedImage) {
      alert('请先生成纹样后再保存')
      return
    }

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再保存作品')
      navigate('/login')
      return
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
            return
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

      const { error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        style_id: dimension.craft[0] || null,
        params: { ...generationParams, tags: uniqueTags, title },
        image_url: generatedImage,
        author_nickname: nickname,
        is_public: false,
      })

      if (error) {
        console.error('Save error:', error)
        alert(`保存失败: ${error.message}`)
      } else {
        alert('已保存至我的作品')
      }
    } catch (err: any) {
      console.error('Save error:', err)
      alert(`保存失败: ${err.message || '未知错误'}`)
    } finally {
      setIsSaving(false)
    }
  }

  

  const handleShare = async () => {
    if (!generatedImage) {
      alert('请先生成纹样后再分享')
      return
    }

    const { data: { session } } = await supabase.auth?.getSession()
    
    let shareUrl = `${window.location.origin}/gallery`
    
    if (session?.user) {
      const confirmed = window.confirm('分享前会自动保存这件作品并设为公开可见，是否继续？')
      if (!confirmed) {
        return
      }

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', session.user.id)
          .single()
        
        const isGuest = localStorage.getItem('is_guest') === 'true'
        const nickname = isGuest ? '游客' : (profileData?.nickname || session.user.email?.split('@')[0] || '用户')

        const autoTags: string[] = []
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
        
        const { data: savedData } = await supabase.from('generations').insert({
          user_id: session.user.id,
          style_id: dimension.craft[0] || null,
          params: { ...generationParams, tags: uniqueTags, title },
          image_url: generatedImage,
          author_nickname: nickname,
          is_public: true,
        }).select('id').single()
        
        if (savedData?.id) {
          shareUrl = `${window.location.origin}/gallery/${savedData.id}`
        }
      } catch (error) {
        console.error('Share save error:', error)
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ 
          title: '我在纹韵设计的纹样', 
          text: '快来看看我设计的非遗纹样！',
          url: shareUrl 
        })
      } catch {
        // 用户取消分享，忽略
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert('链接已复制到剪贴板')
    }
  }

  const getSelectedStyleName = useCallback(() => {
    if (dimension.craft.length > 0) {
      const craftLabels: Record<string, string> = {
        dye: '染织',
        embroidery: '刺绣',
        brocade: '织锦',
        carving: '雕刻',
        ceramic: '陶瓷',
        metal: '金属工艺',
      }
      return craftLabels[dimension.craft[0]] || '自定义风格'
    }
return '自定义风格'
  }, [dimension.craft])

  const [createMode, setCreateMode] = useState<'ai' | 'fusion'>('ai')
  //const [userPatterns, setUserPatterns] = useState<{ patternId: string; patternName: string; imageUrl: string }[]>([])
  //const [isLoadingUserPatterns, setIsLoadingUserPatterns] = useState(false)
  //const [favoritePatterns, setFavoritePatterns] = useState<{ patternId: string; patternName: string; imageUrl: string }[]>([])
  //const [isLoadingFavorites, setIsLoadingFavorites] = useState(false)
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
      setLastFusionRatio({ a: ratioA, b: ratioB })
      setShowDnaAnalysis(true)
    } finally {
      setIsFusing(false)
    }
  }

  // 统一选择逻辑：先选中的进入第一个位置，后选中的进入第二个位置；
  // 再次点击已选中的项目会取消选中（第二个位置会自动补位到第一个位置）；
  // 两个位置都选满后再点新项目，会替换掉第二个位置

  const handleFusionSave = async () => {
    if (!fusionResultImage) {
      alert('请先生成融合纹样后再保存')
      return
    }

    const { data: { session } } = await supabase.auth?.getSession()
    if (!session?.user) {
      alert('请先登录后再保存作品')
      navigate('/login')
      return
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
            return
          }
        }
      }

      const autoTags = ['纹样融合', fusionSelectedA?.patternName, fusionSelectedB?.patternName].filter(Boolean) as string[]
      const uniqueTags = [...new Set(autoTags)]
      const title = fusionWorkTitle || `融合纹样 #${Date.now().toString(36).toUpperCase()}`

      const { error } = await supabase.from('generations').insert({
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
        is_public: false,
      })

      if (error) {
        console.error('Save error:', error)
        alert(`保存失败: ${error.message}`)
      } else {
        alert('已保存至我的作品')
      }
    } catch (err: any) {
      console.error('Save error:', err)
      alert(`保存失败: ${err.message || '未知错误'}`)
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
      const confirmed = window.confirm('分享前会自动保存这件作品并设为公开可见，是否继续？')
      if (!confirmed) return

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', session.user.id)
          .single()

        const isGuest = localStorage.getItem('is_guest') === 'true'
        const nickname = isGuest ? '游客' : (profileData?.nickname || session.user.email?.split('@')[0] || '用户')

        const autoTags = ['纹样融合', fusionSelectedA?.patternName, fusionSelectedB?.patternName].filter(Boolean) as string[]
        const uniqueTags = [...new Set(autoTags)]
        const title = fusionWorkTitle || `融合纹样 #${Date.now().toString(36).toUpperCase()}`

        const { data: savedData } = await supabase.from('generations').insert({
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
          is_public: true,
        }).select('id').single()

        if (savedData?.id) {
          shareUrl = `${window.location.origin}/gallery/${savedData.id}`
        }
      } catch (error) {
        console.error('Share save error:', error)
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: '我在纹韵设计的融合纹样',
          text: '快来看看我融合设计的非遗纹样！',
          url: shareUrl
        })
      } catch {
        // 用户取消分享，忽略
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert('链接已复制到剪贴板')
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

              <div className="mt-4 p-3 bg-rice-paper rounded-sm border border-deep-blue-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-song text-sm text-deep-blue-light">当前风格</span>
                  <span className="font-shufa text-deep-blue">{getSelectedStyleName()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-song text-sm text-deep-blue-light">配色方案</span>
                  <span className="font-shufa text-deep-blue">
                    {generationParams.colorScheme.mode === 'hue' && '色相调节'}
                    {generationParams.colorScheme.mode === 'pantone' && '潘通色号'}
                    {generationParams.colorScheme.mode === 'image' && '图片吸色'}
                  </span>
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
                  onClick={handleSave}
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
              onClick={handleFusionSave}
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
                  onClick={() => {
                    const imgUrl = createMode === 'fusion' ? fusionResultImage : generatedImage
                    const proxyUrl = `/.netlify/functions/download?url=${encodeURIComponent(imgUrl)}`
                    const link = document.createElement('a')
                    link.href = proxyUrl
                    link.download = `纹韵纹样_${Date.now()}.png`
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
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
              <PatternDnaRadar dna={mockPatternDna} patternName={(createMode === 'fusion' ? fusionWorkTitle : workTitle) || '本次生成纹样'} />
            </FrameDecorations>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></>
  )
}