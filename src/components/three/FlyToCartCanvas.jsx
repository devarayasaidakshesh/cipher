import { Suspense } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrthographicCamera, useTexture } from "@react-three/drei"
import { useRef } from "react"
import * as THREE from "three"

// The 3D "shirt flies into the BAG" overlay. Lazily mounted (via AnimatePresence
// in Layout) only during the ~0.8s flight, so no idle WebGL context. Uses an
// **orthographic pixel-matched** camera: world units = screen pixels, so the
// card rect and the BAG rect map directly to plane position — no raycast /
// unproject math (robust without a live preview). The 3D feel comes from the
// tumbling rotation + scale curve (ortho ignores z, so no z-arc).
//
// `addToCart` is deferred to onComplete (land), NOT on click — so the BAG count
// pulses when the plane arrives (Layout handles that). toRect is re-read from
// bagRef each frame (the navbar is sticky).

const DURATION = 0.8 // seconds
const BASE_H = 170 // px — plane height at t=0 (start)
const APEX = 140 // px — how far the arc apex rises above the higher endpoint

function FlyPlane({ img, item, fromRect, bagRef, onComplete }) {
  const tex = useTexture(img)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const ref = useRef()
  const { size, camera } = useThree()
  const t = useRef(0)
  const done = useRef(false)
  const aspect = (tex.image?.width || 1) / (tex.image?.height || 1) || 1

  useFrame((_, dt) => {
    if (done.current) return
    t.current += dt / DURATION
    const tt = Math.min(1, t.current)
    if (tt >= 1) {
      done.current = true
      onComplete?.(item)
      return
    }
    const w = size.width
    const h = size.height
    // keep the ortho camera matched to the viewport (handles mobile URL-bar resize)
    camera.left = -w / 2
    camera.right = w / 2
    camera.top = h / 2
    camera.bottom = -h / 2
    camera.updateProjectionMatrix()

    // P0 = clicked card center (snapshot at click); P2 = BAG center (per frame)
    const p0 = {
      x: fromRect.left + fromRect.width / 2 - w / 2,
      y: -(fromRect.top + fromRect.height / 2 - h / 2),
    }
    const bagRect = bagRef?.current?.getBoundingClientRect?.()
    const toC = bagRect
      ? { x: bagRect.left + bagRect.width / 2, y: bagRect.top + bagRect.height / 2 }
      : { x: w - 40, y: 30 }
    const p2 = { x: toC.x - w / 2, y: -(toC.y - h / 2) }
    const p1 = { x: (p0.x + p2.x) / 2, y: Math.max(p0.y, p2.y) + APEX }

    // quadratic bezier
    const omt = 1 - tt
    const bx = omt * omt * p0.x + 2 * omt * tt * p1.x + tt * tt * p2.x
    const by = omt * omt * p0.y + 2 * omt * tt * p1.y + tt * tt * p2.y

    // scale: 1 → 1.1 @0.5 → 0.22 @1
    const sc = tt < 0.5 ? 1 + 0.1 * (tt / 0.5) : 1.1 - 0.88 * ((tt - 0.5) / 0.5)
    if (ref.current) {
      ref.current.position.set(bx, by, 0)
      ref.current.scale.set(aspect * BASE_H * sc, BASE_H * sc, 1)
      // tumble (~2 turns on X, ~1.3 on Y)
      ref.current.rotation.set(tt * 6.28, tt * 4.14, 0)
    }
  })

  return (
    <mesh ref={ref}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}

function Scene(props) {
  const { size } = useThree()
  const w = size.width
  const h = size.height
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, 0, 100]}
        left={-w / 2}
        right={w / 2}
        top={h / 2}
        bottom={-h / 2}
        near={0.1}
        far={1000}
      />
      <Suspense fallback={null}>
        <FlyPlane {...props} />
      </Suspense>
    </>
  )
}

export default function FlyToCartCanvas(props) {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 210 }}
    >
      <Scene {...props} />
    </Canvas>
  )
}
