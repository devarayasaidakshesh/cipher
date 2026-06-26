import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useReducedMotion } from "framer-motion"
import * as THREE from "three"
import { SignalWorldBackdrop } from "./SignalWorld"

// 3D hanging-cards wardrobe — the category-select step (replaces RailScene).
//
// Each visible category has a short 3D neon rope hanging from the BOTTOM of
// its HTML card (the card itself is an HTML overlay in HangingCards.jsx, with
// pointer-events-none so the knot's grab sphere here is the hit target). The
// rope is a TubeGeometry rebuilt per frame along a CatmullRomCurve3 (anchor →
// 2 sagged mids → knot), with a downward sag that shrinks as it's pulled taut.
// The knot is freely grabbable; the host owns the 1D spring sim + drag and
// feeds a mutable pullsRef (px, +down); this loop only renders.
//
// Anchor positions come from the host as MEASURED px (card-bottom center,
// relative to the stage) so the ropes pin exactly under the HTML cards at every
// viewport size. px→world uses the R3F viewport: worldPerPx = viewport.height /
// stageH (exact, because viewport aspect == stage aspect).

const CAM_Y = 1 // matches camera position[1] — screen center maps to worldY = CAM_Y
const REST_LEN = 1.35 // world; knot hangs clearly BELOW the card so the rope reads
const WORLD_SAG_MAX = 0.18 // idle sag (shrinks to 0 as pulled taut)
const ROPE_RADIUS = 0.075

const ROPE_COLOR = "#c8ff00"
const SIGNAL = "#c8ff00"

// one RopeRig per category card
function RopeRig({
  i, // card index
  phase, // idle-sway phase offset per card
  anchorsRef, // { current: [{ cx, bottomY }, ...] } px, relative to stage
  pullsRef, // { current: number[] } px pull per card (+down)
  dragIdxRef, // { current: number } dragged card index (-1 none)
  maxPullPxRef, // { current: px } host's maxPull
  activeIdxRef, // { current: number } chosen card (intensifies glow)
  reduceRef,
  onDown, // (clientX, clientY) => void — host starts drag for this card
  stageWRef,
  stageHRef,
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
  const anchor = useMemo(() => new THREE.Vector3(), [])
  const knot = useMemo(() => new THREE.Vector3(), [])
  const mid1 = useMemo(() => new THREE.Vector3(), [])
  const mid2 = useMemo(() => new THREE.Vector3(), [])
  const prevGeo = useRef({ rope: null, glow: null })

  const knotGeo = useMemo(() => new THREE.TorusKnotGeometry(0.22, 0.075, 96, 12, 2, 3), [])
  const ropeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ROPE_COLOR,
        emissive: SIGNAL,
        emissiveIntensity: 2.2,
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
        emissiveIntensity: 2.9,
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

  useFrame((state, delta) => {
    t.current += delta
    const reduce = reduceRef.current
    const stageW = stageWRef.current || 1
    const stageH = stageHRef.current || 1
    const a = anchorsRef.current?.[i]
    if (!a) return

    // px → world (viewport.height = visible world height at z=0; aspect matches stage)
    const worldPerPx = state.viewport.height / stageH
    const anchorX = (a.cx - stageW / 2) * worldPerPx
    const anchorY = CAM_Y + (stageH / 2 - a.bottomY) * worldPerPx // screen +down → world -y

    // pull is a 2D px offset {x: +right, y: +down} from the knot's rest pos
    const pullVec = pullsRef.current?.[i] || { x: 0, y: 0 }
    const pullMag = Math.hypot(pullVec.x, pullVec.y)
    const maxPx = maxPullPxRef.current || 1
    const pullProg = Math.min(1, pullMag / maxPx)
    const pullWorldX = pullVec.x * worldPerPx
    const pullWorldY = pullVec.y * worldPerPx

    // idle sway on the free end — gentler at rest, dies out as pulled taut
    const isDrag = dragIdxRef.current === i
    const swayAmp = reduce || isDrag ? 0 : 0.06 * (1 - pullProg * 0.8)
    const sway = Math.sin(t.current * 1.15 + phase) * swayAmp

    // knot world position: rest = straight below anchor; pull offsets it in
    // whatever direction the user dragged (+x right, +y down → world -y)
    knot.set(anchorX + sway + pullWorldX, anchorY - REST_LEN - pullWorldY, 0)
    anchor.set(anchorX, anchorY, 0)

    // sag: rope bows downward, shrinking to 0 as pulled taut
    const sag = WORLD_SAG_MAX * (1 - pullProg)
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
      const g = new THREE.TubeGeometry(curve, 32, ROPE_RADIUS * 3.0, 7, false)
      glowRef.current.geometry = g
      prevGeo.current.glow = g
      const isActive = activeIdxRef.current === i
      glowMat.opacity = 0.26 + (isActive ? 0.18 : 0) + pullProg * 0.08
    }

    if (knotRef.current) {
      knotRef.current.position.copy(knot)
      knotRef.current.rotation.x = t.current * 0.4
      knotRef.current.rotation.y = t.current * 0.3
    }
    if (haloRef.current) {
      haloRef.current.position.copy(knot)
      const pulse = 0.6 + Math.sin(t.current * 3) * 0.12
      const isActive = activeIdxRef.current === i ? 1 : 0
      haloRef.current.scale.setScalar((0.85 + pullProg * 0.25) * pulse * (1 + isActive * 0.4))
      haloMat.opacity = 0.16 + isActive * 0.22 + pullProg * 0.08
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
        <sphereGeometry args={[0.44, 20, 20]} />
      </mesh>
      {/* larger invisible grab sphere that follows the knot — forgiving touch target */}
      <mesh ref={grabRef} material={grabMat}
        onPointerDown={startDrag} onPointerOver={onOver} onPointerOut={onOut}>
        <sphereGeometry args={[0.72, 12, 12]} />
      </mesh>
    </group>
  )
}

function Rig({
  visible,
  anchorsRef,
  pullsRef,
  dragIdxRef,
  maxPullPxRef,
  activeIdxRef,
  reduceRef,
  stageWRef,
  stageHRef,
  onCardDown,
}) {
  return (
    <>
      <SignalWorldBackdrop mouse={{ current: { x: 0, y: 0 } }} />
      {visible.map((c, i) => (
        <RopeRig
          key={c.id}
          i={i}
          phase={i * 1.7}
          anchorsRef={anchorsRef}
          pullsRef={pullsRef}
          dragIdxRef={dragIdxRef}
          maxPullPxRef={maxPullPxRef}
          activeIdxRef={activeIdxRef}
          reduceRef={reduceRef}
          stageWRef={stageWRef}
          stageHRef={stageHRef}
          onDown={(cx, cy) => onCardDown(i, cx, cy)}
        />
      ))}
    </>
  )
}

export default function HangingCardsScene(props) {
  const reduce = useReducedMotion()
  const reduceRef = useRef(reduce)
  reduceRef.current = reduce

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, CAM_Y, 11], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Rig {...props} reduceRef={reduceRef} />
    </Canvas>
  )
}
