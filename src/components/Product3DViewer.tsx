import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center } from '@react-three/drei'
import * as THREE from 'three'

interface ColorMaterial {
  name: string
  materialName: string
  label: string
}

interface Product3DViewerProps {
  modelUrl: string
  textureTargetMaterial: string
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
  cameraPosition?: [number, number, number]
  modelRotation?: [number, number, number]
  modelScale?: number
  className?: string
}

/** 判断 name 列表中是否任一项匹配 target（相等或包含） */
function matchesAnyName(names: string[], target: string): boolean {
  const t = target.toLowerCase()
  return names.some(n => n.length > 0 && (n === t || n.includes(t)))
}

/** 解析 hex 颜色为 THREE.Color */
function hexToColor(hex: string): THREE.Color {
  try {
    return new THREE.Color(hex)
  } catch {
    return new THREE.Color('#ffffff')
  }
}

/** 首次加载时打印所有 mesh 的名字和材质名，便于调试 */
const loggedModels = new Set<string>()

function Model({
  modelUrl,
  textureTargetMaterial,
  colorMaterials = [],
  patternImage,
  colorMap = {},
  modelRotation = [0, -Math.PI / 2, 0],
  modelScale = 0.85,
}: {
  modelUrl: string
  textureTargetMaterial: string
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
  modelRotation?: [number, number, number]
  modelScale?: number
}) {
  const { scene } = useGLTF(modelUrl)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const clonedSceneRef = useRef<THREE.Group | null>(null)

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

  // 首次加载打印材质/节点名
  useEffect(() => {
    const modelKey = modelUrl
    if (loggedModels.has(modelKey)) return
    loggedModels.add(modelKey)

    const meshInfo: string[] = []
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mat = mesh.material as THREE.MeshStandardMaterial
        const info = `  node="${child.name || '-'}" mesh="${mesh.name || '-'}" mat="${mat?.name || '-'}" hasMap=${!!mat?.map} color=${mat?.color?.getHexString() || '-'}`
        meshInfo.push(info)
      }
    })
    console.log(`[3D Viewer] ${modelUrl} 材质/节点清单:\n${meshInfo.join('\n')}`)
  }, [clonedScene, modelUrl])

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh

        if (!mesh.material) {
          mesh.material = new THREE.MeshStandardMaterial({ color: '#f5f5f5', roughness: 0.8, metalness: 0 })
          return
        }

        const oldMat: THREE.MeshStandardMaterial = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
        if (!oldMat) return

        const mat = oldMat.clone() as THREE.MeshStandardMaterial
        mesh.material = mat

        // 收集所有可能的名字：节点名 + 材质名 + mesh 名
        const childName = (child.name || '').toLowerCase()
        const matNameStr = (mat.name || '').toLowerCase()
        const meshNameStr = (mesh.name || '').toLowerCase()
        const allNames = [childName, matNameStr, meshNameStr].filter(n => n.length > 0)

        // 防止纯黑材质：克隆后若颜色为 #000000 则重置为浅灰
        if (mat.color && mat.color.getHex() === 0x000000) {
          mat.color.set('#f5f5f5')
        }

        // 贴纹样：只对 textureTargetMaterial 匹配的 mesh 贴图
        // 贴纹样时将 color 设为白，避免与贴图颜色相乘发黑
        if (texture && textureTargetMaterial && matchesAnyName(allNames, textureTargetMaterial)) {
          mat.map = texture
          mat.color.set('#ffffff')
          mat.needsUpdate = true
        }

        // 换色：只对 colorMaterials 匹配的 mesh 改色，不影响其他部件
        // 换色时同时设 color + emissive，确保有 map 的材质也能看见颜色变化
        colorMaterials.forEach((cm) => {
          if (matchesAnyName(allNames, cm.materialName)) {
            const hex = colorMap[cm.name]
            if (hex) {
              const targetColor = hexToColor(hex)
              mat.color.copy(targetColor)
              // 对有 map 的材质，用 emissive 保证颜色可见
              if (mat.map) {
                mat.emissive.copy(targetColor)
                mat.emissiveIntensity = 0.6
              } else {
                mat.emissiveIntensity = 0
              }
              mat.needsUpdate = true
            }
          }
        })
      }
    })
  }, [clonedScene, texture, textureTargetMaterial, colorMaterials, colorMap])

  return (
    <Center>
      <group rotation={modelRotation} scale={modelScale}>
        <primitive object={clonedScene} ref={clonedSceneRef} />
      </group>
    </Center>
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
  colorMaterials = [],
  patternImage,
  colorMap = {},
  cameraPosition,
  modelRotation,
  modelScale,
  className = '',
}: Product3DViewerProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{ height: 480, minHeight: 480, background: '#f7f3eb' }}
    >
      <Canvas
        camera={{ position: cameraPosition || [0, 0.05, 2.4], fov: 28 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 4]} intensity={1.15} />
        <directionalLight position={[-3, 2, -3]} intensity={0.45} />
        <directionalLight position={[0, 2, 5]} intensity={0.4} />

        <Suspense fallback={<LoaderFallback />}>
          <Model
            modelUrl={modelUrl}
            textureTargetMaterial={textureTargetMaterial}
            colorMaterials={colorMaterials}
            patternImage={patternImage}
            colorMap={colorMap}
            modelRotation={modelRotation}
            modelScale={modelScale}
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.8}
          maxDistance={5}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
