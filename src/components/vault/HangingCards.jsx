import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence } from "framer-motion"
import { vaultCategories, productsFor, genderLabel } from "@/data/fakestore"
import DrawerInterior from "./DrawerInterior"

// Hanging-cards wardrobe — the category-select step (drop-in replacement for
// Rail). A row of category cards hang in the stage; a short 3D neon rope +
// knot hangs BELOW each card (the card is an HTML overlay, pointer-events-none,
// so the knot's grab sphere in HangingCardsScene is the hit target). Grab a
// knot and pull in ANY direction (2D spring, K=280 D=12) past the snap
// threshold (measured as pull DISTANCE from rest) → flash → "breach" overlay
// (cat code / big italic name / "{n} PIECES IN COLLECTION" / load bar /
// "// DECRYPTING WARDROBE" / "← PULL BACK") → onPick(catId) → the URL
// `category` is set → the category-sync effect opens DrawerInterior (the
// product grid) over the stage. The 3D canvas stays mounted across the
// breach→grid handoff (this component handles BOTH closed + open states, like
// Rail did). Reduced-motion users get the 2D CategorySelect instead (Vault).
//
// Spring sim state lives in plain mutable refs (NOT React state); the 3D scene
// reads pullsRef each frame. React state (mirror) only mirrors pulls[] +
// entered + flash for the HTML card overlay + breach overlay.

const HangingCardsScene = lazy(() => import("@/components/three/HangingCardsScene"))

const K = 280 // spring stiffness (reference)
const D = 12 // damping
const OPEN_DELAY_MS = 220 // breach → DrawerInterior open delay (matches Rail)
// breach timing (reference: flash 280ms, overlay 450ms, loadBar 1.4s 0.5s)
const FLASH_ON_MS = 280
const OVERLAY_MS = 450
const COMMIT_MS = 1950 // ~overlay-open (450) + 0.5 delay + 1.4 fill + buffer

// 2D pull offset per card (px, +x right, +y down). Each card gets its own
// distinct object so mutating one never touches another.
const zero = () => ({ x: 0, y: 0 })

// CSS-rope fallback shown while the three.js chunk loads — identical card
// layout so there's no shift when the chunk resolves.
function HangingCardsFallback({ visible }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center gap-[clamp(20px,4vw,52px)] pt-[110px]">
      {visible.map((c) => (
        <div key={c.id} className="flex flex-col items-center">
          <CardSkin code={c.code} name={c.label} count={c.n} />
          <div
            className="mt-0 w-1"
            style={{
              height: 26,
              background:
                "repeating-linear-gradient(to bottom,#c8ff00 0px,#8fb300 3px,#c8ff00 6px,#e8ff60 9px,#c8ff00 12px)",
              filter: "drop-shadow(0 0 4px rgba(200,255,0,0.7))",
            }}
          />
          <div className="-mt-1 h-3 w-3 rounded-full bg-signal" style={{ filter: "drop-shadow(0 0 8px rgba(200,255,0,0.9))" }} />
        </div>
      ))}
    </div>
  )
}

