import { useMemo, useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { ScrollControls, Scroll, useScroll, Grid } from "@react-three/drei"
import * as THREE from "three"
import { useReducedMotion } from "framer-motion"

const TOTAL_PAGES = 5

const AUDIENCE_LEFT  = ["AI ENGINEERS", "PROMPT BUILDERS", "TECH FOUNDERS", "OPEN SOURCE DEVS"]
const AUDIENCE_RIGHT = ["ML RESEARCHERS", "SYSTEM ARCHITECTS", "HARDWARE HACKERS", "CTOs"]

const PILLARS = [
  {
    code: "// 01",
    title: "BUILT FOR BUILDERS",
    desc: "Designed for people who think in systems and ship in sprints. No filler. Pure signal.",
  },
  {
    code: "// 02",
    title: "ENCRYPTED BY DESIGN",
    desc: "UV-reactive inks reveal hidden schematics under blacklight. The message is there — you just need the right frequency.",
  },
  {
    code: "// 03",
    title: "HEAVY GRADE FABRIC",
    desc: "240GSM canvas. DWR-coated. Double-stitched. Built to outlast as many late-night deploys as you can ship.",
  },
]

// ── 3D ──────────────────────────────────────────────────────────────────

function SignalPoints({ mouse, count = 2200 }) {
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
    ref.current.rotation.z += delta * 0.01
    ref.current.rotation.y += (mouse.current.x * 0.25 - ref.current.rotation.y) * 0.04
    ref.current.rotation.x += (mouse.current.y * 0.18 - ref.current.rotation.x) * 0.04

    // Keep the starfield a constant-density infinite cloud that follows the
    // camera in BOTH scroll directions. The camera dollies through -z (down to
    // ~-42 at the last section) and back; a one-directional recycle would pile
    // points up ahead (too many at the end) and strand them beyond the fog's
    // far plane when scrolling back (sky empties). Instead, fold every point
    // that leaves the visible window [camZ-50, camZ-2] back in from the side it
    // exited, so ~all stars stay in the lit band regardless of direction.
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
        let d = arr[zi] - lo
        d = ((d % L) + L) % L          // fold into [0, L)
        arr[zi] = lo + d               // -> inside the visible window
        arr[i * 3]     = (Math.random() - 0.5) * 36
        arr[i * 3 + 1] = (Math.random() - 0.5) * 22
        moved = true
      }
    }
    if (moved) pos.needsUpdate = true
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

function Rig({ mouse }) {
  const scroll = useScroll()
  const reduce = useReducedMotion()
  useFrame((state) => {
    const targetZ = 12 - scroll.offset * 54
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.1
    if (!reduce) {
      state.camera.position.x += (mouse.current.x * 1.6 - state.camera.position.x) * 0.04
      state.camera.position.y += (mouse.current.y * 1.0 - state.camera.position.y) * 0.04
    }
    state.camera.lookAt(state.camera.position.x * 0.3, state.camera.position.y * 0.3, state.camera.position.z - 6)
  })
  return null
}

// Smooth ease-in-out so nothing snaps or glitches
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

// Sections fade in straight (no X translation on entrance) and exit to the RIGHT.
const TRAVEL = 40

// Entrance: pure fade-in, no movement
const entranceAlpha = (e) => Math.max(0, 1 - e * 2.2)
// Exit: fade out quickly so text disappears early in the rightward slide
const exitAlpha     = (e) => Math.max(0, 1 - e * 6)

function ScrollParallax({ sectionRefs }) {
  const scroll = useScroll()
  const reduce = useReducedMotion()

  useFrame(() => {
    if (reduce) return
    const o = scroll.offset

    sectionRefs.forEach((ref, i) => {
      if (!ref.current) return

      const localT = (o - i / TOTAL_PAGES) * TOTAL_PAGES

      let tx = 0
      let alpha = 1

      if (i === 0) {
        // Hero: no entrance, exits RIGHT on first scroll
        const e = easeInOut(Math.max(0, Math.min(1, localT)))
        tx    = e * TRAVEL
        alpha = exitAlpha(e)

      } else if (i === TOTAL_PAGES - 1) {
        // Last section: fades in straight, stays forever
        if (localT < 0) {
          const e = easeInOut(Math.min(1, -localT / 0.55))
          tx    = 0
          alpha = entranceAlpha(e)
        }
        // localT >= 0 → tx=0, alpha=1, never moves again

      } else {
        if (localT < 0) {
          // Entrance — fade in only, no X movement
          const e = easeInOut(Math.min(1, -localT / 0.55))
          tx    = 0
          alpha = entranceAlpha(e)
        } else {
          // Exit — slides out to the RIGHT (0 → +X) with fade
          const e = easeInOut(Math.max(0, Math.min(1, (localT - 0.6) / 0.4)))
          tx    = e * TRAVEL
          alpha = exitAlpha(e)
        }
      }

      ref.current.style.transform = `translateX(${tx}vw)`
      ref.current.style.opacity   = String(alpha)
    })
  })
  return null
}

