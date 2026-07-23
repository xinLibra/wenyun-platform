import { useState } from 'react'

interface PatternRecommendation {
  patternId: string
  patternName: string
  imageUrl: string
  meaning: string
  region: string
  matchScore: number
}

interface SemanticPatternSearchProps {
  onSearch?: (query: string) => Promise<{
    matchedTags: string[]
    recommendations: PatternRecommendation[]
  }>
  onSelectPattern?: (rec: PatternRecommendation) => void
}

export function SemanticPatternSearch({ onSearch, onSelectPattern }: SemanticPatternSearchProps) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [matchedTags, setMatchedTags] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<PatternRecommendation[]>([])

  const handleSearch = async () => {
    if (!query.trim() || !onSearch) return
    setIsSearching(true)
    setHasSearched(true)
    try {
      const result = await onSearch(query.trim())
      setMatchedTags(result.matchedTags)
      setRecommendations(result.recommendations)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100 p-5">
      <h3 className="font-shufa text-lg text-deep-blue text-center mb-4">场景纹样推荐</h3>

      <p className="font-song text-sm text-deep-blue-light text-center mb-4">
        输入使用场景或送礼对象，AI为您推荐合适的纹样
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：毕业礼物、新婚祝福、生日惊喜"
          className="flex-1 px-4 py-3 bg-rice-paper border border-deep-blue-200 rounded-sm font-song text-deep-blue focus:outline-none focus:border-palace-red transition-colors"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="px-5 py-3 bg-palace-red text-rice-paper font-song rounded-sm hover:bg-palace-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isSearching ? '推荐中...' : '获取推荐'}
        </button>
      </div>

      {matchedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
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
        <p className="font-song text-sm text-deep-blue-light text-center py-6">
          暂无匹配推荐，试试其他关键词
        </p>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.patternId}
              onClick={() => onSelectPattern?.(rec)}
              className="flex gap-3 p-3 bg-rice-paper rounded-sm border border-deep-blue-100 cursor-pointer hover:border-palace-red transition-colors"
            >
              <img
                src={rec.imageUrl}
                alt={rec.patternName}
                className="w-16 h-16 object-cover rounded-sm flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-song font-medium text-deep-blue">{rec.patternName}</h4>
                  <span className="text-xs font-song text-palace-red flex-shrink-0 ml-2">
                    匹配 {rec.matchScore}%
                  </span>
                </div>
                <p className="font-song text-xs text-deep-blue-light mb-1">{rec.region}</p>
                <p className="font-song text-xs text-deep-blue-light">{rec.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}