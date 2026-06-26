import { motion } from "framer-motion"
import { useOutletContext } from "react-router-dom"
import { genderLabel } from "@/data/fakestore"
import VaultCard from "./VaultCard"

// The open drawer's interior — a recessed cavity panel that fills the wardrobe
// bay (margins keep the 3D cabinet visible around it, so it reads as "inside
// the drawer", not a separate screen). Renders the VaultCard grid for the open
// category + category tabs (to switch drawers, which slam-shut + open via the
// chest's spring) + BACK. ADD → flyToCart (the 3D shirt-plane animation).
export default function DrawerInterior({ cat, gender, tabs, products, onBack, onPick }) {
  const { flyToCart } = useOutletContext() || {}

  const handleAdd = (p, event) => {
    const item = {
      productId: p.id,
      name: p.name,
      price: p.price,
      img: p.colorways[0].img,
      size: p.sizes.includes("M") ? "M" : p.sizes[0],
      colorway: p.colorways[0].name,
      qty: 1,
    }
    const fromRect = event?.currentTarget?.getBoundingClientRect?.()
    if (flyToCart) flyToCart({ item, fromRect })
  }

  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* recessed cavity frame */}
      <div
        className="m-3 flex flex-1 flex-col overflow-hidden rounded-[2px] md:m-6"
        style={{
          background: "#0c0c0c",
          border: "1px solid rgba(200,255,0,0.55)",
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.85), 0 0 30px rgba(200,255,0,0.06)",
        }}
      >
        {/* header: category name + tabs + BACK */}
        <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-line px-4 md:px-6"
          style={{ background: "rgba(8,8,8,0.6)" }}>
          <button
            onClick={onBack}
            className="border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-ash transition-all hover:border-white/40 hover:text-bone"
          >
            ← {genderLabel(gender)}
          </button>
          <h2 className="font-display text-[28px] font-extrabold uppercase italic leading-none tracking-[-0.01em] md:text-[34px]">
            {cat.label}
          </h2>
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-signal sm:inline">{cat.code}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{products.length} pcs</span>

          {/* category tabs — switch drawers (slam-shut + open via chest spring) */}
          <div className="ml-auto hidden items-center gap-1.5 overflow-x-auto md:flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className={`whitespace-nowrap border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] transition-all ${
                  t.id === cat.id
                    ? "border-signal bg-signal/10 text-signal"
                    : "border-line text-ash hover:border-white/40 hover:text-bone"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* card grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-10 pt-5 md:px-6">
          {products.length === 0 ? (
            <p className="py-20 text-center font-mono text-sm text-muted">// no.signal — nothing decoded yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-[2px] md:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <VaultCard key={p.id} product={p} index={i} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
