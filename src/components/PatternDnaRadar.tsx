import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

export interface PatternDnaData {
  geometricScore: number
  symmetryScore: number
  curvatureScore: number
  repetitionScore: number
  traditionalScore: number
  modernFitScore: number
  colorComplexity: number
}

interface PatternDnaRadarProps {
  dna: PatternDnaData
  patternName?: string
}

const dimensionLabels: Record<keyof PatternDnaData, string> = {
  geometricScore: '规整感',
  symmetryScore: '平衡感',
  curvatureScore: '灵动感',
  repetitionScore: '完整度',
  traditionalScore: '非遗韵味',
  modernFitScore: '现代感',
  colorComplexity: '色彩丰富度',
}

export function PatternDnaRadar({ dna, patternName }: PatternDnaRadarProps) {
  const chartData = (Object.keys(dna) as Array<keyof PatternDnaData>).map((key) => ({
    dimension: dimensionLabels[key],
    score: dna[key],
  }))

  return (
    <div className="bg-rice-paper-light rounded-sm border border-deep-blue-100 p-4">
      {patternName && (
        <h3 className="font-shufa text-lg text-deep-blue text-center mb-2">
          {patternName} · 纹样DNA
        </h3>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#B3C6E0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#1A365D', fontSize: 12, fontFamily: 'Noto Serif SC, serif' }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#2D4A70', fontSize: 10 }} />
          <Radar
            name="DNA分数"
            dataKey="score"
            stroke="#9E1F36"
            fill="#9E1F36"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}