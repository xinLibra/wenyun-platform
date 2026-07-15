import { GenerationParams } from '../types/pattern'

const MOCK_IMAGES = [
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20blue%20and%20white%20porcelain%20pattern%20elegant%20minimal%20white%20background&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20paper%20cut%20art%20red%20pattern%20white%20background%20symmetric%20elegant&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20embroidery%20pattern%20silk%20colorful%20floral%20elegant%20minimal&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20ink%20wash%20painting%20pattern%20black%20white%20elegant%20minimal&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20bronze%20vessel%20pattern%20ancient%20gold%20minimal%20elegant&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20jade%20carving%20pattern%20green%20white%20elegant%20minimal&image_size=square',
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20Chinese%20cloud%20pattern%20minimal%20elegant%20blue%20white&image_size=square',
]

interface GenerationResult {
  imageUrl: string
  generationId: string
}

function buildPrompt(params: GenerationParams): string {
  const parts: string[] = ['traditional Chinese pattern design']

  if (params.dimension.craft.length > 0) {
    const craftLabels: Record<string, string> = {
      dye: 'dyeing',
      embroidery: 'embroidery',
      brocade: 'brocade',
      carving: 'carving',
      ceramic: 'ceramic',
      metal: 'metal craft',
    }
    parts.push(...params.dimension.craft.map((c) => craftLabels[c] || c))
  }

  if (params.dimension.ethnic.length > 0) {
    const ethnicLabels: Record<string, string> = {
      han: 'Han',
      miao: 'Miao',
      shui: 'Shui',
      tibetan: 'Tibetan',
      mongolian: 'Mongolian',
      yi: 'Yi',
      dai: 'Dai',
    }
    parts.push(...params.dimension.ethnic.map((e) => `${ethnicLabels[e]} style`))
  }

  if (params.dimension.theme.length > 0) {
    const themeLabels: Record<string, string> = {
      animal: 'animal motifs',
      human: 'human figures',
      plant: 'floral patterns',
      geometric: 'geometric patterns',
      composite: 'composite patterns',
    }
    parts.push(...params.dimension.theme.map((t) => themeLabels[t] || t))
  }

  if (params.dimension.style.figurative < 30) {
    parts.push('abstract')
  } else if (params.dimension.style.figurative > 70) {
    parts.push('figurative')
  }

  if (params.dimension.style.traditional < 30) {
    parts.push('modern')
  } else if (params.dimension.style.traditional > 70) {
    parts.push('traditional')
  }

  if (params.dimension.style.simplicity < 30) {
    parts.push('complex')
  } else if (params.dimension.style.simplicity > 70) {
    parts.push('minimal')
  }

  if (params.arrangement === 'seamless') {
    parts.push('seamless pattern')
  } else if (params.arrangement === 'adapted') {
    parts.push('adapted pattern')
  }

  if (params.symmetry === 'mirror') {
    parts.push('symmetric')
  } else if (params.symmetry === 'rotation') {
    parts.push('rotationally symmetric')
  }

  const complexity = params.complexity || 5
  if (complexity <= 3) {
    parts.push('simple')
  } else if (complexity >= 8) {
    parts.push('intricate detailed')
  }

  if (params.colorScheme.mode === 'hue' && params.colorScheme.hue !== undefined) {
    const hueLabels: Record<number, string> = {
      0: 'red',
      30: 'orange',
      60: 'yellow',
      120: 'green',
      180: 'cyan',
      240: 'blue',
      300: 'purple',
    }
    const nearestHue = Object.keys(hueLabels)
      .map((k) => parseInt(k))
      .sort((a, b) => Math.abs(a - params.colorScheme.hue!) - Math.abs(b - params.colorScheme.hue!))[0]
    parts.push(hueLabels[nearestHue])
  }

  return parts.join(' ')
}

export async function mockGeneratePattern(
  params: GenerationParams
): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const prompt = buildPrompt(params)
  const imageIndex = Math.floor(Math.random() * MOCK_IMAGES.length)
  const randomImage = MOCK_IMAGES[imageIndex]

  return {
    imageUrl: randomImage,
    generationId: `mock-${Date.now()}`,
    prompt,
  } as GenerationResult & { prompt: string }
}

export async function generatePatternWithFallback(
  params: GenerationParams
): Promise<GenerationResult> {
  try {
    const result = await mockGeneratePattern(params)

    const testResponse = await fetch(result.imageUrl, { method: 'HEAD' })
    if (testResponse.ok) {
      return result
    }
  } catch (error) {
    console.warn('Mock generation failed, using fallback')
  }

  const prompt = buildPrompt(params)
  const encodedPrompt = encodeURIComponent(prompt)

  return {
    imageUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodedPrompt}&image_size=square`,
    generationId: `fallback-${Date.now()}`,
  }
}