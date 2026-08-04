interface PatternRecommendation {
  patternId: string
  patternName: string
  imageUrl: string
  meaning: string
  region: string
  matchScore: number
}

const semanticRules: Record<
  string,
  { matchedTags: string[]; recommendations: PatternRecommendation[] }
> = {
  毕业: {
    matchedTags: ['毕业', '成长', '牡丹纹'],
    recommendations: [
      {
        patternId: 'mock-peony-001',
        patternName: '牡丹纹',
        imageUrl: '/placeholder-pattern-a.png',
        meaning: '富贵吉祥，寓意圆满美好',
        region: '江南地区传统纹样',
        matchScore: 95,
      },
    ],
  },
  新婚: {
    matchedTags: ['新婚', '喜庆', '龙凤纹'],
    recommendations: [
      {
        patternId: 'mock-dragon-phoenix-001',
        patternName: '龙凤纹',
        imageUrl: '/placeholder-pattern-b.png',
        meaning: '美满姻缘，寓意夫妻和谐',
        region: '传统吉祥纹样',
        matchScore: 92,
      },
    ],
  },
  婚礼: {
    matchedTags: ['婚礼', '喜庆', '龙凤纹'],
    recommendations: [
      {
        patternId: 'mock-dragon-phoenix-002',
        patternName: '龙凤纹',
        imageUrl: '/placeholder-pattern-b.png',
        meaning: '龙凤呈祥，喜庆成双',
        region: '传统吉祥纹样',
        matchScore: 93,
      },
    ],
  },
  生日: {
    matchedTags: ['生日', '祝福', '鹤纹'],
    recommendations: [
      {
        patternId: 'mock-crane-001',
        patternName: '鹤纹',
        imageUrl: '/placeholder-pattern-a.png',
        meaning: '松鹤延年，寓意长寿吉祥',
        region: '传统民俗纹样',
        matchScore: 90,
      },
    ],
  },
  寿: {
    matchedTags: ['寿辰', '长寿', '鹤纹'],
    recommendations: [
      {
        patternId: 'mock-crane-002',
        patternName: '鹤纹',
        imageUrl: '/placeholder-pattern-a.png',
        meaning: '仙鹤祥瑞，康宁长寿',
        region: '传统民俗纹样',
        matchScore: 91,
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