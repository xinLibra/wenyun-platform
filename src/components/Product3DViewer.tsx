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

type TextureTargetMaterials = Partial<Record<PatternAreaKey, string[]>>

interface Product3DViewerProps {
  modelUrl: string
  /** 目标材质：可为单个材质名或数组（如 tote_bag.json 的 textureTargetMaterial 数组） */
  textureTargetMaterial: string | string[]
  textureTargetMaterials?: TextureTargetMaterials
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
  cameraPosition?: [number, number, number]
  modelRotation?: [number, number, number]
  modelScale?: number
  patternArea?: PatternAreaKey
  captureRef?: React.MutableRefObject<(() => string | null) | null>
  className?: string
  /** patternArea=full 时，不贴图的材质列表（用于兜底 full 配置不全） */
  excludeFromPatternAreaFull?: string[]
  /** 纹样透明度 0-1，仅对命中贴图目标的材质生效（默认 1 不透明） */
  patternOpacity?: number
}

function hexToColor(hex: string): THREE.Color {
  try {
    return new THREE.Color(hex)
  } catch {
    return new THREE.Color('#ffffff')
  }
}

/** 统一名称归一化：先 String(x ?? '') 再 trim + toLowerCase，禁止未 String 就 toLowerCase */
function norm(x: unknown): string {
  return String(x ?? '').trim().toLowerCase()
}

/** 命中判断：mesh 名 或 材质名 精确匹配（二者都认，抱枕等 GLB 只有 mesh 名可用的产品依赖此函数） */
function hitTarget(mesh: THREE.Mesh, target: string): boolean {
  const t = norm(target)
  if (!t) return false
  if (norm(mesh.name) === t) return true
  const raw = mesh.material
  const mats = (Array.isArray(raw) ? raw : [raw]) as THREE.MeshStandardMaterial[]
  return mats.some((m) => norm(m?.name) === t)
}

function getTextureTargets(
  textureTargetMaterial: string | string[],
  textureTargetMaterials: TextureTargetMaterials | undefined,
  patternArea: PatternAreaKey
): string[] {
  if (textureTargetMaterials?.[patternArea]?.length) {
    return textureTargetMaterials[patternArea] as string[]
  }
  if (Array.isArray(textureTargetMaterial)) {
    // 数组目标：展开为 string[]，避免整段数组当 string 导致 toLowerCase 崩溃
    return textureTargetMaterial.filter((t): t is string => typeof t === 'string')
  }
  if (typeof textureTargetMaterial === 'string') {
    return [textureTargetMaterial]
  }
  return []
}

const loggedModels = new Set<string>()

