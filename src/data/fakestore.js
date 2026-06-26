// CIPHER catalog source: FakeStoreAPI (https://fakestoreapi.com).
//
// The API returns generic e-commerce products (title, price, description,
// category, image, rating) — none of the streetwear fields CIPHER needs
// (garment type, colorways, sizes, stock, drop). So we map each API product
// into CIPHER's catalog shape and render it on-brand using the same garment
// silhouettes as the hand-written catalog (see garments.js).
//
// Network is best-effort: callers get { products, error } — on any failure we
// return a small local fallback so the store never renders an empty grid.

import { garmentImage } from "./garments"

const API_URL = "https://fakestoreapi.com/products"

// CIPHER categories + the garment silhouettes we can render. API categories
// ("men's clothing", "jewelery", "electronics"…) are remapped onto these so
// the Shop filters stay on-brand.
const CATEGORY_MAP = {
  "men's clothing": "Tops",
  "women's clothing": "Tops",
  jewelery: "Accessories",
  electronics: "Accessories",
}

// Vault gender assignment. FakeStoreAPI isn't gendered beyond men's/women's
// clothing; jewelery → women (accessories), electronics → men (tactical/utility).
const GENDER_MAP = {
  "men's clothing": "men",
  "women's clothing": "women",
  jewelery: "women",
  electronics: "men",
}

// The Vault's per-gender category sets (handoff §6). Each product is placed
// into one of these so the pull-drawer navigation (gender → category → grid)
// has somewhere to live.
export const vaultCategories = {
  men: [
    { id: "tshirts", code: "CAT-01", label: "T-SHIRTS", desc: "Graphic tees, encrypted UV prints" },
    { id: "shirts",  code: "CAT-02", label: "SHIRTS",   desc: "Technical collars, button-down fabrics" },
    { id: "hoodies", code: "CAT-03", label: "HOODIES",  desc: "Heavyweight fleece, sealed seams" },
    { id: "cargo",   code: "CAT-04", label: "CARGO",    desc: "Tactical pockets, DWR treated" },
    { id: "caps",    code: "CAT-05", label: "CAPS",     desc: "Structured, embroidered cipher logo" },
  ],
  women: [
    { id: "tshirts",     code: "CAT-01", label: "T-SHIRTS",   desc: "Signal prints, cropped and relaxed fits" },
    { id: "tops",        code: "CAT-02", label: "TOPS",        desc: "Technical fabric, minimal seams" },
    { id: "hoodies",     code: "CAT-03", label: "HOODIES",     desc: "Oversized fit, encrypted prints" },
    { id: "bottoms",     code: "CAT-04", label: "BOTTOMS",     desc: "High-waist utility pockets" },
    { id: "accessories", code: "CAT-05", label: "ACCESSORIES", desc: "Bags, caps, lanyards" },
  ],
}

// Place a product into the right Vault subcategory for its gender, inferred
// from the title. Electronics/misc fall to the closest utility bucket so the
// Vault never has orphan products (titles still render, so mismatches are
// visible — the catalog is sparse/mixed by FakeStoreAPI's nature).
function inferVaultCategory(title, gender) {
  const t = title.toLowerCase()
  const isHood = /(hood|fleece|sweat|jacket|coat|parka|rain shell)/.test(t)
  // NOTE: check tee BEFORE shirt — "t-shirt" contains "shirt".
  const isTee = /(tee|t-shirt|short sleeve)/.test(t)
  if (gender === "men") {
    if (isHood) return "hoodies"
    if (isTee) return "tshirts"
    if (/(shirt|button|oxford|polo)/.test(t)) return "shirts"
    if (/(pant|jean|trouser|cargo)/.test(t)) return "cargo"
    if (/(cap|hat|beanie)/.test(t)) return "caps"
    // backpacks / electronics / misc → tactical utility
    return "cargo"
  }
  // women
  if (isHood) return "hoodies"
  if (isTee) return "tshirts"
  if (/(top|blouse|tank)/.test(t)) return "tops"
  if (/(pant|jean|trouser|skirt|short|legging|bottom)/.test(t)) return "bottoms"
  // jewelery / bags / accessories / misc
  return "accessories"
}

// Guess a garment silhouette from the product title + API category so each
// product renders a real-looking piece (tee, hoodie, cap, bag…) rather than
// the generic folded-garment fallback.
function inferType(title, apiCat) {
  const t = title.toLowerCase()
  if (/(hood|fleece|sweat)/.test(t)) return "Hoodie"
  if (/(jacket|coat|parka|shell|wind)/.test(t)) return "Shell"
  if (/(pant|jean|trouser|cargo|chino)/.test(t)) return "Cargo"
  if (/(tee|t-shirt|shirt|top)/.test(t)) return "Tee"
  if (/(cap|hat|beanie)/.test(t)) return "Cap"
  if (/(back|bag|sling|duffel|tote)/.test(t)) return "Bag"
  if (/(ring|necklace|bracelet|jewel|gold|silver|chain)/.test(t)) return "Cap" // accessory glyph
  if (apiCat === "jewelery") return "Cap"
  return "Tee"
}

// Colorway palettes per CIPHER category — every product gets 1–3 colorways,
// each rendered in its own garment silhouette via garmentImage().
const PALETTES = {
  Tops: [
    { name: "Void Black", hex: "#0a0a0b" },
    { name: "Bone", hex: "#e8e8e6" },
    { name: "Signal", hex: "#c6ff00" },
  ],
  Bottoms: [
    { name: "Void Black", hex: "#0a0a0b" },
    { name: "Carbon", hex: "#2e303a" },
  ],
  Outerwear: [
    { name: "Carbon", hex: "#2e303a" },
    { name: "Void Black", hex: "#0a0a0b" },
  ],
  Accessories: [
    { name: "Carbon", hex: "#2e303a" },
    { name: "Signal", hex: "#c6ff00" },
  ],
}

