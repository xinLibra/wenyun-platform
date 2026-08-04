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
  cameraPosition?: [number, number, number];
  className?: string
}

function Model({
  modelUrl,
  textureTargetMaterial,
  colorMaterials = [],
  patternImage,
  colorMap = {},
}: {
  modelUrl: string
  textureTargetMaterial: string
  colorMaterials?: ColorMaterial[]
  patternImage?: string | null
  colorMap?: Record<string, string>
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

        const matName = (mat.name || mesh.name || '').toLowerCase()

        if (
          texture &&
          (matName === textureTargetMaterial.toLowerCase() ||
            matName.includes(textureTargetMaterial.toLowerCase()))
        ) {
          mat.map = texture
          mat.needsUpdate = true
        }

        colorMaterials.forEach((cm) => {
          if (
            matName === cm.materialName.toLowerCase() ||
            matName.includes(cm.materialName.toLowerCase())
          ) {
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

  // 稍微旋转，让正面朝向相机（若仍侧对，可改 rotation-y 数值）
  return (
    <Center>
      <group rotation={[0, -Math.PI / 2, 0]} scale={0.85}>
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
  className = '',
}: Product3DViewerProps) {
  return (
    <div
      className={`w-full ${className}`}
      style={{ height: 480, minHeight: 480, background: '#f7f3eb' }}
    >
      <Canvas
        // 拉远相机，尽量看全机身
        camera={{ position: [0, 0.05, 2.4], fov: 28 }}
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
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.8}
          maxDistance={3.5}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/models/phone_case.glb')