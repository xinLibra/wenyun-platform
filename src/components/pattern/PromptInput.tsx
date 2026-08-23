import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { PromptParseResult } from '../../types/pattern'

interface PatternRecommendation {
  patternId: string
  patternName: string
  imageUrl: string
  meaning: string
  region: string
  matchScore: number
  /** 纹样所属主题（floral/beast），用于点击后自动切主题 */
  themeId?: 'floral' | 'beast'
}

interface PromptInputProps {
  /** 解析结果；result.rawText 为输入框原文，供父组件勾选主题/子类/场景 */
  onParse: (result: PromptParseResult & { rawText?: string }) => void
  onParseComplete?: (isComplete: boolean) => void
  onSemanticSearch?: (query: string) => Promise<{
    matchedTags: string[]
    recommendations: PatternRecommendation[]
  }>
}

const CRAFT_KEYWORDS: Record<string, string> = {
  '蓝印花': 'dye',
  '扎染': 'dye',
  '蜡染': 'dye',
  '苏绣': 'embroidery',
  '湘绣': 'embroidery',
  '蜀绣': 'embroidery',
  '粤绣': 'embroidery',
  '刺绣': 'embroidery',
  '云锦': 'brocade',
  '蜀锦': 'brocade',
  '壮锦': 'brocade',
  '织锦': 'brocade',
  '剪纸': 'carving',
  '木雕': 'carving',
  '砖雕': 'carving',
  '石雕': 'carving',
  '青花': 'ceramic',
  '粉彩': 'ceramic',
  '钧瓷': 'ceramic',
  '青铜': 'metal',
  '花丝': 'metal',
}

const ETHNIC_KEYWORDS: Record<string, string> = {
  '汉族': 'han',
  '苗族': 'miao',
  '水族': 'shui',
  '藏族': 'tibetan',
  '蒙古': 'mongolian',
  '彝族': 'yi',
  '傣族': 'dai',
}

const THEME_KEYWORDS: Record<string, string> = {
  '龙': 'animal',
  '凤': 'animal',
  '瑞兽': 'animal',
  '鱼': 'animal',
  '虫': 'animal',
  '人物': 'human',
  '缠枝': 'plant',
  '折枝': 'plant',
  '团花': 'plant',
  '花卉': 'plant',
  '花草': 'plant',
  '牡丹': 'plant',
  '回纹': 'geometric',
  '冰裂纹': 'geometric',
  '锁子纹': 'geometric',
  '几何': 'geometric',
}

const APPLICATION_KEYWORDS: Record<string, string> = {
  '服饰': 'clothing',
  '衣服': 'clothing',
  '服装': 'clothing',
  '包装': 'packaging',
  '礼盒': 'packaging',
  '家居': 'home',
  '家具': 'home',
  '文创': 'cultural',
  '周边': 'cultural',
  '帆布包': 'cultural',
  '手提袋': 'cultural',
  '毕业': 'cultural',
}

const COLOR_KEYWORDS: Record<string, number> = {
  '红色': 0,
  '橙色': 30,
  '黄色': 60,
  '绿色': 120,
  '青色': 180,
  '蓝色': 240,
  '紫色': 300,
}

function parsePrompt(prompt: string): PromptParseResult {
  const dimension = {
    craft: [] as string[],
    ethnic: [] as string[],
    theme: [] as string[],
    application: [] as string[],
    style: {
      figurative: 50,
      traditional: 50,
      simplicity: 50,
      handmade: 50,
    },
  }

  const result: PromptParseResult = {
    dimension,
  }

  for (const [keyword, value] of Object.entries(CRAFT_KEYWORDS)) {
    if (prompt.includes(keyword) && !dimension.craft.includes(value)) {
      dimension.craft.push(value)
    }
  }

  for (const [keyword, value] of Object.entries(ETHNIC_KEYWORDS)) {
    if (prompt.includes(keyword) && !dimension.ethnic.includes(value)) {
      dimension.ethnic.push(value)
    }
  }

  for (const [keyword, value] of Object.entries(THEME_KEYWORDS)) {
    if (prompt.includes(keyword) && !dimension.theme.includes(value)) {
      dimension.theme.push(value)
    }
  }

  for (const [keyword, value] of Object.entries(APPLICATION_KEYWORDS)) {
    if (prompt.includes(keyword) && !dimension.application.includes(value)) {
      dimension.application.push(value)
    }
  }

  if (prompt.includes('抽象')) {
    dimension.style.figurative = 20
  } else if (prompt.includes('具象')) {
    dimension.style.figurative = 80
  }

  if (prompt.includes('现代')) {
    dimension.style.traditional = 20
  } else if (prompt.includes('传统')) {
    dimension.style.traditional = 80
  }

  if (prompt.includes('简约')) {
    dimension.style.simplicity = 80
  } else if (prompt.includes('繁复')) {
    dimension.style.simplicity = 20
  }

  if (prompt.includes('科技')) {
    dimension.style.handmade = 20
  } else if (prompt.includes('手工')) {
    dimension.style.handmade = 80
  }

  for (const [keyword, hue] of Object.entries(COLOR_KEYWORDS)) {
    if (prompt.includes(keyword)) {
      result.colorScheme = { mode: 'hue', hue }
      break
    }
  }

  if (prompt.includes('四方')) {
    result.arrangement = 'seamless'
  } else if (prompt.includes('适合')) {
    result.arrangement = 'adapted'
  }

  if (prompt.includes('对称')) {
    result.symmetry = 'mirror'
  }

  return result
}

