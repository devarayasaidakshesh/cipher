import { useEffect, useRef } from "react"
import { useReducedMotion } from "framer-motion"

// The site-wide CIPHER world — a fixed, pointer-events-none layer mounted once
// in Layout so every route shows the 3D effect: a CSS perspective neon grid
// floor at the bottom + a 2D-canvas drifting starfield. Cheap (no three.js,
// no WebGL) so it runs on content pages alongside FlyToCartCanvas without
// context conflicts. Routes that paint their own opaque 3D canvas (Home's
// HeroScene, the Vault's scenes) sit above z-0 and overpaint this — so it only
// reads through on the other routes (ProductDetail, Wishlist, Account, …).
//
// Starfield is a direct port of the reference HTML's initStarfield: ~120 stars,
// ~25% neon "signal" green, drift + edge-wrap, one rAF loop. Paused when the
// tab is hidden or under prefers-reduced-motion (one static frame then).

const STAR_COUNT = 120

export default function CipherBackdrop() {
  const canvasRef = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let W = 0
    let H = 0
    let stars = []
    let raf = null
    let running = false

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + "px"
      canvas.style.height = H + "px"
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2,
        a: Math.random() * 0.6 + 0.15,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.06,
        green: Math.random() < 0.25,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const s of stars) {
        s.x += s.vx
        s.y += s.vy
        if (s.x < 0) s.x = W
        if (s.x > W) s.x = 0
        if (s.y < 0) s.y = H
        if (s.y > H) s.y = 0
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.green
          ? `rgba(200,255,0,${s.a})`
          : `rgba(255,255,255,${s.a * 0.7})`
        ctx.fill()
      }
    }

    const loop = () => {
      draw()
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (running || reduce) return
      running = true
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = null
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    const onResize = () => {
      build()
      if (reduce) draw() // keep the static frame sized right
    }

    build()
    if (reduce) {
      draw() // single static frame
    } else {
      start()
    }
    window.addEventListener("resize", onResize)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      stop()
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [reduce])

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {/* starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* perspective neon grid floor (bottom 46vh) */}
      <div className="absolute bottom-0 left-0 right-0 h-[46vh] overflow-hidden">
        <div className="cipher-grid-floor absolute left-0 h-[200%] w-[200%] -ml-[50%]" />
        {/* horizon glow */}
        <div className="absolute left-0 right-0 top-0 h-[40px] bg-gradient-to-b from-signal/10 to-transparent" />
      </div>

      {/* top vignette so content stays legible under the navbar */}
      <div className="absolute left-0 right-0 top-0 h-24 bg-gradient-to-b from-ink to-transparent" />
    </div>
  )
}
