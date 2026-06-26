import { motion } from "framer-motion"
import { vaultCategories, genderLabel, productsFor } from "@/data/fakestore"

export default function CategorySelect({ gender, catalog, onPick, onBack }) {
  const cats = vaultCategories[gender] || []
  // Hide empty categories so the Vault never shows a dead end (FakeStoreAPI is
  // sparse — some categories have 0 pieces). Counts are real, not the handoff's 48/56.
  const visible = cats
    .map((cat) => ({ ...cat, n: productsFor(catalog, gender, cat.id).length }))
    .filter((cat) => cat.n > 0)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* toolbar */}
      <div className="flex h-[72px] shrink-0 items-center gap-4 border-b border-line px-6 md:px-10">
        <button
          onClick={onBack}
          className="border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-ash transition-all hover:border-white/40 hover:text-bone"
        >
          ← BACK
        </button>
        <h2 className="font-display text-[34px] font-extrabold uppercase tracking-[-0.01em]">
          {genderLabel(gender)}
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted">// SELECT.CATEGORY</span>
      </div>

      {/* rows */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {visible.map((cat, i) => (
          <motion.button
            key={cat.id}
            onClick={() => onPick(cat.id)}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }}
            className="group relative flex min-h-[76px] flex-1 cursor-pointer items-center overflow-hidden border-b border-line-soft"
          >
            <span className="w-[88px] shrink-0 pl-6 font-mono text-[9px] uppercase tracking-[0.2em] text-signal md:pl-10">
              {cat.code}
            </span>
            <span className="flex-1 font-display text-[clamp(30px,3.8vw,52px)] font-extrabold uppercase leading-none tracking-[-0.01em]">
              {cat.label}
            </span>
            <span className="mr-[62px] max-w-[200px] shrink-0 text-right">
              <span className="block font-mono text-[10px] text-ash">{cat.n} pieces</span>
              <span className="mt-1 block font-body text-[11px] leading-tight text-muted">{cat.desc}</span>
            </span>
            {/* PULL tab */}
            <span className="absolute right-0 top-0 bottom-0 flex w-[52px] flex-col items-center justify-center gap-2 border-l border-signal/10 bg-signal/[0.028] transition-all group-hover:bg-signal/10 group-hover:border-signal/40">
              <span className="font-mono text-[8px] tracking-[0.28em] text-signal" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>PULL</span>
              <span className="text-[13px] leading-none text-signal">→</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
