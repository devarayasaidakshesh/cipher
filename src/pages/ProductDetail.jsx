import { useState, lazy, Suspense } from "react"
import { useParams, Link, useOutletContext, useNavigate } from "react-router-dom"
import { useProducts } from "@/context/ProductsContext"
import { useStore } from "@/context/StoreContext"
import TechTags from "@/components/brand/TechTags"

// 3D viewer is code-split; falls back to the plain photo while it loads.
const ProductStage = lazy(() => import("@/components/three/ProductStage"))

export default function ProductDetail() {
  const { id } = useParams()
  const { catalog } = useProducts()
  const product = catalog.find((p) => p.id === id || p.code === id)
  const { openCart, flyToCart } = useOutletContext() || {}
  const navigate = useNavigate()
  const { addToCart, toggleWish, isWished, user } = useStore()

  const [colorIdx, setColorIdx] = useState(0)
  const [size, setSize] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [error, setError] = useState("")

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-32 text-center">
        <p className="font-mono text-sm text-ash">// signal.lost — product not found</p>
        <Link to="/shop" className="mt-4 inline-block text-signal hover:underline">← Back to shop</Link>
      </div>
    )
  }

  const colorway = product.colorways[colorIdx]
  // Distinct image URLs — API products share one real photo across colorways,
  // so the thumbnail strip only renders when there's actually more than one.
  const distinctImgs = [...new Set(product.colorways.map((cw) => cw.img))]
  const colorwaysForImg = distinctImgs.map((src) =>
    product.colorways.findIndex((cw) => cw.img === src)
  )
  const stockFor = (s) => product.stock[s] ?? 0
  const sizeStock = size ? stockFor(size) : 0

  const handleAdd = (event) => {
    if (!size) {
      setError("Select a size to continue.")
      return
    }
    if (sizeStock <= 0) {
      setError("That size is out of stock.")
      return
    }
    setError("")
    const item = {
      productId: product.id,
      name: product.name,
      price: product.price,
      img: colorway.img,
      size,
      colorway: colorway.name,
      qty: 1,
    }
    const fromRect = event?.currentTarget?.getBoundingClientRect?.()
    if (flyToCart) flyToCart({ item, fromRect })
    else { addToCart(item); openCart?.() }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <nav className="mb-8 font-mono text-xs uppercase tracking-widest text-ash">
        <Link to="/shop" className="hover:text-signal">Shop</Link>
        <span className="mx-2">/</span>
        <span className="text-bone">{product.code}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] overflow-hidden border border-line bg-ink-2">
            <Suspense fallback={<img src={colorway.img} alt={product.name} className="h-full w-full object-contain p-4" />}>
              <ProductStage url={colorway.img} />
            </Suspense>
          </div>
          {distinctImgs.length > 1 && (
            <div className="mt-4 flex gap-3">
              {distinctImgs.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setColorIdx(colorwaysForImg[i])}
                  className={`h-16 w-14 overflow-hidden border bg-bone transition-colors ${
                    colorwaysForImg[i] === colorIdx ? "border-signal" : "border-line hover:border-ash"
                  }`}
                >
                  <img src={src} alt={product.name} className="h-full w-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="font-mono text-xs uppercase tracking-widest text-signal">
            {product.code} · {product.drop}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold">{product.name}</h1>
          <p className="mt-3 font-mono text-lg text-bone">${product.price}</p>

          <p className="mt-6 text-ash">{product.description}</p>

          {/* Tech tags */}
          <div className="mt-5">
            <p className="font-mono text-xs uppercase tracking-widest text-ash">// specs</p>
            <TechTags product={product} className="mt-2" />
          </div>

          {/* Colorway selector */}
          <div className="mt-8">
            <p className="font-mono text-xs uppercase tracking-widest text-ash">
              Colour — <span className="text-bone">{colorway.name}</span>
            </p>
            <div className="mt-3 flex gap-3">
              {product.colorways.map((cw, i) => (
                <button
                  key={cw.name}
                  onClick={() => setColorIdx(i)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    i === colorIdx ? "border-signal scale-110" : "border-line"
                  }`}
                  style={{ backgroundColor: cw.hex }}
                  aria-label={cw.name}
                />
              ))}
            </div>
          </div>

          {/* Size selector */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-ash">Size</p>
              <button
                onClick={() => setShowGuide(true)}
                className="font-mono text-xs uppercase tracking-widest text-ash underline underline-offset-4 hover:text-signal"
              >
                Size guide
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {product.sizes.map((s) => {
                const n = stockFor(s)
                const oos = n <= 0
                return (
                  <button
                    key={s}
                    disabled={oos}
                    onClick={() => { setSize(s); setError("") }}
                    className={`relative border py-3 font-mono text-xs transition-colors ${
                      size === s
                        ? "border-signal bg-signal text-ink"
                        : oos
                        ? "cursor-not-allowed border-line text-ash/40 line-through"
                        : "border-line text-bone hover:border-signal"
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
            {size && (
              <p className="mt-2 font-mono text-xs text-ash">
                {sizeStock > 0 ? `// ${sizeStock} in stock` : "// out of stock"}
              </p>
            )}
            {error && <p className="mt-2 font-mono text-xs text-signal">{error}</p>}
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleAdd}
              className="flex-1 bg-signal py-4 font-mono text-xs uppercase tracking-widest text-ink transition-opacity hover:opacity-90"
            >
              Add to cart
            </button>
            <button
              onClick={() => (user ? toggleWish(product.id) : navigate("/signup"))}
              className={`border px-4 transition-colors ${
                isWished(product.id) ? "border-signal text-signal" : "border-line text-bone hover:border-signal"
              }`}
              aria-label="Toggle wishlist"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isWished(product.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>

          {/* Details */}
          <div className="mt-10 space-y-3 border-t border-line pt-6 font-mono text-xs text-ash">
            <p>▸ Free shipping over $150</p>
            <p>▸ 30-day returns on unworn pieces</p>
            <p>▸ Shipped from encrypted warehouse</p>
          </div>
        </div>
      </div>

      {/* Size guide modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6" onClick={() => setShowGuide(false)}>
          <div className="max-w-md border border-line bg-ink-2 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Size Guide</h3>
              <button onClick={() => setShowGuide(false)} className="text-ash hover:text-bone">✕</button>
            </div>
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-line text-ash">
                  <th className="py-2">Size</th>
                  <th className="py-2">Chest (in)</th>
                  <th className="py-2">Length (in)</th>
                </tr>
              </thead>
              <tbody>
                {[["S", 38, 27], ["M", 40, 28], ["L", 42, 29], ["XL", 44, 30], ["XXL", 46, 31]].map(([s, c, l]) => (
                  <tr key={s} className="border-b border-line/50">
                    <td className="py-2 text-signal">{s}</td>
                    <td className="py-2">{c}</td>
                    <td className="py-2">{l}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
