import { createContext, useContext, useEffect, useState } from "react"
import { fetchCatalog } from "@/data/fakestore"

// Editable catalog shared by Shop + Admin + PDP. Source: FakeStoreAPI
// (https://fakestoreapi.com) — fetched on first mount and mapped into CIPHER's
// shape. A successful fetch is cached to localStorage so refreshes are instant
// and admin edits to the loaded catalog survive; a fetch failure falls back to
// the bundled offline catalog (see fakestore.js) so the grid is never empty.
//
// Bumped CATALOG_VERSION when the mapping shape changes (e.g. new silhouette
// logic): a stale cached catalog from an older build is discarded so fresh
// API data (and new art) replaces it.
const CATALOG_VERSION = "fs-v4"
const CACHE_KEY = `cipher.catalog.${CATALOG_VERSION}`
const ProductsContext = createContext(null)

export function ProductsProvider({ children }) {
  const [catalog, setCatalog] = useState(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })
  const [status, setStatus] = useState(
    catalog.length ? "ready" : "loading" // "loading" | "ready" | "error"
  )

  // First load with an empty cache → fetch from FakeStoreAPI.
  useEffect(() => {
    if (catalog.length) return
    let alive = true
    setStatus("loading")
    fetchCatalog().then(({ products, error }) => {
      if (!alive) return
      setCatalog(products)
      setStatus(error ? "error" : "ready")
    })
    return () => {
      alive = false
    }
  }, [catalog.length])

  // Persist whenever the catalog changes (seed load + admin edits).
  useEffect(() => {
    if (catalog.length) localStorage.setItem(CACHE_KEY, JSON.stringify(catalog))
  }, [catalog])

  const upsert = (product) => {
    setCatalog((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id)
      if (idx === -1) return [...prev, product]
      const copy = [...prev]
      copy[idx] = product
      return copy
    })
  }

  const remove = (id) => setCatalog((prev) => prev.filter((p) => p.id !== id))

  // Re-fetch from the API, discarding the cache + any admin edits.
  const reset = async () => {
    localStorage.removeItem(CACHE_KEY)
    setStatus("loading")
    const { products, error } = await fetchCatalog()
    setCatalog(products)
    setStatus(error ? "error" : "ready")
  }

  return (
    <ProductsContext.Provider value={{ catalog, status, upsert, remove, reset }}>
      {children}
    </ProductsContext.Provider>
  )
}

export const useProducts = () => {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider")
  return ctx
}
