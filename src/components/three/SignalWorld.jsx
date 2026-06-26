import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Grid } from "@react-three/drei"
import * as THREE from "three"
import { useReducedMotion } from "framer-motion"

// The shared CIPHER world: ink-black scene + fog + neon ambient/point lights, a
// dense field of additive-blended "signal" points that tilt toward the pointer
// and drift, and an infinite neon grid floor. Extracted from HeroScene so the
// hero and the vault-entry transition render the *same* 3D structure — the
// transition is a continuation of the hero's world, not a separate scene.
//
// `mouse` is a ref of { x, y } in [-1, 1] driven by a window pointer listener
// the host owns (so the field parallaxes even though the canvas may be
// pointer-events-none).
//
// `speedRef` (optional) is a ref of a multiplier 1→N that ramps the ambient
// z-rotation speed — used by the vault-entry transition to swirl the field
// faster as it accelerates. The hero doesn't pass it, so its drift is unchanged.
//
// `wrap` (optional) — when true the starfield becomes infinite along the
// camera's forward axis: any point that slips behind the camera is recycled to
// just ahead of it, within the fog's visible band, so there are always stars in
// front (the vault-entry dolly would otherwise outrun the static cloud and the
// sky would go empty at the end). The camera position is transformed into the
// points-group's local space each frame (one worldToLocal call) so the wrap
// stays correct even though the field tilts with the pointer. The hero doesn't
// pass `wrap`, so its fixed cloud is unchanged.
export const WORLD = {
  BG: "#080808",
  FOG: ["#080808", 14, 52],
  AMBIENT: 0.5,
  POINT_LIGHT: { position: [6, 6, 6], intensity: 30, color: "#c8ff00" },
  GRID: {
    position: [0, -2.6, 0],
    args: [80, 80],
    cellSize: 0.6,
    cellThickness: 0.5,
    cellColor: "#17171c",
    sectionSize: 3,
    sectionThickness: 1,
    sectionColor: "#c8ff00",
    fadeDistance: 34,
    fadeStrength: 1.5,
    infiniteGrid: true,
  },
}

export function SignalPoints({ mouse, speedRef, wrap = false, count = 2200 }) {
  const ref = useRef()
  const reduce = useReducedMotion()
  const scratch = useRef(new THREE.Vector3())
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 36
      arr[i * 3 + 1] = (Math.random() - 0.5) * 22
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10
    }
    return arr
  }, [count])
  useFrame((state, delta) => {
    if (!ref.current || reduce) return
    const speed = speedRef?.current ?? 1
    ref.current.rotation.z += delta * 0.01 * speed
    ref.current.rotation.y += (mouse.current.x * 0.25 - ref.current.rotation.y) * 0.04
    ref.current.rotation.x += (mouse.current.y * 0.18 - ref.current.rotation.x) * 0.04

    if (wrap) {
      // camera pos in the points-group's local space (accounts for tilt)
      const camLocal = scratch.current.copy(state.camera.position)
      ref.current.worldToLocal(camLocal)
      const camZ = camLocal.z
      const lo = camZ - 50
      const hi = camZ - 2
      const L = 50 - 2
      const pos = ref.current.geometry.attributes.position
      const arr = pos.array
      let moved = false
      for (let i = 0; i < count; i++) {
        const zi = i * 3 + 2
        if (arr[zi] < lo || arr[zi] > hi) {
          // fold back into the visible window [lo, hi] from whichever side it
          // exited — keeps the cloud constant-density in BOTH directions so it
          // never piles up ahead nor empties (camera looks down -z; in front = -z)
          let d = arr[zi] - lo
          d = ((d % L) + L) % L
          arr[zi] = lo + d
          arr[i * 3]     = (Math.random() - 0.5) * 36
          arr[i * 3 + 1] = (Math.random() - 0.5) * 22
          moved = true
        }
      }
      if (moved) pos.needsUpdate = true
    }
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} color="#c8ff00" sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// <color>/<fog>/lights/signal field/grid — the hero world. Compose this inside
// a <Canvas>; add scene-specific cameras/rigs around it.
export function SignalWorldBackdrop({ mouse, speedRef, wrap = false }) {
  return (
    <>
      <color attach="background" args={[WORLD.BG]} />
      <fog attach="fog" args={WORLD.FOG} />
      <ambientLight intensity={WORLD.AMBIENT} />
      <pointLight position={WORLD.POINT_LIGHT.position} intensity={WORLD.POINT_LIGHT.intensity} color={WORLD.POINT_LIGHT.color} />
      <SignalPoints mouse={mouse} speedRef={speedRef} wrap={wrap} />
      <Grid position={WORLD.GRID.position} args={WORLD.GRID.args} cellSize={WORLD.GRID.cellSize} cellThickness={WORLD.GRID.cellThickness} cellColor={WORLD.GRID.cellColor} sectionSize={WORLD.GRID.sectionSize} sectionThickness={WORLD.GRID.sectionThickness} sectionColor={WORLD.GRID.sectionColor} fadeDistance={WORLD.GRID.fadeDistance} fadeStrength={WORLD.GRID.fadeStrength} infiniteGrid={WORLD.GRID.infiniteGrid} />
    </>
  )
}