function Model({
  modelUrl,
  textureTargetMaterial,
  textureTargetMaterials,
  colorMaterials = [],
  patternImage,
  colorMap = {},
  modelRotation = [0, 0, 0],
  modelScale = 0.35,
  patternArea = 'chest',
  excludeFromPatternAreaFull = [],
  patternOpacity = 1,
}: {
  modelUrl: string
  textureTargetMaterial: string | string[]
  textureTargetMaterials?: TextureTargetMaterials
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
  modelRotation?: [number, number, number]
  modelScale?: number
  patternArea?: PatternAreaKey
  /** full 贴图时，这些材质名绝对不贴图（如手提带）；用于兜底 full 配置不全的 JSON */
  excludeFromPatternAreaFull?: string[]
  /** 纹样透明度 0-1，仅对命中贴图目标的材质生效 */
  patternOpacity?: number
}) {
  const { scene } = useGLTF(modelUrl)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const clonedSceneRef = useRef<THREE.Group | null>(null)
  // 只存一次的「原始色」缓存：key = mat.name/mesh.name 组合，值 = 修正后的 THREE.Color
  const initialColorsRef = useRef<Map<string, THREE.Color>>(new Map())
  const initialColorReadyRef = useRef(false)
  const materialDumpLoggedRef = useRef(false)

  useEffect(() => {
    console.log('[Model] url=', modelUrl, 'rot=', modelRotation, 'scale=', modelScale, 'patternArea=', patternArea)
  }, [modelUrl, modelRotation, modelScale, patternArea])

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
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        tex.flipY = false
        setTexture(tex)
      },
      undefined,
      (err) => console.error('纹样贴图加载失败', err)
    )
    return () => {
      cancelled = true
    }
  }, [patternImage])

  const clonedScene = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    if (loggedModels.has(modelUrl)) return
    loggedModels.add(modelUrl)
    const meshInfo: string[] = []
    const targets = getTextureTargets(textureTargetMaterial, textureTargetMaterials, patternArea)
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const raw = mesh.material
        const matList = (Array.isArray(raw) ? raw : [raw]) as THREE.MeshStandardMaterial[]
        const names = [norm(mesh.name), norm(child.name), ...matList.map((m) => norm(m?.name))]
          .filter((s) => s && s !== '-')
        const hitTarget = targets.some((t) => {
          const tt = norm(t)
          if (!tt) return false
          return names.some((n) => {
            if (!n) return false
            if (n === tt) return true
            const minLen = /[\u4e00-\u9fff]/.test(tt) || /[\u4e00-\u9fff]/.test(n) ? 2 : 3
            if (n.length < minLen || tt.length < minLen) return false
            return n.includes(tt) || tt.includes(n)
          })
        })
        const matNames = matList.map((m) => `"${m?.name || '-'}"`).join(', ')
        const matHex = matList.map((m) => m?.color?.getHexString() || '-').join(', ')
        const hasMap = matList.some((m) => !!m?.map)
        meshInfo.push(
          `  node="${child.name || '-'}" mesh="${mesh.name || '-'}" mat=[${matNames}] hasMap=${hasMap} color=[${matHex}] hitTextureTarget=${hitTarget ? '✓' : '✗'}`
        )
      }
    })
    console.log(`[3D Viewer] ${modelUrl} 材质/节点清单:\n${meshInfo.join('\n')}`)
    // 打印当前 targets 和 colorMaterials 供调试
    console.log(`[3D Viewer] patternArea=${patternArea} targets=`, targets)
    console.log(`[3D Viewer] colorMaterials=`, colorMaterials.map(cm => `${cm.name}=${cm.materialName}`))
    console.log(`[3D Viewer] colorMap=`, colorMap)
  }, [clonedScene, modelUrl])

  useEffect(() => {
    const targets = getTextureTargets(textureTargetMaterial, textureTargetMaterials, patternArea)
    // 本次实际贴图 / 换色的材质名收集（供 Console 汇总）
    const texturedMats = new Set<string>()
    const recoloredMats = new Set<string>()

    // 统计场景 mesh 数：只有 1 个 mesh 时，贴图/上色无条件命中（抱枕等单网格产品兜底）
    const allMeshes: THREE.Mesh[] = []
    clonedScene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) allMeshes.push(o as THREE.Mesh)
    })
    const isSingleMesh = allMeshes.length === 1
    if (isSingleMesh) {
      console.log(`[3D Viewer] ${modelUrl} fallback single mesh: 场景仅 ${allMeshes.length} 个 mesh，贴图/上色强制命中`)
    }

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
          const matName = String(m.name ?? '').toLowerCase().trim()
          const meshName = String(mesh.name ?? '').toLowerCase().trim()
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
      const byIndex = initialColorsRef.current.get(`${String(meshName ?? '').toLowerCase()}|${matIdx}`)
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

    // ===== 换色诊断：colorMap 非空时打印场景真实材质名 + 换色目标映射，便于核对 GLB 材质名 =====
    if (Object.keys(colorMap).length > 0) {
      const sceneMats = new Set<string>()
      clonedScene.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return
        const mesh = child as THREE.Mesh
        const ms = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        ms.forEach((m) => {
          if (m?.name) sceneMats.add(m.name)
        })
      })
      console.log(
        `[3D Viewer recolor-diag] colorMap={${Object.entries(colorMap).map(([k, v]) => `${k}:${v}`).join(', ')}} colorMaterials=${JSON.stringify(colorMaterials.map((cm) => `${cm.name}->${cm.materialName}`))} targets=${JSON.stringify(targets)} sceneMaterials=[${[...sceneMats].join(', ')}]`
      )
    }

    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh

      if (!mesh.material) {
        // GLB 网格没有材质（如 cushion.glb 的 glTF 未声明 materials）：
        // 之前这里直接 return，导致永远贴不上纹样。现在创建默认材质后继续走下方贴图逻辑。
        mesh.material = new THREE.MeshStandardMaterial({
          name: mesh.name || child.name || '',
          color: '#f5f5f5',
          roughness: 0.75,
          metalness: 0,
        })
        console.warn(
          `[3D Viewer] ${modelUrl} 网格 "${mesh.name || child.name}" 原本无材质，已创建默认材质，继续尝试贴图（node=${child.name}）`
        )
      }

      const raw = mesh.material
      const matList = (Array.isArray(raw) ? raw : [raw]) as THREE.MeshStandardMaterial[]

      matList.forEach((oldMat, idx) => {
        if (!oldMat) return

        const mat = oldMat.clone() as THREE.MeshStandardMaterial
        // 记录原始透明度，未命中贴图时恢复（避免半透明材质被破坏）
        const origOpacity = oldMat.opacity
        const origTransparent = oldMat.transparent
        const origDepthWrite = oldMat.depthWrite

        if (Array.isArray(mesh.material)) {
          ;(mesh.material as THREE.Material[])[idx] = mat
        } else {
          mesh.material = mat
        }

        const names = [norm(mat.name), norm(mesh.name), norm(child.name)]
          .filter((s) => s && s !== '-')

        // mesh 名 + 材质名都认（hitTarget 精确匹配），再叠加旧子串匹配兼容其它产品
        const matchTarget = (target: string): boolean => {
          const t = norm(target)
          if (!t) return false
          if (hitTarget(mesh, target)) return true
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

        // 换色部件拦截：仅当"纹样目标为子串命中（非精确）"且该材质是换色部件时才拦截贴图。
        // 修复笔记本线圈 "材质.002" 被过宽目标 "材质" 子串命中 → 线圈被纹样染色；
        // 同时保证"本身就是精确贴图目标的换色部件"仍能贴纹样（抱枕整枕 / T恤胸前）。
        const hitColorMaterial = colorMaterials.some((cm) => matchTarget(cm.materialName))
        const exactTextureTargetHit = targets.some((t) => {
          const tt = String(t ?? '').toLowerCase().trim()
          return tt && names.includes(tt)
        })

        // 单 mesh 兜底：场景只有 1 个 mesh 时无条件贴图（json 名字对不上也强制生效）
        const effectiveHitTexture = isSingleMesh
          ? true
          : (hitTextureTarget || hitByExcludeFallback) && (!hitColorMaterial || exactTextureTargetHit)

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
          // 纹样透明度：命中贴图的材质按 patternOpacity 生效
          mat.opacity = patternOpacity
          mat.transparent = patternOpacity < 1
          mat.depthWrite = patternOpacity >= 1
          mat.needsUpdate = true
          texturedMats.add(mat.name || mesh.name || child.name || '-')
        } else {
          // 未命中贴图目标：清 map + 严格恢复 initialColor（绝不会黑，因为存时已修正）
          mat.map = null
          mat.opacity = origOpacity
          mat.transparent = origTransparent
          mat.depthWrite = origDepthWrite
          const initC = getInitialColor(names, mesh.name, idx)
          mat.color.copy(initC)
          mat.needsUpdate = true
        }

        // ===== 换色：仅用户显式设置的部件覆盖（单 mesh 时无条件命中）=====
        let userColored = false
        colorMaterials.forEach((cm) => {
          if (!isSingleMesh && !matchTarget(cm.materialName)) return
          const hex = colorMap[cm.name]
          if (!hex) return
          userColored = true
          const targetColor = hexToColor(hex)
          const mode = mat.map ? 'emissive' : 'color'
          if (mat.map) {
            // 有贴图：不要把 color 乘脏贴图，用 emissive 着色（强度提高让部件底色可见，但不破坏纹样）
            mat.emissive.copy(targetColor)
            mat.emissiveIntensity = 0.45
          } else {
            mat.color.copy(targetColor)
            mat.emissive.set(0x000000)
            mat.emissiveIntensity = 0
          }
          mat.needsUpdate = true
          recoloredMats.add(mat.name || mesh.name || child.name || '-')
          console.log(
            `[3D Viewer recolor] part=${cm.name}(${cm.label || ''}) hex=${hex} materialName="${mat.name}" mesh="${mesh.name}" node="${child.name}" mode=${mode}`
          )
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

    // ===== 一次性材质 dump：在默认材质创建后打印真实 material.name（供 json 对齐）=====
    if (!materialDumpLoggedRef.current) {
      materialDumpLoggedRef.current = true
      const dump: string[] = []
      clonedScene.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m, i) => {
          dump.push(
            `[3D Viewer dump] node="${child.name || '-'}" meshName="${mesh.name || '-'}" materialName="${m?.name || '-'}" matIndex=${i} type=${m?.type || '-'}`
          )
        })
      })
      console.log(`[3D Viewer] ${modelUrl} 材质 dump（创建默认材质后）:\n${dump.join('\n')}`)
    }

    // ===== 汇总：本次实际执行的贴图 / 换色材质列表 =====
    console.log(
      `[3D Viewer apply] patternArea=${patternArea} targets=${JSON.stringify(targets)} textured=[${[...texturedMats].join(', ')}] recolored=[${[...recoloredMats].join(', ')}]`
    )
  }, [clonedScene, texture, scene, textureTargetMaterial, textureTargetMaterials, patternArea, colorMaterials, colorMap, patternOpacity])

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
  colorMaterials = [],
  patternImage,
  colorMap = {},
  cameraPosition,
  modelRotation,
  modelScale,
  patternArea = 'chest',
  captureRef,
  className = '',
  excludeFromPatternAreaFull = [],
  patternOpacity = 1,
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
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
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
            key={`${modelUrl}-${patternImage || 'none'}`}
            modelUrl={modelUrl}
            textureTargetMaterial={textureTargetMaterial}
            textureTargetMaterials={textureTargetMaterials}
            colorMaterials={colorMaterials}
            patternImage={patternImage}
            colorMap={colorMap}
            modelRotation={rot}
            modelScale={scl}
            patternArea={patternArea}
            excludeFromPatternAreaFull={excludeFromPatternAreaFull}
            patternOpacity={patternOpacity}
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
