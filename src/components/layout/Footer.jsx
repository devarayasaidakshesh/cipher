import { Link } from "react-router-dom"

// Handoff footer: 4-column grid (brand 2fr / shop / support / signal 1.6fr),
// newsletter input, hairline top border.
export default function Footer() {
  const col = (label) =>
    `font-mono text-[9px] uppercase tracking-[0.22em] text-muted mb-4`
  const link = `font-body text-[13px] text-ash transition-colors hover:text-bone cursor-pointer`

  return (
    <footer className="relative z-10 border-t border-line bg-ink px-6 py-14 md:px-20 md:pb-9 md:pt-14">
      <div className="mx-auto mb-12 grid max-w-7xl gap-12 md:grid-cols-[2fr_1fr_1fr_1.6fr]">
        {/* brand */}
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-4 w-4 items-center justify-center border-[1.5px] border-signal">
              <span className="h-1.5 w-1.5 bg-signal" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-[0.05em]">CIPHER//</span>
          </div>
          <p className="font-mono text-[11px] tracking-[0.04em] text-muted">Decode the fit.</p>
        </div>

        {/* shop */}
        <div>
          <h4 className={col()}>SHOP</h4>
          <ul className="space-y-2.5">
            <li><Link to="/vault" className={link}>All</Link></li>
            <li><Link to="/vault?gender=men" className={link}>Men's</Link></li>
            <li><Link to="/vault?gender=women" className={link}>Women's</Link></li>
            <li><Link to="/wishlist" className={link}>Wishlist</Link></li>
          </ul>
        </div>

        {/* support */}
        <div>
          <h4 className={col()}>SUPPORT</h4>
          <ul className="space-y-2.5">
            <li><span className={link}>Shipping</span></li>
            <li><span className={link}>Returns</span></li>
            <li><span className={link}>Size Guide</span></li>
            <li><Link to="/admin" className={link}>Admin</Link></li>
          </ul>
        </div>

        {/* signal */}
        <div>
          <h4 className={col()}>SIGNAL</h4>
          <p className="mb-3.5 font-body text-[13px] text-ash">Get drop notifications.</p>
          <form onSubmit={(e) => e.preventDefault()} className="flex">
            <input
              type="email"
              placeholder="you@signal.io"
              className="min-w-0 flex-1 border border-line border-r-0 bg-ink-3 px-3.5 py-2.5 font-mono text-[11px] outline-none focus:border-signal"
            />
            <button className="bg-signal px-4 font-mono text-[13px] font-bold text-ink transition-colors hover:bg-signal-hover" aria-label="Subscribe">
              →
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-line-soft pt-7 font-mono text-[10px] text-muted sm:flex-row">
        <p>© 2026 CIPHER//. All rights encrypted.</p>
        <p>Built for learning · React · Vite · Tailwind</p>
      </div>
    </footer>
  )
}
