import { useCallback, useRef, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { useReducedMotion } from "framer-motion"
import Navbar from "@/components/layout/Navbar"
import Footer from "@/components/layout/Footer"
import CipherBackdrop from "@/components/brand/CipherBackdrop"
import CartDrawer from "@/components/layout/CartDrawer"
import AuthModal from "@/components/layout/AuthModal"
import CartSignalEffect from "@/components/layout/CartSignalEffect"
import { useStore } from "@/context/StoreContext"

export default function Layout() {
  const [cartOpen, setCartOpen] = useState(false)
  const [flight, setFlight] = useState(null) // { item, fromRect } | null
  const { pathname } = useLocation()
  const { addToCart } = useStore()
  const reduce = useReducedMotion()
  const bagRef = useRef(null)
  const busyRef = useRef(false)

  const isHome = pathname === "/"
  const hideFooter = isHome || pathname.startsWith("/vault")

  const flyToCart = useCallback(
    ({ item, fromRect }) => {
      if (reduce || !bagRef.current || !fromRect || busyRef.current) {
        addToCart(item)
        setCartOpen(true)
        return
      }
      busyRef.current = true
      setFlight({ item, fromRect })
    },
    [reduce, addToCart]
  )

  const onLand = useCallback(
    (item) => {
      addToCart(item)
      setCartOpen(true)
      setFlight(null)
      busyRef.current = false
    },
    [addToCart]
  )

  return (
    <div className="flex min-h-screen flex-col">
      <CipherBackdrop />
      {!isHome && <Navbar bagRef={bagRef} onOpenCart={() => setCartOpen(true)} />}
      <main className="relative z-10 flex-1">
        <Outlet context={{ openCart: () => setCartOpen(true), flyToCart }} />
      </main>
      {!hideFooter && <Footer />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal />

      {/* CIPHER signal compile effect — replaces the WebGL fly-to-cart */}
      {flight && (
        <CartSignalEffect
          key={flight.item.productId + Date.now()}
          fromRect={flight.fromRect}
          bagRef={bagRef}
          item={flight.item}
          onComplete={onLand}
        />
      )}
    </div>
  )
}
