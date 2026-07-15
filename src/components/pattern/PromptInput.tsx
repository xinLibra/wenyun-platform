import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { PromptParseResult } from '../../types/pattern'

interface PromptInputProps {
  onParse: (result: PromptParseResult) => void
  onParseComplete?: (isComplete: boolean) => void
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

export function PromptInput({ onParse, onParseComplete }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [isParsed, setIsParsed] = useState(false)

  const handleParse = async () => {
    if (!prompt.trim()) return

    setIsParsing(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const result = parsePrompt(prompt)
    onParse(result)
    setIsParsed(true)
    onParseComplete?.(true)

    setIsParsing(false)
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
    <div className="bg-rice-paper-light border border-deep-blue-100 rounded-sm p-4">
      <label className="block font-shufa text-deep-blue mb-2">自然语言描述</label>
      <div className="relative">
        <textarea
          value={prompt}
          onChange={handleInputChange}
          placeholder="例如：苗族风格、蓝色调、抽象动物纹，适合印在帆布包上"
          className="w-full px-4 py-3 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue placeholder-deep-blue-300 focus:outline-none focus:border-palace-red resize-none"
          rows={3}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleParse}
          disabled={isParsing || !prompt.trim()}
          className="absolute bottom-2 right-2"
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
      </div>
      <p className="font-song text-xs text-deep-blue-light mt-2">
        解析后将自动为您勾选下方对应的筛选项，您仍可手动调整
      </p>
    </div>
  )
}