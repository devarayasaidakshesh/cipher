import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"
import { vaultGenderCount } from "@/data/fakestore"

// Rope-pull Vault — rebuilt from the CIPHER Vault handoff, then freed.
//
// Two panels (MEN'S / WOMEN'S) each with a 3D rope hanging freely from the top
// of the panel — NO pulley, NO bracket, just the rope. The user grabs the knot
// and pulls it in ANY direction (down, left, right, even up); the rope follows
// the knot, extending/shortening as it goes. 2D spring physics (K=260, D=13)
// drive the knot's {x,y} offset from rest: when the pull magnitude exceeds the
// snap threshold (in any direction) the knot snaps the rest of the way, the
// chosen panel expands to 100% width, the other collapses, and the transition
// overlay (GEN-0X / MEN'S / // LOADING COLLECTION / load bar) fades in. After
// the load bar completes, onPick(gender) fires → the host swaps in the
// CategorySelect wardrobe. Release before the threshold → the knot springs
// back to rest.
//
// The 3D rope lives in VaultRopeScene (lazy — keeps three.js out of the main
// chunk). This component owns the 2D spring sim + drag + entered state and
// feeds mutable {x,y} offset refs to the 3D scene; the scene reads them each
// frame. Spring sim state lives in refs (not React state); React state only
// mirrors the offsets + entered for the HTML overlay (panel widths + overlay).

const VaultRopeScene = lazy(() => import("@/components/three/VaultRopeScene"))

const K = 260 // spring stiffness
const D = 13 // damping
const HOLD_PX = 84 // top offset reserved by nav + breadcrumb (matches handoff)
const SNAP_DELAY_MS = 500 // handoff: entered set 500ms after snap
const LOAD_MS = 1650 // handoff load bar: 0.4s delay + 1.2s fill = 1.6s; commit at the fill

function RopeFallback() {
  // CSS-rope fallback shown while the three.js chunk loads (brief — the Vault
  // is reached after VaultDescend, so three is likely already cached). Just the
  // rope hanging from the top — no pulley, no bracket (matches the 3D scene).
  return (
    <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
      <div
        className="w-1"
        style={{
          height: 150,
          background:
            "repeating-linear-gradient(to bottom,#c8ff00 0px,#8fb300 3px,#c8ff00 6px,#e8ff60 9px,#c8ff00 12px)",
          filter: "drop-shadow(0 0 4px rgba(200,255,0,0.7))",
        }}
      />
      <div className="-mt-1 h-3 w-3 rounded-full bg-signal" style={{ filter: "drop-shadow(0 0 8px rgba(200,255,0,0.9))" }} />
    </div>
  )
}

function Panel({ side, badge, name, count, width }) {
  // faithful handoff panel: grid overlay, GEN label, big italic type at bottom,
  // a center divider on the men's edge. pointer-events-none so the drag reaches
  // the 3D canvas handle behind; the rope/pulley themselves are 3D (canvas).
  const isMen = side === "men"
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 transition-[width] duration-700"
      style={{
        width,
        [isMen ? "left" : "right"]: 0,
        // gradient: transparent at top (rope + 3D world read through) → solid
        // at bottom (type legibility) — gives the panel depth without hiding the rope
        background: isMen
          ? "linear-gradient(to bottom, rgba(13,13,13,0.30) 0%, rgba(13,13,13,0.55) 45%, rgba(13,13,13,0.90) 100%)"
          : "linear-gradient(to bottom, rgba(11,11,11,0.30) 0%, rgba(11,11,11,0.55) 45%, rgba(11,11,11,0.90) 100%)",
        borderRight: isMen ? "1px solid rgba(200,255,0,0.12)" : "none",
        transitionTimingFunction: "cubic-bezier(0.76,0,0.24,1)",
      }}
    >
      {/* grid overlay (handoff: 40px repeating neon lines) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(200,255,0,0.022) 39px,rgba(200,255,0,0.022) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(200,255,0,0.022) 39px,rgba(200,255,0,0.022) 40px)",
        }}
      />

      {/* GEN label */}
      <div
        className="absolute top-8 font-mono text-[10px] uppercase tracking-[0.2em] text-signal"
        style={{ [isMen ? "left" : "right"]: 40 }}
      >
        {badge}
      </div>

      {/* big type + piece count — centered in the panel */}
      <div className="absolute bottom-[120px] left-0 right-0 flex flex-col items-center text-center px-10">
        <div
          className="font-display font-black uppercase italic leading-[0.82] tracking-[-0.02em] text-bone"
          style={{ fontSize: "clamp(72px,9vw,130px)" }}
        >
          {name}
        </div>
        <div className="mt-[18px] font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          {count} PIECES — SS26
        </div>
      </div>
    </div>
  )
}

