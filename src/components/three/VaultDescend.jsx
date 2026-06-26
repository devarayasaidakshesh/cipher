import { useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { motion } from "framer-motion"
import { useReducedMotion } from "framer-motion"
import { SignalWorldBackdrop } from "./SignalWorld"

// The vault-entry transition. Reuses the hero's exact 3D world (signal field +
// grid + neon fog) so the handoff from ENTER THE VAULT is seamless — no wall,
// no doors, just a continuous forward flow through the world. The camera
// accelerates from slow to fast (easeInQuart) with an FOV warp + field swirl
// for the motion-blur read, a "BREACHING THE VAULT" status shows, and after
// ~2.0s onComplete fires so the host routes to /vault — which lands on the
// MEN'S / WOMEN'S gender select.

const DURATION = 2.0

const CAMERA_FROM_Z = 12   // camera start (matches hero)
const CAMERA_TO_Z = -42    // launch deep through the field
const FOV_FROM = 60        // matches hero
const FOV_TO = 104         // aggressive warp stretch at the end (motion-blur read)

// easeInQuart — very slow start, hard accelerating finish. No settle: the
// vault entry keeps speeding up so it feels like launching INTO the vault.
const easeInQuart = (p) => p * p * p * p

function Rig({ reduce, speedRef, flashRef, onCompleteRef }) {
  const t = useRef(0)
  const done = useRef(false)
  useFrame((state, delta) => {
    t.current += delta
    const p = Math.min(t.current / DURATION, 1)
    const e = easeInQuart(p)

    if (reduce) return

    // accelerating forward dolly through the signal field
    state.camera.position.z = CAMERA_FROM_Z + (CAMERA_TO_Z - CAMERA_FROM_Z) * e
    // sway amplitude grows hard with speed so the streak feels alive
    const sway = 0.2 + e * 1.4
    state.camera.position.x = Math.sin(t.current * 1.3) * 0.35 * sway
    state.camera.position.y = Math.cos(t.current * 0.9) * 0.22 * sway
    // FOV warp over the last 60% — radial stretch = the motion-blur read
    state.camera.fov = FOV_FROM + (FOV_TO - FOV_FROM) * Math.max(0, (p - 0.35) / 0.65)
    state.camera.updateProjectionMatrix()
    state.camera.lookAt(0, 0, state.camera.position.z - 6)

    // swirl the signal field faster as we accelerate (1 → ~10)
    speedRef.current = 1 + e * 9

    // final signal flash — bursts in over the last 15%, peaks at the cut
    const flash = Math.max(0, (p - 0.85) / 0.15)
    if (flashRef.current) flashRef.current.style.opacity = String(flash)

    if (p >= 1 && !done.current) {
      done.current = true
      // route at the peak of the flash — bursting through into the vault
      setTimeout(() => onCompleteRef.current?.(), 40)
    }
  })
  return null
}

export default function VaultDescend({ onComplete }) {
  const mouse = useRef({ x: 0, y: 0 })
  const speedRef = useRef(1)
  const flashRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) {
      // reduced-motion: skip the animation, route after a short fade
      const id = setTimeout(() => onComplete?.(), 450)
      return () => clearTimeout(id)
    }
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [reduce, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Canvas camera={{ position: [0, 0, CAMERA_FROM_Z], fov: 60 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <SignalWorldBackdrop mouse={mouse} speedRef={speedRef} wrap />
        <Rig reduce={reduce} speedRef={speedRef} flashRef={flashRef} onCompleteRef={onCompleteRef} />
      </Canvas>

      {/* final signal flash — opacity driven by the Rig, peaks at the cut */}
      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-signal" style={{ opacity: 0 }} />

      {/* brand overlay — single-line status, fades on exit */}
      <motion.div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="font-display text-[clamp(40px,8vw,96px)] font-extrabold uppercase leading-[0.9] tracking-[-0.02em] text-center whitespace-nowrap">
          BREACHING <span className="text-signal">THE VAULT</span>
        </p>
        <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
          // DECRYPTING.ACCESS.PROTOCOLS
          <span className="cipher-blink text-signal" style={{ animation: "cipherBlink 0.9s steps(1) infinite" }}> _</span>
        </p>
      </motion.div>
    </motion.div>
  )
}
