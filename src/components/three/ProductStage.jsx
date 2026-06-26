import { useRef, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useTexture, Grid } from "@react-three/drei"
import * as THREE from "three"
import { useReducedMotion } from "framer-motion"

// The product photo on a 3D plane that tilts toward the pointer, sat above a
// neon ring pedestal and an infinite grid floor with a neon rim light.
// "View it from every angle" feel using the real photo — no 3D model needed.

function Photo({ url }) {
  const tex = useTexture(url)
  const ref = useRef()
  const reduce = useReducedMotion()

  // keep the image crisp / unlit (its own colors, not scene-lit)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8

  useFrame((state) => {
    if (!ref.current || reduce) return
    const tx = state.pointer.x * 0.45
    const ty = -state.pointer.y * 0.35
    ref.current.rotation.y += (tx - ref.current.rotation.y) * 0.08
    ref.current.rotation.x += (ty - ref.current.rotation.x) * 0.08
  })

  return (
    <group ref={ref}>
      <mesh>
        <planeGeometry args={[2.4, 3.2]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function Pedestal() {
  return (
    <>
      {/* neon ring under the piece */}
      <mesh position={[0, -1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.018, 16, 80]} />
        <meshBasicMaterial color="#c8ff00" toneMapped={false} />
      </mesh>
      {/* rim light from below */}
      <pointLight position={[0, -1.2, 1.5]} color="#c8ff00" intensity={6} distance={7} />
      {/* soft fill from front */}
      <pointLight position={[0, 0.5, 4]} color="#ffffff" intensity={2} distance={10} />
    </>
  )
}

export default function ProductStage({ url }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 4.6], fov: 38 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <Suspense fallback={null}>
        <Photo url={url} />
        <Pedestal />
        <Grid
          position={[0, -1.95, 0]}
          args={[30, 30]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#1f1f24"
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor="#c8ff00"
          fadeDistance={16}
          fadeStrength={1.5}
          infiniteGrid
        />
      </Suspense>
    </Canvas>
  )
}
