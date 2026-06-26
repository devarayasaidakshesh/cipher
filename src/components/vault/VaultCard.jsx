import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import { TECH_SPECS } from "@/components/brand/TechTags"

// Presentational product card, extracted from VaultGrid so both the 2D grid
// (reduced-motion path) and the 3D chest's DrawerInterior render the same card.
// onAdd(product, event) — the event lets the caller read the clicked button's
// screen rect for the fly-to-cart animation.
export default function VaultCard({ product, index, onAdd }) {
  const tags = (TECH_SPECS[product.type] || []).slice(0, 2)
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min((index ?? 0) * 0.03, 0.3) }}
      className="group bg-ink-2 transition-colors hover:bg-[#131313]"
    >
      <Link to={`/product/${product.id}`}>
        <div className="relative flex aspect-[3/4] items-center justify-center bg-bone">
          <img
            src={product.colorways[0].img}
            alt={product.name}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-2.5 top-2.5 font-mono text-[8px] uppercase tracking-[0.1em] text-ink/40">
            {product.code}
          </span>
        </div>
      </Link>
      <div className="border-t border-line-soft px-3 py-3.5">
        <div className="mb-1 flex items-baseline justify-between gap-1.5">
          <Link to={`/product/${product.id}`} className="min-w-0 truncate font-body text-xs font-medium text-bone/90">
            {product.name}
          </Link>
          <span className="shrink-0 font-mono text-[11px]">${product.price}</span>
        </div>
        <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.1em] text-ash">{product.type}</p>
        {tags.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className="border border-line px-1.5 py-[3px] font-mono text-[7px] tracking-[0.1em] text-ash">
                {t}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={(e) => onAdd?.(product, e)}
          className="w-full bg-signal py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-signal-hover"
        >
          ADD TO CART
        </button>
      </div>
    </motion.div>
  )
}
