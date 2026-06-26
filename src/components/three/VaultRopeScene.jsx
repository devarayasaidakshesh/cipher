import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useReducedMotion } from "framer-motion"
import * as THREE from "three"
import { SignalWorldBackdrop } from "./SignalWorld"

// The 3D rope-pull Vault. Two real 3D ropes (one per gender) hang freely from
// invisible anchors at the top of each half — NO pulley, NO bracket, just the
// rope. Each rope is a TubeGeometry rebuilt per frame along a CatmullRom curve
// from the top anchor to the grabbable knot, with a downward sag that shrinks
// as the rope is pulled taut. The knot is freely draggable in ANY direction
// (down, left, right, even up) — the host owns the spring sim (now 2D) + drag
// and feeds a mutable {x,y} offset ref; this loop only renders.
//
// Pull "distance" is the magnitude of the offset; the host snaps + triggers the
// transition when it exceeds the threshold, regardless of direction.
//
// px→world: worldPerPx = WORLD_MAX_PULL / maxPullPx, so the host's maxPull (px)
// maps to WORLD_MAX_PULL units of knot travel in any direction.

const ANCHOR_Y = 5.5 // above the visible top — rope emerges from the top of the frame
const REST_LEN = 2.4 // rest rope length → rest knot at y = ANCHOR_Y - REST_LEN
const WORLD_MAX_PULL = 3.4 // world units of max knot travel (any direction)
const SAG_MAX = 0.4 // idle sag (shrinks to 0 as the rope is pulled taut)
const ROPE_RADIUS = 0.05

const ROPE_COLOR = "#c8ff00" // matches the GEN-01/GEN-02 text color exactly
const SIGNAL = "#c8ff00"

// one RopeRig per gender side
function RopeRig({
  x,
  phase,
  offRef, // { current: { x, y } } px offset from rest (screen convention: +x right, +y down)
  dragRef, // { current: bool } — disable idle sway while dragging
  maxPullPxRef, // { current: px } host's maxPull — for px→world conversion
  activeRef, // { current: bool } — chosen rope (intensifies glow)
  reduceRef,
  onDown, // (clientX, clientY) => void — host starts drag
}) {
  const knotRef = useRef()
  const haloRef = useRef()
  const ropeRef = useRef()
  const glowRef = useRef()
  const grabRef = useRef()
  const t = useRef(0)

  // scratch curve (reused — points mutated each frame, never reallocated)
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
    []
  )
  const anchor = useMemo(() => new THREE.Vector3(x, ANCHOR_Y, 0), [x])
  const knot = useMemo(() => new THREE.Vector3(), [])
  const mid1 = useMemo(() => new THREE.Vector3(), [])
  const mid2 = useMemo(() => new THREE.Vector3(), [])
  const prevGeo = useRef({ rope: null, glow: null })

  const knotGeo = useMemo(() => new THREE.TorusKnotGeometry(0.17, 0.06, 96, 12, 2, 3), [])
  const ropeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ROPE_COLOR,
        emissive: SIGNAL,
        emissiveIntensity: 1.7,
        roughness: 0.4,
        metalness: 0.1,
      }),
    []
  )
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: SIGNAL,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )
  const knotMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: SIGNAL,
        emissive: SIGNAL,
        emissiveIntensity: 2.4,
        roughness: 0.25,
        metalness: 0.2,
      }),
    []
  )
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: SIGNAL,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )
  const grabMat = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    []
  )

  useEffect(() => {
    return () => {
      ;[ropeMat, glowMat, knotMat, haloMat, grabMat].forEach((m) => m.dispose())
      ;[knotGeo].forEach((g) => g.dispose())
      prevGeo.current.rope?.dispose()
      prevGeo.current.glow?.dispose()
    }
  }, [ropeMat, glowMat, knotMat, haloMat, grabMat, knotGeo])

  useFrame((_, delta) => {
    t.current += delta
    const reduce = reduceRef.current
    const off = offRef.current || { x: 0, y: 0 }
    const maxPx = maxPullPxRef.current || 1
    const wpPx = WORLD_MAX_PULL / maxPx // px → world

    // offset in world units (screen +y down → world -y)
    const ox = off.x * wpPx
    const oy = off.y * wpPx
    const pullMag = Math.min(1, Math.hypot(ox, oy) / WORLD_MAX_PULL) // 0..1

    // idle sway on the free end — gentler at rest, dies out as it's pulled taut
    const swayAmp = reduce || dragRef.current ? 0 : 0.06 * (1 - pullMag * 0.8)
    const sway = Math.sin(t.current * 1.15 + phase) * swayAmp
    const sway2 = Math.sin(t.current * 0.7 + phase * 1.6) * swayAmp * 0.4

    // knot world position (rest = straight below anchor)
    const kx = x + ox + sway
    const ky = (ANCHOR_Y - REST_LEN) - oy + sway2 * 0.3
    knot.set(kx, ky, 0)

    // sag: rope bows downward, shrinking to 0 as it's pulled taut
    const sag = SAG_MAX * (1 - pullMag)

    // curve: anchor → knot, mid points sagged downward (world -y)
    mid1.copy(anchor).lerp(knot, 0.33).add(new THREE.Vector3(0, -sag * 0.35, 0))
    mid2.copy(anchor).lerp(knot, 0.66).add(new THREE.Vector3(0, -sag * 0.7, 0))
    const pts = curve.points
    pts[0].copy(anchor)
    pts[1].copy(mid1)
    pts[2].copy(mid2)
    pts[3].copy(knot)

    if (ropeRef.current) {
      prevGeo.current.rope?.dispose()
      const g = new THREE.TubeGeometry(curve, 32, ROPE_RADIUS, 7, false)
      ropeRef.current.geometry = g
      prevGeo.current.rope = g
    }
    if (glowRef.current) {
      prevGeo.current.glow?.dispose()
      const g = new THREE.TubeGeometry(curve, 32, ROPE_RADIUS * 2.6, 7, false)
      glowRef.current.geometry = g
      prevGeo.current.glow = g
      glowMat.opacity = 0.26 + (activeRef.current ? 0.18 : 0) + pullMag * 0.08
    }

    if (knotRef.current) {
      knotRef.current.position.copy(knot)
      knotRef.current.rotation.x = t.current * 0.4
      knotRef.current.rotation.y = t.current * 0.3
    }
    if (haloRef.current) {
      haloRef.current.position.copy(knot)
      const pulse = 0.6 + Math.sin(t.current * 3) * 0.12
      const active = activeRef.current ? 1 : 0
      haloRef.current.scale.setScalar((0.85 + pullMag * 0.25) * pulse * (1 + active * 0.4))
      haloMat.opacity = 0.16 + active * 0.22 + pullMag * 0.08
    }
    if (grabRef.current) {
      grabRef.current.position.copy(knot) // grab sphere follows the knot
    }
  })

  const startDrag = (e) => {
    e.stopPropagation()
    const cx = e.clientX ?? e.nativeEvent?.clientX
    const cy = e.clientY ?? e.nativeEvent?.clientY
    if (cx != null && cy != null) onDown(cx, cy)
  }
  const onOver = (e) => {
    e.stopPropagation()
    if (!document.body.classList.contains("cipher-grabbing")) {
      document.body.style.cursor = "grab"
    }
  }
  const onOut = () => {
    if (!document.body.classList.contains("cipher-grabbing")) {
      document.body.style.cursor = "auto"
    }
  }

  return (
    <group>
      {/* rope glow shell (additive, behind solid rope) */}
      <mesh ref={glowRef} material={glowMat} />
      {/* rope (rebuilt each frame) */}
      <mesh ref={ropeRef} material={ropeMat} />

      {/* grabbable knot handle */}
      <mesh ref={knotRef} geometry={knotGeo} material={knotMat}
        onPointerDown={startDrag} onPointerOver={onOver} onPointerOut={onOut} />
      {/* knot halo */}
      <mesh ref={haloRef} material={haloMat}>
        <sphereGeometry args={[0.34, 20, 20]} />
      </mesh>
      {/* larger invisible grab sphere that follows the knot — forgiving touch target */}
      <mesh ref={grabRef} material={grabMat}
        onPointerDown={startDrag} onPointerOver={onOver} onPointerOut={onOut}>
        <sphereGeometry args={[0.6, 12, 12]} />
      </mesh>
    </group>
  )
}

