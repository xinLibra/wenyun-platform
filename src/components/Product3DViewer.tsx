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

/**
 * 匹配策略：优先精确匹配 material.name；其次 node/mesh 名精确；最后才 includes。
 * 避免一个短名（如 "cushion"）通过 includes 误伤多个部件。
 */
function matchMaterial(
  matName: string,
  nodeName: string,
  meshName: string,
  target: string
): boolean {
  const t = target.toLowerCase()
  const m = matName.toLowerCase()
  const n = nodeName.toLowerCase()
  const ms = meshName.toLowerCase()

  // 1. 材质名精确匹配（最可靠）
  if (m.length > 0 && m === t) return true
  // 2. 节点名精确匹配
  if (n.length > 0 && n === t) return true
  // 3. mesh 名精确匹配
  if (ms.length > 0 && ms === t) return true
  // 4. 最后才 includes（兜底，处理带后缀的情况如 .001）
  if (m.length > 0 && m.includes(t)) return true
  if (n.length > 0 && n.includes(t)) return true
  if (ms.length > 0 && ms.includes(t)) return true
  return false
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
  modelRotation = [0, 0, 0],
  modelScale = 0.45,
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

        // 若 mesh 没有材质，创建默认浅灰材质
        if (!mesh.material) {
          mesh.material = new THREE.MeshStandardMaterial({ color: '#f0ece4', roughness: 0.85, metalness: 0 })
          return
        }

        const oldMat: THREE.MeshStandardMaterial = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
        if (!oldMat) return

        const mat = oldMat.clone() as THREE.MeshStandardMaterial
        mesh.material = mat

        const nodeName = child.name || ''
        const meshName = mesh.name || ''
        const matName = mat.name || ''

        // 防止纯黑材质：克隆后若 color 为 #000000 则重置为浅灰（仅当不是用户选色目标时）
        const isColorTarget = colorMaterials.some(cm => matchMaterial(matName, nodeName, meshName, cm.materialName))
        if (!isColorTarget && mat.color && mat.color.getHex() === 0x000000) {
          mat.color.set('#f0ece4')
        }

        // 贴纹样：只对 textureTargetMaterial 匹配的 mesh 贴图
        // 贴纹样时将 color 设为白，避免与贴图颜色相乘发黑
        if (texture && textureTargetMaterial && matchMaterial(matName, nodeName, meshName, textureTargetMaterial)) {
          mat.map = texture
          mat.color.set('#ffffff')
          mat.needsUpdate = true
        }

        // 换色：只对 colorMaterials 匹配的 mesh 改色，不影响其他部件
        // 仅当 colorMap 中明确有该 name 的色值时才写
        colorMaterials.forEach((cm) => {
          if (matchMaterial(matName, nodeName, meshName, cm.materialName)) {
            const hex = colorMap[cm.name]
            if (hex) {
              const targetColor = hexToColor(hex)
              mat.color.copy(targetColor)
              // 有 map 的部件：emissive 低强度，避免整块发黑发脏
              if (mat.map) {
                mat.emissive.copy(targetColor)
                mat.emissiveIntensity = 0.2
              } else {
                // 无 map 部件：emissive 关闭，仅靠 color
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
        camera={{ position: cameraPosition || [0, 0.1, 1.7], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        {/* 环境光：整体提亮，解决背面全黑 */}
        <ambientLight intensity={1.2} />
        {/* 半球光：天空白、地面暖，模拟环境反射 */}
        <hemisphereLight args={['#ffffff', '#e8e0d4', 0.5]} />
        {/* 主光：正面偏上 */}
        <directionalLight position={[3, 5, 4]} intensity={0.9} />
        {/* 背面补光：解决转到背面过暗 */}
        <directionalLight position={[0, 1, -4]} intensity={0.7} />
        {/* 侧补光 */}
        <directionalLight position={[-3, 2, 3]} intensity={0.35} />

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
          minDistance={0.5}
          maxDistance={5}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