function World({ mouse, sectionRefs }) {
  return (
    <>
      <color attach="background" args={["#080808"]} />
      <fog attach="fog" args={["#080808", 14, 52]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} intensity={30} color="#c8ff00" />
      <SignalPoints mouse={mouse} />
      <Grid position={[0, -2.6, 0]} args={[80, 80]} cellSize={0.6} cellThickness={0.5} cellColor="#17171c" sectionSize={3} sectionThickness={1} sectionColor="#c8ff00" fadeDistance={34} fadeStrength={1.5} infiniteGrid />
      <Rig mouse={mouse} />
      <ScrollParallax sectionRefs={sectionRefs} />
    </>
  )
}

// ── HTML overlay ─────────────────────────────────────────────────────────

function Content({ onEnter, sectionRefs }) {
  const [r0, r1, r2, r3, r4] = sectionRefs

  return (
    <div className="relative w-full">

      {/* ── 1 · HERO ─────────────────────────────────────────────────── */}
      <section className="flex h-screen w-full items-center px-[8vw] md:px-[10vw]">
        <div ref={r0} className="flex max-w-[600px] flex-col" style={{ willChange: "transform, opacity" }}>

          {/* Signal badge */}
          <div className="mb-8 flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-signal">
            <span className="h-[6px] w-[6px] rounded-full bg-signal" style={{ animation: "cipherPulse 1.4s ease-in-out infinite" }} />
            SIGNAL_ACTIVE
          </div>

          {/* Wordmark — matches reference: clamp(80px, 12vw, 160px) */}
          <h1
            className="font-display font-black uppercase text-bone"
            style={{
              fontSize: "clamp(80px,12vw,160px)",
              lineHeight: 0.92,
              letterSpacing: "-0.01em",
              textShadow: "0 0 80px rgba(200,255,0,0.08)",
            }}
          >
            CIPHER//
          </h1>

          {/* Subheadline */}
          <p className="mt-5 font-mono uppercase text-bone/78" style={{ fontSize: 11, letterSpacing: "0.3em" }}>
            ENCODED IN EVERY THREAD
          </p>

          {/* Body copy — mono, matches reference */}
          <p className="mt-3.5 font-mono text-bone/82" style={{ fontSize: 12, lineHeight: 1.8, letterSpacing: "0.02em", maxWidth: 340 }}>
            Garments compiled at the intersection of code and cloth.<br />
            For the ones who deploy at 3AM and ship before dawn.
          </p>

          {/* CTA */}
          <button
            onClick={onEnter}
            className="mt-10 w-fit bg-signal font-mono font-bold uppercase text-ink transition-all hover:-translate-y-0.5 hover:bg-signal-hover"
            style={{ fontSize: 11, letterSpacing: "0.2em", padding: "14px 28px" }}
          >
            ENTER THE VAULT
          </button>
        </div>
      </section>

      {/* ── 2 · BUILT FOR THE ONES WHO BUILD ─────────────────────────── */}
      <section className="flex h-screen w-full items-center px-[8vw] md:px-[10vw]">
        <div ref={r1} className="flex max-w-[520px] flex-col" style={{ willChange: "transform, opacity" }}>

          {/* Section label */}
          <p className="mb-12 font-mono uppercase text-signal" style={{ fontSize: 13, letterSpacing: "0.25em" }}>
            // BUILT FOR THE ONES WHO BUILD
          </p>

          {/* Two-column audience list */}
          <div className="grid grid-cols-2 gap-x-10" style={{ gap: "18px 0" }}>
            <div className="flex flex-col" style={{ gap: 18 }}>
              {AUDIENCE_LEFT.map((a) => (
                <div key={a} className="flex items-center gap-3">
                  <span className="font-mono text-bone/30" style={{ fontSize: 10 }}>—</span>
                  <span className="font-mono uppercase text-bone" style={{ fontSize: 12, letterSpacing: "0.1em" }}>{a}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col" style={{ gap: 18 }}>
              {AUDIENCE_RIGHT.map((a) => (
                <div key={a} className="flex items-center gap-3">
                  <span className="font-mono text-signal" style={{ fontSize: 10 }}>—</span>
                  <span className="font-mono uppercase text-signal" style={{ fontSize: 12, letterSpacing: "0.1em" }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body with left neon border */}
          <div className="mt-10" style={{ borderLeft: "1px solid rgba(200,255,0,0.2)", paddingLeft: 20, maxWidth: 380 }}>
            <p className="font-mono text-bone/82" style={{ fontSize: 11, lineHeight: 1.9, letterSpacing: "0.01em" }}>
              If you've ever shipped a model, opened a PR at midnight,<br />
              or explained embeddings to a VC — this is yours.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3 · THE CIPHER STANDARD ──────────────────────────────────── */}
      <section className="flex h-screen w-full items-center px-[8vw] md:px-[10vw]">
        <div ref={r2} style={{ willChange: "transform, opacity" }}>

          <p className="mb-9 font-mono uppercase text-signal" style={{ fontSize: 13, letterSpacing: "0.25em" }}>
            // THE CIPHER STANDARD
          </p>

          <h2
            className="font-display font-black uppercase text-bone"
            style={{ fontSize: "clamp(36px,5vw,72px)", lineHeight: 0.95, letterSpacing: "-0.01em" }}
          >
            NOT CLOTHES.<br />
            WE COMPILE<br />
            <span className="text-signal">GARMENTS.</span>
          </h2>

          <div className="mt-6" style={{ maxWidth: 360, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24 }}>
            <p className="font-mono text-bone/85" style={{ fontSize: 13, lineHeight: 1.9 }}>
              Precision-engineered apparel for the people<br />
              rewriting the world from a terminal window.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4 · WHY CIPHER ──────────────────────────────────────────── */}
      <section className="flex h-screen w-full items-start pt-[14vh] px-[8vw] md:px-[10vw]">
        <div ref={r3} className="w-full max-w-[760px]" style={{ willChange: "transform, opacity" }}>

          <p className="mb-10 font-mono uppercase text-signal" style={{ fontSize: 13, letterSpacing: "0.25em" }}>
            // WHY CIPHER
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 0 }}>
            {PILLARS.map((pt, i) => (
              <div
                key={pt.code}
                style={{
                  padding: i === 0 ? "0 32px 0 0" : i === 1 ? "0 32px" : "0 0 0 32px",
                  borderRight: i < 2 ? "1px solid rgba(200,255,0,0.12)" : "none",
                }}
              >
                <p className="font-mono uppercase text-signal" style={{ fontSize: 10, letterSpacing: "0.2em", marginBottom: 16 }}>
                  {pt.code}
                </p>
                <div style={{ height: 1, background: "rgba(200,255,0,0.2)", width: 40, marginBottom: 20 }} />
                <h3
                  className="font-display font-extrabold uppercase text-bone"
                  style={{ fontSize: 22, letterSpacing: "0.04em", marginBottom: 14 }}
                >
                  {pt.title}
                </h3>
                <p className="font-mono text-bone/82" style={{ fontSize: 10, lineHeight: 1.9 }}>
                  {pt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5 · MANIFESTO + FINAL CTA ────────────────────────────────── */}
      <section className="flex h-screen w-full items-center px-[8vw] md:px-[10vw]">
        <div ref={r4} style={{ maxWidth: 520, willChange: "transform, opacity" }}>

          <p className="font-mono uppercase text-signal" style={{ fontSize: 13, letterSpacing: "0.25em", marginBottom: 36 }}>
            // CIPHER MANIFESTO #1
          </p>

          <blockquote className="font-mono italic text-bone/85" style={{ fontSize: 15, lineHeight: 2, letterSpacing: "0.02em", marginBottom: 8 }}>
            We don't ship garments. We deploy them — compiled from raw signal,{" "}
            <span className="text-signal" style={{ fontStyle: "italic" }}>cut with precision, encrypted for the wearer alone.</span>
          </blockquote>

          <div style={{ width: 32, height: 1, background: "#c8ff00", margin: "20px 0 36px" }} />

          <button
            onClick={onEnter}
            className="bg-signal font-mono font-bold uppercase text-ink transition-all hover:-translate-y-0.5 hover:bg-signal-hover"
            style={{ fontSize: 11, letterSpacing: "0.2em", padding: "14px 28px" }}
          >
            ENTER THE VAULT →
          </button>
        </div>
      </section>

    </div>
  )
}

export default function HeroScene({ onEnter }) {
  const mouse = useRef({ x: 0, y: 0 })
  const r0 = useRef(null)
  const r1 = useRef(null)
  const r2 = useRef(null)
  const r3 = useRef(null)
  const r4 = useRef(null)
  const sectionRefs = [r0, r1, r2, r3, r4]

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [])

  return (
    <div className="h-screen w-full">
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <ScrollControls pages={TOTAL_PAGES} damping={0.25}>
          <World mouse={mouse} sectionRefs={sectionRefs} />
          <Scroll html>
            <Content onEnter={onEnter} sectionRefs={sectionRefs} />
          </Scroll>
        </ScrollControls>
      </Canvas>
    </div>
  )
}
