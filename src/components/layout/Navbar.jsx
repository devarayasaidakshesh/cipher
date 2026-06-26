import { useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useStore } from "@/context/StoreContext"
import { useAuthModal } from "@/context/AuthModalContext"

// Handoff nav: 60px sticky, blurred near-black, neon square logo + CIPHER//.
// Center links end in a single SIGN UP (no SIGN IN — that lives inside the
// modal). Right side: wishlist heart + BAG [N].
const navCls = ({ isActive }) =>
  `font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${
    isActive ? "text-bone" : "text-ash hover:text-bone"
  }`

export default function Navbar({ bagRef, onOpenCart }) {
  const { cartCount, user, wishlist } = useStore()
  const { openAuth } = useAuthModal()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const signUp = () => {
    setOpen(false)
    openAuth("signup")
  }

  return (
    <header
      className="sticky top-0 z-[150] flex h-[60px] items-center justify-between border-b border-line px-6 md:px-10"
      style={{ background: "rgba(8,8,8,0.97)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
    >
      {/* Left: logo */}
      <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
        <span className="flex h-[18px] w-[18px] items-center justify-center border-2 border-signal">
          <span className="h-[7px] w-[7px] bg-signal" />
        </span>
        <span className="font-display text-xl font-extrabold tracking-[0.06em]">CIPHER//</span>
      </Link>

      {/* Center: nav */}
      <nav className="hidden items-center gap-7 md:flex">
        <NavLink to="/vault" className={navCls} onClick={() => setOpen(false)}>Shop</NavLink>
        <NavLink to="/vault?drop=DROP_03" className={navCls} onClick={() => setOpen(false)}>New Drop</NavLink>
        <NavLink to="/wishlist" className={navCls} onClick={() => setOpen(false)}>Wishlist</NavLink>
        {user ? (
          <NavLink to="/account" className={navCls} onClick={() => setOpen(false)}>Account</NavLink>
        ) : (
          <button onClick={signUp} className={navCls({ isActive: false })}>Sign Up</button>
        )}
      </nav>

      {/* Right: wishlist + bag */}
      <div className="flex items-center gap-5">
        <Link
          to="/wishlist"
          className="relative text-[17px] leading-none text-ash transition-colors hover:text-bone"
          aria-label="Wishlist"
        >
          <span aria-hidden>♡</span>
          {wishlist.length > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center bg-signal font-mono text-[10px] font-bold text-ink">
              {wishlist.length}
            </span>
          )}
        </Link>
        <button
          ref={bagRef}
          onClick={onOpenCart}
          className="flex items-center gap-1.5 text-ash transition-colors hover:text-signal"
          aria-label="Cart"
        >
          {/* key-remount per count → bump pulse when the fly-to-cart lands */}
          <motion.span
            key={cartCount}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.22, 1] }}
            transition={{ duration: 0.26, ease: "easeOut" }}
            className="inline-block font-mono text-[11px] tracking-[0.1em]"
          >
            BAG [{cartCount}]
          </motion.span>
        </button>

        {/* mobile toggle */}
        <button
          className="text-bone md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="absolute left-0 right-0 top-[60px] flex flex-col gap-4 border-b border-line bg-ink px-6 py-5 md:hidden">
          <NavLink to="/vault" className={navCls} onClick={() => setOpen(false)}>Shop</NavLink>
          <NavLink to="/vault?drop=DROP_03" className={navCls} onClick={() => setOpen(false)}>New Drop</NavLink>
          <NavLink to="/wishlist" className={navCls} onClick={() => setOpen(false)}>Wishlist</NavLink>
          {user ? (
            <NavLink to="/account" className={navCls} onClick={() => setOpen(false)}>Account</NavLink>
          ) : (
            <button onClick={signUp} className="text-left font-mono text-[11px] uppercase tracking-[0.12em] text-ash">Sign Up</button>
          )}
        </nav>
      )}
    </header>
  )
}
