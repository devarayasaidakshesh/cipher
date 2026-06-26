import { useNavigate } from "react-router-dom"
import { genderLabel } from "@/data/fakestore"

const VAULT_CATS = {
  tshirts: "T-SHIRTS", shirts: "SHIRTS", hoodies: "HOODIES",
  cargo: "CARGO", caps: "CAPS", tops: "TOPS", bottoms: "BOTTOMS", accessories: "ACCESSORIES",
}

export default function VaultBreadcrumb({ gender, category, onHome }) {
  const navigate = useNavigate()
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-line">
      <div className="flex h-full items-center">
        <button
          onClick={onHome}
          className="flex h-full items-center gap-1.5 border-r border-line px-5 font-mono text-[10px] uppercase tracking-[0.13em] text-ash transition-colors hover:bg-white/[0.03] hover:text-bone"
        >
          ← HOME
        </button>
        <span className="px-3.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">THE VAULT</span>
        {gender && (
          <>
            <span className="mr-0.5 font-mono text-[10px] text-white/15">/</span>
            <span className="px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-bone/60">
              {genderLabel(gender)}
            </span>
          </>
        )}
        {category && (
          <>
            <span className="mr-0.5 font-mono text-[10px] text-white/15">/</span>
            <span className="px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-signal">
              {VAULT_CATS[category] || category}
            </span>
          </>
        )}
      </div>
      {!gender && (
        <span className="pr-6 font-mono text-[9px] uppercase tracking-[0.24em] text-muted">// PULL.TO.ENTER</span>
      )}
    </div>
  )
}
