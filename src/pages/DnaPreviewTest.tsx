import { PatternDnaRadar } from '../components/PatternDnaRadar'
import { PatternFusionSlider } from '../components/PatternFusionSlider'
import { SemanticPatternSearch } from '../components/SemanticPatternSearch'
import { mockPatternDna } from '../mock/patternDna'
import { mockPatternA, mockPatternB } from '../mock/patternFusion'
import { mockSemanticSearch } from '../mock/semanticSearch'

export default function DnaPreviewTest() {
  const handleFusionChange = (ratioA: number, ratioB: number) => {
    console.log('融合比例变化：', ratioA, ratioB)
  }

  const handleGenerate = (ratioA: number, ratioB: number) => {
    console.log('触发融合生成，比例：', ratioA, ratioB)
  }

  return (
    <div className="min-h-screen bg-rice-paper flex flex-col items-center justify-center gap-8 p-8">
      <div className="w-full max-w-md">
        <PatternDnaRadar dna={mockPatternDna} patternName="苗绣·蝴蝶纹" />
      </div>

      <div className="w-full max-w-md">
        <PatternFusionSlider
          patternA={mockPatternA}
          patternB={mockPatternB}
          onFusionChange={handleFusionChange}
          onGenerate={handleGenerate}
        />
      </div>

      <div className="w-full max-w-md">
        <SemanticPatternSearch onSearch={mockSemanticSearch} />
      </div>
    </div>
  )
}