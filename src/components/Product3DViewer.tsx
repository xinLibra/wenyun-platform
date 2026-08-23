import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center } from '@react-three/drei'
import * as THREE from 'three'
import type { PatternAreaKey } from '../config/product3D'

interface ColorMaterial {
  name: string
  materialName: string
  label: string
}

/** 纹样排版模式（与 2D PatternRenderer 保持一致） */
type LayoutMode = 'center' | 'tile' | 'corner' | 'band' | 'free'

type TextureTargetMaterials = Partial<Record<PatternAreaKey, string[]>>

interface Product3DViewerProps {
  modelUrl: string
  textureTargetMaterial: string
  textureTargetMaterials?: TextureTargetMaterials
  colorTargetMaterials?: TextureTargetMaterials
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
  cameraPosition?: [number, number, number]
  modelRotation?: [number, number, number]
  modelScale?: number
  patternArea?: PatternAreaKey
  colorArea?: PatternAreaKey
  captureRef?: React.MutableRefObject<(() => string | null) | null>
  className?: string
  /** patternArea=full 时，不贴图的材质列表（用于兜底 full 配置不全） */
  excludeFromPatternAreaFull?: string[]
  /** 纹样排版模式 */
  layoutMode?: LayoutMode
  /** 纹样缩放（0.5~4，映射到 repeat） */
  patternScale?: number
  /** 纹样水平偏移（-0.5~0.5） */
  offsetX?: number
  /** 纹样垂直偏移（-0.5~0.5） */
  offsetY?: number
  /** 纹样旋转（角度，0~360） */
  patternRotation?: number
  blendMode?: 'normal' | 'overlay' | 'multiply' | 'screen'
}

function hexToColor(hex: string): THREE.Color {
  try {
    return new THREE.Color(hex)
  } catch {
    return new THREE.Color('#ffffff')
  }
}

function getTextureTargets(
  textureTargetMaterial: string,
  textureTargetMaterials: TextureTargetMaterials | undefined,
  patternArea: PatternAreaKey
): string[] {
  if (textureTargetMaterials?.[patternArea]?.length) {
    return textureTargetMaterials[patternArea] as string[]
  }
  if (textureTargetMaterial) {
    return [textureTargetMaterial]
  }
  return []
}

const loggedModels = new Set<string>()

/** 根据 layoutMode 配置 texture 的 wrap/repeat/offset/rotation
 * 保守策略：保证主贴图面清晰完整，宁可简单不要花哨但坏掉
 */
function configureTextureByLayout(
  tex: THREE.Texture,
  layoutMode: LayoutMode,
  patternScale: number,
  offsetX: number,
  offsetY: number,
  patternRotation: number
): void {
  // 将 patternScale (0.5~4) 映射到 repeat (2~0.5)
  // scale 越大 = 纹样越大 = repeat 越小，限制在合理范围避免极端值
  const s = Math.max(0.5, Math.min(2, 1.5 / patternScale))
  const rotRad = (patternRotation * Math.PI) / 180

  // 重置
  tex.center.set(0.5, 0.5)
  tex.rotation = 0
  tex.offset.set(0, 0)
  tex.repeat.set(1, 1)

  switch (layoutMode) {
    case 'tile':
      // 重复平铺：四方连续铺满，用 RepeatWrapping
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      // scale 0.5~4 映射到 repeat 2~0.5
      const tileRepeat = Math.max(0.5, Math.min(3, 2 / patternScale))
      tex.repeat.set(tileRepeat, tileRepeat)
      tex.offset.set(0, 0)
      tex.rotation = 0
      break

    case 'center':
      // 居中放大：单图完整显示在中心
      // 用 ClampToEdgeWrapping 避免边缘重复
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      // scale 控制显示范围：1为填满，越小显示越少（放大效果）
      // 限制在 0.7~1.3 避免极端拉伸
      const centerScale = Math.max(0.7, Math.min(1.3, 1.2 - (patternScale - 1) * 0.1))
      tex.repeat.set(centerScale, centerScale)
      // 居中偏移
      tex.offset.set((1 - centerScale) / 2, (1 - centerScale) / 2)
      tex.rotation = 0
      break

    case 'band':
      // 腰封式：横向装饰带
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      // 横向随 scale，纵向固定窄带（0.25~0.4）
      const bandHeight = Math.max(0.25, Math.min(0.4, 0.3 / patternScale))
      tex.repeat.set(s * 1.2, bandHeight)
      // 垂直居中偏上（视觉腰封位置）
      tex.offset.set(0, 0.5 - bandHeight / 2)
      tex.rotation = 0
      break

    case 'corner':
      // 角落点缀：小图在角落，其余显示材质原色
      // 用 RepeatWrapping 但 offset 推到一角
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      // 小图尺寸
      const cornerSize = Math.max(0.35, Math.min(0.6, 0.5 / patternScale))
      tex.repeat.set(cornerSize, cornerSize)
      // 推到右下角（UV 坐标 0,0 通常在左下，1,1 在右上）
      // offset 让图显示在角落：右下 = 大图区域
      tex.offset.set(1 - cornerSize, 0)
      tex.rotation = 0
      break

    case 'free':
    default:
      // 自由模式：用户完全控制
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      // scale 映射到 repeat
      const freeRepeat = Math.max(0.3, Math.min(3, 1.5 / patternScale))
      tex.repeat.set(freeRepeat, freeRepeat)
      tex.center.set(0.5, 0.5)
      // offset 范围 -0.5~0.5
      tex.offset.set(offsetX, offsetY)
      tex.rotation = rotRad
      break
  }

  tex.needsUpdate = true
}