// Stable pseudo-random from a seed so stock numbers are deterministic per
// product (refreshing doesn't reshuffle availability — feels like a real
// catalog, not random noise).
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const SIZE_SETS = {
  Tops: ["S", "M", "L", "XL"],
  Bottoms: ["28", "30", "32", "34"],
  Outerwear: ["S", "M", "L", "XL"],
  Accessories: ["One Size"],
}

// Turn one FakeStoreAPI product into a CIPHER catalog entry.
export function mapProduct(api, index) {
  const category = CATEGORY_MAP[api.category] || "Accessories"
  const gender = GENDER_MAP[api.category] || "men"
  const vaultCategory = inferVaultCategory(api.title, gender)
  const type = inferType(api.title, api.category)
  const palette = PALETTES[category]
  const rand = seeded(api.id * 7919 + 13)

  // 1–3 colorways depending on category. Colorways stay as cosmetic color
  // options (CIPHER swatches), but every colorway points at the REAL product
  // photo from the API — one image per product, so the gallery shows the
  // actual piece, not a generated silhouette.
  const colorways = palette
    .slice(0, category === "Accessories" ? 2 : 3)
    .map((cw) => ({ ...cw, img: api.image }))

  // Synthesize per-size stock from the API rating count (a product with more
  // reviews reads as "more in stock"), with one size occasionally OOS so the
  // low-stock + sold-out UI states have something to show.
  const sizes = SIZE_SETS[category]
  const stock = {}
  sizes.forEach((s) => {
    const base = Math.round((api.rating?.count ?? 30) * (0.05 + rand() * 0.15))
    const oos = rand() > 0.82 // ~18% chance a given size is sold out
    stock[s] = oos ? 0 : Math.max(0, base)
  })

  // Code-name: keep the API id but tag it as a CIPHER unit (FS = FakeStore).
  const code = `FS-${String(api.id).padStart(2, "0")}`
  const name = api.title.length > 22 ? api.title.slice(0, 22).trim() + "…" : api.title

  return {
    id: String(api.id),
    code,
    name,
    category,
    gender,
    vaultCategory,
    type,
    price: Math.round(api.price),
    colorways,
    sizes,
    stock,
    drop: index % 2 === 0 ? "DROP_01" : "DROP_02",
    description: api.description,
    rating: api.rating,
    source: "fakestoreapi",
  }
}

// Public: fetch + map the full catalog. Never throws — on failure returns
// { products: fallback, error } so the UI always has something to show.
export async function fetchCatalog() {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout?.(8000) })
    if (!res.ok) throw new Error(`FakeStoreAPI ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data) || !data.length) throw new Error("empty response")
    return { products: data.map(mapProduct), error: null }
  } catch (err) {
    console.warn("[cipher] FakeStoreAPI fetch failed, using fallback:", err.message)
    return { products: FALLBACK, error: err.message || "fetch failed" }
  }
}

// CIPHER categories exposed for the Shop filter row (re-exported so Shop.jsx
// keeps importing from one place).
export const categories = ["All", "Tops", "Bottoms", "Outerwear", "Accessories"]

export const garmentTypes = ["Tee", "Hoodie", "Cargo", "Pant", "Shell", "Cap", "Bag"]

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"]

// --- Vault selectors ---
export const genderLabel = (g) => (g === "men" ? "MEN'S" : g === "women" ? "WOMEN'S" : "")

// Products in the Vault for a given gender (+ optional subcategory).
export function productsFor(catalog, gender, category) {
  return catalog.filter(
    (p) => p.gender === gender && (!category || p.vaultCategory === category)
  )
}

// Total pieces a gender shows in the Vault (used for the "48 PIECES" label).
export const vaultGenderCount = (catalog, gender) =>
  catalog.filter((p) => p.gender === gender).length

// Minimal offline fallback (3 hand-mapped pieces) so the store is never empty
// if FakeStoreAPI is unreachable. Same CIPHER shape as mapped API products.
const FALLBACK = [
  {
    id: "fb-1", code: "FB-01", name: "Signal Tee", category: "Tops", gender: "men", vaultCategory: "tshirts", type: "Tee", price: 68,
    colorways: PALETTES.Tops.map((cw) => ({ ...cw, img: garmentImage("Tee", cw) })),
    sizes: SIZE_SETS.Tops, stock: { S: 4, M: 0, L: 7, XL: 2 }, drop: "DROP_01",
    description: "Heavyweight 240gsm tee with encrypted back-print. Offline fallback piece.",
    source: "fallback",
  },
  {
    id: "fb-2", code: "FB-02", name: "Nocturne Hoodie", category: "Tops", gender: "women", vaultCategory: "hoodies", type: "Hoodie", price: 148,
    colorways: PALETTES.Tops.slice(0, 2).map((cw) => ({ ...cw, img: garmentImage("Hoodie", cw) })),
    sizes: SIZE_SETS.Tops, stock: { S: 2, M: 5, L: 3, XL: 0 }, drop: "DROP_02",
    description: "Brushed-back fleece hoodie. Offline fallback piece.", source: "fallback",
  },
  {
    id: "fb-3", code: "FB-03", name: "Carrier Sling", category: "Accessories", gender: "women", vaultCategory: "accessories", type: "Bag", price: 96,
    colorways: PALETTES.Accessories.map((cw) => ({ ...cw, img: garmentImage("Bag", cw) })),
    sizes: SIZE_SETS.Accessories, stock: { "One Size": 11 }, drop: "DROP_01",
    description: "Sling carry pack. Offline fallback piece.", source: "fallback",
  },
]
