// 花卉+回纹边框融合自测（纯 prompt 构建，无网络）
// 覆盖：梅花+回纹 50/50、回纹 80（满铺语义降级 border）、回纹 20、seamless 强制 single
import { buildFusionPromptParts } from '../src/services/patternGeneration'
import { getFusionPairPreset } from '../src/config/fusionPairPresets'
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

function params(over: Partial<GenerationParams> = {}): GenerationParams {
  return {
    dimension: { mainTheme: 'geometric', subcategory: 'huiwen', style: 'traditional' } as any,
    complexity: 55,
    textureDetail: 28,
    colorScheme: { mode: 'hue', hue: 240, brightness: 50 } as any,
    arrangement: 'single',
    symmetry: 'mirror',
    culturalIntensity: 75,
    ...over,
  } as unknown as GenerationParams
}

function run(ratioA: number, ratioB: number, over: Partial<GenerationParams> = {}) {
  const info = buildFusionPromptParts({
    subcategoryA: 'plum',
    subcategoryB: 'huiwen',
    ratioA,
    ratioB,
    params: params(over),
  })
  const plum = info.loraA
  const huiwen = info.loraB
  console.log(`--- plum+huiwen ${ratioA}/${ratioB} | 权重 plum=${plum?.weight} huiwen=${huiwen?.weight}`)
  return { info, plum, huiwen }
}

// 1) 梅花+回纹 50/50（验收主场景）
let r = run(50, 50)
const req = ['thin single-line outermost border only', 'one narrow greek key frame along the four outer edges', 'floral filling the inner panel only']
for (const w of req) assert(r.info.prompt.includes(w), `50/50 正向含 "${w}"`)
assert(!/labyrinth|maze|dense meander field/i.test(r.info.prompt), '50/50 正向无 maze/labyrinth', r.info.prompt)
assert(r.huiwen!.weight >= 0.45 && r.huiwen!.weight <= 0.55, '50/50 回纹权重 0.45-0.55', String(r.huiwen!.weight))
assert(r.plum!.weight >= 0.75 && r.plum!.weight <= 0.85, '50/50 梅花权重 0.75-0.85', String(r.plum!.weight))
assert(r.info.prompt.includes('huiwen ONLY as outermost border'), '50/50 含角色区分强化句')
assert(r.info.prompt.includes('simple rectangular meander border band'), '50/50 含 available 细边框句')
for (const w of ['meander filling the whole image', 'labyrinth', 'maze background', 'all-over greek key', 'dense maze', 'complex labyrinth medallion', 'nested meander']) {
  assert(r.info.negativePrompt.includes(w), `负向含 "${w}"`)
}
assert(!r.info.prompt.includes('seamless repeat') && !r.info.prompt.includes('tileable'), '50/50 无平铺词')

// 2) 回纹 80%（满铺意图 -> 仍 border、权重 <=0.6）
r = run(20, 80)
assert(r.huiwen!.weight <= 0.6 && r.huiwen!.weight >= 0.45, '80/20 回纹权重 <=0.6 且 >=0.45', String(r.huiwen!.weight))
assert(r.plum!.weight >= 0.75 && r.plum!.weight <= 0.85, '80/20 梅花权重 0.75-0.85', String(r.plum!.weight))
assert(r.info.prompt.includes('thin single-line outermost border only'), '80/20 仍是 border only')
assert(!/labyrinth|maze/i.test(r.info.prompt), '80/20 无 maze')
assert(!r.info.prompt.includes('seamless'), '80/20 无 seamless')

// 3) 回纹 20%（花卉主导边框仍保底 0.45）
r = run(80, 20)
assert(r.huiwen!.weight === 0.45, '20/80 回纹权重保底 0.45', String(r.huiwen!.weight))

// 4) 用户手动 seamless -> 强制 single（无 seamless/tileable，含 single motif）
r = run(50, 50, { arrangement: 'seamless' })
assert(!r.info.prompt.includes('seamless repeat') && !r.info.prompt.includes('tileable continuous'), 'seamless 被强制 single（无 tileable 词）', r.info.prompt)
assert(r.info.prompt.includes('single motif, centered medallion'), 'seamless 被强制 single（含 single motif）')

// 5) fusionPairPreset 排布固定 single
for (const [a, b] of [['plum', 'huiwen'], ['lotus', 'huiwen'], ['peony', 'huiwen'], ['huiwen', 'chrysanthemum']] as const) {
  const preset = getFusionPairPreset(a, b)
  assert(preset.arrangement === 'single', `preset ${a}+${b} arrangement=single`, preset.arrangement)
}

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`)
process.exit(fail === 0 ? 0 : 1)
