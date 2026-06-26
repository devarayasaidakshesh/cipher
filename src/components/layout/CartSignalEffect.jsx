import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

// CIPHER// add-to-cart signal effect.
// Replaces the WebGL fly-to-cart. Pure CSS + Framer Motion — no canvas needed.
//
// Sequence:
//  0ms  — neon scan sweep rises over the source button
//  80ms — 18 neon code particles burst from source, arc to BAG
// 480ms — ring ripple expands from BAG
// 600ms — onComplete fires (addToCart + open drawer)
// 700ms — "// COMPILED" badge fades out

const CHARS = ["01","10","//",">>","0x","&&","{}","#!","<>","1","0","//",">>","01","</>","0x","10","01"]
const TOTAL = 0.68 // seconds for whole effect

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// Pre-compute each particle's path so it's deterministic (no random on re-render)
const PARTICLES = CHARS.map((char, i) => {
  const spread = ((i / CHARS.length) - 0.5) * 220    // horizontal spread
  const riseJitter = 60 + (i % 4) * 22               // arc height variation
  const delay = (i / CHARS.length) * 0.28            // stagger
  const dur = 0.42 + (i % 3) * 0.06
  const rotStart = (i % 2 === 0 ? 1 : -1) * (15 + i * 7)
  return { char, spread, riseJitter, delay, dur, rotStart }
})

export default function CartSignalEffect({ fromRect, bagRef, item, onComplete }) {
  const firedRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete?.(item)
      }
    }, TOTAL * 1000 + 50)
    return () => clearTimeout(t)
  }, [item, onComplete])

  if (!fromRect) { onComplete?.(item); return null }

  const bagRect = bagRef?.current?.getBoundingClientRect()
  const fromX = fromRect.left + fromRect.width / 2
  const fromY = fromRect.top + fromRect.height / 2
  const toX = bagRect ? bagRect.left + bagRect.width / 2 : fromX
  const toY = bagRect ? bagRect.top + bagRect.height / 2 : fromY - 200

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 220 }}>

      {/* ── 1. Neon scan sweep at source ─────────────────────────────── */}
      <motion.div
        style={{
          position: "absolute",
          left: fromRect.left - 4,
          top: fromRect.top - 4,
          width: fromRect.width + 8,
          height: fromRect.height + 8,
          border: "1px solid rgba(200,255,0,0.7)",
          boxShadow: "0 0 16px rgba(200,255,0,0.35), inset 0 0 20px rgba(200,255,0,0.08)",
          overflow: "hidden",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.45, times: [0, 0.08, 0.65, 1] }}
      >
        {/* horizontal scan line sweeping up */}
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(to right, transparent, #c8ff00, transparent)",
            boxShadow: "0 0 8px #c8ff00",
          }}
          initial={{ top: "100%" }}
          animate={{ top: "-4px" }}
          transition={{ duration: 0.35, ease: "linear" }}
        />
        {/* grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 7px,rgba(200,255,0,0.05) 7px,rgba(200,255,0,0.05) 8px)",
          }}
        />
      </motion.div>

      {/* ── 2. "// COMPILING" badge at source ────────────────────────── */}
      <motion.div
        style={{
          position: "absolute",
          left: fromX - 56,
          top: fromRect.top - 32,
          fontFamily: "'Space Mono', monospace",
          fontSize: 9,
          color: "#c8ff00",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          textShadow: "0 0 10px rgba(200,255,0,0.7)",
          whiteSpace: "nowrap",
        }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: [0, 1, 1, 0], y: [4, 0, 0, -4] }}
        transition={{ duration: 0.55, times: [0, 0.12, 0.7, 1] }}
      >
        // COMPILING…
      </motion.div>

      {/* ── 3. Neon code particles streaming to BAG ──────────────────── */}
      {PARTICLES.map(({ char, spread, riseJitter, delay, dur, rotStart }, i) => {
        const dx = toX - fromX
        const dy = toY - fromY
        // Mid-arc control point: rises above the straight line
        const arcMidX = dx * 0.4 + spread * 0.6
        const arcMidY = dy * 0.35 - riseJitter

        return (
          <motion.span
            key={i}
            style={{
              position: "absolute",
              left: fromX,
              top: fromY,
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: 10 + (i % 3) * 2,
              color: "#c8ff00",
              textShadow: "0 0 6px #c8ff00, 0 0 12px rgba(200,255,0,0.5)",
              willChange: "transform, opacity",
              letterSpacing: "0.05em",
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: rotStart }}
            animate={{
              x:      [0, arcMidX, dx],
              y:      [0, arcMidY, dy],
              opacity:[0, 1, 1, 0],
              scale:  [0.6, 1.1, 0.3],
              rotate: [rotStart, 0, -rotStart * 0.5],
            }}
            transition={{
              duration: dur,
              delay,
              ease: "easeIn",
              opacity: { times: [0, 0.15, 0.75, 1] },
            }}
          >
            {char}
          </motion.span>
        )
      })}

      {/* ── 4. Neon ring burst at BAG on arrival ─────────────────────── */}
      {[0, 1].map((ring) => (
        <motion.div
          key={ring}
          style={{
            position: "absolute",
            left: toX - 18,
            top: toY - 18,
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "1.5px solid #c8ff00",
            boxShadow: "0 0 10px #c8ff00",
          }}
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 2.8 + ring * 1.4, opacity: 0 }}
          transition={{
            duration: 0.45,
            delay: 0.44 + ring * 0.1,
            ease: "easeOut",
          }}
        />
      ))}

      {/* ── 5. BAG flash glow ────────────────────────────────────────── */}
      <motion.div
        style={{
          position: "absolute",
          left: toX - 28,
          top: toY - 28,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,255,0,0.5) 0%, transparent 70%)",
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.6, 2.2] }}
        transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
      />

      {/* ── 6. "// COMPILED" toast (bottom-right) ────────────────────── */}
      <motion.div
        style={{
          position: "fixed",
          right: 24,
          bottom: 28,
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: "#080808",
          background: "#c8ff00",
          padding: "8px 16px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontWeight: 700,
          boxShadow: "0 0 24px rgba(200,255,0,0.5)",
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -4] }}
        transition={{ duration: 0.7, times: [0, 0.15, 0.7, 1], delay: 0.1 }}
      >
        // ITEM.COMPILED →
      </motion.div>

    </div>
  )
}
