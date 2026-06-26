import { Link } from "react-router-dom"
import { useStore } from "@/context/StoreContext"
import { useProducts } from "@/context/ProductsContext"

export default function Wishlist() {
  const { wishlist, toggleWish, user, authReady } = useStore()
  const { catalog } = useProducts()

  const items = wishlist.map((id) => catalog.find((p) => p.id === id)).filter(Boolean)

  if (authReady && !user) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center">
        <p className="font-mono text-sm text-ash">// auth.required</p>
        <h1 className="mt-4 font-display text-4xl font-bold">Sign in to view saved pieces</h1>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/signup" className="bg-signal px-6 py-3 font-mono text-xs uppercase tracking-widest text-ink">Sign up</Link>
          <Link to="/account" className="border border-line px-6 py-3 font-mono text-xs uppercase tracking-widest text-bone hover:border-signal">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">▸ saved</p>
      <h1 className="mb-10 mt-2 font-display text-4xl font-bold">Wishlist</h1>

      {items.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-mono text-sm text-ash">// wishlist.empty</p>
          <Link to="/shop" className="mt-4 inline-block text-signal hover:underline">Browse the shop →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="group">
              <Link to={`/product/${p.id}`}>
                <div className="relative aspect-[4/5] overflow-hidden border border-line bg-bone">
                  <img src={p.colorways[0].img} alt={p.name} className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-ink/50">{p.code}</span>
                </div>
              </Link>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <Link to={`/product/${p.id}`} className="font-display font-semibold hover:text-signal">{p.name}</Link>
                  <p className="font-mono text-xs text-ash">{p.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-ash">${p.price}</p>
                  <button onClick={() => toggleWish(p.id)} className="text-signal hover:scale-110" aria-label="Remove">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
