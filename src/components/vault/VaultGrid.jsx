import { useOutletContext } from "react-router-dom"
import { genderLabel, productsFor } from "@/data/fakestore"
import VaultCard from "./VaultCard"

export default function VaultGrid({ gender, category, catalog, onBack }) {
  const { flyToCart } = useOutletContext() || {}

  const products = productsFor(catalog, gender, category)

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
    <div className="flex h-full flex-col overflow-hidden">
      {/* toolbar */}
      <div className="flex h-[72px] shrink-0 items-center gap-4 border-b border-line px-6 md:px-10">
        <button
          onClick={onBack}
          className="border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-ash transition-all hover:border-white/40 hover:text-bone"
        >
          ← {genderLabel(gender)}
        </button>
        <h2 className="font-display text-[34px] font-extrabold uppercase tracking-[-0.01em]">
          {category.toUpperCase()}
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{products.length} pieces</span>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6 md:px-10">
        {products.length === 0 ? (
          <p className="py-20 text-center font-mono text-sm text-muted">// no.signal — nothing decoded yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-[2px] md:grid-cols-3">
            {products.map((p, i) => (
              <VaultCard key={p.id} product={p} index={i} onAdd={handleAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
