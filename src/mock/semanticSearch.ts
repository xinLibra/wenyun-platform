interface PatternRecommendation {
  patternId: string
  patternName: string
  imageUrl: string
  meaning: string
  region: string
  matchScore: number
}

// 简单的关键词匹配规则表，模拟方向4的匹配逻辑
const semanticRules: Record<string, { matchedTags: string[]; recommendations: PatternRecommendation[] }> = {
  毕业: {
    matchedTags: ['毕业', '成长'],
    recommendations: [
      {
        patternId: 'mock-zhu-001',
        patternName: '竹纹',
        imageUrl: '/placeholder-pattern-a.png',
        meaning: '节节高升，寓意成长与坚韧',
        region: '江南地区传统纹样',
        matchScore: 95,
      },
    ],
  },
  新婚: {
    matchedTags: ['新婚', '喜庆'],
    recommendations: [
      {
        patternId: 'mock-feng-001',
        patternName: '凤凰纹',
        imageUrl: '/placeholder-pattern-b.png',
        meaning: '美满姻缘，寓意夫妻和谐',
        region: '传统吉祥纹样',
        matchScore: 92,
      },
    ],
  },
  生日: {
    matchedTags: ['生日', '祝福'],
    recommendations: [
      {
        patternId: 'mock-shi-001',
        patternName: '石榴纹',
        imageUrl: '/placeholder-pattern-a.png',
        meaning: '多子多福，寓意长寿吉祥',
        region: '传统民俗纹样',
        matchScore: 88,
      },
    ],
  },
}

// 模拟异步接口调用，含随机延迟，模拟真实网络请求体验
export async function mockSemanticSearch(query: string) {
  await new Promise((resolve) => setTimeout(resolve, 600))

  const matchedKey = Object.keys(semanticRules).find((key) => query.includes(key))

  if (!matchedKey) {
    return { matchedTags: [], recommendations: [] }
  }

  return semanticRules[matchedKey]
}