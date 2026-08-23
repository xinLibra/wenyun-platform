import { searchCulturalSemantics, type CulturalSemantic } from '../config/culturalSemantics'
import { getPatternThumbnail } from '../config/patternThumbnails'

export interface PatternRecommendation {
  patternId: string
  patternName: string
  imageUrl: string
  meaning: string
  region: string
  matchScore: number
  /** 纹样所属主题（floral/beast），用于自动勾选主题 */
  themeId?: 'floral' | 'beast'
}

interface SemanticSearchResult {
  matchedTags: string[]
  recommendations: PatternRecommendation[]
}

/**
 * 场景关键词 → 文化语义推荐
 * 从 culturalSemantics 表中做「包含匹配」，返回最多 8 条推荐。
 * 推荐按「场景 + 纹样」去重（同一纹样同一场景只出现一次），
 * 并优先展示更符合常见赠礼场景的条目。
 */
export async function mockSemanticSearch(query: string): Promise<SemanticSearchResult> {
  // 保留少量异步体验，与旧实现一致
  await new Promise((resolve) => setTimeout(resolve, 400))

  const q = (query || '').trim()
  if (!q) return { matchedTags: [], recommendations: [] }

  const hits = searchCulturalSemantics(q)
  if (hits.length === 0) {
    return { matchedTags: [], recommendations: [] }
  }

  const seen = new Set<string>()
  const recs: PatternRecommendation[] = []
  for (const hit of hits) {
    const key = `${hit.patternId}:${hit.scene}`
    if (seen.has(key)) continue
    seen.add(key)
    recs.push({
      patternId: hit.patternId,
      patternName: hit.patternLabel,
      imageUrl: getPatternThumbnail(hit.patternId, hit.patternLabel),
      meaning: hit.meaning,
      region: hit.scene,
      matchScore: Math.max(80, 100 - recs.length * 3),
      themeId: hit.themeId,
    })
    if (recs.length >= 8) break
  }

  // matchedTags：命中场景的去重集合，供「识别到」标签展示
  const sceneTags = [...new Set(hits.map((h: CulturalSemantic) => h.scene))].slice(0, 5)

  return {
    matchedTags: sceneTags,
    recommendations: recs,
  }
}