// the card visual — used by both the live overlay and the fallback. Always
// pointer-events-none (the 3D knot behind it is the grab target).
function CardSkin({ code, name, count, prog = 0, hovered = false }) {
  const borderColor = hovered
    ? "rgba(200,255,0,0.8)"
    : prog > 0.05
      ? `rgba(200,255,0,${0.25 + prog * 0.55})`
      : "rgba(255,255,255,0.09)"
  const glowAlpha = hovered ? 0.06 : prog > 0 ? (prog * 0.08).toFixed(3) : 0
  const cornerOpacity = hovered ? 1 : 0.35
  return (
    <div
      className="relative h-[290px] w-[clamp(150px,17vw,200px)] overflow-hidden border bg-[#0b0b0b]"
      style={{ borderColor, transition: "border-color 0.3s" }}
    >
      {/* scan-line sweep (opacity gated by hover via parent) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: hovered ? 1 : 0 }}>
        <div className="cipher-scanline absolute left-0 right-0 h-[40px] bg-gradient-to-b from-transparent via-signal/10 to-transparent" />
      </div>

      {/* corner brackets */}
      <div className="absolute left-[10px] top-[10px] h-[14px] w-[14px] border-t border-l" style={{ borderColor: "#c8ff00", opacity: cornerOpacity }} />
      <div className="absolute right-[10px] top-[10px] h-[14px] w-[14px] border-t border-r" style={{ borderColor: "#c8ff00", opacity: cornerOpacity }} />
      <div className="absolute bottom-[10px] left-[10px] h-[14px] w-[14px] border-b border-l" style={{ borderColor: "#c8ff00", opacity: cornerOpacity }} />
      <div className="absolute bottom-[10px] right-[10px] h-[14px] w-[14px] border-b border-r" style={{ borderColor: "#c8ff00", opacity: cornerOpacity }} />

      {/* radial glow */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, rgba(200,255,0,${glowAlpha}), transparent 70%)` }} />

      {/* content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[10px]">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-signal/60">{code}</div>
        <div className="text-center font-display text-[44px] font-black uppercase italic leading-none tracking-[-0.01em] text-bone">{name}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{count} PCS</div>
        <div className="mt-[4px] flex gap-[5px]">
          <div className="h-[4px] w-[4px] bg-signal/50" />
          <div className="h-[4px] w-[4px] bg-signal/25" />
          <div className="h-[4px] w-[4px] bg-signal/15" />
        </div>
      </div>

      {/* PULL hint */}
      <div className="absolute bottom-[14px] left-0 right-0 flex justify-center" style={{ opacity: prog < 0.05 ? (hovered ? 1 : 0.5) : 0 }}>
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-signal/50">PULL ↓</span>
      </div>
    </div>
  )
}

export default function HangingCards({ gender, category, catalog, onPick, onBack }) {
  // Memoize so the category-sync effect's [category, visible] dep is stable —
  // a fresh array every render would re-fire that effect → setMirror → loop.
  // (Same shape as Rail.jsx.)
  const visible = useMemo(
    () =>
      (vaultCategories[gender] || [])
        .map((c) => ({ ...c, n: productsFor(catalog, gender, c.id).length }))
        .filter((c) => c.n > 0),
    [catalog, gender]
  )
  const N = visible.length

  // --- spring sim refs (2D per card; plain mutable, scene reads .current) ---
  const pullsRef = useRef(Array.from({ length: N }, zero))
  const velRef = useRef(Array.from({ length: N }, zero))
  const targetRef = useRef(Array.from({ length: N }, zero))
  const dragIdxRef = useRef(-1)
  const activeIdxRef = useRef(-1)
  const dragStart = useRef(zero()) // pointer pos at drag start
  const dragStartPos = useRef(zero()) // knot offset at drag start

  const enteredRef = useRef(false) // ref mirror of `entered` (event-handler closures are first-render)
  const timersRef = useRef([])
  const raf = useRef(null)
  const animating = useRef(false)

  // open-state (DrawerInterior)
  const interiorIdxRef = useRef(-1)
  const [interiorIdx, setInteriorIdx] = useState(-1)
  const openTimer = useRef(null)

  // React-state mirror for the HTML overlay
  const [mirror, setMirror] = useState({ pulls: Array.from({ length: N }, zero), flash: false, entered: null })
  const [hovered, setHovered] = useState(-1)

  // measurement refs (card-bottom centers → 3D rope anchors)
  const stageRef = useRef(null)
  const cardRefs = useRef([])
  const anchorsRef = useRef([])
  const stageWRef = useRef(0)
  const stageHRef = useRef(0)
  const maxPullRef = useRef(0)
  const snapAtRef = useRef(0)

  // keep sim arrays sized to N (gender switch remounts via key, but be safe)
  useEffect(() => {
    const pad = (ref) => {
      const a = ref.current
      if (a.length < N) ref.current = a.concat(Array.from({ length: N - a.length }, zero))
      else if (a.length > N) ref.current = a.slice(0, N)
    }
    pad(pullsRef); pad(velRef); pad(targetRef)
  }, [N])

  // --- spring loop (only runs while a knot is settling/snapping) ---
  const startLoop = () => {
    if (animating.current) return
    animating.current = true
    const tick = () => {
      const dt = 1 / 60
      let live = false
      for (let i = 0; i < N; i++) {
        if (dragIdxRef.current === i) continue
        const p = pullsRef.current[i]
        const v = velRef.current[i]
        const tg = targetRef.current[i]
        const fx = -K * (p.x - tg.x) - D * v.x
        const fy = -K * (p.y - tg.y) - D * v.y
        v.x += fx * dt
        v.y += fy * dt
        p.x += v.x * dt
        p.y += v.y * dt
        const dist = Math.hypot(p.x - tg.x, p.y - tg.y)
        const speed = Math.hypot(v.x, v.y)
        if (dist > 0.2 || speed > 0.3) live = true
        else { p.x = tg.x; p.y = tg.y; v.x = 0; v.y = 0 }
      }
      setMirror((s) => ({ ...s, pulls: [...pullsRef.current] }))
      if (live) raf.current = requestAnimationFrame(tick)
      else animating.current = false
    }
    raf.current = requestAnimationFrame(tick)
  }

  const sched = (ms, fn) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  // --- drag math (2D — knot follows the pointer in any direction; radial
  //     rubber-band once the pull distance exceeds maxPull) ---
  const applyDrag = (clientX, clientY) => {
    const i = dragIdxRef.current
    if (i < 0) return
    const max = maxPullRef.current || 1
    let dx = dragStartPos.current.x + (clientX - dragStart.current.x)
    let dy = dragStartPos.current.y + (clientY - dragStart.current.y)
    const mag = Math.hypot(dx, dy)
    if (mag > max) {
      // resist beyond maxPull — stays in the pull direction, just stiffer
      const scaled = max + (mag - max) * 0.08
      const k = scaled / mag
      dx *= k
      dy *= k
    }
    const p = pullsRef.current[i]
    p.x = dx
    p.y = dy
    setMirror((s) => ({ ...s, pulls: [...pullsRef.current] }))
  }

  const releaseHandle = () => {
    const i = dragIdxRef.current
    if (i < 0) return
    dragIdxRef.current = -1
    document.body.classList.remove("cipher-grabbing")
    document.body.style.cursor = "auto"
    const p = pullsRef.current[i]
    const mag = Math.hypot(p.x, p.y)
    if (mag >= snapAtRef.current) {
      // breach this category — snap the knot out to maxPull along the pull dir
      const max = maxPullRef.current || 1
      const dir = mag > 0 ? { x: p.x / mag, y: p.y / mag } : { x: 0, y: 1 }
      targetRef.current[i] = { x: dir.x * max, y: dir.y * max }
      velRef.current[i] = { x: dir.x * 140, y: dir.y * 140 }
      activeIdxRef.current = i
      startLoop()
      if (!enteredRef.current) {
        enteredRef.current = true
        sched(FLASH_ON_MS, () => setMirror((s) => ({ ...s, flash: true })))
        sched(OVERLAY_MS, () => setMirror((s) => ({ ...s, flash: false, entered: i })))
        sched(COMMIT_MS, () => {
          if (visible[i]) onPick?.(visible[i].id)
        })
      }
    } else {
      // spring back to rest
      targetRef.current[i] = zero()
      velRef.current[i] = zero()
      startLoop()
    }
  }

  // --- pointer handlers (window-level so the drag survives leaving the knot) ---
  useEffect(() => {
    const onMove = (e) => { if (dragIdxRef.current >= 0) applyDrag(e.clientX, e.clientY) }
    const onUp = () => { if (dragIdxRef.current >= 0) releaseHandle() }
    const onTouchMove = (e) => {
      if (dragIdxRef.current < 0) return
      if (e.cancelable) e.preventDefault()
      const t = e.touches[0]
      if (!t) return
      applyDrag(t.clientX, t.clientY)
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
  }, [N])

  // --- drag-start (called by the 3D knot's onPointerDown via the scene) ---
  const onCardDown = (i, clientX, clientY) => {
    if (interiorIdxRef.current >= 0 || enteredRef.current) return
    dragIdxRef.current = i
    dragStart.current = { x: clientX, y: clientY }
    const p = pullsRef.current[i] || zero()
    dragStartPos.current = { x: p.x, y: p.y }
    velRef.current[i] = zero()
    document.body.classList.add("cipher-grabbing")
    document.body.style.cursor = "grabbing"
  }

  // BACK on the breach overlay: cancel + reset
  const onOverlayClose = () => {
    clearTimers()
    enteredRef.current = false
    for (let i = 0; i < N; i++) { pullsRef.current[i] = zero(); velRef.current[i] = zero(); targetRef.current[i] = zero() }
    activeIdxRef.current = -1
    setMirror({ pulls: Array.from({ length: N }, zero), flash: false, entered: null })
  }

  // --- measure card-bottom centers → anchors; maxPull/snapAt from stage height ---
  const measure = () => {
    const stage = stageRef.current
    if (!stage) return
    const s = stage.getBoundingClientRect()
    stageWRef.current = s.width
    stageHRef.current = s.height
    // Short, realistic pull travel — the knot only drops a little before the
    // breach snaps it. (Was 0.55× stage height, which sent it way down.)
    maxPullRef.current = s.height * 0.15
    snapAtRef.current = maxPullRef.current * 0.5
    anchorsRef.current = cardRefs.current.map((el) => {
      if (!el) return { cx: 0, bottomY: 0 }
      const r = el.getBoundingClientRect()
      return { cx: r.left + r.width / 2 - s.left, bottomY: r.bottom - s.top }
    })
  }
  useLayoutEffect(() => {
    measure()
    const rafId = requestAnimationFrame(measure) // re-measure after layout/fonts settle
    let ro
    if (typeof ResizeObserver !== "undefined" && stageRef.current) {
      ro = new ResizeObserver(measure)
      ro.observe(stageRef.current)
    }
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect()
      window.removeEventListener("resize", measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N])

  // --- sync URL category → DrawerInterior (open state) ---
  useEffect(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null }
    const idx = category ? visible.findIndex((c) => c.id === category) : -1
    if (idx >= 0) {
      const wasOpen = interiorIdxRef.current >= 0
      // conclude the breach overlay only once the drawer is actually up —
      // keeps the overlay (and the enteredRef drag-guard) alive across the
      // OPEN_DELAY_MS gap so no second knot can be grabbed mid-handoff.
      const openNow = () => {
        interiorIdxRef.current = idx
        setInteriorIdx(idx)
        enteredRef.current = false
        clearTimers()
        setMirror((s) => ({ ...s, flash: false, entered: null }))
      }
      if (wasOpen) openNow()
      else openTimer.current = setTimeout(openNow, OPEN_DELAY_MS)
    } else {
      // closed → reset any in-progress pull
      interiorIdxRef.current = -1
      setInteriorIdx(-1)
      enteredRef.current = false
      clearTimers()
      for (let i = 0; i < N; i++) { pullsRef.current[i] = zero(); velRef.current[i] = zero(); targetRef.current[i] = zero() }
      activeIdxRef.current = -1
      setMirror({ pulls: Array.from({ length: N }, zero), flash: false, entered: null })
    }
    return () => { if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, visible])

  // cleanup on unmount
  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    if (openTimer.current) clearTimeout(openTimer.current)
    clearTimers()
    document.body.classList.remove("cipher-grabbing")
    document.body.style.cursor = "auto"
  }, [])

  // --- render values ---
  const { pulls, flash, entered } = mirror
  const maxP = maxPullRef.current || 1

  const openCat = interiorIdx >= 0 ? visible[interiorIdx] : null
  const openProducts = openCat ? productsFor(catalog, gender, openCat.id) : []

  const breachCat = entered != null && visible[entered] ? visible[entered] : null

  return (
    <div ref={stageRef} className="relative h-full w-full bg-ink" style={{ overflow: "clip" }}>
      {/* === 3D world + per-card ropes (lazy) === */}
      <Suspense fallback={<HangingCardsFallback visible={visible} />}>
        <HangingCardsScene
          visible={visible}
          anchorsRef={anchorsRef}
          pullsRef={pullsRef}
          dragIdxRef={dragIdxRef}
          maxPullPxRef={maxPullRef}
          activeIdxRef={activeIdxRef}
          stageWRef={stageWRef}
          stageHRef={stageHRef}
          onCardDown={onCardDown}
        />
      </Suspense>

      {/* === HTML card overlay (pointer-events-none — the 3D knot is the grab target) === */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 right-0 top-0 flex items-start justify-center gap-[clamp(20px,4vw,52px)] pt-[110px]">
          {visible.map((c, i) => {
            const p = pulls[i] || { x: 0, y: 0 }
            const prog = Math.min(1, Math.hypot(p.x, p.y) / maxP)
            return (
              <div
                key={c.id}
                ref={(el) => { cardRefs.current[i] = el }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? -1 : h))}
                style={{ animation: `cardFloat${i % 3} ${4.2 + i * 0.5}s ease-in-out infinite` }}
              >
                <CardSkin code={c.code} name={c.label} count={c.n} prog={prog} hovered={hovered === i} />
              </div>
            )
          })}
        </div>

        {/* page header */}
        <div className="absolute left-6 top-5 md:left-10">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted">
            // {genderLabel(gender)} WARDROBE
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-signal">
            PULL.CARD → BREACH
          </p>
        </div>
      </div>

      {/* === breach flash === */}
      <div
        className="pointer-events-none absolute inset-0 z-[490] bg-signal transition-opacity duration-150"
        style={{ opacity: flash ? 0.5 : 0 }}
      />

      {/* === breach overlay === */}
      <div
        className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-ink transition-opacity duration-500"
        style={{ opacity: entered != null ? 1 : 0, pointerEvents: entered != null ? "auto" : "none" }}
      >
        {breachCat && (
          <>
            <div
              className="font-mono text-[10px] uppercase tracking-[0.26em] text-signal"
              style={{ animation: "textIn 0.5s 0.1s ease both" }}
            >
              {breachCat.code}
            </div>
            <div
              className="w-full overflow-visible px-8 text-center font-display font-black uppercase italic leading-[0.85] tracking-[-0.02em] text-bone"
              style={{ fontSize: "clamp(90px,14vw,180px)", animation: "textIn 0.7s 0.2s ease both" }}
            >
              {breachCat.label}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              {breachCat.n} PIECES IN COLLECTION
            </div>
            <div className="relative mt-3 h-px w-[160px] overflow-hidden" style={{ background: "rgba(200,255,0,0.2)" }}>
              <div
                className="absolute inset-0 origin-left bg-signal"
                style={{ transform: "scaleX(0)", animation: entered != null ? "loadBar 1.4s 0.5s cubic-bezier(0.4,0,0.2,1) forwards" : "none" }}
              />
            </div>
            <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-signal/40">
              // DECRYPTING WARDROBE
            </div>
            <button
              onClick={onOverlayClose}
              className="mt-5 cursor-pointer border border-white/10 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-bone/30 transition-colors hover:text-bone"
            >
              ← PULL BACK
            </button>
          </>
        )}
      </div>

      {/* === open drawer (product grid) — breach → onPick → category → DrawerInterior === */}
      <AnimatePresence>
        {interiorIdx >= 0 && openCat && (
          <DrawerInterior
            key={openCat.id}
            cat={openCat}
            gender={gender}
            tabs={visible}
            products={openProducts}
            onBack={onBack}
            onPick={onPick}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
