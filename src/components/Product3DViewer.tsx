import { Suspense, useEffect, useMemo, useState } from 'react'
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
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const oldMat = mesh.material as THREE.MeshStandardMaterial
        if (!oldMat) return

        const mat = oldMat.clone()
        mesh.material = mat

        // 收集所有可能的名字：节点名 + 材质名 + mesh 名
        const childName = (child.name || '').toLowerCase()
        const matNameStr = (mat.name || '').toLowerCase()
        const meshNameStr = (mesh.name || '').toLowerCase()
        const allNames = [childName, matNameStr, meshNameStr].filter(n => n.length > 0)

        // 防止纯黑材质：克隆后若颜色为 #000000 则重置为白
        if (mat.color && mat.color.getHex() === 0x000000) {
          mat.color.set('#f5f5f5')
        }

        // 贴纹样：只对 textureTargetMaterial 匹配的 mesh 贴图
        if (texture && textureTargetMaterial && matchesAnyName(allNames, textureTargetMaterial)) {
          mat.map = texture
          mat.needsUpdate = true
        }

        // 换色：只对 colorMaterials 匹配的 mesh 改色，不影响其他部件
        colorMaterials.forEach((cm) => {
          if (matchesAnyName(allNames, cm.materialName)) {
            const hex = colorMap[cm.name]
            if (hex) {
              mat.color.set(hex)
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
        <primitive object={clonedScene} />
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