export default function GenderSelect({ catalog, onPick }) {
  const reduce = useReducedMotion()

  // --- spring sim refs (2D — knot is freely draggable in any direction) ---
  // Each rope tracks an {x,y} offset (px, screen convention: +x right, +y down)
  // from its rest position. Spring returns it to {0,0}; drag moves it freely;
  // snap fires when |off| exceeds snapThreshold (any direction).
  const mkVec = () => useRef({ x: 0, y: 0 })
  const mOff = mkVec(); const mVel = mkVec(); const mTarget = mkVec()
  const mDrag = useRef(false); const mStart = useRef({ x: 0, y: 0 }); const mStartOff = useRef({ x: 0, y: 0 })
  const wOff = mkVec(); const wVel = mkVec(); const wTarget = mkVec()
  const wDrag = useRef(false); const wStart = useRef({ x: 0, y: 0 }); const wStartOff = useRef({ x: 0, y: 0 })

  const maxPull = useRef(0) // px, max knot travel (any direction), recomputed on resize
  const snapThreshold = useRef(0)

  const mActive = useRef(false)
  const wActive = useRef(false)
  const enteredRef = useRef(false) // ref mirror of `entered` (event-handler closures are first-render)

  // React-state mirror for the HTML overlay
  const [mirror, setMirror] = useState({ mOff: { x: 0, y: 0 }, wOff: { x: 0, y: 0 }, entered: null })
  const raf = useRef(null)
  const animating = useRef(false)
  const enterTimer = useRef(null)
  const containerRef = useRef(null)

  // --- spring loop (only runs while a rope is settling/snapping) ---
  // 2D per-axis: F = -K*(off - target) - D*vel
  const startLoop = () => {
    if (animating.current) return
    animating.current = true
    const tick = () => {
      const dt = 1 / 60
      let changed = false

      const step = (off, vel, target, drag) => {
        if (drag) return false
        let c = false
        for (const k of ["x", "y"]) {
          const f = -K * (off.current[k] - target.current[k]) - D * vel.current[k]
          vel.current[k] += f * dt
          off.current[k] += vel.current[k] * dt
          if (Math.abs(off.current[k] - target.current[k]) > 0.2 || Math.abs(vel.current[k]) > 0.4) c = true
        }
        return c
      }

      let mc = false; let wc = false
      if (!mDrag.current) mc = step(mOff, mVel, mTarget, mDrag.current)
      if (!wDrag.current) wc = step(wOff, wVel, wTarget, wDrag.current)
      changed = mc || wc

      if (mc) { mOff.current = { ...mOff.current } } // new identity so scene+overlay see change
      if (wc) { wOff.current = { ...wOff.current } }

      if (changed) {
        setMirror((s) => ({
          ...s,
          mOff: mc ? { ...mOff.current } : s.mOff,
          wOff: wc ? { ...wOff.current } : s.wOff,
        }))
        raf.current = requestAnimationFrame(tick)
      } else {
        animating.current = false
      }
    }
    raf.current = requestAnimationFrame(tick)
  }

  // --- drag math (2D, radial rubber-band at maxPull) ---
  const applyDrag = (isM, clientX, clientY) => {
    const start = isM ? mStart.current : wStart.current
    const startOff = isM ? mStartOff.current : wStartOff.current
    const max = maxPull.current || 1
    // raw offset = start offset + pointer delta
    let x = startOff.x + (clientX - start.x)
    let y = startOff.y + (clientY - start.y)
    const mag = Math.hypot(x, y)
    if (mag > max) {
      // rubber-band: resistance past maxPull
      const over = mag - max
      const scale = (max + over * 0.08) / mag
      x *= scale; y *= scale
    }
    const next = { x, y }
    if (isM) { mOff.current = next; setMirror((s) => ({ ...s, mOff: next })) }
    else { wOff.current = next; setMirror((s) => ({ ...s, wOff: next })) }
  }

  const releaseHandle = (isM) => {
    const off = isM ? mOff.current : wOff.current
    if (isM) mDrag.current = false; else wDrag.current = false
    document.body.classList.remove("cipher-grabbing")
    document.body.style.cursor = "auto"
    const mag = Math.hypot(off.x, off.y)
    if (mag >= snapThreshold.current) {
      // snap the rest of the way in the CURRENT direction → enter that wardrobe
      const nx = mag > 0.0001 ? off.x / mag : 0
      const ny = mag > 0.0001 ? off.y / mag : 1
      const snapTarget = { x: nx * maxPull.current, y: ny * maxPull.current }
      const snapVel = { x: nx * 150, y: ny * 150 }
      if (isM) { mTarget.current = snapTarget; mVel.current = snapVel; mActive.current = true; mOff.current = { ...off } }
      else { wTarget.current = snapTarget; wVel.current = snapVel; wActive.current = true; wOff.current = { ...off } }
      // guard against double-enter (enteredRef is ref, not stale state)
      if (!enteredRef.current) {
        enteredRef.current = true
        startLoop()
        const which = isM ? "mens" : "womens"
        enterTimer.current = setTimeout(() => {
          setMirror((s) => ({ ...s, entered: which }))
          // after the load bar, commit the gender → host swaps to CategorySelect
          enterTimer.current = setTimeout(() => {
            onPick?.(isM ? "men" : "women")
          }, LOAD_MS)
        }, SNAP_DELAY_MS)
      }
    } else {
      // spring back to rest
      const back = { x: 0, y: 0 }
      const backVel = { x: 0, y: 0 } // velocity reset; spring pulls it home
      if (isM) { mTarget.current = back; mVel.current = backVel }
      else { wTarget.current = back; wVel.current = backVel }
      startLoop()
    }
  }

  // --- pointer handlers (window-level so the drag survives leaving the handle) ---
  useEffect(() => {
    const onMove = (e) => {
      if (mDrag.current) applyDrag(true, e.clientX, e.clientY)
      if (wDrag.current) applyDrag(false, e.clientX, e.clientY)
    }
    const onUp = () => {
      if (mDrag.current) releaseHandle(true)
      if (wDrag.current) releaseHandle(false)
    }
    const onTouchMove = (e) => {
      if (!(mDrag.current || wDrag.current)) return
      if (e.cancelable) e.preventDefault()
      const tx = e.touches[0]?.clientX
      const ty = e.touches[0]?.clientY
      if (tx == null || ty == null) return
      if (mDrag.current) applyDrag(true, tx, ty)
      if (wDrag.current) applyDrag(false, tx, ty)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- maxPull from container height (matches handoff: (H - 84) * 0.55) ---
  useLayoutEffect(() => {
    const measure = () => {
      const h = containerRef.current?.clientHeight ?? (window.innerHeight - HOLD_PX)
      maxPull.current = h * 0.55
      snapThreshold.current = maxPull.current * 0.42
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  // cleanup any pending enter timers on unmount
  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    if (enterTimer.current) clearTimeout(enterTimer.current)
    document.body.classList.remove("cipher-grabbing")
    document.body.style.cursor = "auto"
  }, [])

  // --- drag-start handlers (called by the 3D knot's onPointerDown) ---
  const onMensDown = (clientX, clientY) => {
    if (mirror.entered) return
    mDrag.current = true
    mStart.current = { x: clientX, y: clientY }
    mStartOff.current = { ...mOff.current }
    mVel.current = { x: 0, y: 0 }
    document.body.classList.add("cipher-grabbing")
    document.body.style.cursor = "grabbing"
  }
  const onWomensDown = (clientX, clientY) => {
    if (mirror.entered) return
    wDrag.current = true
    wStart.current = { x: clientX, y: clientY }
    wStartOff.current = { ...wOff.current }
    wVel.current = { x: 0, y: 0 }
    document.body.classList.add("cipher-grabbing")
    document.body.style.cursor = "grabbing"
  }

  // BACK on the transition overlay: cancel + reset
  const onOverlayClose = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    enteredRef.current = false
    mOff.current = { x: 0, y: 0 }; mVel.current = { x: 0, y: 0 }; mTarget.current = { x: 0, y: 0 }
    wOff.current = { x: 0, y: 0 }; wVel.current = { x: 0, y: 0 }; wTarget.current = { x: 0, y: 0 }
    mActive.current = false; wActive.current = false
    setMirror({ mOff: { x: 0, y: 0 }, wOff: { x: 0, y: 0 }, entered: null })
  }

  // --- render values (panel widths, overlay) — progress is pull magnitude ---
  const { mOff: mo, wOff: wo, entered } = mirror
  const maxP = maxPull.current || 1
  const mProg = Math.min(1, Math.hypot(mo.x, mo.y) / maxP)
  const wProg = Math.min(1, Math.hypot(wo.x, wo.y) / maxP)

  const mensWidth =
    entered === "womens" ? "0%" : entered === "mens" ? "100%" : `${50 + mProg * 25 - wProg * 25}%`
  const womensWidth =
    entered === "mens" ? "0%" : entered === "womens" ? "100%" : `${50 + wProg * 25 - mProg * 25}%`

  const overlayOpacity = entered ? 1 : 0
  const overlayTitle = entered === "mens" ? "MEN'S" : entered === "womens" ? "WOMEN'S" : ""
  const overlayLabel = entered === "mens" ? "GEN-01" : entered === "womens" ? "GEN-02" : ""
  const loadingAnim = entered
    ? "cipherLoadBar 1.2s 0.4s cubic-bezier(0.4,0,0.2,1) forwards"
    : "none"

  const menCount = vaultGenderCount(catalog, "men")
  const womenCount = vaultGenderCount(catalog, "women")

  return (
    <div ref={containerRef} className="relative h-full w-full bg-ink" style={{ overflow: "clip" }}>
      {/* === 3D world + two ropes (lazy) === */}
      <Suspense fallback={<RopeFallback />}>
        <VaultRopeScene
          mOffRef={mOff} wOffRef={wOff}
          mDragRef={mDrag} wDragRef={wDrag}
          maxPullPxRef={maxPull}
          mActiveRef={mActive} wActiveRef={wActive}
          onMensDown={onMensDown} onWomensDown={onWomensDown}
        />
      </Suspense>

      {/* === HTML panels (faithful handoff, pointer-events-none so drag hits the canvas) === */}
      <div className="pointer-events-none absolute inset-0">
        <Panel side="men" badge="GEN-01" name="MEN'S" count={menCount} width={mensWidth} />
        <Panel side="women" badge="GEN-02" name="WOMEN'S" count={womenCount} width={womensWidth} />

        {/* pull hint */}
        {!entered && (
          <div className="absolute left-1/2 bottom-10 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted text-center">
            <div className="text-signal">// GRAB.KNOT.PULL.ANY.WAY</div>
            <div className="mt-1.5 opacity-60">drag a rope in any direction to breach that wardrobe</div>
          </div>
        )}
      </div>

      {/* === transition overlay (GEN / MEN'S / // LOADING COLLECTION / bar / BACK) === */}
      <div
        className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-ink transition-opacity duration-500"
        style={{ opacity: overlayOpacity, pointerEvents: entered ? "auto" : "none" }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-signal"
          style={{ animation: entered ? "cipherFadeUp 0.5s ease forwards" : "none" }}
        >
          {overlayLabel}
        </div>
        <div
          className="w-full overflow-visible px-8 text-center font-display font-black italic uppercase leading-[0.85] tracking-[-0.02em] text-bone"
          style={{ fontSize: "clamp(80px,12vw,160px)", animation: entered ? "cipherFadeUp 0.6s 0.1s ease both" : "none" }}
        >
          {overlayTitle}
        </div>
        <div
          className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted"
          style={{ animation: entered ? "cipherFadeUp 0.6s 0.2s ease both" : "none" }}
        >
          // LOADING COLLECTION
        </div>
        <div
          className="relative mt-2 h-px w-[120px] overflow-hidden"
          style={{ background: "rgba(200,255,0,0.3)", animation: entered ? "cipherFadeUp 0.6s 0.3s ease both" : "none" }}
        >
          <div
            className="absolute inset-0 origin-left bg-signal"
            style={{ transform: "scaleX(0)", animation: loadingAnim }}
          />
        </div>
        <button
          onClick={onOverlayClose}
          className="mt-4 cursor-pointer font-mono text-[10px] uppercase tracking-[0.14em] text-bone opacity-50 hover:opacity-100"
          style={{ animation: entered ? "cipherFadeUp 0.6s 0.5s ease both" : "none" }}
        >
          ← BACK
        </button>
      </div>
    </div>
  )
}
