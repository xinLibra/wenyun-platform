// 锦地条纹压制自测（纯 prompt 构建）：单纹样 + 融合（菊花+锦地 seamless）
import { buildPromptParts, buildFusionPromptParts } from '../src/services/patternGeneration'
import type { GenerationParams } from '../src/types/pattern'

let fail = 0
function assert(ok: boolean, label: string, extra = '') {
  if (!ok) {
    fail++
    console.error(`FAIL: ${label}${extra ? ' -> ' + extra : ''}`)
  } else {
    console.log(`PASS: ${label}`)
  }
}

const POS = ['hexagonal honeycomb lattice', 'tortoiseshell pattern', 'repeating regular hexagon grid', 'geometric brocade ground']
const NEG = ['horizontal stripes', 'vertical stripes', 'stripe pattern', 'banded pattern']

// ---- 单纹样：锦地（默认走 buildPromptParts） ----
const single = buildPromptParts({
  dimension: { mainTheme: 'geometric', subcategory: 'jindi', style: 'traditional' } as any,
  complexity: 55,
  textureDetail: 28,
  colorScheme: { mode: 'pantone', pantone: '19-4052 TCX' } as any,
  arrangement: 'seamless',
  symmetry: 'mirror',
  culturalIntensity: 75,
} as unknown as GenerationParams)
console.log('--- jindi 单纹样 seamless ---')
console.log('lora:', single.loraFile, '@', single.loraWeight)
for (const w of POS) assert(single.prompt.includes(w), `单纹样 正向含 "${w}"`)
for (const w of NEG) assert(single.negativePrompt.includes(w), `单纹样 负向含 "${w}"`)
assert(!single.negativePrompt.includes('hexagon') && !single.negativePrompt.includes('tortoiseshell'), '单纹样 负向无结构词泄漏', single.negativePrompt)
assert(single.loraWeight >= 0.85 && single.loraWeight <= 0.9, '单纹样 权重 0.85-0.9', String(single.loraWeight))

// ---- 融合：菊花+锦地 seamless（精选组合） ----
const fusion = buildFusionPromptParts({
  subcategoryA: 'chrysanthemum',
  subcategoryB: 'jindi',
  ratioA: 50,
  ratioB: 50,
  params: {
    dimension: { mainTheme: 'geometric', subcategory: 'jindi' } as any,
    complexity: 55,
    textureDetail: 28,
    colorScheme: { mode: 'pantone', pantone: '19-4052 TCX' } as any,
    arrangement: 'seamless',
    symmetry: 'mirror',
    culturalIntensity: 75,
  } as unknown as GenerationParams,
})
console.log('--- fusion chrysanthemum+jindi 50/50 seamless ---')
console.log('loraA:', fusion.loraA && `<${fusion.loraA.file}:${fusion.loraA.weight}>`, '| loraB:', fusion.loraB && `<${fusion.loraB.file}:${fusion.loraB.weight}>`)
for (const w of POS) assert(fusion.prompt.includes(w), `融合 正向含 "${w}"`)
for (const w of NEG) assert(fusion.negativePrompt.includes(w), `融合 负向含 "${w}"`)
assert(fusion.prompt.includes('seamless repeat') || fusion.prompt.includes('tileable'), '融合 seamless 保留平铺语义（菊花+锦地）')
assert(!/stripe/i.test(fusion.prompt), '融合 正向无 stripe 词')

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`)
process.exit(fail === 0 ? 0 : 1)