function Model({
  modelUrl,
  textureTargetMaterial,
  textureTargetMaterials,
  colorTargetMaterials,
  colorMaterials = [],
  patternImage,
  colorMap = {},
  modelRotation = [0, 0, 0],
  modelScale = 0.35,
  patternArea = 'chest',
  colorArea,
  excludeFromPatternAreaFull = [],
  layoutMode = 'center',
  patternScale = 1,
  offsetX = 0,
  offsetY = 0,
  patternRotation = 0,
  blendMode = 'normal',
}: Product3DViewerProps) {
  const { scene } = useGLTF(modelUrl)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const clonedSceneRef = useRef<THREE.Group | null>(null)
  // 只存一次的「原始色」缓存：key = mat.name/mesh.name 组合，值 = 修正后的 THREE.Color
  const initialColorsRef = useRef<Map<string, THREE.Color>>(new Map())
  const initialColorReadyRef = useRef(false)

  useEffect(() => {
    console.log('[Model] url=', modelUrl, 'rot=', modelRotation, 'scale=', modelScale, 'patternArea=', patternArea, 'colorArea=', colorArea)
  }, [modelUrl, modelRotation, modelScale, patternArea, colorArea])

  useEffect(() => {
    if (!patternImage) {
      setTexture(null)
      return
    }
    const loader = new THREE.TextureLoader()
    let cancelled = false
    loader.load(
      patternImage,
      (tex) => {
        if (cancelled) return
        tex.colorSpace = THREE.SRGBColorSpace
        tex.flipY = false
        // 根据 layoutMode 配置纹理变换
        configureTextureByLayout(tex, layoutMode, patternScale, offsetX, offsetY, patternRotation)
        setTexture(tex)
      },
      undefined,
      (err) => console.error('纹样贴图加载失败', err)
    )
    return () => {
      cancelled = true
    }
  }, [patternImage, layoutMode, patternScale, offsetX, offsetY, patternRotation])

  const clonedScene = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    if (loggedModels.has(modelUrl)) return
    loggedModels.add(modelUrl)
    const meshInfo: string[] = []
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mat = mesh.material as THREE.MeshStandardMaterial
        meshInfo.push(
          `  node="${child.name || '-'}" mesh="${mesh.name || '-'}" mat="${mat?.name || '-'}" hasMap=${!!mat?.map} color=${mat?.color?.getHexString() || '-'}`
        )
      }
    })
    console.log(`[3D Viewer] ${modelUrl} 材质/节点清单:\n${meshInfo.join('\n')}`)
    // 打印当前 targets 和 colorMaterials 供调试
    const targets = getTextureTargets(textureTargetMaterial, textureTargetMaterials, patternArea)
    console.log(`[3D Viewer] patternArea=${patternArea} targets=`, targets)
    console.log(`[3D Viewer] colorMaterials=`, colorMaterials.map(cm => `${cm.name}=${cm.materialName}`))
    console.log(`[3D Viewer] colorMap=`, colorMap)
  }, [clonedScene, modelUrl])

  useEffect(() => {
    const targets = getTextureTargets(textureTargetMaterial, textureTargetMaterials, patternArea)

    // ===== 1. 一次性从原始 scene 捕获初始色（只跑一次）=====
    if (!initialColorReadyRef.current) {
      initialColorReadyRef.current = true
      initialColorsRef.current.clear()
      scene.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return
        const mesh = child as THREE.Mesh
        const raw = mesh.material
        if (!raw) return
        const list = Array.isArray(raw) ? raw : [raw]
        ;(list as THREE.MeshStandardMaterial[]).forEach((m, i) => {
          if (!m) return
          const matName = (m.name || '').toLowerCase().trim()
          const meshName = (mesh.name || '').toLowerCase().trim()
          const keys = new Set<string>()
          if (matName) keys.add(matName)
          if (meshName) keys.add(meshName)
          if (matName) keys.add(`${meshName}|${matName}`)
          // 原始颜色：纯黑/亮度 < 0.08 → 当浅灰，避免导出器把有贴图材质 color 设黑导致"清色/非贴图区变黑"
          let c: THREE.Color
          if (m.color) {
            c = m.color.clone()
            const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
            // 该原始材质本身有贴图 map → 黑色是导出器约定，不影响，但若将来清掉 map 要回亮
            if (c.getHex() === 0x000000 || lum < 0.08) {
              c.set('#f5f5f5')
            }
          } else {
            c = new THREE.Color('#f5f5f5')
          }
          keys.forEach((k) => initialColorsRef.current.set(k, c))
          // 额外按 material 数组下标存一份
          initialColorsRef.current.set(`${meshName}|${i}`, c)
        })
      })
    }

    // 取初始色：按名称匹配，找不到就退回安全色
    const getInitialColor = (names: string[], meshName: string, matIdx: number): THREE.Color => {
      const byIndex = initialColorsRef.current.get(`${meshName.toLowerCase()}|${matIdx}`)
      if (byIndex) return byIndex
      for (const n of names) {
        const c = initialColorsRef.current.get(n)
        if (c) return c
      }
      for (const n of names) {
        for (const [k, v] of initialColorsRef.current.entries()) {
          if (n && k && (n.includes(k) || k.includes(n))) return v
        }
      }
      return new THREE.Color('#f5f5f5')
    }

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh

      if (!mesh.material) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#f5f5f5',
          roughness: 0.75,
          metalness: 0,
        })
        return
      }

      const raw = mesh.material
      const matList = (Array.isArray(raw) ? raw : [raw]) as THREE.MeshStandardMaterial[]

      matList.forEach((oldMat, idx) => {
        if (!oldMat) return

        const mat = oldMat.clone() as THREE.MeshStandardMaterial

        if (Array.isArray(mesh.material)) {
          ;(mesh.material as THREE.Material[])[idx] = mat
        } else {
          mesh.material = mat
        }

        const names = [mat.name || '', mesh.name || '', child.name || '']
          .map((s) => s.toLowerCase().trim())
          .filter((s) => s && s !== '-')

        const matchTarget = (target: string): boolean => {
          const t = (target || '').toLowerCase().trim()
          if (!t) return false
          return names.some((n) => {
            if (!n) return false
            if (n === t) return true
            const minLen = /[\u4e00-\u9fff]/.test(t) || /[\u4e00-\u9fff]/.test(n) ? 2 : 3
            if (n.length < minLen || t.length < minLen) return false
            return n.includes(t) || t.includes(n)
          })
        }

        const hitTextureTarget = targets.some((t) => matchTarget(t))

        // 兜底：patternArea === 'full' 且配置了 excludeFromPatternAreaFull（如手提带材质）
        // 当 JSON textureTargetMaterials.full 未命中但当前材质又不是"明确排除项"时 → 也贴 full
        // 这解决了托特包 full 数组写不全导致"只有正中贴花、其余包身变纯色冒充"的问题
        let hitByExcludeFallback = false
        if (patternArea === 'full' && excludeFromPatternAreaFull.length > 0 && !hitTextureTarget) {
          const isExcluded = excludeFromPatternAreaFull.some((ex) => matchTarget(ex))
          if (!isExcluded) {
            hitByExcludeFallback = true
          }
        }
        const effectiveHitTexture = hitTextureTarget || hitByExcludeFallback

        if (typeof mat.metalness === 'number') {
          mat.metalness = Math.min(mat.metalness, 0.15)
        }
        if (typeof mat.roughness === 'number') {
          mat.roughness = Math.max(mat.roughness, 0.55)
        }

        // ===== 纹样贴图：严格按规则 =====
        if (texture && effectiveHitTexture) {
          mat.map = texture
          mat.color.set('#ffffff') // 贴图区必须纯白，否则乘脏贴图
          
          // 应用混合模式
          switch (blendMode) {
            case 'overlay':
              // 叠加：近似用 AdditiveBlending 但降低强度
              mat.blending = THREE.CustomBlending
              mat.blendSrc = THREE.SrcAlphaFactor
              mat.blendDst = THREE.OneFactor
              mat.blendEquation = THREE.AddEquation
              mat.opacity = 0.85
              mat.transparent = true
              break
            case 'multiply':
              // 正片叠底
              mat.blending = THREE.MultiplyBlending
              mat.opacity = 1
              mat.transparent = false
              break
            case 'screen':
              // 滤色：用 CustomBlending 近似 Screen
              mat.blending = THREE.CustomBlending
              mat.blendSrc = THREE.OneFactor
              mat.blendDst = THREE.OneMinusSrcColorFactor
              mat.blendEquation = THREE.AddEquation
              mat.opacity = 0.9
              mat.transparent = true
              break
            case 'normal':
            default:
              // 正常模式
              mat.blending = THREE.NormalBlending
              mat.opacity = 1
              mat.transparent = false
              break
          }
          
          mat.needsUpdate = true
        } else {
          // 未命中贴图目标：清 map + 严格恢复 initialColor（绝不会黑，因为存时已修正）
          mat.map = null
          mat.blending = THREE.NormalBlending
          mat.opacity = 1
          mat.transparent = false
          const initC = getInitialColor(names, mesh.name, idx)
          mat.color.copy(initC)
          mat.needsUpdate = true
        }

        // ===== 换色：仅用户显式设置的部件覆盖 =====
        let userColored = false
        colorMaterials.forEach((cm) => {
          if (!matchTarget(cm.materialName)) return
          const hex = colorMap[cm.name]
          if (!hex) return
          userColored = true
          const targetColor = hexToColor(hex)
          if (mat.map) {
            // 有贴图：不要把 color 乘脏贴图，用 emissive 轻微着色
            mat.emissive.copy(targetColor)
            mat.emissiveIntensity = 0.2
          } else {
            mat.color.copy(targetColor)
            mat.emissive.set(0x000000)
            mat.emissiveIntensity = 0
          }
          mat.needsUpdate = true
        })

        // 未被用户换色：确保 emissive 干净，无贴图时保持 initialColor
        if (!userColored) {
          if (!mat.map) {
            const initC = getInitialColor(names, mesh.name, idx)
            mat.color.copy(initC)
          }
          mat.emissive.set(0x000000)
          mat.emissiveIntensity = 0
        }
      })
    })
  }, [clonedScene, texture, scene, textureTargetMaterial, textureTargetMaterials, patternArea, colorTargetMaterials, colorArea, colorMaterials, colorMap, layoutMode, patternScale, offsetX, offsetY, patternRotation, blendMode])

  return (
    <group rotation={modelRotation as [number, number, number]} scale={modelScale}>
      <Center>
        <primitive object={clonedScene} ref={clonedSceneRef} />
      </Center>
    </group>
  )
}

function LoaderFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.35, 0.7, 0.06]} />
      <meshStandardMaterial color="#cccccc" wireframe />
    </mesh>
  )
}

export function Product3DViewer({
  modelUrl,
  textureTargetMaterial,
  textureTargetMaterials,
  colorTargetMaterials,
  colorMaterials = [],
  patternImage,
  colorMap = {},
  cameraPosition,
  modelRotation,
  modelScale,
  patternArea = 'chest',
  colorArea,
  captureRef,
  className = '',
  excludeFromPatternAreaFull = [],
  layoutMode = 'center',
  patternScale = 1,
  offsetX = 0,
  offsetY = 0,
  patternRotation = 0,
  blendMode = 'normal',
}: Product3DViewerProps) {
  const rot = modelRotation ?? [0, 0, 0]
  const scl = modelScale ?? 0.35
  const cam = cameraPosition ?? [0, 0.12, 1.7]
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  const handleCreated = ({ gl }: { gl: THREE.WebGLRenderer }) => {
    rendererRef.current = gl
    gl.setClearColor(0x000000, 0)
    if (captureRef) {
      captureRef.current = () => {
        try {
          return gl.domElement.toDataURL('image/png')
        } catch {
          return null
        }
      }
    }
  }

  return (
    <div
      className={`w-full ${className}`}
      style={{ height: 480, minHeight: 480, background: '#f7f3eb' }}
    >
      <Canvas
        key={modelUrl}
        camera={{ position: cam, fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={handleCreated}
      >
        <ambientLight intensity={1.25} />
        <hemisphereLight args={['#ffffff', '#e8e0d4', 0.55]} />
        <directionalLight position={[4, 6, 4]} intensity={0.85} />
        <directionalLight position={[-3, 3, 2]} intensity={0.5} />
        <directionalLight position={[0, 2, -5]} intensity={0.7} />
        <directionalLight position={[0, -2, 3]} intensity={0.35} />

        <Suspense fallback={<LoaderFallback />}>
          <Model
            key={`${modelUrl}-${patternImage || 'none'}-${layoutMode}-${patternScale}-${offsetX}-${offsetY}-${patternRotation}-${blendMode}`}
            modelUrl={modelUrl}
            textureTargetMaterial={textureTargetMaterial}
            textureTargetMaterials={textureTargetMaterials}
            colorTargetMaterials={colorTargetMaterials}
            colorMaterials={colorMaterials}
            patternImage={patternImage}
            colorMap={colorMap}
            modelRotation={rot}
            modelScale={scl}
            patternArea={patternArea}
            colorArea={colorArea}
            excludeFromPatternAreaFull={excludeFromPatternAreaFull}
            layoutMode={layoutMode}
            patternScale={patternScale}
            offsetX={offsetX}
            offsetY={offsetY}
            patternRotation={patternRotation}
            blendMode={blendMode}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.5}
          maxDistance={6}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
