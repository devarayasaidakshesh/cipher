import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useStore } from "@/context/StoreContext"

// Handoff cart sidebar: 360px, #0a0a0a, slides in over a blurred backdrop.
// Empty state uses the ∅ // BAG.EMPTY glyph; items show image, name,
// SIZE · COLOR, price, qty stepper + remove.
export default function CartDrawer({ open, onClose }) {
  const { cart, cartSubtotal, cartCount, setQty, removeFromCart } = useStore()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            className="fixed inset-0 z-[190] bg-black/55 backdrop-blur-[3px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* drawer */}
          <motion.aside
            className="fixed right-0 top-0 bottom-0 z-[200] flex w-[360px] max-w-full flex-col border-l border-line bg-[#0a0a0a]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-6">
              <h2 className="font-mono text-xs tracking-[0.15em]">
                CART <span className="text-signal">[{cartCount}]</span>
              </h2>
              <button onClick={onClose} className="text-xl leading-none text-ash transition-colors hover:text-bone" aria-label="Close cart">
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3.5 text-muted">
                <span className="text-4xl leading-none">∅</span>
                <span className="font-mono text-[10px] tracking-[0.2em]">// BAG.EMPTY</span>
                <span className="font-body text-[13px]">No pieces added yet.</span>
                <Link
                  to="/vault"
                  onClick={onClose}
                  className="mt-3 bg-signal px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-signal-hover"
                >
                  Enter the Vault
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-6">
                  <AnimatePresence initial={false}>
                    {cart.map((item) => (
                      <motion.li
                        key={item.key}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-3 border-b border-line-soft py-3.5"
                      >
                        <img src={item.img} alt={item.name} className="h-[76px] w-[60px] shrink-0 border border-line bg-bone p-1 object-contain" />
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-body text-xs font-medium text-bone/90">{item.name}</p>
                            <p className="font-mono text-xs">${item.price * item.qty}</p>
                          </div>
                          <p className="mt-0.5 font-mono text-[9px] text-ash">
                            {item.size} · {item.colorway}
                          </p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center border border-line">
                              <button className="px-2 text-ash hover:text-signal" onClick={() => setQty(item.key, item.qty - 1)} aria-label="Decrease">−</button>
                              <span className="px-3 font-mono text-xs">{item.qty}</span>
                              <button className="px-2 text-ash hover:text-signal" onClick={() => setQty(item.key, item.qty + 1)} aria-label="Increase">+</button>
                            </div>
                            <button
                              className="font-body text-[11px] text-muted transition-colors hover:text-bone"
                              onClick={() => removeFromCart(item.key)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="shrink-0 border-t border-line px-6 py-4">
                  <div className="mb-3.5 flex justify-between font-mono text-[10px]">
                    <span className="text-ash">Subtotal</span>
                    <span>${cartSubtotal}</span>
                  </div>
                  <Link
                    to="/checkout"
                    onClick={onClose}
                    className="block w-full bg-signal py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ink transition-colors hover:bg-signal-hover"
                  >
                    CHECKOUT · ${cartSubtotal}
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
