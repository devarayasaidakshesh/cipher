import { useState, lazy, Suspense } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence } from "framer-motion"
import { useStore } from "@/context/StoreContext"
import { useAuthModal } from "@/context/AuthModalContext"

// The landing is one scroll-driven 3D world (code-split — three.js loads
// after first paint; the static fallback shows the logo + ENTER THE VAULT so
// first paint is instant).
const HeroScene = lazy(() => import("@/components/three/HeroScene"))
const VaultDescend = lazy(() => import("@/components/three/VaultDescend"))

// static fallback shown while the 3D chunk loads — instant, on-brand
function Fallback({ onEnter }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-ink px-6 text-center">
      <h1 className="font-display text-[clamp(80px,13.5vw,172px)] font-extrabold uppercase leading-[0.88] tracking-[-0.02em]">CIPHER//</h1>
      <button onClick={onEnter} className="mt-11 bg-signal px-9 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink hover:bg-signal-hover">
        ENTER THE VAULT
      </button>
      <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.3em] text-muted">// loading.signal</p>
    </div>
  )
}

// fixed neon corner brackets — brand frame that persists across the scroll
function Brackets() {
  const c = "absolute w-8 h-8 pointer-events-none z-20"
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div className={`${c} top-5 left-5 border-t border-l`} style={{ borderColor: "rgba(200,255,0,0.35)" }} />
      <div className={`${c} top-5 right-5 border-t border-r`} style={{ borderColor: "rgba(200,255,0,0.35)" }} />
      <div className={`${c} bottom-5 left-5 border-b border-l`} style={{ borderColor: "rgba(200,255,0,0.35)" }} />
      <div className={`${c} bottom-5 right-5 border-b border-r`} style={{ borderColor: "rgba(200,255,0,0.35)" }} />
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)
  const { user } = useStore()
  const { openAuth } = useAuthModal()

  const enterVault = () => {
    if (user) {
      setEntering(true)
    } else {
      openAuth("login", () => setEntering(true))
    }
  }

  return (
    <div className="relative bg-ink">
      {/* floating CIPHER logo (top-left) — the only chrome on the landing */}
      <Link to="/" className="fixed left-6 top-6 z-30 flex items-center gap-2.5 md:left-10 md:top-7" aria-label="CIPHER home">
        <span className="flex h-[18px] w-[18px] items-center justify-center border-2 border-signal">
          <span className="h-[7px] w-[7px] bg-signal" />
        </span>
        <span className="font-display text-xl font-extrabold tracking-[0.06em]">CIPHER//</span>
      </Link>

      <Brackets />

      <Suspense fallback={<Fallback onEnter={enterVault} />}>
        <HeroScene onEnter={enterVault} />
      </Suspense>

      {/* 3D vault descend → /vault */}
      <AnimatePresence>
        {entering && (
          <Suspense fallback={null}>
            <VaultDescend onComplete={() => navigate("/vault")} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  )
}
