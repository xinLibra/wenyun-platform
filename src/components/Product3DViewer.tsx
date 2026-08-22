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

function getColorTargets(
  colorMaterialName: string,
  colorTargetMaterials: TextureTargetMaterials | undefined,
  colorArea: PatternAreaKey | undefined
): string[] | null {
  if (!colorArea) return null
  const mapped = colorTargetMaterials?.[colorArea]
  if (mapped?.length) return mapped
  if (colorMaterialName) return [colorMaterialName]
  return null
}

const loggedModels = new Set<string>()

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
}: {
  modelUrl: string
  textureTargetMaterial: string
  textureTargetMaterials?: TextureTargetMaterials
  colorTargetMaterials?: TextureTargetMaterials
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
  modelRotation?: [number, number, number]
  modelScale?: number
  patternArea?: PatternAreaKey
  colorArea?: PatternAreaKey
}) {
  const { scene } = useGLTF(modelUrl)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const clonedSceneRef = useRef<THREE.Group | null>(null)

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
  }, [clonedScene, modelUrl])

  useEffect(() => {
    const targets = getTextureTargets(textureTargetMaterial, textureTargetMaterials, patternArea)

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
            if (n.length < 3 || t.length < 3) return false
            return n.includes(t) || t.includes(n)
          })
        }

        const hitTextureTarget = targets.some((t) => matchTarget(t))

        if (mat.color && mat.color.getHex() === 0x000000) {
          mat.color.set('#f0f0f0')
        }
        if (typeof mat.metalness === 'number') {
          mat.metalness = Math.min(mat.metalness, 0.15)
        }
        if (typeof mat.roughness === 'number') {
          mat.roughness = Math.max(mat.roughness, 0.55)
        }

        // ===== 纹样贴图：命中目标 → 贴 + color=白，否则清除 =====
        if (texture && hitTextureTarget) {
          mat.map = texture
          mat.color.set('#ffffff')
          mat.needsUpdate = true
        } else if (!hitTextureTarget && mat.map === texture) {
          mat.map = null
          mat.color.set('#f0f0f0')
          mat.needsUpdate = true
        }

        // ===== 换色 =====
        let userColored = false
        colorMaterials.forEach((cm) => {
          if (!matchTarget(cm.materialName)) return
          const hex = colorMap[cm.name]
          if (!hex) return
          userColored = true
          const targetColor = hexToColor(hex)
          if (mat.map) {
            // 有贴图：不要用 color 乘脏贴图，用 emissive 做轻微着色
            mat.emissive.copy(targetColor)
            mat.emissiveIntensity = 0.2
          } else {
            mat.color.copy(targetColor)
            mat.emissive.set(0x000000)
            mat.emissiveIntensity = 0
          }
          mat.needsUpdate = true
        })

        if (!userColored && mat.color) {
          const hsl = { h: 0, s: 0, l: 0 }
          mat.color.getHSL(hsl)
          if (hsl.l < 0.35) {
            mat.color.set(mat.map ? '#ffffff' : '#e8e8e8')
          }
        }
        if (mat.emissive && !userColored) {
          mat.emissive.set(0x000000)
          mat.emissiveIntensity = 0
        }
      })
    })
  }, [clonedScene, texture, textureTargetMaterial, textureTargetMaterials, patternArea, colorTargetMaterials, colorArea, colorMaterials, colorMap])

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