export function PromptInput({ onParse, onParseComplete, onSemanticSearch }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isParsed, setIsParsed] = useState(false)

  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [matchedTags, setMatchedTags] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<PatternRecommendation[]>([])
  const [justSelectedRecommendation, setJustSelectedRecommendation] = useState(false)
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null)
  const previousPromptRef = useRef('')

  const handleParse = async () => {
    if (!prompt.trim()) return

    setIsParsing(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const result = parsePrompt(prompt)
    // 关键：把原文一并传给父组件，用于勾选主题/子类/场景
    onParse({ ...result, rawText: prompt.trim() })
    localStorage.setItem('last_pattern_prompt', prompt.trim())
    setIsParsed(true)
    onParseComplete?.(true)
    setJustSelectedRecommendation(false)

    setIsParsing(false)
  }

  const handleGetRecommendations = async () => {
    if (!prompt.trim() || !onSemanticSearch) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const result = await onSemanticSearch(prompt.trim())
      setMatchedTags(result.matchedTags)
      setRecommendations(result.recommendations)
      // 默认选中第一条并立即应用：切主题/勾子类/寓意并入标签
      if (result.recommendations.length > 0) {
        const first = result.recommendations[0]
        const firstKey = `${first.patternId}:${first.region}`
        // 避免重复点击「获取场景推荐」时对同一条重复追加
        if (selectedRecommendationId !== firstKey) {
          applyRecommendation(first)
        }
      }
    } finally {
      setIsSearching(false)
    }
  }

  /** 应用一条推荐：保留用户原文，把「纹样名 + 寓意」并入输入框并直接解析，
   *  让父组件切主题/勾子类；寓意随 rawText 并入 prompt 标签 */
  const applyRecommendation = (rec: PatternRecommendation) => {
    previousPromptRef.current = prompt
    const base = prompt.trim()
    const text = base
      ? `${base}，${rec.patternName}，${rec.meaning}`
      : `${rec.patternName}，${rec.meaning}`
    setPrompt(text)
    setJustSelectedRecommendation(true)
    setSelectedRecommendationId(`${rec.patternId}:${rec.region}`)
    setIsParsed(true)
    onParseComplete?.(true)
    onParse({
      dimension: {
        mainTheme: rec.themeId === 'beast' ? 'beast' : rec.themeId === 'floral' ? 'floral' : undefined,
        subcategory: rec.patternId,
      } as any,
      rawText: text,
    })
  }

  const handleSelectRecommendation = (rec: PatternRecommendation) => {
    if (selectedRecommendationId === `${rec.patternId}:${rec.region}`) {
      // 再次点击同一推荐：撤销应用，恢复用户原文
      setPrompt(previousPromptRef.current)
      setSelectedRecommendationId(null)
      setJustSelectedRecommendation(false)
      setIsParsed(false)
      onParseComplete?.(false)
      return
    }
    applyRecommendation(rec)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setPrompt(newValue)
    if (isParsed && newValue !== prompt) {
      setIsParsed(false)
      onParseComplete?.(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        value={prompt}
        onChange={handleInputChange}
        placeholder="例如：牡丹纹、蓝色调，适合毕业礼物；或输入「鹤纹」自动匹配瑞兽主题"
        className="w-full px-4 py-3 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red resize-none"
        rows={3}
      />

      {justSelectedRecommendation && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2 px-3 py-2 bg-palace-red/10 border border-palace-red/30 rounded-sm"
        >
          <span className="text-palace-red">👉</span>
          <span className="font-song text-sm text-palace-red">
            已应用该推荐：自动切换主题并勾选对应纹样，寓意已并入描述标签
          </span>
        </motion.div>
      )}

      <div className="flex gap-2 mt-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleParse}
          disabled={isParsing || !prompt.trim()}
        >
          {isParsing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-rice-paper border-t-transparent rounded-full"
            />
          ) : (
            '解析'
          )}
        </Button>

        {onSemanticSearch && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGetRecommendations}
            disabled={isSearching || !prompt.trim()}
          >
            {isSearching ? '推荐中...' : '获取场景推荐'}
          </Button>
        )}
      </div>

      <p className="font-song text-xs text-deep-blue-light mt-2">
        点击「解析」自动为您勾选下方对应的筛选项；点击「获取场景推荐」根据使用场景推荐纹样
      </p>

      {matchedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="font-song text-xs text-deep-blue-light">识别到：</span>
          {matchedTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-ming-yellow/30 text-deep-blue text-xs font-song rounded-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {hasSearched && !isSearching && recommendations.length === 0 && (
        <p className="font-song text-sm text-deep-blue-light text-center py-4">
          暂无匹配推荐，试试其他关键词
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="mt-3 space-y-2">
          {recommendations.map((rec) => {
            const isApplied = selectedRecommendationId === `${rec.patternId}:${rec.region}`
            return (
              <div
                key={`${rec.patternId}:${rec.region}`}
                onClick={() => handleSelectRecommendation(rec)}
                className={`flex gap-3 p-3 bg-rice-paper rounded-sm border cursor-pointer transition-colors ${
                  isApplied
                    ? 'border-palace-red bg-palace-red/5'
                    : 'border-deep-blue-100 hover:border-palace-red'
                }`}
              >
                <img
                  src={rec.imageUrl}
                  alt={rec.patternName}
                  className="w-14 h-14 object-cover rounded-sm flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-song font-medium text-deep-blue text-sm">
                      {rec.patternName}
                    </h4>
                    <span className="text-xs font-song text-palace-red flex-shrink-0 ml-2">
                      匹配 {rec.matchScore}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-song bg-deep-blue-50 text-deep-blue px-1.5 py-0.5 rounded-sm border border-deep-blue-100">
                      {rec.region}
                    </span>
                  </div>
                  <p className="font-song text-xs text-deep-blue-light">{rec.meaning}</p>
                  {isApplied && (
                    <p className="font-song text-xs text-palace-red mt-1">
                      ✓ 已应用，再次点击可撤销
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