// Convert screen fraction (0–1) to world X at z=0, accounting for actual viewport + camera
function screenFractionToWorldX(fraction, camera, size) {
  const ndcX = fraction * 2 - 1
  const v = new THREE.Vector3(ndcX, 0, -1).unproject(camera)
  const dir = v.sub(camera.position).normalize()
  const t = -camera.position.z / dir.z
  return camera.position.x + dir.x * t
}

function Rig({
  mOffRef, wOffRef, mDragRef, wDragRef, maxPullPxRef,
  mActiveRef, wActiveRef, reduceRef, onMensDown, onWomensDown,
}) {
  const { camera, size } = useThree()

  // Center of men's panel = 25% of screen, women's = 75%
  const xMen   = screenFractionToWorldX(0.25, camera, size)
  const xWomen = screenFractionToWorldX(0.75, camera, size)

  return (
    <>
      <SignalWorldBackdrop mouse={{ current: { x: 0, y: 0 } }} />
      <RopeRig
        x={xMen} phase={0}
        offRef={mOffRef} dragRef={mDragRef} maxPullPxRef={maxPullPxRef}
        activeRef={mActiveRef} reduceRef={reduceRef} onDown={onMensDown}
      />
      <RopeRig
        x={xWomen} phase={2.1}
        offRef={wOffRef} dragRef={wDragRef} maxPullPxRef={maxPullPxRef}
        activeRef={wActiveRef} reduceRef={reduceRef} onDown={onWomensDown}
      />
    </>
  )
}

export default function VaultRopeScene(props) {
  const reduce = useReducedMotion()
  const reduceRef = useRef(reduce)
  reduceRef.current = reduce

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 1, 11], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Rig {...props} reduceRef={reduceRef} />
    </Canvas>
  )
}
