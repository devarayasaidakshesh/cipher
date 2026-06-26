import { useMemo, useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "framer-motion"

// A dense field of neon "signal" points drifting in 3D behind the hero
// wordmark. The whole field tilts toward the pointer (parallax) and slowly
// rotates. Reduced-motion users get a static field (no rotation).
//
// Parallax is driven by a window-level pointer listener (not R3F's
// state.pointer) because the canvas is pointer-events-none so it never
// blocks the hero CTAs.

function Points({ count = 2500 }) {
  const ref = useRef()
  const reduce = useReducedMotion()
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 34
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22
    }
    return arr
  }, [count])

  useFrame((_, delta) => {
    if (!ref.current) return
    // parallax tilt toward pointer (always on — it's gentle, not motion-sickening)
    const tx = mouse.current.x * 0.35
    const ty = mouse.current.y * 0.25
    ref.current.rotation.y += (tx - ref.current.rotation.y) * 0.04
    ref.current.rotation.x += (ty - ref.current.rotation.x) * 0.04
    // ambient drift — disabled for reduced-motion users
    if (!reduce) {
      ref.current.rotation.z += delta * 0.012
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#c8ff00"
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// A sparser, larger, dimmer layer behind the main field for depth.
function DepthLayer({ count = 600 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30
      arr[i * 3 + 2] = -8 - Math.random() * 20
    }
    return arr
  }, [count])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color="#c8ff00" sizeAttenuation transparent opacity={0.3} depthWrite={false} />
    </points>
  )
}

export default function SignalField() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <DepthLayer />
        <Points />
      </Canvas>
    </div>
  )
}
